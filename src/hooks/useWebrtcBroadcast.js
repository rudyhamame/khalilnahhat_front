import { useEffect, useRef, useState } from 'react';
import { Room, VideoPresets, RoomEvent, createLocalTracks, LocalVideoTrack, LocalAudioTrack } from 'livekit-client';

import {capturePresentationSource} from '../lib/livePresentationSource';
import {audioInputLevel,createStudioAudioMixer} from '../lib/studioAudioMixer';
import {liveAudioProcessing,liveAudioConstraints,supportedLiveAudioProcessing,readLiveAudioProcessing,applyLiveAudioProcessing} from '../lib/liveAudioProcessing';
import { CAMERA_APPEARANCE_DEFAULTS, normalizeCameraAppearance } from '../lib/cameraAppearance';
import { CameraMirrorProcessor } from '../lib/CameraMirrorProcessor';
import { publishVocalMicrophone } from '../lib/publishVocalMicrophone';
import workletUrl from '../audio/vocal-worklet.js?worker&url';
import { VocalCorrectionProcessor } from '../lib/VocalCorrectionProcessor';
import { useVocalSettings, getVocalSettings, setVocalStatus, setVocalPitch, resetVocalLiveStatus } from './useVocalCorrection';

function describeMediaError(error, kind) {
  const name = error?.name || '';

  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return `No ${kind} was found on this device.`;
  }

  if (name === 'NotAllowedError' || name === 'PermissionDeniedError' || name === 'SecurityError') {
    return `${kind} access is blocked for this site. Check your browser's site permissions (camera/microphone) and reload.`;
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return `Your ${kind} is already in use by another app or browser tab.`;
  }

  return error?.message ? `${kind}: ${error.message}` : `Could not access your ${kind}.`;
}

