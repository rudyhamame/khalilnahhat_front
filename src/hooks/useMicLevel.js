import { useEffect, useState } from 'react';

export function useMicLevel({ deviceId, track, enabled }) {
  const [level, setLevel] = useState(0);
  const [error, setError] = useState('');
  const [deviceLabel, setDeviceLabel] = useState('');

  useEffect(() => {
    if (!enabled || !navigator.mediaDevices?.getUserMedia) {
      setLevel(0);
      return undefined;
    }

    let isCancelled = false;
    let audioContext;
    let analyser;
    let source;
    let rafId;
    let ownedStream;
    let activeTrack;

    const handleMute = () => {
      if (!isCancelled) {
        setError('Your microphone is muted at the OS or hardware level (no audio is reaching the browser).');
      }
    };
    const handleUnmute = () => {
      if (!isCancelled) {
        setError('');
      }
    };

    async function start() {
      try {
        let mediaStreamTrack = track;

        if (!mediaStreamTrack) {
          ownedStream = await navigator.mediaDevices.getUserMedia({
            audio: deviceId ? { deviceId: { exact: deviceId } } : true,
          });
          mediaStreamTrack = ownedStream.getAudioTracks()[0];
        }

        if (isCancelled || !mediaStreamTrack) {
          return;
        }

        activeTrack = mediaStreamTrack;
        setDeviceLabel(mediaStreamTrack.label || '');
        mediaStreamTrack.addEventListener('mute', handleMute);
        mediaStreamTrack.addEventListener('unmute', handleUnmute);

        if (mediaStreamTrack.muted) {
          handleMute();
        }

        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioContext = new AudioContextClass();

        if (audioContext.state === 'suspended') {
          await audioContext.resume().catch(() => {});
        }

        if (isCancelled) {
          return;
        }

        if (audioContext.state !== 'running') {
          setError('Audio is paused by the browser. Click anywhere on the page, then reselect the microphone.');
          return;
        }

        source = audioContext.createMediaStreamSource(new MediaStream([mediaStreamTrack]));
        analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);

        const data = new Uint8Array(analyser.frequencyBinCount);

        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sumSquares = 0;
          for (let i = 0; i < data.length; i += 1) {
            const normalized = (data[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / data.length);
          setLevel(Math.min(1, rms * 4));
          rafId = requestAnimationFrame(tick);
        };

        tick();

        if (!mediaStreamTrack.muted) {
          setError('');
        }
      } catch (mediaError) {
        if (!isCancelled) {
          setError(mediaError.message || 'Could not access the microphone.');
        }
      }
    }

    start();

    return () => {
      isCancelled = true;
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
      source?.disconnect();
      audioContext?.close();
      activeTrack?.removeEventListener('mute', handleMute);
      activeTrack?.removeEventListener('unmute', handleUnmute);
      ownedStream?.getTracks().forEach((mediaTrack) => mediaTrack.stop());
    };
  }, [deviceId, track, enabled]);

  return { level, error, deviceLabel };
}
