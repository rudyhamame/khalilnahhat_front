import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Volume2 } from 'lucide-react';
import { fetchWebrtcViewerToken } from '../lib/api';

function WebrtcViewer({ lang = 'en' }) {
  const ar = lang === 'ar';
  const videoRef = useRef(null);
  const audioRef = useRef(null);
  const [status, setStatus] = useState('connecting');
  const [needsSoundUnlock, setNeedsSoundUnlock] = useState(false);

  useEffect(() => {
    let isCancelled = false;
    const room = new Room();

    const attachTrack = (track) => {
      if (track.kind === Track.Kind.Video && videoRef.current) {
        track.attach(videoRef.current);
        if (!isCancelled) setStatus('connected');
      } else if (track.kind === Track.Kind.Audio && audioRef.current) {
        track.attach(audioRef.current);
        const playPromise = audioRef.current.play();
        if (playPromise?.catch) {
          playPromise.catch(() => {
            if (!isCancelled) {
              setNeedsSoundUnlock(true);
            }
          });
        }
      }
    };

    room.on(RoomEvent.TrackSubscribed, attachTrack);
    room.on(RoomEvent.TrackUnsubscribed, (track) => {
      track.detach();
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
      room.disconnect();
    };
  }, []);

  const handleEnableSound = () => {
    audioRef.current?.play().then(() => setNeedsSoundUnlock(false)).catch(() => setNeedsSoundUnlock(true));
  };

  return (
    <div className="live-stream-webrtc-shell">
      <video ref={videoRef} className="live-stream-webrtc-video" autoPlay playsInline muted />
      <audio ref={audioRef} autoPlay />
      {['connecting', 'waiting', 'reconnecting'].includes(status) ? (
        <div className="live-stream-webrtc-status">{status === 'waiting' ? (ar ? 'في انتظار الكاميرا…' : 'Waiting for the camera…') : (ar ? 'جارٍ الاتصال بالبث…' : 'Connecting to the live broadcast…')}</div>
      ) : null}
      {status === 'error' ? (
        <div className="live-stream-webrtc-status">{ar ? 'تعذر الاتصال بالبث. حاول إعادة الاتصال.' : 'Unable to connect. Use Reconnect to try again.'}</div>
      ) : null}
      {status === 'ended' ? (
        <div className="live-stream-webrtc-status">{ar ? 'انتهى البث.' : 'The broadcast has ended.'}</div>
      ) : null}
      {needsSoundUnlock ? (
        <button type="button" className="live-stream-webrtc-unmute" onClick={handleEnableSound}>
          <Volume2 size={16} />
          {ar ? 'اضغط لتفعيل الصوت' : 'Tap to enable sound'}
        </button>
      ) : null}
    </div>
  );
}

export default WebrtcViewer;
