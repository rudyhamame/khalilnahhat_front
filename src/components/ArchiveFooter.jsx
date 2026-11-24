import {retainArchiveSource} from '../lib/archivePlaybackSource';
import useAutoEqualizer from '../hooks/useAutoEqualizer';
import {isMixerAvailable,MIXER_PHONE_MEDIA} from '../lib/mixerAvailability';
import useMicChannel from '../hooks/useMicChannel';
import { EQUALIZER_BANDS, flatEqualizer, equalizerGain } from '../lib/audioEqualizer';
import usePartyLighting from '../hooks/usePartyLighting';
import useStemPlayer from '../hooks/useStemPlayer';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../lib/api';
import {fetchArchivePlaybackCatalog} from '../lib/musicArchiveCatalog';
import {ARCHIVE_PLAYER_COMMAND,publishArchivePlayerState,ARCHIVE_MIXER_STATE,readArchiveMixerState,publishArchiveMixerState} from '../lib/archivePlayerBridge';
import { preparePerformer } from '../lib/songPerformance';
import {mediaScratch} from '../lib/mediaScratch';
import './archiveFooter.css';

const DdjController = lazy(() => import('./DdjController'));

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
  const [mixerOpen,setMixerOpen]=useState(()=>isMixerAvailable()&&readArchiveMixerState());
  useEffect(()=>{
    const media=window.matchMedia(MIXER_PHONE_MEDIA);
    const sync=()=>{const open=readArchiveMixerState();if(!isMixerAvailable()&&open){publishArchiveMixerState(false);return;}setMixerOpen(open);};
    media.addEventListener('change',sync);
    const close=()=>publishArchiveMixerState(false),key=event=>{if(event.key==='Escape'&&readArchiveMixerState())close();};
    sync();window.addEventListener(ARCHIVE_MIXER_STATE,sync);window.addEventListener('echo:close-mixer',close);window.addEventListener('keydown',key);
    return()=>{media.removeEventListener('change',sync);window.removeEventListener(ARCHIVE_MIXER_STATE,sync);window.removeEventListener('echo:close-mixer',close);window.removeEventListener('keydown',key);};
  },[]);
  const audio = useRef(null);
  const scratch = useRef({active:false,was:false,timer:0});
  // Song-to-song transition (like Anghami): the old song fades out, the next one fades in.
  const fade = useRef({raf:0,pendingIn:false,hasPlayed:false});
  const ramp = (to, ms, done) => {
    const element = audio.current;
    cancelAnimationFrame(fade.current.raf);
    if (!element) { done?.(); return; }
    const from = element.volume, start = performance.now();
    const tick = now => {
      const t = Math.min(1, (now - start) / ms), eased = t * t * (3 - 2 * t);
      element.volume = Math.max(0, Math.min(1, from + (to - from) * eased));
      if (t < 1) fade.current.raf = requestAnimationFrame(tick); else done?.();
    };
    fade.current.raf = requestAnimationFrame(tick);
  };
  const [equalizer, setEqualizer] = useState(flatEqualizer);
  const [autoEqualizer,setAutoEqualizer]=useState(false),[autoEqStatus,setAutoEqStatus]=useState('Auto EQ off');
  const manualEqualizer=useRef(flatEqualizer());
  const stopAutoEqualizer=useRef(null);
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
  const [error, setError] = useState('');
  const [playbackRate, setPlaybackRate] = useState(1);
  const current = tracks.find((track) => track.id === selected) || tracks[0];
  const loadedSource=useRef(null);
  loadedSource.current=retainArchiveSource(loadedSource.current,current);
  const currentUrl=loadedSource.current.url;
  const autoDjOwnsTransport=useRef(false);
  const { unlock, setEqualizerBand, channelMeter, audioGraph, rememberEqualizer } = usePartyLighting(audio, enabled, mixerOpen);
  const stems = useStemPlayer({audio,track:current?{...current,audioUrl:currentUrl}:current,audioGraph,unlock,master:volume,active:enabled&&mixerOpen});
  const mic = useMicChannel({ master: volume, minimized: false, masterMeter: channelMeter });
  useAutoEqualizer({active:autoEqualizer&&enabled&&mixerOpen,audioGraph,base:manualEqualizer.current,onChange:values=>{rememberEqualizer(values);setEqualizer(values);},onStatus:message=>{setAutoEqStatus(message);if(message.startsWith('Auto EQ unavailable'))setAutoEqualizer(false);},stopRef:stopAutoEqualizer});
  const changeEqualizer = (band, value) => {
    // Manual changes restore the manual curve before applying the user's movement.
    stopAutoEqualizer.current?.();setAutoEqualizer(false);setAutoEqStatus('Auto EQ off · manual control');
    manualEqualizer.current={...manualEqualizer.current,[band]:value};
    setEqualizer({...manualEqualizer.current});
    setEqualizerBand(band, value);
  };

  archiveHandler.current = async event => {
    unlock();
    const request = ++archiveRequest.current;
    const ids = event.detail?.ids;
    const autoplay = event.detail?.autoplay !== false;
    if (!Array.isArray(ids) || !ids.includes(event.detail.id)) return;
    archiveQueue.current = ids;
    try {
      const catalog = await fetchArchivePlaybackCatalog();
      if (request !== archiveRequest.current) return;
      const byId = new Map(catalog.songs.filter(song => song.audioUrl).map(song => [song.id, song]));
      const items = ids.map(id => byId.get(id)).filter(Boolean);
      if (!items.some(song => song.id === event.detail.id)) throw new Error('This recording is no longer published.');
      const open = () => {
        const same=event.detail.id===currentIdRef.current;
        setTracks(items);setSelected(event.detail.id);setEnabled(true);
        // Reopening the current recording updates its queue, not its transport.
        if(same){if(autoplay&&!playingRef.current)beginPlayback();return;}
        setPlaying(false);if(autoplay)beginPlayback();
      };
      if (event.detail.id !== currentIdRef.current) fadeOutThen(open); else open();
    } catch (error) { setError(error.message || 'Could not open this recording.'); }
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
        const data = queueIds ? await fetchArchivePlaybackCatalog({refresh:true}) : await apiRequest('/player/playlist');
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
    // The audio engine remains mounted, but no sidebar rail is reserved.
    document.documentElement.classList.remove('echo-player-visible','echo-queue-open');
  }, []);

  const volumeRef = useRef(volume);
  volumeRef.current = volume;
  const playingRef = useRef(false);
  const currentIdRef = useRef('');
  playingRef.current = playing;
  currentIdRef.current = current?.id || '';
  // A different recording than the one that was loaded: the next start fades in.
  const lastTrackId = useRef(null);
  useEffect(() => { if (lastTrackId.current && current?.id && lastTrackId.current !== current.id) fade.current.trackChanged = true; if (current?.id) lastTrackId.current = current.id; }, [current?.id]);
  const fadeOutThen = run => {
    const element = audio.current;
    if (!element || !playingRef.current || element.paused) { run(); return; }
    fade.current.pendingIn = true;
    ramp(0, 450, run);
  };
  useEffect(() => {
    if (!audio.current) return;
    audio.current.volume = volume;
    try { localStorage.setItem('echo-player-volume', String(volume)); } catch { /* Storage may be disabled. */ }
  }, [volume, enabled]);

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    // Match the separated channels: speed also changes pitch, as on a DJ deck.
    element.preservesPitch = false;
    element.defaultPlaybackRate = playbackRate;
    element.playbackRate = playbackRate;
  }, [playbackRate, current?.id, currentUrl, enabled]);

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    setError(''); setPosition(0); element.currentTime = 0; setDuration(Number.isFinite(element.duration) ? element.duration : 0);
  }, [current?.id, currentUrl, enabled]);

  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    let cancelled = false;
    if (playing && currentUrl && enabled) {
      const swap = fade.current.pendingIn || fade.current.hasPlayed && element.currentTime === 0 && fade.current.trackChanged;
      if (swap) element.volume = 0; else { cancelAnimationFrame(fade.current.raf); element.volume = volumeRef.current; }
      element.play().then(() => { fade.current.hasPlayed = true; if (swap) { fade.current.pendingIn = false; fade.current.trackChanged = false; ramp(volumeRef.current, 1100); } }).catch(() => { if (!cancelled) { setPlaying(false); setError('Unable to play this recording. Try the next track.'); } });
    } else { cancelAnimationFrame(fade.current.raf); element.volume = volumeRef.current; element.pause(); }
    return () => { cancelled = true; element.pause(); };
  }, [playing, current?.id, currentUrl, enabled]);

  const step = (direction) => {
    if (!tracks.length) return;
    const index = tracks.findIndex((track) => track.id === current?.id);
    const next = tracks[(index + direction + tracks.length) % tracks.length];
    cancelPreparation();
    setError('');
    if (next.id === current?.id && audio.current) { audio.current.currentTime = 0; if (playing) audio.current.play().catch(() => setPlaying(false)); }
    else fadeOutThen(() => setSelected(next.id));
  };

  const remoteControl=useRef(null);
  remoteControl.current=event=>{
    const {type,value}=event.detail||{};
    if(type==='autodj-transport'){
      autoDjOwnsTransport.current=Boolean(value);
    }else if(type==='volume'){
      const next=Number(value);if(Number.isFinite(next))setVolume(Math.max(0,Math.min(1,next)));
    }else if(type==='rate'){
      const next=Number(value);if(Number.isFinite(next))setPlaybackRate(Math.max(.5,Math.min(1.5,next)));
    }else if(type==='equalizer'){
      if(EQUALIZER_BANDS.some(band=>band.key===value?.band)&&Number.isFinite(value.gain))changeEqualizer(value.band,equalizerGain(value.gain));
    }else if(type==='equalizer-auto'){
      const on=Boolean(value);if(on)unlock();else stopAutoEqualizer.current?.();
      setAutoEqualizer(on);setAutoEqStatus(on?'Auto EQ listening…':'Auto EQ off');
    }else if(type==='equalizer-reset'){
      for(const band of EQUALIZER_BANDS)changeEqualizer(band.key,0);
    }else if(type==='scratch'){
      mediaScratch(audio.current,scratch.current,value,{duration,normalRate:playbackRate,resume:playing,onPosition:setPosition});
    }else if(type==='seek'){
      const next=Number(value);
      if(audio.current&&Number.isFinite(next)&&Number.isFinite(duration)&&duration>0){
        const target=Math.max(0,Math.min(duration,next));audio.current.currentTime=target;setPosition(target);
      }
    }else if(type==='queue'&&Array.isArray(value)&&value.length&&new Set(value).size===value.length&&value.includes(current?.id)){
      const byId=new Map(tracks.map(track=>[track.id,track]));
      if(value.every(id=>byId.has(id))){archiveQueue.current=value;setTracks(value.map(id=>byId.get(id)));}
    }else if(type==='deck-toggle'&&mixerOpen&&current&&enabled){
      cancelPreparation();setError('');unlock();setPlaying(value=>!value);
    }else if(type==='toggle'&&current&&enabled){
      if(preparing)cancelPreparation();else if(playing)setPlaying(false);else beginPlayback({inline:true});
    }else if(type==='stop'){
      ++archiveRequest.current;
      cancelPreparation();
      setPlaying(false);
      setBuffering(false);
      if(audio.current){audio.current.pause();if(audio.current.readyState>0)audio.current.currentTime=0;}
      setPosition(0);
    }else if(type==='eject'){
      // Stop and unload: nothing is "now playing" any more (the app nav gets its normal Music icon back).
      ++archiveRequest.current;
      cancelPreparation();
      setPlaying(false);
      setBuffering(false);
      if(audio.current){audio.current.pause();if(audio.current.readyState>0)audio.current.currentTime=0;}
      setPosition(0);
      archiveQueue.current=[];setTracks([]);setEnabled(false);setSelected('');
    }else if(type==='pause'){cancelPreparation();setPlaying(false);}
  };
  useEffect(()=>{
    const handle=event=>remoteControl.current?.(event);
    window.addEventListener(ARCHIVE_PLAYER_COMMAND,handle);
    return()=>window.removeEventListener(ARCHIVE_PLAYER_COMMAND,handle);
  },[]);
  useEffect(()=>{
    publishArchivePlayerState({track:current||null,tracks,playing,preparing,buffering,position,duration,volume,playbackRate,equalizer,autoEqualizer,autoEqStatus,error,enabled});
  },[current,tracks,playing,preparing,buffering,position,duration,volume,playbackRate,equalizer,autoEqualizer,autoEqStatus,error,enabled]);

  const handleEnded=()=>{if(autoDjOwnsTransport.current)setPlaying(false);else step(1);};

  return <>
    <audio data-track-id={current?.id} ref={audio} crossOrigin="anonymous" src={currentUrl || undefined} preload="metadata"
      onLoadedMetadata={(event) => { event.currentTarget.playbackRate = playbackRate; setDuration(event.currentTarget.duration); setBuffering(false); }}
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)} onCanPlay={() => setBuffering(false)}
      onEnded={handleEnded} onError={() => { if (currentUrl) { setError('Track unavailable. Choose another recording.'); setPlaying(false); setBuffering(false); } }} />
    {mixerOpen&&createPortal(
      <div className="wp-channels" role="dialog" aria-modal="true" aria-label="Mixer"><div className="home-archive-controller">
        <Suspense fallback={<div className="ddj-loading" role="status">Loading mixer…</div>}>
          <DdjController stems={stems} mic={mic} masterMeter={channelMeter} audioGraph={audioGraph} unlock={unlock}/>
        </Suspense>
      </div></div>,
      document.body,
    )}
  </>;
}
