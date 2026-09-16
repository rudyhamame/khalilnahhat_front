import { useEffect, useRef, useState } from 'react';
import { Room, VideoPresets } from 'livekit-client';

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
      roomRef.current?.disconnect();
    },
    [],
  );

  const goLive = async (title) => {
    setIsConnecting(true);
    setStatusMessage('Requesting camera and microphone access...');

    try {
      const { token, url } = await onGoLive(title);
      const room = new Room();
      roomRef.current = room;
      await room.connect(url, token);

      let hasMicrophone = false;
      let hasCamera = false;
      let microphoneIssue = '';
      let cameraIssue = '';

      try {
        const microphonePublication = await room.localParticipant.setMicrophoneEnabled(
          true,
          selectedAudioDeviceId ? { deviceId: { exact: selectedAudioDeviceId } } : undefined,
        );
        setMicMediaStreamTrack(microphonePublication?.track?.mediaStreamTrack || null);
        hasMicrophone = true;
      } catch (microphoneError) {
        console.warn('Microphone unavailable:', microphoneError);
        microphoneIssue = describeMediaError(microphoneError, 'Microphone');
      }

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
      roomRef.current?.disconnect();
      roomRef.current = null;
      setMicMediaStreamTrack(null);
      setStatusMessage(error.message || 'Could not start the browser broadcast.');
    } finally {
      setIsConnecting(false);
    }
  };

  const endLive = async () => {
    setIsConnecting(true);
    setStatusMessage('Ending broadcast...');

    try {
      roomRef.current?.disconnect();
      roomRef.current = null;
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
