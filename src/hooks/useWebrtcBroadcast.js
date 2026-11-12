import { useEffect, useRef, useState } from 'react';
import { Room, VideoPresets, RoomEvent, createLocalTracks, LocalVideoTrack, LocalAudioTrack } from 'livekit-client';

import {capturePresentationSource} from '../lib/livePresentationSource';
import {captureAudioSource} from '../lib/audioSource';
import {createProgramOutput} from '../lib/programOutput';
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

export function useWebrtcBroadcast({ onBeforePreview, onGoLive, onEndLive, onReady, onStartRecording, getOutputs, isNativePortrait, getPortraitAudio, expectedRoom, requireRecording = false, recordingEnabled = true }) {
  const generation = useRef(0);
  const previewTracks = useRef([]);
  const presentation=useRef(null);
  // The brand logo is burned into the picture by the camera processor; in Two sources the compositor draws it instead (never both).
  const watermarkOn=useRef(true);
  // In Two sources the look is applied to the final collab picture, so the source's own processor keeps only mirror and logo.
  const lookInOutput=useRef(false);
  const effectiveLook=value=>lookInOutput.current?{...value,strength:0,sideLight:0}:value;
  const setWatermark=on=>{watermarkOn.current=on;const processor=previewTracks.current.find(track=>track.kind==='video')?.getProcessor?.();if(processor)processor.watermark=on;};
  const pendingDisplay=useRef(null),pendingPromise=useRef(null),latestKind=useRef('');
  const separateAudio=useRef(null),programRef=useRef(null),voiceTrack=useRef(null),voiceLevelRef=useRef(1),inputLostRef=useRef(false),masterRef=useRef(1);
  const presentationMixer=useRef(null);
  const micInput=useRef(null),sourceAudioInput=useRef(null);
  const [sourceAudioTrack,setSourceAudioTrack]=useState(null),[sourceAudioMuted,setSourceAudioMuted]=useState(false);
  const [sourceKind,setSourceKindState]=useState(()=>{try{const saved=sessionStorage.getItem('echo-live-source-kind');return ['camera','display'].includes(saved)?saved:'camera';}catch{return 'camera';}}),[sourceFile,setSourceFile]=useState(null); // nothing is highlighted as the input until it is picked on purpose (selectSource sets the flag below)
  const sourceChosenRef=useRef(false);
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
  // The mixer for a preview; the portrait source's sound (chosen in the Studio) joins it from the start.
  const newMixer=()=>{const mixer=createStudioAudioMixer({microphoneLevel:inputLevels.current.microphone,sourceLevel:inputLevels.current.source});const portrait=callbacks.current.getPortraitAudio?.();if(portrait)mixer.connectPortrait?.(portrait);if(voiceTrack.current){mixer.connectVoice?.(voiceTrack.current.mediaStreamTrack);mixer.setVoiceLevel?.(voiceLevelRef.current);}mixer.setMasterLevel?.(masterRef.current);return mixer;};
  const releasePreview=()=>{pauseSoundRef.current?.audio.pause();pauseSoundRef.current=null;programRef.current?.program?.stop();programRef.current?.input?.stop?.();programRef.current=null;inputLostRef.current=false;setInputLost?.(false);setPaused?.(false);setPausedPreview?.(null);separateAudio.current?.cleanup?.();separateAudio.current=null;for(const track of previewTracks.current){track.detach?.();track.stop();}previewTracks.current=[];presentationMixer.current?.stop();presentationMixer.current=null;presentation.current?.cleanup();presentation.current=null;micInput.current?.stop();micInput.current=null;sourceAudioInput.current=null;setSourceAudioTrack(null);setSourceAudioMuted(false);setSourceProcessing(liveAudioProcessing('music'));setSourceProcessingApplied(null);setSourceProcessingMessage('');setIsPreviewing(false);setMicMediaStreamTrack(null);setCameraMirrored(false);};

  const ownedRoom = useRef('');
  const directRecorder=useRef(null);
  const finishRecording=async (complete,defer=false)=>{const recorder=directRecorder.current;directRecorder.current=null;return recorder?.stop(complete,{defer});};
  const suspendRecording=async()=>{const recorder=directRecorder.current;directRecorder.current=null;await recorder?.suspend?.();};
  const callbacks=useRef({onEndLive,onReady,getOutputs,isNativePortrait,getPortraitAudio});
  callbacks.current={onEndLive,onReady,getOutputs,isNativePortrait,getPortraitAudio};
  const release=async(roomName)=>{if(roomName)await callbacks.current.onEndLive(roomName);};
  const processorRef = useRef(null);
  const vocalSettings = useVocalSettings();
  useEffect(() => { processorRef.current?.configure(vocalSettings); }, [vocalSettings]);
  const videoRef = useRef(null);
  const roomRef = useRef(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  // Portrait crop position (0 = left edge, 1 = right edge). It drives the studio preview and the portrait output page.
  const [portraitPan, setPortraitPanState] = useState(() => { try { const saved = Number(localStorage.getItem('echo-portrait-pan')); return Number.isFinite(saved) && saved >= 0 && saved <= 1 && localStorage.getItem('echo-portrait-pan') !== null ? saved : .5; } catch { return .5; } });
  const setPortraitPan = value => setPortraitPanState(Math.max(0, Math.min(1, Number(value) || 0)));
  useEffect(() => {
    try { localStorage.setItem('echo-portrait-pan', String(portraitPan)); } catch { /* The crop still applies this session. */ }
    if (!isBroadcasting) return undefined;
    // Re-sent every few seconds so a portrait output that joins late, or reconnects, catches up.
    const send = () => { try { void roomRef.current?.localParticipant?.publishData(new TextEncoder().encode(JSON.stringify({ t: 'portrait-pan', x: callbacks.current.isNativePortrait?.() ? 0.5 : portraitPan })), { reliable: true })?.catch?.(() => {}); } catch { /* No room yet. */ } };
    send(); const timer = setInterval(send, 3000);
    return () => clearInterval(timer);
  }, [portraitPan, isBroadcasting]);
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
      programRef.current?.program?.stop();programRef.current?.input?.stop?.();programRef.current=null;voiceTrack.current?.stop?.();voiceTrack.current=null;
      for(const track of previewTracks.current){track.detach?.();track.stop();}previewTracks.current=[];presentationMixer.current?.stop();presentationMixer.current=null;micInput.current?.stop();micInput.current=null;presentation.current?.cleanup();presentation.current=null;pendingDisplay.current?.cleanup();pendingDisplay.current=null;separateAudio.current?.cleanup?.();separateAudio.current=null;
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
  // Portrait only: the source itself is captured 9:16 (not a crop of a landscape picture).
  const captureVideo=()=>{const long=quality==='1080'?1920:quality==='360'?640:1280,short=quality==='1080'?1080:quality==='360'?360:720,portrait=Boolean(isNativePortrait?.()),width=portrait?short:long,height=portrait?long:short;return {resolution:{width,height,frameRate:30,aspectRatio:width/height},...(selectedVideoDeviceId?{deviceId:{exact:selectedVideoDeviceId}}:{})};};
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
  const preparePreview=async({kind=sourceKind,file=sourceFile,audio=audioMode,audioSourceFile=audioFile}={})=>{
    if(mediaBusy.current||processingLock.current||mirrorLock.current||roomRef.current)return;
    if(onBeforePreview?.()===false)return;
    mediaBusy.current=true;setPreviewBusy(true);const request=++generation.current;
    releasePreview();setStatusMessage('Opening private preview. Nothing is on air yet.');
    const tracks=[],issues=[];
    try{
      const split=audio!=='auto';
      let nativeAudio=null;
      if(kind==='camera'&&split){
        try{tracks.push(...await createLocalTracks({audio:false,video:captureVideo()}));}catch(error){issues.push(describeMediaError(error,'Camera'));}
        if(request!==generation.current){tracks.forEach(track=>track.stop());return;}
      }else if(kind==='camera'){
        for(const kind of ['audio','video']){
          try{tracks.push(...await createLocalTracks({audio:kind==='audio'?captureAudio():false,video:kind==='video'?captureVideo():false}));}
          catch(error){issues.push(describeMediaError(error,kind==='audio'?'Microphone':'Camera'));}
          if(request!==generation.current){tracks.forEach(track=>track.stop());return;}
        }
      }else{
        const capture=captureVideo(),size=capture.resolution;
        // A tab chosen earlier (or still being chosen in the browser's picker) is reused, never asked for twice.
        let held=null;
        if(kind==='display'){if(pendingPromise.current){try{held=await pendingPromise.current;}catch{held=null;}pendingPromise.current=null;}else held=pendingDisplay.current;pendingDisplay.current=null;}
        const source=held||await capturePresentationSource({kind,file,width:size.width,height:size.height,onEnded:()=>{setStatusMessage('Source sharing ended.');if(roomRef.current)void endLive();else closePreview();}});
        if(request!==generation.current){source.cleanup();return;}
        presentation.current=source;
        tracks.push(new LocalVideoTrack(source.stream.getVideoTracks()[0]));
        if(split){nativeAudio=source.stream.getAudioTracks()[0]||null;}
        else{
        const sourceAudio=source.stream.getAudioTracks()[0];
        sourceAudioInput.current=sourceAudio||null;setSourceAudioTrack(sourceAudio||null);
        // A new source always starts untouched; microphone choices never carry over.
        setSourceProcessing(liveAudioProcessing('music'));setSourceProcessingApplied(readLiveAudioProcessing(sourceAudio));setSourceProcessingMessage('');
        const mixer=newMixer();
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
      }
      // Split audio: the sound is chosen on its own, whatever the picture is.
      if(split){
        const mixer=newMixer();
        presentationMixer.current=mixer;await mixer.ready;
        if(request!==generation.current){mixer.stop();tracks.forEach(track=>track.stop());return;}
        let sourceAudio=null;
        try{
          if(audio==='mic'){
            const mic=(await createLocalTracks({audio:captureAudio(),video:false})).find(t=>t.kind==='audio');
            if(request!==generation.current){mic?.stop();mixer.stop();tracks.forEach(track=>track.stop());return;}
            if(!mic)throw new Error('No microphone was found.');
            micInput.current=mic;mixer.connectMicrophone(mic.mediaStreamTrack);
          }else if(audio==='tab'||audio==='file'){
            // The picture's own sound when it is the same thing (a shared tab, a video file); otherwise capture it separately.
            const own=(audio==='tab'&&kind==='display')||(audio==='file'&&kind==='video');
            if(own){sourceAudio=nativeAudio;if(!sourceAudio)throw new Error(audio==='tab'?'The shared tab has no audio. Turn on "Share tab audio".':'This video file has no audio.');}
            else{
              const separate=await captureAudioSource({kind:audio,file:audioSourceFile,onEnded:()=>{setStatusMessage('Audio sharing ended.');if(roomRef.current)void endLive();else closePreview();}});
              if(request!==generation.current){separate.cleanup();mixer.stop();tracks.forEach(track=>track.stop());return;}
              separateAudio.current=separate;sourceAudio=separate.stream.getAudioTracks()[0];
            }
            sourceAudioInput.current=sourceAudio;setSourceAudioTrack(sourceAudio);
            setSourceProcessing(liveAudioProcessing('music'));setSourceProcessingApplied(readLiveAudioProcessing(sourceAudio));setSourceProcessingMessage('');
            mixer.connectSource(sourceAudio);
          }
          tracks.push(new LocalAudioTrack(mixer.track));
        }catch(error){issues.push(error?.name?describeMediaError(error,'Audio'):(error?.message||'Audio is unavailable.'));mixer.stop();presentationMixer.current=null;}
      }
      if(!tracks.length)throw new Error(issues.join(' '));
      // Every input goes through the steady program picture (what is published and recorded); the input can change or be replaced by a hold photo.
      const rawInput=tracks.find(track=>track.kind==='video');
      if(rawInput){
        const {width,height}=captureVideo().resolution,program=createProgramOutput({width,height});
        program.setInput(rawInput.mediaStreamTrack);
        tracks[tracks.indexOf(rawInput)]=new LocalVideoTrack(program.track,undefined,true);
        programRef.current={program,input:rawInput};
        watchInput(rawInput);
      }
      const camera=tracks.find(track=>track.kind==='video');
      if(camera){
        const effect=new CameraMirrorProcessor({mirrored:false,appearance:effectiveLook(cameraAppearance),watermark:true});effect.watermark=watermarkOn.current;
        try{await camera.setProcessor(effect,true);}catch(error){await effect.destroy();throw error;}
        if(request!==generation.current){tracks.forEach(track=>track.stop());return;}
      }
      if(kind==='camera'&&!split){
        micInput.current=tracks.find(track=>track.kind==='audio')||null;
        if(micInput.current){
          const mixer=newMixer();
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
  // After a Studio refresh: no input exists any more, so the live comes back PAUSED on the pause photo (silent) until a new input is chosen and Resume is pressed.
  const preparePausedPreview=async photo=>{
    if(!photo||mediaBusy.current||processingLock.current||mirrorLock.current||roomRef.current)return false;
    mediaBusy.current=true;setPreviewBusy(true);const request=++generation.current;
    releasePreview();
    try{
      const {width,height}=captureVideo().resolution,program=createProgramOutput({width,height});
      program.setHold(photo);
      const video=new LocalVideoTrack(program.track,undefined,true);
      const effect=new CameraMirrorProcessor({mirrored:false,appearance:effectiveLook(cameraAppearance),watermark:true});effect.watermark=watermarkOn.current;
      try{await video.setProcessor(effect,true);}catch(error){await effect.destroy();program.stop();throw error;}
      const mixer=newMixer();presentationMixer.current=mixer;await mixer.ready;
      if(request!==generation.current){mixer.stop();video.stop();program.stop();return false;}
      const audio=new LocalAudioTrack(mixer.track);audio.mediaStreamTrack.enabled=false;
      programRef.current={program,input:null};
      previewTracks.current=[video,audio];setIsPreviewing(true);setMicMuted(false);setCameraOff(false);
      setPaused(true);setPausedPreview(null);
      if(videoRef.current)video.attach(videoRef.current);
      setStatusMessage('The Studio was refreshed. The live is paused on your photo: choose an input, then Resume live.');return true;
    }catch(error){releasePreview();setStatusMessage(error.message||'Could not restore the paused live.');return false;}
    finally{mediaBusy.current=false;setPreviewBusy(false);}
  };
  // While paused the portrait source may be changed: its published track is swapped (or published) without touching the live.
  const setPortraitTrack=async track=>{
    const participant=roomRef.current?.localParticipant;if(!participant||!track)return false;
    try{
      const existing=[...participant.trackPublications.values()].find(publication=>publication.trackName==='portrait-source');
      if(existing?.track)await existing.track.replaceTrack(track,true);
      else await participant.publishTrack(new LocalVideoTrack(track,undefined,true),{name:'portrait-source',source:'unknown'});
      return true;
    }catch(error){setStatusMessage(error?.message||'The portrait source could not be updated for viewers.');return false;}
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
    pendingDisplay.current?.cleanup();pendingDisplay.current=null;pendingPromise.current=null;latestKind.current=kind;
    setSourceKind(kind);setSourceFile(file);sourceChosenRef.current=true;
    // Tab / window: the browser's picker opens right here, inside the click (screen sharing needs that gesture). The chosen
    // tab is held and Open preview just shows it, with no second prompt.
    if(kind==='display'){
      const size=captureVideo().resolution;
      const promise=(async()=>capturePresentationSource({kind:'display',width:size.width,height:size.height,onEnded:()=>{pendingDisplay.current=null;pendingPromise.current=null;setStatusMessage('Source sharing ended.');if(roomRef.current)void endLive();else closePreview();}}))();
      pendingPromise.current=promise;
      promise.then(source=>{if(latestKind.current!=='display'||pendingPromise.current!==promise){source.cleanup();return;}pendingDisplay.current=source;setStatusMessage('Tab or window chosen. Press Open preview.');})
        .catch(error=>{if(pendingPromise.current===promise)pendingPromise.current=null;setStatusMessage(error?.name==='NotAllowedError'?'No tab or window was chosen.':(error?.message||'Could not share the tab or window.'));});
    }
    // Setting an input opens the private preview at once (inside the click, which screen sharing and video playback need).
    // A preview that is already open is replaced by the new input.
    if(kind==='camera'||kind==='display'||file)return preparePreview({kind,file});
  };
  // Setting the audio input reopens the private preview with it (the new mode is passed along: React has not committed it yet).
  const selectAudio=(mode,file=null)=>{
    if(mediaBusy.current||processingLock.current||mirrorLock.current||startBusy.current||roomRef.current)return;
    setAudioModeState(mode);setAudioFile(file);
    return preparePreview({kind:sourceKind,file:sourceFile,audio:mode,audioSourceFile:file});
  };
  // No input, no recording: when the picture source ends (unplugged, sharing stopped) the recording pauses until an input is chosen.
  const watchInput=owner=>{
    const track=owner?.mediaStreamTrack;
    track?.addEventListener?.('ended',()=>{
      if(programRef.current?.input!==owner||!roomRef.current)return;
      inputLostRef.current=true;setInputLost(true);directRecorder.current?.pause?.();
      setStatusMessage('The input stopped. The recording is paused until you choose a new input.');
    },{once:true});
  };
  const pauseSoundRef=useRef(null);
  const stopPauseSound=()=>{const current=pauseSoundRef.current;pauseSoundRef.current=null;if(!current)return;presentationMixer.current?.connectPause?.(null);current.audio.pause();URL.revokeObjectURL(current.url);};
  // A chosen sound loops while paused; the live inputs go quiet and the sound is the only thing viewers hear.
  const startPauseSound=file=>{
    const mixer=presentationMixer.current;if(!file||!mixer?.connectPause)return;
    try{const url=URL.createObjectURL(file),audio=new Audio(url);audio.loop=true;audio.preload='auto';const track=(audio.captureStream?.()||audio.mozCaptureStream?.())?.getAudioTracks()[0];
      if(!track){URL.revokeObjectURL(url);return;}
      void audio.play().then(()=>{mixer.connectPause(track);mixer.setMuted?.(true);for(const published of previewTracks.current)if(published.kind==='audio')published.mediaStreamTrack.enabled=true;}).catch(()=>URL.revokeObjectURL(url));
      pauseSoundRef.current={audio,url};}catch{/* Pause stays silent. */}
  };
  const pauseLive=(photo,{muteAudio=false,sound=null}={})=>{
    const program=programRef.current?.program;if(!program||!roomRef.current||!photo)return false;
    program.setHold(photo);setPaused(true);setPausedPreview(program.inputStream);
    directRecorder.current?.pause?.();
    if(muteAudio){for(const track of previewTracks.current)if(track.kind==='audio')track.mediaStreamTrack.enabled=false;}
    startPauseSound(sound);
    return true;
  };
  // While paused: take a NEW picture input (video only; its sound is not used). Viewers keep seeing the photo until Resume.
  const setPausedInput=async({kind,file=null})=>{
    const holder=programRef.current;if(!holder||!(holder.program.holding||inputLostRef.current)||mediaBusy.current)return false;
    mediaBusy.current=true;setPreviewBusy(true);
    try{
      const {width,height}=captureVideo().resolution;let next,owner;
      if(kind==='camera'){owner=(await createLocalTracks({audio:false,video:captureVideo()})).find(track=>track.kind==='video');if(!owner)throw new Error('No camera was found.');next=owner.mediaStreamTrack;}
      else{const source=await capturePresentationSource({kind,file,width,height,onEnded:()=>setStatusMessage('The new input stopped sharing.')});source.stream.getAudioTracks().forEach(track=>track.stop());next=source.stream.getVideoTracks()[0];owner=new LocalVideoTrack(next);}
      holder.program.setInput(next);
      // The old input is only released now that the program has switched; stopping a track by hand does not end the live.
      holder.input?.stop?.();holder.input=owner;watchInput(owner);
      setSourceKind(kind);setSourceFile(file);setPausedPreview(holder.program.inputStream);
      // A new input ends the "no input" pause, unless Pause live is still holding the photo.
      if(inputLostRef.current){inputLostRef.current=false;setInputLost(false);if(!holder.program.holding)directRecorder.current?.resume?.();}
      return true;
    }catch(error){setStatusMessage(error?.name==='NotAllowedError'?'No tab or window was chosen.':(describeMediaError(error,kind==='camera'?'Camera':'Source')||error?.message));return false;}
    finally{mediaBusy.current=false;setPreviewBusy(false);}
  };
  // While paused: change the AUDIO input (microphone, tab, file, none) in the running mixer, without touching the live or the published track.
  const setPausedAudio=async(mode,file=null)=>{
    const mixer=presentationMixer.current;
    if(!mixer||!paused||mediaBusy.current)return false;
    if(mode==='auto'){setStatusMessage('Choose Microphone, Tab / window, File or None for the audio while paused.');return false;}
    mediaBusy.current=true;setPreviewBusy(true);
    try{
      let nextMic=null,nextSource=null,nextSeparate=null;
      if(mode==='mic'){
        nextMic=(await createLocalTracks({audio:captureAudio(),video:false})).find(track=>track.kind==='audio');
        if(!nextMic)throw new Error('No microphone was found.');
      }else if(mode==='tab'||mode==='file'){
        nextSeparate=await captureAudioSource({kind:mode,file,onEnded:()=>setStatusMessage('Audio sharing ended.')});
        nextSource=nextSeparate.stream.getAudioTracks()[0];
      }
      // The new input is ready: only now is the old one released.
      mixer.disconnectMicrophone();mixer.connectSource(nextSource||null);
      micInput.current?.stop();micInput.current=nextMic;if(nextMic)mixer.connectMicrophone(nextMic.mediaStreamTrack);
      separateAudio.current?.cleanup?.();separateAudio.current=nextSeparate;
      sourceAudioInput.current=nextSource;setSourceAudioTrack(nextSource);
      setMicMediaStreamTrack(nextMic?.mediaStreamTrack||null);
      setAudioModeState(mode);setAudioFile(file);
      return true;
    }catch(error){setStatusMessage(error?.name?describeMediaError(error,'Audio'):(error?.message||'Audio is unavailable.'));return false;}
    finally{mediaBusy.current=false;setPreviewBusy(false);}
  };
  // The portrait source's sound joins the same mixer (also while paused).
  const setInputMuted=on=>presentationMixer.current?.setMuted?.(on);
  const getInputMeterStream=()=>presentationMixer.current?.meterStream||null;
  const getVoiceMeterStream=()=>presentationMixer.current?.voiceMeterStream||null;
  const setPortraitAudio=track=>{presentationMixer.current?.connectPortrait?.(track||null);};
  const resumeLive=()=>{
    const program=programRef.current?.program;if(!program)return;
    if(!programRef.current.input){setStatusMessage('Choose a video input first, then Resume live.');return;}
    program.setHold(null);setPaused(false);setPausedPreview(null);
    if(pauseSoundRef.current){stopPauseSound();presentationMixer.current?.setMuted?.(false);}
    directRecorder.current?.resume?.();
    for(const track of previewTracks.current)if(track.kind==='audio'&&!micMuted)track.mediaStreamTrack.enabled=true;
  };
  const stopVoice=()=>{presentationMixer.current?.disconnectVoice?.();voiceTrack.current?.stop?.();voiceTrack.current=null;setVoiceOn(false);setVoiceStream(null);};
  const voiceDeviceRef=useRef(null);
  const setVoice=async on=>{
    if(!on){stopVoice();return true;}
    const mixer=presentationMixer.current;
    if(!mixer){setStatusMessage('Open the preview first: the voice microphone joins the live sound.');return false;}
    if(voiceTrack.current)return true;
    try{
      // The voice microphone has its own device choice, apart from the audio input above.
      const mic=(await createLocalTracks({audio:{...captureAudio(),...((voiceDeviceRef.current??voiceDeviceId)?{deviceId:{exact:voiceDeviceRef.current??voiceDeviceId}}:{})},video:false})).find(track=>track.kind==='audio');
      if(!mic)throw new Error('No microphone was found.');
      if(presentationMixer.current!==mixer){mic.stop();return false;}
      voiceTrack.current=mic;mixer.connectVoice?.(mic.mediaStreamTrack);mixer.setVoiceLevel?.(voiceLevelRef.current);setVoiceOn(true);setVoiceStream(new MediaStream([mic.mediaStreamTrack]));return true;
    }catch(error){setStatusMessage(describeMediaError(error,'Microphone'));setVoiceOn(false);return false;}
  };
  const selectVoiceDevice=async id=>{
    voiceDeviceRef.current=id;setVoiceDeviceState(id);try{localStorage.setItem('echo-voice-device',id);}catch{/* Session choice still works. */}
    // If the voice microphone is on, it moves to the new device right away.
    if(voiceTrack.current){stopVoice();await setVoice(true);}
  };
  // The master level of the whole audio input (microphone, tab or file sound, portrait sound); the voice microphone is not scaled by it.
  const updateMasterLevel=value=>{const level=audioInputLevel(value);masterRef.current=level;setMasterLevelState(level);try{localStorage.setItem('echo-input-master',String(level));}catch{/* The level still applies. */}presentationMixer.current?.setMasterLevel?.(level);};
  // Auto leveling lowers the audio input by this factor while the voice speaks (1 = untouched).
  const setDuck=(factor,smoothing)=>presentationMixer.current?.setDuck?.(factor,smoothing);
  const updateVoiceLevel=value=>{const level=audioInputLevel(value);voiceLevelRef.current=level;setVoiceLevelState(level);presentationMixer.current?.setVoiceLevel?.(level);};
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
      if(mirrored||effectiveLook(next).strength>0||effectiveLook(next).sideLight||existing?.watermark){
        if(existing instanceof CameraMirrorProcessor)existing.configure({mirrored,appearance:effectiveLook(next)});
        else{processor=new CameraMirrorProcessor({mirrored,appearance:effectiveLook(next),watermark:true});processor.watermark=watermarkOn.current;await track.setProcessor(processor,true);}
      }else if(existing)await track.stopProcessor();
      if(request!==generation.current){await processor?.destroy();return;}
      setCameraMirrored(mirrored);setCameraAppearance(next);
      setStatusMessage(`Camera effects applied to preview and outgoing video. Mirror ${mirrored?'on':'off'} · beauty / lighting ${next.strength?'on':'off'}.`);
    }catch(error){await processor?.destroy();if(request===generation.current)setStatusMessage(error.message||'Could not change camera effects.');}
    finally{mirrorLock.current=false;setMirrorBusy(false);}
  };
  const setLookInOutput=on=>{lookInOutput.current=on;const processor=previewTracks.current.find(track=>track.kind==='video')?.getProcessor?.();if(processor?.configure)try{processor.configure({appearance:effectiveLook(cameraAppearance)});}catch{/* Unsupported filters */}};
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
  // Audio input, chosen apart from the video: auto (what each video brings, as before) | mic | tab | file | none.
  const [audioMode,setAudioModeState]=useState('auto'),[audioFile,setAudioFile]=useState(null);
  // Pause live: a hold photo replaces the input for viewers while the admin changes the input privately.
  const [paused,setPaused]=useState(false),[pausedPreview,setPausedPreview]=useState(null),[inputLost,setInputLost]=useState(false);
  // The voice microphone: an extra input, isolated from the Audio input choice, on its own mixer channel with its own level.
  const [voiceOn,setVoiceOn]=useState(false),[voiceLevel,setVoiceLevelState]=useState(1),[voiceStream,setVoiceStream]=useState(null);
  const [masterLevel,setMasterLevelState]=useState(()=>{try{const saved=Number(localStorage.getItem('echo-input-master'));return Number.isFinite(saved)&&saved>=0&&saved<=2&&localStorage.getItem('echo-input-master')!==null?saved:1;}catch{return 1;}}),[voiceDeviceId,setVoiceDeviceState]=useState(()=>{try{return localStorage.getItem('echo-voice-device')||'';}catch{return '';}});
  const goLive = async (title,existingClaim=null,sourceOverride=sourceKind,holdPhoto=null) => {
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
      // Reconnecting after a refresh: viewers get the pause photo from the first frame, with the sound silenced.
      if(holdPhoto&&programRef.current?.program){programRef.current.program.setHold(holdPhoto);setPaused(true);setPausedPreview(programRef.current.program.inputStream);for(const track of previewTracks.current)if(track.kind==='audio')track.mediaStreamTrack.enabled=false;}

      let hasMicrophone = false;
      let hasCamera = false;
      let microphoneIssue = '';
      let cameraIssue = '';
      let portraitIssue = '';

      try {
        // Audio off for the landscape source still publishes the mix when the portrait source brings sound.
        if(audioMode==='none'&&!previewTracks.current.some(track=>track.kind==='audio'))throw Object.assign(new Error('Audio is off.'),{silent:true});
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
        const processor = pitchCorrectionEnabled&&sourceOverride==='camera'&&['auto','mic'].includes(audioMode) ? new VocalCorrectionProcessor(getVocalSettings(), { onStatus: status => { if (request === generation.current) setVocalStatus(status); }, onPitch: pitch => { if (request === generation.current) setVocalPitch(pitch); }, workletUrl }) : null;
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
        if(!microphoneError?.silent){console.warn('Microphone unavailable:', microphoneError);microphoneIssue = describeMediaError(microphoneError, 'Microphone');}
      }

      if (request !== generation.current) return;
      try {
        // Studio outputs: the landscape track may be the collab picture; the portrait track may be source B (published separately).
        const outputs=callbacks.current.getOutputs?.()||{};
        const localCamera=outputs.landscape?new LocalVideoTrack(outputs.landscape,undefined,true):previewTracks.current.find(track=>track.kind==='video');
        const cameraPublication = localCamera ? await room.localParticipant.publishTrack(localCamera,{source:sourceOverride==='display'?'screen_share':'camera'}) : await room.localParticipant.setCameraEnabled(true,captureVideo());
        // The collab picture is built FROM the preview element: attaching the published collab picture to it would feed the picture back
        // into itself (a hall of mirrors). The preview element keeps showing the input.
        if (!outputs.landscape && cameraPublication?.track && videoRef.current) {
          cameraPublication.track.attach(videoRef.current);
        }
        hasCamera = true;
        if(outputs.portrait){
          // 'unknown' keeps the media service's landscape composite from showing it; the portrait page finds it by name.
          try{await room.localParticipant.publishTrack(new LocalVideoTrack(outputs.portrait,undefined,true),{name:'portrait-source',source:'unknown'});}
          catch(portraitError){console.warn('Portrait source unavailable:',portraitError);portraitIssue='The portrait source could not be published; portrait stays a crop of landscape.';}
        }
      } catch (cameraError) {
        console.warn('Camera unavailable:', cameraError);
        cameraIssue = describeMediaError(cameraError, 'Camera');
      }

      if (request !== generation.current) return;
      if (!hasMicrophone && !hasCamera) {
        throw new Error([cameraIssue, microphoneIssue].filter(Boolean).join(' '));
      }

      refreshDevices();

      if(recording?.mode==='direct'){
        if(!onStartRecording)throw new Error('Direct recording is unavailable in this studio.');
        const tracks=[...room.localParticipant.trackPublications.values()].filter(publication=>publication.trackName!=='portrait-source').map(publication=>publication.track?.mediaStreamTrack).filter(Boolean);
        const recorder=await onStartRecording({id:recording.id,tracks});directRecorder.current=recorder;
        if(holdPhoto)recorder?.pause?.();
        if(request!==generation.current){await recorder.stop(false);return;}
      }
      await callbacks.current.onReady?.(claimedRoom);
      if(request!==generation.current)return;
      setIsBroadcasting(true);setIsPreviewing(false);
      setStatusMessage(
        !hasCamera
          ? `You are live (audio only). ${cameraIssue}`
          : !hasMicrophone
            ? `You are live (video only). ${microphoneIssue}`
            : `You are live. Viewers on the Live page can now watch.${portraitIssue?` ${portraitIssue}`:''}`,
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

    let recordingIssue='',sendParts=null;
    // The recording is closed in the folder first; the live ends at once; the parts go to OVH afterwards.
    try {const result=await finishRecording(true,true);if(typeof result==='function')sendParts=result;}catch(error){recordingIssue=error.message;}
    try {
      const roomName=ownedRoom.current||expectedRoom;ownedRoom.current='';
      const endingRoom=roomRef.current;roomRef.current=null;
      endingRoom?.disconnect();
      roomRef.current = null;
      processorRef.current?.destroy();
      processorRef.current = null;
      resetVocalLiveStatus();
      releasePreview();stopVoice();
      setMicMediaStreamTrack(null);
      setIsBroadcasting(false);
      await onEndLive(roomName);
      setStatusMessage(recordingIssue||'Live stream ended. Check recording status for saved files and any pending uploads.');
    } catch (error) {
      setStatusMessage(error.message || 'Could not end the browser live stream.');
    } finally {
      setIsConnecting(false);
      if(sendParts)void sendParts().catch(error=>setStatusMessage(error.message));
    }
  };

  return {
    videoRef,
    portraitPan,setPortraitPan,
    sourceKind,sourceChosen:sourceChosenRef.current,setSourceKind,sourceFile,setSourceFile,selectSource,audioMode,audioFile,selectAudio,includeMicrophone,setIncludeMicrophone:updateIncludeMicrophone,pauseSource:()=>presentation.current?.pause?.(),playSource:()=>presentation.current?.play?.(),restartSource:()=>presentation.current?.restart?.(),
    cameraMirrored,mirrorBusy,toggleCameraMirror,cameraAppearance,updateCameraAppearance,
    processing,processingApplied,processingMessage,processingBusy,updateAudioProcessing,
    sourceProcessing,sourceProcessingApplied,sourceProcessingMessage,sourceProcessingBusy,sourceProcessingSupported,updateSourceAudioProcessing,
    isPreviewing,previewBusy,preparePreview,preparePausedPreview,setWatermark,setLookInOutput,setPortraitTrack,setPausedAudio,setPortraitAudio,getInputMeterStream,getVoiceMeterStream,setInputMuted,closePreview,micMuted,cameraOff,toggleMicrophone:()=>toggleInput('audio'),toggleCamera:()=>toggleInput('video'),quality,setQuality,pitchCorrectionEnabled,setPitchCorrectionEnabled,
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
    micMediaStreamTrack,inputLost,voiceOn,voiceLevel,voiceStream,voiceDeviceId,masterLevel,updateMasterLevel,setDuck,selectVoiceDevice,setVoice,updateVoiceLevel,paused,pausedPreview,pauseLive,resumeLive,setPausedInput,microphoneLevel,sourceLevel,updateMicrophoneLevel,updateSourceLevel,
  };
}
