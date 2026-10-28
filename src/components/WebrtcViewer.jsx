import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Volume2, VolumeX } from 'lucide-react';
import { createLiveAudioFocus } from '../lib/liveAudioFocus';
import { fetchWebrtcViewerToken } from '../lib/api';
import {connectEqualizer,EQUALIZER_BANDS,equalizerGain,flatEqualizer} from '../lib/audioEqualizer';

function WebrtcViewer({ lang = 'en', muted = false, volume = 1, equalizer = null, showAudioControls = false, audioControlsTarget = null }) {
  const ar = lang === 'ar';
  const videoRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [needsSoundUnlock, setNeedsSoundUnlock] = useState(false);
  const [previewMuted, setPreviewMuted] = useState(muted);
  const [otherPlayerActive, setOtherPlayerActive] = useState(false);
  const isMuted = (showAudioControls ? previewMuted : muted) || otherPlayerActive;
  const hasEqualizer=Boolean(equalizer);
  const audioFocusRef = useRef(null);
  const ownsAudioFocusRef = useRef(false);
  const mutedRef = useRef(isMuted);
  const equalizerGraph=useRef(null);

  useEffect(()=>{
    if(!hasEqualizer)return undefined;
    const element=videoRef.current,AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!element||!AudioContext)return undefined;
    let context,source;
    try{
      context=new AudioContext({latencyHint:'interactive'});
      source=context.createMediaElementSource(element);
      const graph=connectEqualizer(context,source,flatEqualizer());
      equalizerGraph.current={context,source,...graph};
    }catch{
      source?.disconnect();context?.close().catch(()=>{});return undefined;
    }
    return()=>{
      const graph=equalizerGraph.current;equalizerGraph.current=null;
      graph?.source.disconnect();Object.values(graph?.filters||{}).forEach(filter=>filter.disconnect());
      graph?.context.close().catch(()=>{});
    };
  },[hasEqualizer]);

  useEffect(()=>{
    const graph=equalizerGraph.current;if(!graph||!equalizer)return;
    for(const band of EQUALIZER_BANDS)graph.filters[band.key].gain.setTargetAtTime(equalizerGain(equalizer[band.key]),graph.context.currentTime,.025);
  },[equalizer]);

  useEffect(() => {
    if(videoRef.current)videoRef.current.volume=Math.max(0,Math.min(1,volume));
  },[volume]);

  useEffect(() => {
    mutedRef.current = isMuted;
    if (videoRef.current) videoRef.current.muted = isMuted;
    if(!isMuted)equalizerGraph.current?.context.resume().catch(()=>{});
    if(!isMuted&&videoRef.current?.srcObject?.getAudioTracks().length){
      ownsAudioFocusRef.current=true;
      audioFocusRef.current?.claim();
      window.dispatchEvent(new Event('echo:live-audio'));
      videoRef.current.play()?.catch(()=>setNeedsSoundUnlock(true));
    }
  }, [isMuted]);

  useEffect(() => {
    const focus = createLiveAudioFocus({ onLoseFocus: () => {
      ownsAudioFocusRef.current = false;
      mutedRef.current = true;
      if (videoRef.current) videoRef.current.muted = true;
      setOtherPlayerActive(true);
    } });
    audioFocusRef.current = focus;
    return () => { focus.close(); audioFocusRef.current = null; };
  }, []);

  useEffect(() => {
    let isCancelled = false;
    const room = new Room();

    const element = videoRef.current;
    const attachedTracks = new Set();
    const attachTrack = (track) => {
      if (!element || ![Track.Kind.Video, Track.Kind.Audio].includes(track.kind)) return;
      // Both tracks must share one MediaStream and playback timeline. The SDK merges
      // track kinds on this element; restore our mute choice after either arrives.
      track.attach(element);
      attachedTracks.add(track);
      element.muted = mutedRef.current;
      if (track.kind === Track.Kind.Video && !isCancelled) setStatus('connected');
      element.play()?.then(() => {
        if (!isCancelled && !mutedRef.current && element.srcObject?.getAudioTracks().length && !ownsAudioFocusRef.current) {
          ownsAudioFocusRef.current = true;
          audioFocusRef.current?.claim();
          window.dispatchEvent(new Event('echo:live-audio'));
        }
      }).catch(() => {
        if (!isCancelled && !mutedRef.current) setNeedsSoundUnlock(true);
      });
    };

    room.on(RoomEvent.TrackSubscribed, attachTrack);
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (element) track.detach(element);
      attachedTracks.delete(track);
      if (track.kind === Track.Kind.Video && !isCancelled) setStatus('waiting');
    });
    room.on(RoomEvent.Reconnecting, () => { if (!isCancelled) setStatus('reconnecting'); });
    room.on(RoomEvent.Reconnected, () => {
      if (!isCancelled) setStatus(videoRef.current?.srcObject ? 'connected' : 'waiting');
    });
    room.on(RoomEvent.Disconnected, () => {
      if (!isCancelled) setStatus('ended');
    });

    async function connect() {
      try {
        const { token, url } = await fetchWebrtcViewerToken();
        if (isCancelled) return;

        await room.connect(url, token);
        if (isCancelled) {
          room.disconnect();
          return;
        }

        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            if (publication.track) attachTrack(publication.track);
          });
        });

        setStatus((current) => current === 'connected' ? current : 'waiting');
      } catch {
        if (!isCancelled) setStatus('error');
      }
    }

    connect();

    return () => {
      isCancelled = true;
      attachedTracks.forEach(track => track.detach(element));
      room.disconnect();
    };
  }, []);

  const handleSoundControl = () => {
    const nextMuted = showAudioControls && !isMuted && !needsSoundUnlock;
    setOtherPlayerActive(false);
    if (showAudioControls) setPreviewMuted(nextMuted);
    mutedRef.current = nextMuted;
    if (videoRef.current) videoRef.current.muted = nextMuted;
    if (nextMuted) { setNeedsSoundUnlock(false); return; }
    ownsAudioFocusRef.current = true;
    audioFocusRef.current?.claim();
    window.dispatchEvent(new Event('echo:live-audio'));
    videoRef.current?.play().then(() => setNeedsSoundUnlock(false)).catch(() => setNeedsSoundUnlock(true));
  };
  const soundLabel = showAudioControls
    ? (isMuted ? (ar ? 'تشغيل صوت المعاينة' : 'Unmute preview') : needsSoundUnlock
      ? (ar ? 'تفعيل صوت المعاينة' : 'Enable preview sound') : (ar ? 'كتم صوت المعاينة' : 'Mute preview'))
    : otherPlayerActive ? (ar ? 'تشغيل الصوت هنا' : 'Play sound here') : (ar ? 'اضغط لتفعيل الصوت' : 'Tap to enable sound');

  const soundControl = showAudioControls || otherPlayerActive || (!isMuted && needsSoundUnlock) ? (
        <button type="button" className={audioControlsTarget ? 'admin-live-control admin-preview-sound-control' : 'live-stream-webrtc-unmute'} onClick={handleSoundControl} aria-label={soundLabel}>
          {showAudioControls && !isMuted && !needsSoundUnlock ? <VolumeX size={16} /> : <Volume2 size={16} />}
          {soundLabel}
        </button>
  ) : null;

  return (
    <div className="live-stream-webrtc-shell">
      <video ref={videoRef} className="live-stream-webrtc-video" autoPlay playsInline muted={isMuted} />
      {['connecting', 'waiting', 'reconnecting'].includes(status) ? (
        <div className="live-stream-webrtc-status">{status === 'waiting' ? (ar ? 'في انتظار الكاميرا…' : 'Waiting for the camera…') : (ar ? 'جارٍ الاتصال بالبث…' : 'Connecting to the live broadcast…')}</div>
      ) : null}
      {status === 'error' ? (
        <div className="live-stream-webrtc-status">{ar ? 'تعذر الاتصال بالبث. حاول إعادة الاتصال.' : 'Unable to connect. Use Reconnect to try again.'}</div>
      ) : null}
      {status === 'ended' ? (
        <div className="live-stream-webrtc-status">{ar ? 'انتهى البث.' : 'The broadcast has ended.'}</div>
      ) : null}
      {soundControl && (audioControlsTarget ? createPortal(soundControl, audioControlsTarget) : soundControl)}
    </div>
  );
}

export default WebrtcViewer;
