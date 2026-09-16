import { useEffect, useMemo, useRef, useState } from 'react';

function formatTime(totalSeconds) {
  if (!Number.isFinite(totalSeconds)) {
    return '--:--';
  }

  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.floor(totalSeconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function durationToSeconds(durationString) {
  const [minutes, seconds] = durationString.split(':').map(Number);
  return minutes * 60 + seconds;
}

function zeroFrequencyLevels(count = 48) {
  return Array.from({ length: count }, () => 0);
}

function AudioPlayer({
  title,
  audioSrc,
  audioTracks = [],
  fallbackDuration,
  description,
  type,
  variant = 'default',
  onPlaybackStateChange,
  onFrequencyDataChange,
  frequencyBarCount = 48,
}) {
  const audioRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const animationFrameRef = useRef(0);
  const frequencyArrayRef = useRef(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationToSeconds(fallbackDuration));
  const [volume, setVolume] = useState(0.65);
  const [error, setError] = useState('');
  const [currentTrackIndex, setCurrentTrackIndex] = useState(0);
  const [shouldResumePlayback, setShouldResumePlayback] = useState(false);

  const playlist = audioTracks.length
    ? audioTracks
    : audioSrc
      ? [{ id: 'single-track', title, src: audioSrc }]
      : [];
  const activeTrack = playlist[currentTrackIndex] || null;
  const resolvedAudioSrc = activeTrack?.src || audioSrc || '';
  const resolvedTitle = activeTrack?.title || title;
  const hasAudio = Boolean(resolvedAudioSrc);
  const audioStatus = useMemo(() => {
    if (error) {
      return error;
    }

    if (!hasAudio) {
      return 'No audio loaded yet. The interface stays active as a replacement-safe preview.';
    }

    if (!isReady) {
      return 'Loading transmission...';
    }

    return isPlaying ? 'Transmission live' : 'Transmission paused';
  }, [error, hasAudio, isPlaying, isReady]);

  useEffect(() => {
    setCurrentTrackIndex(0);
    setCurrentTime(0);
    setDuration(durationToSeconds(fallbackDuration));
    setIsReady(false);
    setIsPlaying(false);
    setError('');
    setShouldResumePlayback(false);
  }, [audioTracks, audioSrc, fallbackDuration]);

  useEffect(() => {
    if (typeof onFrequencyDataChange === 'function') {
      onFrequencyDataChange(zeroFrequencyLevels(frequencyBarCount));
    }
  }, [frequencyBarCount, onFrequencyDataChange]);

  useEffect(() => {
    const audioElement = audioRef.current;

    if (!audioElement) {
      return undefined;
    }

    audioElement.volume = volume;
    audioElement.muted = isMuted;

    const handleLoadedMetadata = () => {
      setIsReady(true);
      setDuration(audioElement.duration || durationToSeconds(fallbackDuration));

      if (shouldResumePlayback) {
        audioElement
          .play()
          .then(() => {
            setIsPlaying(true);
            setShouldResumePlayback(false);
          })
          .catch(() => {
            setError('Playback was blocked. Try interacting with the page again.');
            setIsPlaying(false);
            setShouldResumePlayback(false);
          });
      }
    };

    const handleTimeUpdate = () => setCurrentTime(audioElement.currentTime);
    const handleEnded = () => {
      if (playlist.length > 1) {
        setCurrentTrackIndex((currentIndex) => (currentIndex + 1) % playlist.length);
        setCurrentTime(0);
        setIsReady(false);
        setShouldResumePlayback(true);
        return;
      }

      setIsPlaying(false);
    };
    const handleError = () => {
      setError('Audio source unavailable. Replace the placeholder URL to enable playback.');
      setIsReady(false);
      setIsPlaying(false);
      setShouldResumePlayback(false);

      if (typeof onFrequencyDataChange === 'function') {
        onFrequencyDataChange(zeroFrequencyLevels(frequencyBarCount));
      }
    };

    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);

    return () => {
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
    };
  }, [fallbackDuration, frequencyBarCount, isMuted, onFrequencyDataChange, playlist.length, shouldResumePlayback, volume]);

  useEffect(() => {
    if (typeof onPlaybackStateChange === 'function') {
      onPlaybackStateChange({
        isReady,
        isPlaying,
        hasAudio,
        error,
      });
    }
  }, [error, hasAudio, isPlaying, isReady, onPlaybackStateChange]);

  useEffect(() => {
    const audioElement = audioRef.current;

    if (!audioElement || typeof onFrequencyDataChange !== 'function') {
      return undefined;
    }

    const resetFrequencies = () => {
      window.cancelAnimationFrame(animationFrameRef.current);
      onFrequencyDataChange(zeroFrequencyLevels(frequencyBarCount));
    };

    const updateFrequencies = () => {
      const analyser = analyserRef.current;
      const frequencyArray = frequencyArrayRef.current;

      if (!analyser || !frequencyArray) {
        return;
      }

      analyser.getByteFrequencyData(frequencyArray);

      const nextLevels = Array.from({ length: frequencyBarCount }, (_, index) => {
        const start = Math.floor((index / frequencyBarCount) * frequencyArray.length);
        const end = Math.max(start + 1, Math.floor(((index + 1) / frequencyBarCount) * frequencyArray.length));
        let total = 0;

        for (let bucketIndex = start; bucketIndex < end; bucketIndex += 1) {
          total += frequencyArray[bucketIndex];
        }

        return total / (end - start) / 255;
      });

      onFrequencyDataChange(nextLevels);
      animationFrameRef.current = window.requestAnimationFrame(updateFrequencies);
    };

    const connectAnalyser = async () => {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;

      if (!AudioContextClass) {
        return;
      }

      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContextClass();
      }

      if (!sourceRef.current) {
        sourceRef.current = audioContextRef.current.createMediaElementSource(audioElement);
      }

      if (!analyserRef.current) {
        analyserRef.current = audioContextRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.smoothingTimeConstant = 0.82;
      }

      if (!frequencyArrayRef.current || frequencyArrayRef.current.length !== analyserRef.current.frequencyBinCount) {
        frequencyArrayRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      }

      sourceRef.current.disconnect();
      analyserRef.current.disconnect();
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioContextRef.current.destination);

      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      window.cancelAnimationFrame(animationFrameRef.current);
      updateFrequencies();
    };

    if (isPlaying && hasAudio) {
      connectAnalyser().catch(() => {
        resetFrequencies();
      });
    } else {
      resetFrequencies();
    }

    return () => {
      window.cancelAnimationFrame(animationFrameRef.current);
    };
  }, [frequencyBarCount, hasAudio, isPlaying, onFrequencyDataChange, resolvedAudioSrc]);

  useEffect(
    () => () => {
      window.cancelAnimationFrame(animationFrameRef.current);
      analyserRef.current?.disconnect();
      sourceRef.current?.disconnect();
      audioContextRef.current?.close().catch(() => {});
    },
    [],
  );

  const togglePlayback = async () => {
    if (!hasAudio || !audioRef.current) {
      setError('Add a real audio file in src/data/siteData.js to enable playback.');
      return;
    }

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    try {
      await audioRef.current.play();
      setError('');
      setIsPlaying(true);
    } catch {
      setError('Playback was blocked. Try interacting with the page again.');
      setIsPlaying(false);
    }
  };

  const handleSeek = (event) => {
    const nextTime = Number(event.target.value);
    setCurrentTime(nextTime);

    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const handleVolume = (event) => {
    const nextVolume = Number(event.target.value);
    setVolume(nextVolume);
    setIsMuted(nextVolume === 0);
  };

  const jumpToTime = (nextTime) => {
    setCurrentTime(nextTime);

    if (audioRef.current) {
      audioRef.current.currentTime = nextTime;
    }
  };

  const selectTrack = (direction) => {
    if (playlist.length <= 1) {
      jumpToTime(direction < 0 ? 0 : duration ? duration - 1 : 0);
      return;
    }

    const nextIndex =
      direction < 0
        ? (currentTrackIndex - 1 + playlist.length) % playlist.length
        : (currentTrackIndex + 1) % playlist.length;

    if (audioRef.current) {
      audioRef.current.pause();
    }

    setCurrentTrackIndex(nextIndex);
    setCurrentTime(0);
    setDuration(durationToSeconds(fallbackDuration));
    setIsReady(false);
    setError('');
    setShouldResumePlayback(isPlaying);
    setIsPlaying(false);
  };

  return (
    <div className={`audio-player audio-player-${variant}`}>
      <audio ref={audioRef} preload="metadata" src={resolvedAudioSrc || undefined} />
      <div className="audio-player-topline">
        <div>
          <p className="detail-label">{variant === 'hero' ? 'CURRENT FREQUENCY' : 'Console'}</p>
          <h3>{resolvedTitle}</h3>
          {type ? <p className="audio-type">{type}</p> : null}
        </div>
        {variant === 'default' ? (
          <p className="audio-status" aria-live="polite">
            {audioStatus}
          </p>
        ) : null}
      </div>

      {variant === 'default' ? <p className="audio-description">{description}</p> : null}

      <div className="audio-controls">
        {variant === 'hero' ? (
          <button type="button" className="icon-button icon-button-muted" onClick={() => selectTrack(-1)}>
            <i className="bx bx-skip-previous" aria-hidden="true" />
            <span className="sr-only">Previous</span>
          </button>
        ) : null}
        <button type="button" className="icon-button" onClick={togglePlayback}>
          <i className={`bx ${isPlaying ? 'bx-pause' : 'bx-play'}`} aria-hidden="true" />
          <span className="sr-only">{isPlaying ? 'Pause' : 'Play'}</span>
        </button>
        {variant === 'hero' ? (
          <button
            type="button"
            className="icon-button icon-button-muted"
            onClick={() => selectTrack(1)}
          >
            <i className="bx bx-skip-next" aria-hidden="true" />
            <span className="sr-only">Next</span>
          </button>
        ) : null}

        <div className="audio-timeline">
          <label className="sr-only" htmlFor="audio-seek">
            Seek audio
          </label>
          <input
            id="audio-seek"
            type="range"
            min="0"
            max={duration || 1}
            value={Math.min(currentTime, duration || 1)}
            onChange={handleSeek}
          />
          <div className="timeline-meta">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        <div className="volume-cluster">
          <button
            type="button"
            className="icon-button icon-button-muted"
            onClick={() => setIsMuted((currentValue) => !currentValue)}
          >
            <i className={`bx ${isMuted ? 'bx-volume-mute' : 'bx-volume-full'}`} aria-hidden="true" />
            <span className="sr-only">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <label className="sr-only" htmlFor="audio-volume">
            Adjust volume
          </label>
          <input
            id="audio-volume"
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={isMuted ? 0 : volume}
            onChange={handleVolume}
          />
        </div>
      </div>

      {variant === 'hero' ? null : null}
    </div>
  );
}

export default AudioPlayer;