export function useWebrtcBroadcast({ onBeforePreview, onGoLive, onEndLive, onReady, onStartRecording, onStartLocalRecording, expectedRoom, requireRecording = false, recordingEnabled = true }) {
  const generation = useRef(0);
  const previewTracks = useRef([]);
  const presentation=useRef(null);
  const presentationMixer=useRef(null);
  const micInput=useRef(null),sourceAudioInput=useRef(null);
  const [sourceAudioTrack,setSourceAudioTrack]=useState(null),[sourceAudioMuted,setSourceAudioMuted]=useState(false);
  const [sourceKind,setSourceKindState]=useState(()=>{try{const saved=sessionStorage.getItem('echo-live-source-kind');return ['camera','display'].includes(saved)?saved:'camera';}catch{return 'camera';}}),[sourceFile,setSourceFile]=useState(null);
  const setSourceKind=kind=>{setSourceKindState(kind);if(['camera','display'].includes(kind)){try{sessionStorage.setItem('echo-live-source-kind',kind);}catch{/* Source selection still works without storage. */}}};
  const [includeMicrophone,setIncludeMicrophone]=useState(false);
  const [isPreviewing,setIsPreviewing]=useState(false);
  const [previewBusy,setPreviewBusy]=useState(false);
  const [micMuted,setMicMuted]=useState(false),[cameraOff,setCameraOff]=useState(false);
  const [quality,setQuality]=useState('720');
  const [pitchCorrectionEnabled,setPitchCorrectionEnabled]=useState(false);
  const [cameraMirrored,setCameraMirrored]=useState(false),[mirrorBusy,setMirrorBusy]=useState(false);
  const mirrorLock=useRef(false);
  const [cameraAppearance,setCameraAppearance]=useState(CAMERA_APPEARANCE_DEFAULTS);
  // Effects are opt-in for this studio session; legacy saved presets cannot enable them.
  const [processingOverrides,setProcessingOverrides]=useState({});
  const [processingApplied,setProcessingApplied]=useState(null);
  const [processingMessage,setProcessingMessage]=useState('');
  const [processingBusy,setProcessingBusy]=useState(false);
  const processingLock=useRef(false);
  const processing=liveAudioProcessing('music',processingOverrides);
  const [sourceProcessing,setSourceProcessing]=useState(()=>liveAudioProcessing('music'));
  const [sourceProcessingApplied,setSourceProcessingApplied]=useState(null);
  const [sourceProcessingMessage,setSourceProcessingMessage]=useState('');
  const [sourceProcessingBusy,setSourceProcessingBusy]=useState(false);
  const sourceProcessingSupported=supportedLiveAudioProcessing(sourceAudioTrack);
  const [microphoneLevel,setMicrophoneLevelState]=useState(1),[sourceLevel,setSourceLevelState]=useState(1);
  const inputLevels=useRef({microphone:1,source:1});
  const updateMicrophoneLevel=value=>{const level=audioInputLevel(value);inputLevels.current.microphone=level;setMicrophoneLevelState(level);presentationMixer.current?.setMicrophoneLevel(level);};
  const updateSourceLevel=value=>{const level=audioInputLevel(value);inputLevels.current.source=level;setSourceLevelState(level);presentationMixer.current?.setSourceLevel(level);};
  const mediaBusy=useRef(false),startBusy=useRef(false);
  const releasePreview=()=>{for(const track of previewTracks.current){track.detach?.();track.stop();}previewTracks.current=[];presentationMixer.current?.stop();presentationMixer.current=null;presentation.current?.cleanup();presentation.current=null;micInput.current?.stop();micInput.current=null;sourceAudioInput.current=null;setSourceAudioTrack(null);setSourceAudioMuted(false);setSourceProcessing(liveAudioProcessing('music'));setSourceProcessingApplied(null);setSourceProcessingMessage('');setIsPreviewing(false);setMicMediaStreamTrack(null);setCameraMirrored(false);};

  const ownedRoom = useRef('');
  const directRecorder=useRef(null);
  const finishRecording=async complete=>{const recorder=directRecorder.current;directRecorder.current=null;await recorder?.stop(complete);};
  const suspendRecording=async()=>{const recorder=directRecorder.current;directRecorder.current=null;await recorder?.suspend?.();};
  const callbacks=useRef({onEndLive,onReady});
  callbacks.current={onEndLive,onReady};
  const release=async(roomName)=>{if(roomName)await callbacks.current.onEndLive(roomName);};
  const processorRef = useRef(null);
  const vocalSettings = useVocalSettings();
  useEffect(() => { processorRef.current?.configure(vocalSettings); }, [vocalSettings]);
  const videoRef = useRef(null);
  const roomRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [audioInputs, setAudioInputs] = useState([]);
  const [videoInputs, setVideoInputs] = useState([]);
  const [selectedAudioDeviceId, setSelectedAudioDeviceId] = useState('');
  const [selectedVideoDeviceId, setSelectedVideoDeviceId] = useState('');
  const [micMediaStreamTrack, setMicMediaStreamTrack] = useState(null);

  const refreshDevices = async () => {
    if (!navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setAudioInputs(devices.filter((device) => device.kind === 'audioinput'));
      setVideoInputs(devices.filter((device) => device.kind === 'videoinput'));
    } catch (error) {
      console.warn('Could not list media devices:', error);
    }
  };

  useEffect(() => {
    refreshDevices();

    if (!navigator.mediaDevices?.addEventListener) {
      return undefined;
    }

    navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
    return () => navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
  }, []);

  useEffect(
    () => () => {
      generation.current++;
      for(const track of previewTracks.current){track.detach?.();track.stop();}previewTracks.current=[];presentationMixer.current?.stop();presentationMixer.current=null;micInput.current?.stop();micInput.current=null;presentation.current?.cleanup();presentation.current=null;
      ownedRoom.current='';
      void suspendRecording().catch(()=>{});
      const room=roomRef.current;
      roomRef.current = null;
      room?.disconnect();
      processorRef.current?.destroy();
      processorRef.current = null;
      resetVocalLiveStatus();
    },
    [],
  );

  const captureAudio=()=>({channelCount:2,latency:{ideal:0},...liveAudioConstraints(processing),voiceIsolation:false,...(selectedAudioDeviceId?{deviceId:{exact:selectedAudioDeviceId}}:{})});
  const captureVideo=()=>{const width=quality==='1080'?1920:quality==='360'?640:1280,height=quality==='1080'?1080:quality==='360'?360:720;return {resolution:{width,height,frameRate:30,aspectRatio:width/height},...(selectedVideoDeviceId?{deviceId:{exact:selectedVideoDeviceId}}:{})};};
  const updateAudioProcessing=async(patch)=>{
    if(processingLock.current||mediaBusy.current||startBusy.current)return;
    const next=patch===null?liveAudioProcessing('music'):{...processing,...patch};
    const track=micInput.current;
    if(!track){setProcessingOverrides(patch===null?{}:next);setProcessingApplied(null);setProcessingMessage('Audio processing will be requested when you open private preview.');return;}
    processingLock.current=true;setProcessingBusy(true);setProcessingMessage('Applying to the current audio input…');const request=generation.current;
    try{
      const applied=await applyLiveAudioProcessing(track,next);
      if(request!==generation.current)return;
      setProcessingOverrides(patch===null?{}:next);setProcessingApplied(applied);
      const ignored=Object.keys(next).filter(key=>applied[key]!==null&&applied[key]!==next[key]);
      setProcessingMessage(ignored.length?'The input did not apply every requested setting. Check the reported input settings below.':Object.values(applied).some(value=>value===null)?'Requested on the current input. This browser does not report every processing setting.':'Applied to the current input. Listen on headphones to check the result.');
    }catch(error){if(request===generation.current)setProcessingMessage(error.message||'Audio processing could not be changed. The previous selection is retained.');}
    finally{processingLock.current=false;setProcessingBusy(false);}
  };
  const updateSourceAudioProcessing=async(patch)=>{
    if(processingLock.current||mediaBusy.current||startBusy.current)return;
    const track=sourceAudioInput.current;
    if(!track){setSourceProcessingMessage('Open a tab/window or video source with audio first.');return;}
    const next=patch===null?liveAudioProcessing('music'):{...sourceProcessing,...patch};
    const supported=supportedLiveAudioProcessing(track);
    if(Object.keys(next).some(key=>next[key]&&!supported[key])){setSourceProcessingMessage('This source does not support the selected effect.');return;}
    processingLock.current=true;setSourceProcessingBusy(true);const request=generation.current;
    try{
      const applied=await applyLiveAudioProcessing(track,next);
      if(request!==generation.current)return;
      setSourceProcessing(next);setSourceProcessingApplied(applied);
      setSourceProcessingMessage(Object.keys(next).some(key=>applied[key]!==null&&applied[key]!==next[key])?'The source did not apply every requested setting. Check the reported settings.':'Applied to source audio only.');
    }catch(error){if(request===generation.current)setSourceProcessingMessage(error.message||'Source effects could not be changed.');}
    finally{processingLock.current=false;setSourceProcessingBusy(false);}
  };
  const preparePreview=async({kind=sourceKind,file=sourceFile}={})=>{
    if(mediaBusy.current||processingLock.current||mirrorLock.current||roomRef.current)return;
    if(onBeforePreview?.()===false)return;
    mediaBusy.current=true;setPreviewBusy(true);const request=++generation.current;
    releasePreview();setStatusMessage('Opening private preview. Nothing is on air yet.');
    const tracks=[],issues=[];
    try{
      if(kind==='camera'){
        for(const kind of ['audio','video']){
          try{tracks.push(...await createLocalTracks({audio:kind==='audio'?captureAudio():false,video:kind==='video'?captureVideo():false}));}
          catch(error){issues.push(describeMediaError(error,kind==='audio'?'Microphone':'Camera'));}
          if(request!==generation.current){tracks.forEach(track=>track.stop());return;}
        }
      }else{
        const capture=captureVideo(),size=capture.resolution;
        const source=await capturePresentationSource({kind,file,width:size.width,height:size.height,onEnded:()=>{setStatusMessage('Source sharing ended.');if(roomRef.current)void endLive();else closePreview();}});
        if(request!==generation.current){source.cleanup();return;}
        presentation.current=source;
        tracks.push(new LocalVideoTrack(source.stream.getVideoTracks()[0]));
        const sourceAudio=source.stream.getAudioTracks()[0];
        sourceAudioInput.current=sourceAudio||null;setSourceAudioTrack(sourceAudio||null);
        // A new source always starts untouched; microphone choices never carry over.
        setSourceProcessing(liveAudioProcessing('music'));setSourceProcessingApplied(readLiveAudioProcessing(sourceAudio));setSourceProcessingMessage('');
        const mixer=createStudioAudioMixer({microphoneLevel:inputLevels.current.microphone,sourceLevel:inputLevels.current.source});
        presentationMixer.current=mixer;
        await mixer.ready;
        if(request!==generation.current){mixer.stop();tracks.forEach(track=>track.stop());return;}
        if(sourceAudio)mixer.connectSource(sourceAudio);
        tracks.push(new LocalAudioTrack(mixer.track));
        if(includeMicrophone){
          try{
            const mic=(await createLocalTracks({audio:captureAudio(),video:false})).find(t=>t.kind==='audio');
            if(request!==generation.current){mic?.stop();tracks.forEach(track=>track.stop());return;}
            micInput.current=mic||null;
            if(mic)mixer.connectMicrophone(mic.mediaStreamTrack);
          }catch(error){issues.push(describeMediaError(error,'Microphone'));setIncludeMicrophone(false);}
        }
      }
      if(!tracks.length)throw new Error(issues.join(' '));
      const camera=tracks.find(track=>track.kind==='video');
      if(camera){
        const effect=new CameraMirrorProcessor({mirrored:false,appearance:cameraAppearance,watermark:true});
        try{await camera.setProcessor(effect,true);}catch(error){await effect.destroy();throw error;}
        if(request!==generation.current){tracks.forEach(track=>track.stop());return;}
      }
      if(kind==='camera'){
        micInput.current=tracks.find(track=>track.kind==='audio')||null;
        if(micInput.current){
          const mixer=createStudioAudioMixer({microphoneLevel:inputLevels.current.microphone,sourceLevel:inputLevels.current.source});
          presentationMixer.current=mixer;await mixer.ready;
          if(request!==generation.current){mixer.stop();tracks.forEach(track=>track.stop());return;}
          mixer.connectMicrophone(micInput.current.mediaStreamTrack);
          tracks[tracks.indexOf(micInput.current)]=new LocalAudioTrack(mixer.track);
        }
      }
      previewTracks.current=tracks;setIsPreviewing(true);setMicMuted(false);setCameraOff(false);
      setMicMediaStreamTrack(micInput.current?.mediaStreamTrack||null);
      setProcessingApplied(readLiveAudioProcessing(micInput.current));setProcessingMessage('');
      if(videoRef.current)tracks.find(track=>track.kind==='video')?.attach(videoRef.current);
      await refreshDevices();setStatusMessage('Private preview ready. '+issues.join(' '));return true;
    }catch(error){tracks.forEach(track=>track.stop());releasePreview();setStatusMessage(error.message||'Could not open preview.');return false;}
    finally{mediaBusy.current=false;setPreviewBusy(false);}
  };
  const updateIncludeMicrophone=async enabled=>{
    if(mediaBusy.current||startBusy.current||processingLock.current||roomRef.current)return;
    const mixer=presentationMixer.current;
    if(!mixer){setIncludeMicrophone(enabled);return;}
    if(!enabled){
      mixer.disconnectMicrophone();micInput.current?.stop();micInput.current=null;
      setIncludeMicrophone(false);setMicMediaStreamTrack(null);setMicMuted(false);return;
    }
    if(micInput.current)return;
    mediaBusy.current=true;setPreviewBusy(true);const request=generation.current;
    let mic;
    try{
      mic=(await createLocalTracks({audio:captureAudio(),video:false})).find(track=>track.kind==='audio');
      if(request!==generation.current||presentationMixer.current!==mixer){mic?.stop();return;}
      if(!mic)throw new Error('No microphone was found.');
      mixer.connectMicrophone(mic.mediaStreamTrack);micInput.current=mic;
      setIncludeMicrophone(true);setMicMuted(false);setMicMediaStreamTrack(mic.mediaStreamTrack);
      setProcessingApplied(readLiveAudioProcessing(mic));await refreshDevices();
      setStatusMessage('Microphone enabled in private preview.');
    }catch(error){mic?.stop();if(request===generation.current){setIncludeMicrophone(false);setStatusMessage(describeMediaError(error,'Microphone'));}}
    finally{mediaBusy.current=false;setPreviewBusy(false);}
  };
  const selectSource=(kind,file=null)=>{
    if(mediaBusy.current||processingLock.current||mirrorLock.current||startBusy.current||roomRef.current)return;
    setSourceKind(kind);setSourceFile(file);
    // Start within the selection gesture: screen sharing and video playback
    // need user activation, and React has not committed the new source yet.
    if(kind==='camera'||kind==='display'||file)return preparePreview({kind,file});
  };
  const closePreview=()=>{if(roomRef.current)return;generation.current++;releasePreview();setStatusMessage('Preview closed.');};
  const updateCameraEffects=async({mirrored=cameraMirrored,appearance=cameraAppearance}={})=>{
    if(mirrorLock.current||mediaBusy.current||startBusy.current)return;
    const next=normalizeCameraAppearance(appearance);
    const track=previewTracks.current.find(t=>t.kind==='video')||[...roomRef.current?.localParticipant.trackPublications?.values()||[]].find(p=>p.kind==='video')?.track;
    if(!track){setCameraAppearance(next);return;}
    const request=generation.current;
    mirrorLock.current=true;setMirrorBusy(true);
    let processor;
    try{
      const existing=track.getProcessor?.();
      if(mirrored||next.strength>0||next.background!=='off'||next.sideLight||existing?.watermark){
        if(existing instanceof CameraMirrorProcessor)existing.configure({mirrored,appearance:next});
        else{processor=new CameraMirrorProcessor({mirrored,appearance:next,watermark:true});await track.setProcessor(processor,true);}
      }else if(existing)await track.stopProcessor();
      if(request!==generation.current){await processor?.destroy();return;}
      setCameraMirrored(mirrored);setCameraAppearance(next);
      setStatusMessage(`Camera effects applied to preview and outgoing video. Mirror ${mirrored?'on':'off'} · beauty / lighting ${next.strength?'on':'off'}.`);
    }catch(error){await processor?.destroy();if(request===generation.current)setStatusMessage(error.message||'Could not change camera effects.');}
    finally{mirrorLock.current=false;setMirrorBusy(false);}
  };
  const toggleCameraMirror=()=>updateCameraEffects({mirrored:!cameraMirrored});
  const updateCameraAppearance=appearance=>updateCameraEffects({appearance});
  const toggleInput=async(kind)=>{
    if(kind==='audio'&&!micInput.current&&presentationMixer.current)return updateIncludeMicrophone(true);
    if(mediaBusy.current||mirrorLock.current)return;mediaBusy.current=true;
    try{
      const track=kind==='audio'?micInput.current:previewTracks.current.find(t=>t.kind===kind)||[...roomRef.current?.localParticipant.trackPublications?.values()||[]].find(p=>p.kind===kind)?.track;
      if(!track)return;
      if(kind==='audio'&&presentationMixer.current){
        track.mediaStreamTrack.enabled=!track.mediaStreamTrack.enabled;
        setMicMuted(!track.mediaStreamTrack.enabled);return;
      }
      if(track.isMuted)await track.unmute();else await track.mute();
      if(kind==='audio')setMicMuted(track.isMuted);else setCameraOff(track.isMuted);
    }catch{setStatusMessage('Could not change this input. Check device access.');}finally{mediaBusy.current=false;}
  };
  const toggleSourceAudio=()=>{
    const track=sourceAudioInput.current;if(!track||track.readyState==='ended')return;
    track.enabled=!track.enabled;setSourceAudioMuted(!track.enabled);
  };
  useEffect(()=>{if(isPreviewing)previewTracks.current.find(track=>track.kind==='video')?.attach(videoRef.current);},[isPreviewing]);
  useEffect(()=>{if(!isPreviewing&&!isBroadcasting)return undefined;const warn=event=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[isPreviewing,isBroadcasting]);
  const [startError,setStartError]=useState('');
  const goLive = async (title,existingClaim=null,sourceOverride=sourceKind) => {
    if (isConnecting || roomRef.current || mediaBusy.current || processingLock.current || mirrorLock.current || startBusy.current) return;
    startBusy.current=true;setStartError('');
    const request = ++generation.current;
    setIsConnecting(true);
    setStatusMessage('Requesting camera and microphone access...');

    let claimedRoom='';const resuming=Boolean(existingClaim);
    try {
      const { token, url, roomName, recording } = existingClaim||await onGoLive(title);
      claimedRoom=roomName;
      if(!recordingEnabled&&recording?.mode!=='none'){
        throw new Error('The server did not confirm live-only mode. Live was canceled. Update the server before broadcasting without saving.');
      }
      if(requireRecording&&(recording?.mode!=='direct'||!recording.id)){
        throw new Error('The server did not enable browser recording. Live was canceled to avoid losing the recording. Restart the backend and try again.');
      }
      if (request !== generation.current) {if(!resuming)await release(roomName);return;}
      ownedRoom.current=roomName;
      const room = new Room({dynacast:true,publishDefaults:{audioPreset:{maxBitrate:256000},forceStereo:true,dtx:false,red:true,videoCodec:'h264',simulcast:true,videoEncoding:{...(quality==='1080'?VideoPresets.h1080:quality==='360'?VideoPresets.h360:VideoPresets.h720).encoding,maxFramerate:30},videoSimulcastLayers:quality==='1080'?[VideoPresets.h360,VideoPresets.h720]:quality==='360'?[VideoPresets.h180]:[VideoPresets.h180,VideoPresets.h360],degradationPreference:'maintain-framerate'}});
      roomRef.current = room;
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current !== room) return;
        generation.current++;
        void suspendRecording().catch(error=>setStatusMessage(error.message));
        ownedRoom.current='';
        roomRef.current = null;
        processorRef.current?.destroy();
        processorRef.current = null;
        resetVocalLiveStatus();
        releasePreview();
        setMicMediaStreamTrack(null);
        setIsBroadcasting(false);
        setIsConnecting(false);setStatusMessage('Studio disconnected. Use Reconnect live to continue this session.');
      });
      await room.connect(url, token);
      if (request !== generation.current) { room.disconnect(); return; }

      let hasMicrophone = false;
      let hasCamera = false;
      let microphoneIssue = '';
      let cameraIssue = '';

      try {
        if(sourceOverride==='camera'&&!previewTracks.current.some(track=>track.kind==='audio')){
          const captured=await createLocalTracks({audio:captureAudio(),video:false});
          const microphone=captured.find(track=>track.kind==='audio');
          if(request!==generation.current){captured.forEach(track=>track.stop());return;}
          if(!microphone)throw new Error('No microphone was found.');
          micInput.current=microphone;
          const mixer=createStudioAudioMixer({microphoneLevel:inputLevels.current.microphone,sourceLevel:inputLevels.current.source});
          presentationMixer.current=mixer;await mixer.ready;
          if(request!==generation.current){mixer.stop();microphone.stop();return;}
          mixer.connectMicrophone(microphone.mediaStreamTrack);
          previewTracks.current.push(new LocalAudioTrack(mixer.track));
        }
        if(sourceOverride!=='camera'&&!previewTracks.current.some(track=>track.kind==='audio'))throw new Error('This source has no audio track.');
        const processor = pitchCorrectionEnabled&&sourceOverride==='camera' ? new VocalCorrectionProcessor(getVocalSettings(), { onStatus: status => { if (request === generation.current) setVocalStatus(status); }, onPitch: pitch => { if (request === generation.current) setVocalPitch(pitch); }, workletUrl }) : null;
        const { publication: microphonePublication, processed } = await publishVocalMicrophone(room.localParticipant, {
          audio: captureAudio(),
          track: previewTracks.current.find(track=>track.kind==='audio'),
          processor,
          isCurrent: () => request === generation.current,
          onFallback: () => { if (request === generation.current) setVocalStatus('Pitch correction is unavailable in this browser. Streaming your natural microphone signal.'); },
        });
        if (processed) { processorRef.current = processor; processor.configure(getVocalSettings()); }
        if(sourceOverride==='camera'&&!micInput.current)micInput.current=microphonePublication?.track||null;
        setMicMediaStreamTrack(micInput.current?.mediaStreamTrack || null);
        setProcessingApplied(readLiveAudioProcessing(micInput.current));setProcessingMessage('');
        hasMicrophone = true;
      } catch (microphoneError) {
        console.warn('Microphone unavailable:', microphoneError);
        microphoneIssue = describeMediaError(microphoneError, 'Microphone');
      }

      if (request !== generation.current) return;
      try {
        const localCamera=previewTracks.current.find(track=>track.kind==='video');
        const cameraPublication = localCamera ? await room.localParticipant.publishTrack(localCamera,{source:sourceOverride==='display'?'screen_share':'camera'}) : await room.localParticipant.setCameraEnabled(true,captureVideo());
        if (cameraPublication?.track && videoRef.current) {
          cameraPublication.track.attach(videoRef.current);
        }
        hasCamera = true;
      } catch (cameraError) {
        console.warn('Camera unavailable:', cameraError);
        cameraIssue = describeMediaError(cameraError, 'Camera');
      }

      if (request !== generation.current) return;
      if (!hasMicrophone && !hasCamera) {
        throw new Error([cameraIssue, microphoneIssue].filter(Boolean).join(' '));
      }

      refreshDevices();

      if(recording?.mode==='direct'||onStartLocalRecording){
        const tracks=[...room.localParticipant.trackPublications.values()].map(publication=>publication.track?.mediaStreamTrack).filter(Boolean);
        const recorders=[];
        const group={async stop(complete){const results=await Promise.allSettled(recorders.map(recorder=>recorder.stop(complete)));const failed=results.filter(result=>result.status==='rejected');if(failed.length)throw new Error(failed.map(result=>result.reason?.message||'Recording finalization failed.').join(' '));},async suspend(){await Promise.allSettled(recorders.map(recorder=>recorder.suspend?.()||recorder.stop(false)));}};
        directRecorder.current=group;
        if(onStartLocalRecording){
          const recorder=await onStartLocalRecording({tracks});recorders.push(recorder);
          if(request!==generation.current){await group.stop(false);return;}
        }
        if(recording?.mode==='direct'){
          if(!onStartRecording)throw new Error('Direct recording is unavailable in this studio.');
          const recorder=await onStartRecording({id:recording.id,tracks});recorders.push(recorder);
          if(request!==generation.current){await group.stop(false);return;}
        }
      }
      await callbacks.current.onReady?.(claimedRoom);
      if(request!==generation.current)return;
      setIsBroadcasting(true);setIsPreviewing(false);
      setStatusMessage(
        !hasCamera
          ? `You are live (audio only). ${cameraIssue}`
          : !hasMicrophone
            ? `You are live (video only). ${microphoneIssue}`
            : 'You are live. Viewers on the Live page can now watch.',
      );
    } catch (error) {
      if (request !== generation.current) return;
      await finishRecording(false).catch(()=>{});
      ownedRoom.current='';
      const failedRoom=roomRef.current;roomRef.current=null;
      failedRoom?.disconnect();
      roomRef.current = null;
      processorRef.current?.destroy();
      processorRef.current = null;
      resetVocalLiveStatus();
      releasePreview();
      setMicMediaStreamTrack(null);
      setIsBroadcasting(false);
      if(!resuming){try {await release(claimedRoom);} catch {setStatusMessage('');setStartError('Start failed. Refresh status and end this browser session.');return;}}
      setStatusMessage('');setStartError(error.message || 'Could not start the browser live stream.');
    } finally {
      startBusy.current=false;
      if (request === generation.current) setIsConnecting(false);
    }
  };

  const endLive = async () => {
    generation.current++;
    setIsConnecting(true);
    setStatusMessage('Ending live stream...');

    let recordingIssue='';
    try {await finishRecording(true);}catch(error){recordingIssue=error.message;}
    try {
      const roomName=ownedRoom.current||expectedRoom;ownedRoom.current='';
      const endingRoom=roomRef.current;roomRef.current=null;
      endingRoom?.disconnect();
      roomRef.current = null;
      processorRef.current?.destroy();
      processorRef.current = null;
      resetVocalLiveStatus();
      releasePreview();
      setMicMediaStreamTrack(null);
      setIsBroadcasting(false);
      await onEndLive(roomName);
      setStatusMessage(recordingIssue||'Live stream ended. Check recording status for saved files and any pending uploads.');
    } catch (error) {
      setStatusMessage(error.message || 'Could not end the browser live stream.');
    } finally {
      setIsConnecting(false);
    }
  };

  return {
    videoRef,
    sourceKind,setSourceKind,sourceFile,setSourceFile,selectSource,includeMicrophone,setIncludeMicrophone:updateIncludeMicrophone,pauseSource:()=>presentation.current?.pause?.(),playSource:()=>presentation.current?.play?.(),restartSource:()=>presentation.current?.restart?.(),
    cameraMirrored,mirrorBusy,toggleCameraMirror,cameraAppearance,updateCameraAppearance,
    processing,processingApplied,processingMessage,processingBusy,updateAudioProcessing,
    sourceProcessing,sourceProcessingApplied,sourceProcessingMessage,sourceProcessingBusy,sourceProcessingSupported,updateSourceAudioProcessing,
    isPreviewing,previewBusy,preparePreview,closePreview,micMuted,cameraOff,toggleMicrophone:()=>toggleInput('audio'),toggleCamera:()=>toggleInput('video'),quality,setQuality,pitchCorrectionEnabled,setPitchCorrectionEnabled,
    isConnecting,
    isBroadcasting,
    statusMessage,startError,
    goLive,
    endLive,
    audioInputs,
    videoInputs,
    selectedAudioDeviceId,
    setSelectedAudioDeviceId,
    selectedVideoDeviceId,
    setSelectedVideoDeviceId,
    sourceAudioTrack,sourceAudioMuted,toggleSourceAudio,
    micMediaStreamTrack,microphoneLevel,sourceLevel,updateMicrophoneLevel,updateSourceLevel,
  };
}
