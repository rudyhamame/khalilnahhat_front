import PartyLighting from './PartyLighting';
import VinylDeck from './VinylDeck';
import MixerChannels from './MixerChannels';
import EqualizerKnob from './EqualizerKnob';
import { EQUALIZER_BANDS, flatEqualizer } from '../lib/audioEqualizer';
import usePartyLighting from '../hooks/usePartyLighting';
import useStemPlayer from '../hooks/useStemPlayer';
import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, RotateCcw, ListMusic, SkipBack, SkipForward, X } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { preparePerformer } from '../lib/songPerformance';
import './archiveFooter.css';

const clock = (value) => Number.isFinite(value) ? `${Math.floor(value / 60)}:${String(Math.floor(value % 60)).padStart(2, '0')}` : '0:00';

export default function ArchiveFooter() {
  const [adminRoute, setAdminRoute] = useState(() => /^\/admin(?:\/|$)/.test(window.location.pathname));
  useEffect(() => {
    const sync = () => setAdminRoute(/^\/admin(?:\/|$)/.test(window.location.pathname));
    window.addEventListener('popstate', sync);
    window.addEventListener('echo:navigation', sync);
    return () => { window.removeEventListener('popstate', sync); window.removeEventListener('echo:navigation', sync); };
  }, []);
  return adminRoute ? null : <ArchiveMusicPlayer />;
}

