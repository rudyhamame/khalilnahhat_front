import { useEffect, useRef, useState } from 'react';
import { LoaderCircle, Pause, Play, Volume2 } from 'lucide-react';

const clock = value => {
  if (!Number.isFinite(value) || value < 0) return '—:—';
  return `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}`;
};

export default function ProjectChatVoicePlayer({ src, label = 'Voice note', preview = false }) {
  const audioRef = useRef(null), durationProbe = useRef(null), version = useRef(0);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [rate, setRate] = useState(1);
  const [error, setError] = useState('');
  useEffect(() => {
    version.current++;
    setPlaying(false); setLoading(false); setDuration(0); setPosition(0); setRate(1); setError('');
    return () => {
      version.current++;
      durationProbe.current?.close().catch(() => {});
      durationProbe.current = null;
    };
  }, [src]);
  const metadata = () => {
    const value = audioRef.current?.duration;
    if (Number.isFinite(value) && value > 0) setDuration(value);
  };
  // Some browser-recorded WebM notes omit duration metadata. Decode only when
  // the listener presses play, rather than decoding the entire chat history.
  const findDuration = async () => {
    const Audio = window.AudioContext || window.webkitAudioContext;
    if (duration || durationProbe.current || !Audio) return;
    const current = version.current;
    let context;
    try {
      context = new Audio(); durationProbe.current = context;
      const response = await fetch(src);
      const buffer = await context.decodeAudioData(await response.arrayBuffer());
      if (version.current === current && Number.isFinite(buffer.duration)) setDuration(buffer.duration);
    } catch { /* Playback can continue even when duration metadata is unavailable. */ }
    finally {
      if (context && context.state !== 'closed') await context.close().catch(() => {});
      if (durationProbe.current === context) durationProbe.current = null;
    }
  };
  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) { audio.pause(); return; }
    setError(''); setLoading(true);
    const current = version.current;
    try {
      if (audio.ended) audio.currentTime = 0;
      audio.playbackRate = rate;
      await audio.play();
      if (version.current === current && !Number.isFinite(audio.duration)) findDuration();
    } catch {
      if (version.current === current) { setLoading(false); setPlaying(false); setError('Could not play this voice note. Try again.'); }
    }
  };
  const progress = duration ? Math.min(100, position / duration * 100) : 0;
  return <div className={`epc-audio-player${preview ? ' is-preview' : ''}`} role="group" aria-label={label}>
    <audio ref={audioRef} src={src} preload="metadata" onLoadedMetadata={metadata} onDurationChange={metadata}
      onTimeUpdate={() => { setPosition(audioRef.current?.currentTime || 0); metadata(); }}
      onPlaying={() => { setPlaying(true); setLoading(false); }} onWaiting={() => setLoading(true)}
      onPause={() => { setPlaying(false); setLoading(false); }}
      onEnded={() => { setPlaying(false); setLoading(false); const audio = audioRef.current; if (audio && !duration) setDuration(audio.currentTime); }}
      onError={() => { setPlaying(false); setLoading(false); setError('This voice note could not be loaded.'); }}/>
    <button type="button" className="epc-audio-play" onClick={toggle} aria-label={`${playing ? 'Pause' : 'Play'} ${label}`} title={playing ? 'Pause' : 'Play'}>
      {loading ? <LoaderCircle size={19} className="epc-audio-spinner"/> : playing ? <Pause size={18} fill="currentColor"/> : <Play size={18} fill="currentColor"/>}
    </button>
    <div className="epc-audio-body"><div className="epc-audio-caption"><span><Volume2 size={11}/>{preview ? 'Voice note preview' : 'Voice message'}</span><button type="button" className="epc-audio-rate" onClick={() => { const next = rate === 1 ? 1.5 : rate === 1.5 ? 2 : 1; setRate(next); if (audioRef.current) audioRef.current.playbackRate = next; }} aria-label={`Playback speed ${rate} times. Change speed.`} title="Change playback speed">{rate}×</button></div>
      <input className="epc-audio-seek" type="range" min="0" max={duration || 1} step="0.1" value={Math.min(position, duration || 1)} disabled={!duration} aria-label={`Seek ${label}`} aria-valuetext={`${clock(position)} of ${duration ? clock(duration) : 'unknown duration'}`} style={{'--epc-progress': `${progress}%`}} onChange={event => { const value = Number(event.target.value); if (audioRef.current) { audioRef.current.currentTime = value; setPosition(value); } }}/>
      <div className="epc-audio-time"><span>{clock(position)}</span><span>{duration ? clock(duration) : '—:—'}</span></div>
    </div>
    {error && <span className="epc-audio-error" role="alert">{error}</span>}
  </div>;
}
