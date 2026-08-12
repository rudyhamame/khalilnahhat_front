import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { Volume2 } from 'lucide-react';
import { fetchWebrtcViewerToken } from '../lib/api';

function WebrtcViewer() {
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
    room.on(RoomEvent.TrackUnsubscribed, (track) => track.detach());
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

        setStatus('connected');
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
    audioRef.current?.play().catch(() => {});
    setNeedsSoundUnlock(false);
  };

  return (
    <div className="live-stream-webrtc-shell">
      <video ref={videoRef} className="live-stream-webrtc-video" autoPlay playsInline />
      <audio ref={audioRef} autoPlay />
      {status === 'connecting' ? (
        <div className="live-stream-webrtc-status">Connecting to the browser broadcast…</div>
      ) : null}
      {status === 'error' ? (
        <div className="live-stream-webrtc-status">Unable to connect to the live broadcast. Try refreshing.</div>
      ) : null}
      {status === 'ended' ? (
        <div className="live-stream-webrtc-status">The broadcast has ended.</div>
      ) : null}
      {needsSoundUnlock ? (
        <button type="button" className="live-stream-webrtc-unmute" onClick={handleEnableSound}>
          <Volume2 size={16} />
          Tap to enable sound
        </button>
      ) : null}
    </div>
  );
}

export default WebrtcViewer;