function ArchiveMusicPlayer() {
  const audio = useRef(null);
  const sidebar = useRef(null);
  const [equalizer, setEqualizer] = useState(flatEqualizer);
  const [tracks, setTracks] = useState([]);
  const archiveQueue = useRef(null);
  const archiveRequest = useRef(0);
  const archiveHandler = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [selected, setSelected] = useState('');
  const [playing, setPlaying] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const preparation = useRef(null);
  const cancelPreparation = () => { preparation.current?.abort(); preparation.current = null; setPreparing(false); };
  const beginPlayback = async () => {
    unlock();
    cancelPreparation();
    setError('');
    const controller = new AbortController();
    preparation.current = controller;
    setPreparing(true);
    const ready = await preparePerformer({ signal: controller.signal });
    if (preparation.current !== controller) return;
    preparation.current = null;
    setPreparing(false);
    if (!ready) { setError('Headphones animation is loading. Please press play again.'); return; }
    setPlaying(true);
  };
  useEffect(() => () => preparation.current?.abort(), []);
  const [buffering, setBuffering] = useState(false);
  const [duration, setDuration] = useState(0);
  const [position, setPosition] = useState(0);
  const [volume, setVolume] = useState(() => { try { const v = Number(localStorage.getItem('echo-player-volume') ?? .75); return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : .75; } catch { return .75; } });
  const [queue, setQueue] = useState(false);
  const [minimized, setMinimized] = useState(() => { try { return localStorage.getItem('echo-player-minimized') === 'true'; } catch { return false; } });
  useEffect(() => {
    const browseArchive = () => {
      if (/^\/(music-archive|mixes|login)(\/|$)/.test(window.location.pathname) && matchMedia('(max-width:899px)').matches) setMinimized(true);
    };
    browseArchive();
    window.addEventListener('echo:navigation', browseArchive);
    return () => window.removeEventListener('echo:navigation', browseArchive);
  }, []);
  const openPlayerButton = useRef(null);
  const minimizePlayerButton = useRef(null);
  const didTogglePlayer = useRef(false);
  const toggleMinimized = (value) => {
    didTogglePlayer.current = true;
    if (value) setQueue(false);
    setMinimized(value);
    try { localStorage.setItem('echo-player-minimized', String(value)); } catch { /* Optional preference. */ }
  };
  useEffect(() => {
    if (didTogglePlayer.current) (minimized ? openPlayerButton : minimizePlayerButton).current?.focus();
  }, [minimized]);
  const queueButton = useRef(null);
  const queueClose = useRef(null);
  const queueWasOpen = useRef(false);
  const [error, setError] = useState('');
  const current = tracks.find((track) => track.id === selected) || tracks[0];
  const currentUrl = current?.audioUrl || '';
  const { lighting, unlock, meter, player, setEqualizerBand, channelMeter, audioGraph } = usePartyLighting(audio, enabled);
  const stems = useStemPlayer({audio,track:current,audioGraph,unlock,master:volume});
  const changeEqualizer = (band, value) => {
    setEqualizer(current => ({ ...current, [band]: value }));
    setEqualizerBand(band, value);
  };

  archiveHandler.current = async event => {
    unlock();
    const request = ++archiveRequest.current;
    const ids = event.detail?.ids;
    if (!Array.isArray(ids) || !ids.includes(event.detail.id)) return;
    archiveQueue.current = ids;
    try {
      const catalog = await apiRequest('/music-archive');
      if (request !== archiveRequest.current) return;
      const byId = new Map(catalog.songs.filter(song => song.audioUrl).map(song => [song.id, song]));
      const items = ids.map(id => byId.get(id)).filter(Boolean);
      if (!items.some(song => song.id === event.detail.id)) throw new Error('This recording is no longer published.');
      setPlaying(false); setTracks(items); setSelected(event.detail.id); setEnabled(true); toggleMinimized(matchMedia('(max-width:899px)').matches);
      beginPlayback();
    } catch (error) { setError(error.message || 'Could not open this album.'); }
  };
  useEffect(() => {
    const play = event => { archiveHandler.current?.(event); };
    window.addEventListener('echo:archive-play', play);
    return () => { window.removeEventListener('echo:archive-play', play); };
  }, []);

  useEffect(() => {
    let stopped = false;
    let timer;
    const refresh = async () => {
      try {
        const queueIds = archiveQueue.current;
        const data = await apiRequest(queueIds ? '/music-archive' : '/player/playlist');
        if (!stopped) {
          if (archiveQueue.current !== queueIds) return;
          const byId = queueIds ? new Map((data.songs || []).filter(song => song.audioUrl).map(song => [song.id, song])) : null;
          const items = queueIds ? queueIds.map(id => byId.get(id)).filter(Boolean) : Array.isArray(data.items) ? data.items : [];
          const active = queueIds ? items.length > 0 : Boolean(data.enabled);
          setTracks(items); setEnabled(active);
          setSelected((id) => items.some((track) => track.id === id) ? id : (items[0]?.id || ''));
          if (!active || !items.length) setPlaying(false);
        }
      } catch { /* Retain the last validated playlist during a temporary status failure. */ }
      finally { if (!stopped) timer = setTimeout(refresh, 30000); }
    };
    refresh();
    const pauseForLive = () => { preparation.current?.abort(); preparation.current = null; setPreparing(false); setPlaying(false); };
    window.addEventListener('echo:live-audio', pauseForLive);
    return () => { stopped = true; clearTimeout(timer); window.removeEventListener('echo:live-audio', pauseForLive); };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('echo-player-visible', enabled && !minimized);
    return () => document.documentElement.classList.remove('echo-player-visible');
  }, [enabled, minimized]);

  useEffect(() => {
    if (!audio.current) return;
    audio.current.volume = volume;
    try { localStorage.setItem('echo-player-volume', String(volume)); } catch { /* Storage may be disabled. */ }
  }, [volume, enabled]);

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    setError(''); setPosition(0); element.currentTime = 0; setDuration(Number.isFinite(element.duration) ? element.duration : 0);
  }, [current?.id, currentUrl, enabled]);

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let cancelled = false;
    if (playing && currentUrl && enabled) element.play().catch(() => { if (!cancelled) { setPlaying(false); setError('Unable to play this recording. Try the next track.'); } });
    else element.pause();
    return () => { cancelled = true; element.pause(); };
  }, [playing, current?.id, currentUrl, enabled]);

  const step = (direction) => {
    if (!tracks.length) return;
    const index = tracks.findIndex((track) => track.id === current?.id);
    const next = tracks[(index + direction + tracks.length) % tracks.length];
    cancelPreparation();
    setError('');
    if (next.id === current?.id && audio.current) { audio.current.currentTime = 0; if (playing) audio.current.play().catch(() => setPlaying(false)); }
    else setSelected(next.id);
  };

  useEffect(() => {
    const open = enabled && queue;
    const page = document.getElementById('echo-page-surface');
    const footer = sidebar.current;
    const compact = matchMedia('(max-width: 1199px)');
    const sync = () => {
      const hiddenPage = open && compact.matches;
      if (page) page.inert = hiddenPage;
      if (footer) footer.inert = hiddenPage;
    };
    document.documentElement.classList.toggle('echo-queue-open', open);
    sync();
    if (open) queueClose.current?.focus();
    else if (queueWasOpen.current) queueButton.current?.focus();
    queueWasOpen.current = open;
    const close = (event) => { if (event.key === 'Escape' && open) setQueue(false); };
    window.addEventListener('keydown', close);
    compact.addEventListener('change', sync);
    return () => {
      window.removeEventListener('keydown', close);
      compact.removeEventListener('change', sync);
      document.documentElement.classList.remove('echo-queue-open');
      if (page) page.inert = false;
      if (footer) footer.inert = false;
    };
  }, [queue, enabled, player]);

  return <><PartyLighting lightingRef={lighting} /><aside className="echo-music-sidebar" ref={sidebar} hidden={!enabled || minimized} aria-label="Music sidebar"><div className="echo-music-sidebar-heading"><span>ECHO / MUSIC</span><button type="button" ref={minimizePlayerButton} aria-label="Minimize music player" aria-controls="echo-music-sidebar-content" aria-expanded="true" title="Close music sidebar" onClick={() => toggleMinimized(true)}><ChevronLeft size={18} /></button></div><div id="echo-music-sidebar-content" className="echo-music-sidebar-content"><section className="echo-equalizer-column" aria-labelledby="echo-equalizer-heading"><header><span>TONE</span><h2 id="echo-equalizer-heading">Equalizer</h2><button type="button" className="echo-eq-reset" onClick={() => { for (const band of EQUALIZER_BANDS) changeEqualizer(band.key, 0); }} aria-label="Reset equalizer" title="Reset equalizer"><RotateCcw size={13} aria-hidden="true" /></button></header><div className="echo-eq-knob-stack" role="region" aria-label="Equalizer frequency controls" tabIndex={0}>{EQUALIZER_BANDS.map(band => <EqualizerKnob key={band.key} label={band.label} frequency={band.caption} value={equalizer[band.key]} onChange={value => changeEqualizer(band.key, value)} />)}</div></section><div className="echo-music-main-column"><div className="echo-music-main-scroll"><section id="echo-footer-player" ref={player} className={`echo-archive-player${playing && !buffering ? ' is-playing' : ''}`} style={{ '--progress': `${duration ? Math.min(100, position / duration * 100) : 0}%` }} aria-label="Echo archive music player">
    <audio data-track-id={current?.id} ref={audio} crossOrigin="anonymous" src={currentUrl || undefined} preload="metadata"
      onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); setBuffering(false); }}
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)} onCanPlay={() => setBuffering(false)}
      onEnded={() => step(1)} onError={() => { if (currentUrl) { setError('Track unavailable. Choose another recording.'); setPlaying(false); setBuffering(false); } }} />
    <div className="echo-player-track">
      <div className="echo-player-identity">
        <div className="echo-player-edition"><b>ECHO</b><span>AFTERHOURS</span><i /></div>
        <strong title={current?.title}>{current?.title?.replace(/^Wafeek Habib\s*[-–—]\s*/i, '') || 'The Echo archive'}</strong>
        <span className={error ? 'echo-player-error' : ''} role={error ? 'status' : undefined}>{error || current?.artist || 'Your next soundtrack is on its way.'}</span>
      </div>
    </div>
    <VinylDeck integrated track={current} playing={playing && !buffering} preparing={preparing} position={position} duration={duration} onToggle={() => { if (preparing) cancelPreparation(); else if (playing) setPlaying(false); else beginPlayback(); }} onSeek={value => { if (audio.current && Number.isFinite(duration) && duration > 0) { const target = Math.max(0, Math.min(duration, value)); audio.current.currentTime = target; setPosition(target); } }} />
    <div className="echo-player-seek">
      <div className="echo-player-signal-heading" aria-hidden="true"><span className="echo-player-state"><i />{preparing ? 'HEADPHONES ON…' : playing ? (buffering ? 'CONNECTING' : 'ON AIR') : 'READY WHEN YOU ARE'}</span><span className="echo-player-track-counter">{current ? String(tracks.indexOf(current) + 1).padStart(2, '0') : '00'}<i>/</i>{String(tracks.length).padStart(2, '0')}</span></div>
      <div className="echo-player-signal">
        <div className="echo-player-spectrum" ref={meter} aria-hidden="true">{Array.from({ length: 40 }, (_, index) => <i key={index} />)}</div>
        <div className="echo-player-rail" aria-hidden="true"><span /></div>
        <input aria-label="Seek music" type="range" min="0" max={Number.isFinite(duration) && duration > 0 ? duration : 1} step=".1" value={Math.min(position, duration || 1)} disabled={!duration} onChange={(event) => { const value = Number(event.target.value); if (audio.current) audio.current.currentTime = value; setPosition(value); }} />
      </div>
      <div className="echo-player-time"><time>{clock(position)}</time><span aria-hidden="true">THE NIGHT HAS A SOUNDTRACK</span><time>{clock(duration)}</time></div>
    </div>
    <div className="echo-player-tools">
      <button type="button" className="echo-player-skip" aria-label="Previous track" disabled={!current} onClick={() => step(-1)}><SkipBack size={17} fill="currentColor" /></button>
      <button type="button" className="echo-player-skip" aria-label="Next track" disabled={!current} onClick={() => step(1)}><SkipForward size={17} fill="currentColor" /></button>
      <button type="button" ref={queueButton} className={`echo-player-queue-toggle${queue ? ' is-active' : ''}`} aria-label="Show player playlist" aria-expanded={queue} aria-controls="echo-player-queue" onClick={() => setQueue((value) => !value)}><ListMusic size={19} /><span>QUEUE<b>{String(tracks.length).padStart(2, '0')}</b></span></button>

    </div>
  </section>

    </div>

    <MixerChannels master={volume} onMasterChange={setVolume} masterMeter={channelMeter} minimized={minimized} stems={stems} />
    </div></div></aside>

    {enabled && minimized && <button type="button" ref={openPlayerButton} className={`echo-player-reopen${playing ? ' is-playing' : ''}`} aria-label="Open music player" aria-controls="echo-music-sidebar-content" aria-expanded="false" onClick={() => toggleMinimized(false)}><span className="echo-reopen-record" aria-hidden="true"><span className="echo-reopen-label">ECHO<small>33⅓</small></span><i className="echo-reopen-spindle"/></span></button>}
    {queue && <aside id="echo-player-queue" className="echo-player-queue" aria-label="Player playlist">
      <div className="echo-player-queue-heading"><div><span>ECHO / SELECTED SOUNDS</span><strong>Your afterhours queue</strong></div><button type="button" ref={queueClose} aria-label="Close playlist" onClick={() => setQueue(false)}><X size={18} /></button></div>
      {!tracks.length && <p>The admin hasn’t selected any archive recordings yet.</p>}
      <ol>{tracks.map((track, index) => <li key={track.id}><button type="button" aria-current={current?.id === track.id ? 'true' : undefined} onClick={() => { setPlaying(false); setSelected(track.id); beginPlayback(); setQueue(false); }}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{track.title}</strong><small>{track.artist}</small></div>{current?.id === track.id && <ListMusic size={16} />}</button></li>)}</ol>
      <div className="echo-player-queue-footer"><span>{tracks.length} {tracks.length === 1 ? 'recording' : 'recordings'} in your queue</span><span><kbd>ESC</kbd> to close</span></div>
    </aside>}
  </>;
}
