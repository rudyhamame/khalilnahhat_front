import PartyLighting from './PartyLighting';
import MixerChannels from './MixerChannels';
import { EQUALIZER_BANDS, flatEqualizer, equalizerGain } from '../lib/audioEqualizer';
import usePartyLighting from '../hooks/usePartyLighting';
import useStemPlayer from '../hooks/useStemPlayer';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../lib/api';
import {fetchArchivePlaybackCatalog} from '../lib/musicArchiveCatalog';
import {ARCHIVE_PLAYER_COMMAND,publishArchivePlayerState} from '../lib/archivePlayerBridge';
import { preparePerformer } from '../lib/songPerformance';
import './archiveFooter.css';

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
  const [channelsTarget,setChannelsTarget]=useState(null);
  useEffect(()=>{
    const sync=()=>setChannelsTarget(document.getElementById('home-archive-channels'));
    sync();
    const observer=new MutationObserver(sync);
    observer.observe(document.body,{childList:true,subtree:true});
    return()=>observer.disconnect();
  },[]);
  const audio = useRef(null);
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
  const [error, setError] = useState('');
  const current = tracks.find((track) => track.id === selected) || tracks[0];
  const currentUrl = current?.audioUrl || '';
  const { lighting, unlock, setEqualizerBand, channelMeter, audioGraph } = usePartyLighting(audio, enabled);
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
      const catalog = await fetchArchivePlaybackCatalog();
      if (request !== archiveRequest.current) return;
      const byId = new Map(catalog.songs.filter(song => song.audioUrl).map(song => [song.id, song]));
      const items = ids.map(id => byId.get(id)).filter(Boolean);
      if (!items.some(song => song.id === event.detail.id)) throw new Error('This recording is no longer published.');
      setPlaying(false); setTracks(items); setSelected(event.detail.id); setEnabled(true);
      beginPlayback({inline:event.detail.inline===true});
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

  const remoteControl=useRef(null);
  remoteControl.current=event=>{
    const {type,value}=event.detail||{};
    if(type==='volume'){
      const next=Number(value);if(Number.isFinite(next))setVolume(Math.max(0,Math.min(1,next)));
    }else if(type==='equalizer'){
      if(EQUALIZER_BANDS.some(band=>band.key===value?.band)&&Number.isFinite(value.gain))changeEqualizer(value.band,equalizerGain(value.gain));
    }else if(type==='equalizer-reset'){
      for(const band of EQUALIZER_BANDS)changeEqualizer(band.key,0);
    }else if(type==='seek'){
      const next=Number(value);
      if(audio.current&&Number.isFinite(next)&&Number.isFinite(duration)&&duration>0){
        const target=Math.max(0,Math.min(duration,next));audio.current.currentTime=target;setPosition(target);
      }
    }else if(type==='queue'&&Array.isArray(value)&&value.length&&new Set(value).size===value.length&&value.includes(current?.id)){
      const byId=new Map(tracks.map(track=>[track.id,track]));
      if(value.every(id=>byId.has(id))){archiveQueue.current=value;setTracks(value.map(id=>byId.get(id)));}
    }else if(type==='toggle'&&current&&enabled){
      if(preparing)cancelPreparation();else if(playing)setPlaying(false);else beginPlayback({inline:true});
    }else if(type==='stop'){
      ++archiveRequest.current;
      cancelPreparation();
      setPlaying(false);
      setBuffering(false);
      if(audio.current){audio.current.pause();if(audio.current.readyState>0)audio.current.currentTime=0;}
      setPosition(0);
    }else if(type==='pause'){cancelPreparation();setPlaying(false);}
  };
  useEffect(()=>{
    const handle=event=>remoteControl.current?.(event);
    window.addEventListener(ARCHIVE_PLAYER_COMMAND,handle);
    return()=>window.removeEventListener(ARCHIVE_PLAYER_COMMAND,handle);
  },[]);
  useEffect(()=>{
    publishArchivePlayerState({track:current||null,tracks,playing,preparing,buffering,position,duration,volume,equalizer,error,enabled});
  },[current,tracks,playing,preparing,buffering,position,duration,volume,equalizer,error,enabled]);

  return <><PartyLighting lightingRef={lighting} />
    <audio data-track-id={current?.id} ref={audio} crossOrigin="anonymous" src={currentUrl || undefined} preload="metadata"
      onLoadedMetadata={(event) => { setDuration(event.currentTarget.duration); setBuffering(false); }}
      onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
      onWaiting={() => setBuffering(true)} onPlaying={() => setBuffering(false)} onCanPlay={() => setBuffering(false)}
      onEnded={() => step(1)} onError={() => { if (currentUrl) { setError('Track unavailable. Choose another recording.'); setPlaying(false); setBuffering(false); } }} />
    {channelsTarget&&createPortal(<MixerChannels master={volume} onMasterChange={setVolume} masterMeter={channelMeter} minimized={false} stems={stems} inlineMonitor/>,channelsTarget)}
  </>;
}
