import {clearRemoteStream,replaceRemoteTrack} from '../lib/liveRemoteStream';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Room, RoomEvent, Track } from 'livekit-client';
import MediaMTXWebRTCReader from '../lib/vendor/mediamtx-reader';
import { Volume2, VolumeX } from 'lucide-react';
import { createLiveAudioFocus } from '../lib/liveAudioFocus';
import { apiRequest, fetchWebrtcViewerToken } from '../lib/api';
import LiveSignInPrompt from '../echo/LiveSignInPrompt';
import {connectEqualizer,EQUALIZER_BANDS,equalizerGain,flatEqualizer} from '../lib/audioEqualizer';

function WebrtcViewer({ lang = 'en', muted = false, volume = 1, equalizer = null, showAudioControls = false, audioControlsTarget = null, token: accountToken, sessionIdentity }) {
  const [credentials,setCredentials]=useState(null);
  const [credentialError,setCredentialError]=useState(false);
  useEffect(()=>{
    let cancelled=false,timer;
    setCredentials(null);setCredentialError(false);
    const verify=async()=>{
      try {await apiRequest('/auth/me',{token:accountToken});}
      catch(error){if(!cancelled&&[401,403].includes(error.status)){setCredentials(null);setCredentialError('auth');return;}}
      if(!cancelled)timer=setTimeout(verify,30000);
    };
    if(accountToken&&sessionIdentity)fetchWebrtcViewerToken(accountToken,sessionIdentity).then(value=>{if(!cancelled&&value.session===sessionIdentity){setCredentials({binding:accountToken,session:sessionIdentity,...value});timer=setTimeout(verify,30000);}}).catch(error=>{if(!cancelled)setCredentialError([401,403].includes(error.status)?'auth':'unavailable');});
    return()=>{cancelled=true;clearTimeout(timer);};
  },[accountToken,sessionIdentity]);
  const access=credentials?.binding===accountToken&&credentials?.session===sessionIdentity?credentials:null;
  const whepUrl=access?.mode==='whep'?access.url:'';
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
    }catch(error){
      if(import.meta.env.DEV)console.warn('Live equalizer setup failed:',error.name,error.message);
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
    if(!isMuted&&(whepUrl || videoRef.current?.srcObject?.getAudioTracks().length)){
      ownsAudioFocusRef.current=true;
      audioFocusRef.current?.claim();
      window.dispatchEvent(new Event('echo:live-audio'));
      videoRef.current.play()?.then(()=>setNeedsSoundUnlock(false)).catch(()=>setNeedsSoundUnlock(true));
    }
  }, [isMuted, whepUrl]);

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
    if (!whepUrl || !access) return undefined;
    const element = videoRef.current;
    let cancelled = false, generation = 0;
    const mediaStream = new MediaStream();
    setStatus('connecting');
    const reader = new MediaMTXWebRTCReader({
      url: whepUrl,
      token: access.token,
      onError: () => {
        if (cancelled) return;
        generation++;
        clearRemoteStream(mediaStream);
        setStatus('reconnecting');
      },
      onTrack: (event) => {
        if (cancelled) { event.track.stop(); return; }
        if (!replaceRemoteTrack(mediaStream,event.track)) return;
        element.muted = mutedRef.current;
        // Reassigning srcObject for each track restarts the same playback timeline.
        if (element.srcObject !== mediaStream) element.srcObject = mediaStream;
        const trackGeneration = generation;
        const isCurrent = () => !cancelled && generation === trackGeneration && mediaStream.getTracks().includes(event.track);
        element.play()?.then(() => {
          if (!isCurrent()) return;
          setStatus('connected');
          if (!mutedRef.current && !ownsAudioFocusRef.current) {
            ownsAudioFocusRef.current = true;
            audioFocusRef.current?.claim();
            window.dispatchEvent(new Event('echo:live-audio'));
          }
        }).catch(() => {
          if (isCurrent()) {
            setStatus('connected');
            setNeedsSoundUnlock(true);
            // iOS and mobile browsers can autoplay video only with sound muted.
            element.muted = true;
            element.play()?.catch(() => {});
          }
        });
      },
    });
    return () => {
      cancelled = true;
      reader.close();
      clearRemoteStream(mediaStream);
      if (element.srcObject === mediaStream) element.srcObject = null;
    };
  }, [whepUrl,access]);

  useEffect(() => {
    if (whepUrl || !access || access.mode!=='webrtc') return undefined;
    let isCancelled = false;
    const room = new Room({adaptiveStream:true});

    const element = videoRef.current;
    const attachedTracks = new Set();
    // The portrait source is a separate track for the portrait output; the Live page always plays the landscape one.
    const attachTrack = (track, publication) => {
      if (publication?.trackName === 'portrait-source') return;
      if (isCancelled || !element || ![Track.Kind.Video, Track.Kind.Audio].includes(track.kind) || attachedTracks.has(track)) return;
      for (const previous of attachedTracks) {
        if (previous.kind === track.kind) { previous.detach(element); attachedTracks.delete(previous); }
      }
      // Both tracks must share one MediaStream and playback timeline. The SDK merges
      // track kinds on this element; restore our mute choice after either arrives.
      track.attach(element);
      attachedTracks.add(track);
      element.muted = mutedRef.current;
      if (track.kind === Track.Kind.Video && !isCancelled) setStatus('connected');
      element.play()?.then(() => {
        if (!isCancelled && attachedTracks.has(track) && !mutedRef.current && element.srcObject?.getAudioTracks().length && !ownsAudioFocusRef.current) {
          ownsAudioFocusRef.current = true;
          audioFocusRef.current?.claim();
          window.dispatchEvent(new Event('echo:live-audio'));
        }
      }).catch(() => {
        if (!isCancelled && attachedTracks.has(track) && !mutedRef.current) setNeedsSoundUnlock(true);
      });
    };

    room.on(RoomEvent.TrackSubscribed, attachTrack);
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      if (!attachedTracks.has(track)) return;
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
        const { token, url } = access;
        if (isCancelled) return;

        await room.connect(url, token);
        if (isCancelled) {
          room.disconnect();
          return;
        }

        room.remoteParticipants.forEach((participant) => {
          participant.trackPublications.forEach((publication) => {
            if (publication.track) attachTrack(publication.track, publication);
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
  }, [whepUrl,access]);

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
    equalizerGraph.current?.context.resume().catch(()=>{});
    videoRef.current?.play().then(() => setNeedsSoundUnlock(false)).catch(error => {
      if(import.meta.env.DEV)console.warn('Live audio start failed:',error.name,error.message);
      setNeedsSoundUnlock(true);
    });
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
      {!accountToken || credentialError==='auth' ? <div className="live-stream-webrtc-status"><LiveSignInPrompt ar={ar} kind={credentialError==='auth'?'expired':'watch'}/></div> : credentialError ? <div className="live-stream-webrtc-status">{ar?'تعذر الاتصال. حاول مجدداً.':'Playback unavailable. Use Reconnect to try again.'}</div> : ['connecting', 'waiting', 'reconnecting'].includes(status) ? (
        <div className="live-stream-webrtc-status">{status === 'waiting' ? (ar ? 'في انتظار الكاميرا…' : 'Waiting for the camera…') : (ar ? 'جارٍ الاتصال بالبث…' : 'Connecting to the live stream…')}</div>
      ) : null}
      {status === 'error' ? (
        <div className="live-stream-webrtc-status">{ar ? 'تعذر الاتصال بالبث. حاول إعادة الاتصال.' : 'Unable to connect. Use Reconnect to try again.'}</div>
      ) : null}
      {status === 'ended' ? (
        <div className="live-stream-webrtc-status">{ar ? 'انتهى البث.' : 'The live stream has ended.'}</div>
      ) : null}
      {soundControl && (audioControlsTarget ? createPortal(soundControl, audioControlsTarget) : soundControl)}
    </div>
  );
}

export default WebrtcViewer;
