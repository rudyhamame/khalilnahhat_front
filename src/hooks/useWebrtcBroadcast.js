import { useEffect, useRef, useState } from 'react';
import { Room, VideoPresets, RoomEvent, createLocalTracks } from 'livekit-client';

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

export function useWebrtcBroadcast({ onGoLive, onEndLive, onReady, expectedRoom }) {
  const generation = useRef(0);
  const previewTracks = useRef([]);
  const [isPreviewing,setIsPreviewing]=useState(false);
  const [previewBusy,setPreviewBusy]=useState(false);
  const [micMuted,setMicMuted]=useState(false),[cameraOff,setCameraOff]=useState(false);
  const [quality,setQuality]=useState('720'),[audioMode,setAudioMode]=useState('music');
  const [portrait,setPortrait]=useState(false);
  const mediaBusy=useRef(false),startBusy=useRef(false);
  const releasePreview=()=>{for(const track of previewTracks.current){track.detach?.();track.stop();}previewTracks.current=[];setIsPreviewing(false);setMicMediaStreamTrack(null);};

  const ownedRoom = useRef('');
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
      for(const track of previewTracks.current){track.detach?.();track.stop();}previewTracks.current=[];
      const roomName=ownedRoom.current;ownedRoom.current='';
      release(roomName).catch(()=>{});
      roomRef.current?.disconnect();
      roomRef.current = null;
      processorRef.current?.destroy();
      processorRef.current = null;
      resetVocalLiveStatus();
    },
    [],
  );

  const captureAudio=()=>({channelCount:audioMode==='music'?2:1,echoCancellation:audioMode==='voice',noiseSuppression:audioMode==='voice',autoGainControl:audioMode==='voice',...(selectedAudioDeviceId?{deviceId:{exact:selectedAudioDeviceId}}:{})});
  const captureVideo=()=>{const width=quality==='360'?640:1280,height=quality==='360'?360:720;return {resolution:{width:portrait?height:width,height:portrait?width:height,frameRate:30,aspectRatio:portrait?height/width:width/height},...(selectedVideoDeviceId?{deviceId:{exact:selectedVideoDeviceId}}:{})};};
  const preparePreview=async()=>{
    if(mediaBusy.current||roomRef.current)return;
    mediaBusy.current=true;setPreviewBusy(true);const request=++generation.current;
    releasePreview();setStatusMessage('Opening private preview. Nothing is on air yet.');
    const tracks=[],issues=[];
    try{
      for(const kind of ['audio','video']){
        try{const captured=await createLocalTracks({audio:kind==='audio'?captureAudio():false,video:kind==='video'?captureVideo():false});tracks.push(...captured);}
        catch(error){issues.push(describeMediaError(error,kind==='audio'?'Microphone':'Camera'));}
        if(request!==generation.current){tracks.forEach(track=>track.stop());return;}
      }
      if(!tracks.length)throw new Error(issues.join(' '));
      previewTracks.current=tracks;setIsPreviewing(true);setMicMuted(false);setCameraOff(false);
      setMicMediaStreamTrack(tracks.find(track=>track.kind==='audio')?.mediaStreamTrack||null);
      if(videoRef.current)tracks.find(track=>track.kind==='video')?.attach(videoRef.current);
      await refreshDevices();setStatusMessage('Private preview ready. '+issues.join(' '));
    }catch(error){tracks.forEach(track=>track.stop());setStatusMessage(error.message||'Could not open preview.');}
    finally{mediaBusy.current=false;setPreviewBusy(false);}
  };
  const closePreview=()=>{if(roomRef.current)return;generation.current++;releasePreview();setStatusMessage('Preview closed.');};
  const toggleInput=async(kind)=>{
    if(mediaBusy.current)return;mediaBusy.current=true;
    try{
      const track=previewTracks.current.find(t=>t.kind===kind)||[...roomRef.current?.localParticipant.trackPublications?.values()||[]].find(p=>p.kind===kind)?.track;
      if(!track)return;
      if(track.isMuted)await track.unmute();else await track.mute();
      if(kind==='audio')setMicMuted(track.isMuted);else setCameraOff(track.isMuted);
    }catch{setStatusMessage('Could not change this input. Check device access.');}finally{mediaBusy.current=false;}
  };
  useEffect(()=>{if(isPreviewing)previewTracks.current.find(track=>track.kind==='video')?.attach(videoRef.current);},[isPreviewing]);
  useEffect(()=>{if(!isPreviewing&&!isBroadcasting)return undefined;const warn=event=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn);},[isPreviewing,isBroadcasting]);
  const goLive = async (title) => {
    if (isConnecting || roomRef.current || mediaBusy.current || startBusy.current) return;
    startBusy.current=true;
    const request = ++generation.current;
    setIsConnecting(true);
    setStatusMessage('Requesting camera and microphone access...');

    let claimedRoom='';
    try {
      const { token, url, roomName } = await onGoLive(title);
      claimedRoom=roomName;
      if (request !== generation.current) {await release(roomName);return;}
      ownedRoom.current=roomName;
      const room = new Room({dynacast:true,publishDefaults:{audioPreset:{maxBitrate:128000},forceStereo:audioMode==='music',dtx:false,red:true,videoCodec:'h264',simulcast:true,videoEncoding:VideoPresets.h720.encoding,videoSimulcastLayers:[VideoPresets.h180,VideoPresets.h360],degradationPreference:'maintain-framerate'}});
      roomRef.current = room;
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current !== room) return;
        generation.current++;
        const endedRoom=ownedRoom.current;ownedRoom.current='';
        release(endedRoom).catch(()=>setStatusMessage('Connection lost. Refresh status and end this browser session.'));
        roomRef.current = null;
        processorRef.current?.destroy();
        processorRef.current = null;
        resetVocalLiveStatus();
        releasePreview();
        setMicMediaStreamTrack(null);
        setIsBroadcasting(false);
        setIsConnecting(false);
      });
      await room.connect(url, token);
      if (request !== generation.current) { room.disconnect(); return; }

      let hasMicrophone = false;
      let hasCamera = false;
      let microphoneIssue = '';
      let cameraIssue = '';

      try {
        const processor = audioMode==='voice' ? new VocalCorrectionProcessor(getVocalSettings(), { onStatus: status => { if (request === generation.current) setVocalStatus(status); }, onPitch: pitch => { if (request === generation.current) setVocalPitch(pitch); }, workletUrl }) : null;
        const { publication: microphonePublication, processed } = await publishVocalMicrophone(room.localParticipant, {
          audio: captureAudio(),
          track: previewTracks.current.find(track=>track.kind==='audio'),
          processor,
          isCurrent: () => request === generation.current,
          onFallback: () => { if (request === generation.current) setVocalStatus('Pitch correction is unavailable in this browser. Streaming your natural microphone signal.'); },
        });
        if (processed) { processorRef.current = processor; processor.configure(getVocalSettings()); }
        setMicMediaStreamTrack(microphonePublication?.track?.mediaStreamTrack || null);
        hasMicrophone = true;
      } catch (microphoneError) {
        console.warn('Microphone unavailable:', microphoneError);
        microphoneIssue = describeMediaError(microphoneError, 'Microphone');
      }

      if (request !== generation.current) return;
      try {
        const localCamera=previewTracks.current.find(track=>track.kind==='video');
        const cameraPublication = localCamera ? await room.localParticipant.publishTrack(localCamera,{source:'camera'}) : await room.localParticipant.setCameraEnabled(true,captureVideo());
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
      try {await release(claimedRoom);} catch {setStatusMessage('Start failed. Refresh status and end this browser session.');return;}
      setStatusMessage(error.message || 'Could not start the browser live stream.');
    } finally {
      startBusy.current=false;
      if (request === generation.current) setIsConnecting(false);
    }
  };

  const endLive = async () => {
    generation.current++;
    setIsConnecting(true);
    setStatusMessage('Ending live stream...');

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
      setStatusMessage('Live stream ended.');
    } catch (error) {
      setStatusMessage(error.message || 'Could not end the browser live stream.');
    } finally {
      setIsConnecting(false);
    }
  };

  return {
    videoRef,
    isPreviewing,previewBusy,preparePreview,closePreview,micMuted,cameraOff,toggleMicrophone:()=>toggleInput('audio'),toggleCamera:()=>toggleInput('video'),quality,setQuality,audioMode,setAudioMode,portrait,setPortrait,
    isConnecting,
    isBroadcasting,
    statusMessage,
    goLive,
    endLive,
    audioInputs,
    videoInputs,
    selectedAudioDeviceId,
    setSelectedAudioDeviceId,
    selectedVideoDeviceId,
    setSelectedVideoDeviceId,
    micMediaStreamTrack,
  };
}
