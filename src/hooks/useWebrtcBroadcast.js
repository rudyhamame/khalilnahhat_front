import { useEffect, useRef, useState } from 'react';
import { Room, VideoPresets, RoomEvent } from 'livekit-client';

import { publishVocalMicrophone } from '../lib/publishVocalMicrophone';
import workletUrl from '../audio/vocal-worklet.js?worker&url';
import { VocalCorrectionProcessor } from '../lib/VocalCorrectionProcessor';
import { useVocalCorrection, getVocalSettings, setVocalStatus, setVocalPitch, resetVocalLiveStatus } from './useVocalCorrection';

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

export function useWebrtcBroadcast({ onGoLive, onEndLive }) {
  const generation = useRef(0);
  const processorRef = useRef(null);
  const { settings: vocalSettings } = useVocalCorrection();
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
      roomRef.current?.disconnect();
      roomRef.current = null;
      processorRef.current?.destroy();
      processorRef.current = null;
      resetVocalLiveStatus();
    },
    [],
  );

  const goLive = async (title) => {
    if (isConnecting || roomRef.current) return;
    const request = ++generation.current;
    setIsConnecting(true);
    setStatusMessage('Requesting camera and microphone access...');

    try {
      const { token, url } = await onGoLive(title);
      if (request !== generation.current) return;
      const room = new Room();
      roomRef.current = room;
      room.on(RoomEvent.Disconnected, () => {
        if (roomRef.current !== room) return;
        generation.current++;
        roomRef.current = null;
        processorRef.current?.destroy();
        processorRef.current = null;
        resetVocalLiveStatus();
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
        const processor = new VocalCorrectionProcessor(getVocalSettings(), { onStatus: status => { if (request === generation.current) setVocalStatus(status); }, onPitch: pitch => { if (request === generation.current) setVocalPitch(pitch); }, workletUrl });
        const { publication: microphonePublication, processed } = await publishVocalMicrophone(room.localParticipant, {
          audio: { channelCount: 1, echoCancellation: false, noiseSuppression: false, autoGainControl: false,
            ...(selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : {}) },
          processor,
          isCurrent: () => request === generation.current,
          onFallback: () => { if (request === generation.current) setVocalStatus('Pitch correction is unavailable in this browser. Broadcasting your natural microphone signal.'); },
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
        const cameraPublication = await room.localParticipant.setCameraEnabled(true, {
          resolution: VideoPresets.h720.resolution,
          ...(selectedVideoDeviceId ? { deviceId: { exact: selectedVideoDeviceId } } : {}),
        });
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

      setIsBroadcasting(true);
      setStatusMessage(
        !hasCamera
          ? `You are live (audio only). ${cameraIssue}`
          : !hasMicrophone
            ? `You are live (video only). ${microphoneIssue}`
            : 'You are live. Viewers on the Live page can now watch.',
      );
    } catch (error) {
      if (request !== generation.current) return;
      roomRef.current?.disconnect();
      roomRef.current = null;
      processorRef.current?.destroy();
      processorRef.current = null;
      resetVocalLiveStatus();
      setMicMediaStreamTrack(null);
      setStatusMessage(error.message || 'Could not start the browser broadcast.');
    } finally {
      if (request === generation.current) setIsConnecting(false);
    }
  };

  const endLive = async () => {
    generation.current++;
    setIsConnecting(true);
    setStatusMessage('Ending broadcast...');

    try {
      roomRef.current?.disconnect();
      roomRef.current = null;
      processorRef.current?.destroy();
      processorRef.current = null;
      resetVocalLiveStatus();
      setMicMediaStreamTrack(null);
      await onEndLive();
      setIsBroadcasting(false);
      setStatusMessage('Broadcast ended.');
    } catch (error) {
      setStatusMessage(error.message || 'Could not end the browser broadcast.');
    } finally {
      setIsConnecting(false);
    }
  };

  return {
    videoRef,
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
