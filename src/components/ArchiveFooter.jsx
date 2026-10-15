import { useEffect, useRef, useState } from 'react';
import { ListMusic, LoaderCircle, Pause, Play, SkipBack, SkipForward, Volume2, VolumeX, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import './archiveFooter.css';

const clock = (value) => Number.isFinite(value) ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}` : '0:00';

export default function ArchiveFooter() {
  const audio = useRef(null);
  const [tracks, setTracks] = useState([]);
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState('');
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(() => { try { const v = Number(localStorage.getItem('echo-player-volume') ?? .75); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : .75; } catch { return .75; } });
  const [queue, setQueue] = useState(false);
  const [error, setError] = useState('');
  const current = tracks.find((track) => track.id === selected) || tracks[0];
  const currentUrl = current?.audioUrl || '';

  useEffect(() => {
    let stopped = false;
    let timer;
    const refresh = async () => {
      try {
        const data = await apiRequest('/player/playlist');
        if (!stopped) {
          const items = Array.isArray(data.items) ? data.items : [];
          setTracks(items); setEnabled(Boolean(data.enabled));
          setSelected((id) => items.some((track) => track.id === id) ? id : (items[0]?.id || ''));
          if (!data.enabled || !items.length) setPlaying(false);
        }
      } catch { /* Retain the last validated playlist during a temporary status failure. */ }
      finally { if (!stopped) timer = setTimeout(refresh, 30000); }
    };
    refresh();
    const pauseForLive = () => setPlaying(false);
    window.addEventListener('echo:live-audio', pauseForLive);
    return () => { stopped = true; clearTimeout(timer); window.removeEventListener('echo:live-audio', pauseForLive); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('echo-player-visible', enabled);
    return () => document.documentElement.classList.remove('echo-player-visible');
  }, [enabled]);

  useEffect(() => {
    if (!audio.current) return;
    audio.current.volume = volume;
    try { localStorage.setItem('echo-player-volume', String(volume)); } catch { /* Storage may be disabled. */ }
  }, [volume, enabled]);

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    setError(''); setPosition(0); element.currentTime = 0; setDuration(Number.isFinite(element.duration) ? element.duration : 0);
  }, [current?.id, currentUrl]);

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let cancelled = false;
    if (playing && currentUrl) element.play().catch(() => { if (!cancelled) { setPlaying(false); setError('Unable to play this recording. Try the next track.'); } });
    else element.pause();
    return () => { cancelled = true; };
  }, [playing, current?.id, currentUrl]);

  const step = (direction) => {
    if (!tracks.length) return;
    const index = tracks.findIndex((track) => track.id === current?.id);
    const next = tracks[(index + direction + tracks.length) % tracks.length];
    setError('');
    if (next.id === current?.id && audio.current) { audio.current.currentTime = 0; if (playing) audio.current.play().catch(() => setPlaying(false)); }
    else setSelected(next.id);
  };

  useEffect(() => {
    const close = (event) => { if (event.key === 'Escape') setQueue(false); };
    window.addEventListener('keydown', close); return () => window.removeEventListener('keydown', close);
  }, []);

  if (!enabled) return null;
  return <aside className="echo-archive-player" aria-label="Echo archive music player">
    <audio ref={audio} src={currentUrl || undefined} preload="metadata"
      onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); setBuffering(false); }}
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)} onCanPlay={() => setBuffering(false)}
      onEnded={() => step(1)} onError={() => { if (currentUrl) { setError('Track unavailable. Choose another recording.'); setPlaying(false); setBuffering(false); } }} />
    <div className="echo-player-mobile-progress" style={{ '--progress': `${duration ? position / duration * 100 : 0}%` }} />
    <div className="echo-player-track">
      <img src={current?.coverImage || '/echo/jade-portrait-transparent.webp'} alt="" onError={(event) => { event.currentTarget.hidden = true; }} />
      <div><strong>{current?.title || 'Echo Archive'}</strong><span role={error ? 'status' : undefined}>{error || current?.artist || 'The next playlist is coming.'}</span></div>
    </div>
    <div className="echo-player-transport">
      <button type="button" aria-label="Previous track" disabled={!current} onClick={() => step(-1)}><SkipBack size={17} /></button>
      <button type="button" className="echo-player-play" aria-label={playing ? 'Pause music' : 'Play music'} disabled={!current} onClick={() => { setError(''); setPlaying((value) => !value); }}>
        {buffering && playing ? <LoaderCircle size={18} className="echo-player-spinner" /> : playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
      </button>
      <button type="button" aria-label="Next track" disabled={!current} onClick={() => step(1)}><SkipForward size={17} /></button>
    </div>
    <div className="echo-player-seek"><time>{clock(position)}</time><input aria-label="Seek music" type="range" min="0" max={Number.isFinite(duration) && duration > 0 ? duration : 1} step=".1" value={Math.min(position, duration || 1)} disabled={!duration} onChange={(event) => { const value = Number(event.target.value); if (audio.current) audio.current.currentTime = value; setPosition(value); }} /><time>{clock(duration)}</time></div>
    <div className="echo-player-volume"><button type="button" aria-label={volume ? 'Mute archive music' : 'Unmute archive music'} onClick={() => setVolume(volume ? 0 : .75)}>{volume ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><input aria-label="Music volume" type="range" min="0" max="1" step=".01" value={volume} onChange={(event) => setVolume(Number(event.target.value))} /></div>
    <button type="button" className={queue ? 'is-active' : ''} aria-label="Show player playlist" aria-expanded={queue} aria-controls="echo-player-queue" onClick={() => setQueue((value) => !value)}><ListMusic size={20} /></button>
    {queue && <section id="echo-player-queue" className="echo-player-queue" aria-label="Player playlist">
      <div className="echo-player-queue-heading"><strong>THE ECHO PLAYLIST</strong><button type="button" aria-label="Close playlist" onClick={() => setQueue(false)}><X size={18} /></button></div>
      {!tracks.length && <p>The admin hasn’t selected any archive recordings yet.</p>}
      <ol>{tracks.map((track, index) => <li key={track.id}><button type="button" aria-current={current?.id === track.id ? 'true' : undefined} onClick={() => { setSelected(track.id); setPlaying(true); setQueue(false); }}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{track.title}</strong><small>{track.artist}</small></div>{current?.id === track.id && <ListMusic size={16} />}</button></li>)}</ol>
    </section>}
  </aside>;
}
