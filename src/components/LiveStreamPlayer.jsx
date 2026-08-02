import { useEffect, useMemo, useState } from 'react';
import { Radio, VideoOff } from 'lucide-react';

function extractYoutubeVideoId(streamUrl) {
  if (!streamUrl) {
    return '';
  }

  const match = streamUrl.trim().match(
    /(?:youtube\.com\/(?:live\/|watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );
  return match?.[1] || '';
}

function normalizeYoutubeEmbedUrl(streamUrl) {
  const videoId = extractYoutubeVideoId(streamUrl);
  return videoId ? `https://www.youtube.com/embed/${videoId}?autoplay=1&playsinline=1` : '';
}

function resolveEventStart(event, liveStream) {
  const startValue =
    liveStream?.nextEventAt ||
    liveStream?.startsAt ||
    event?.startsAt ||
    event?.dateIso ||
    event?.startTime ||
    event?.date;

  if (!startValue) {
    return null;
  }

  const startDate = new Date(startValue);
  return Number.isNaN(startDate.getTime()) ? null : startDate;
}

function formatCountdown(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return [days ? `${days}D` : '', `${String(hours).padStart(2, '0')}H`, `${String(minutes).padStart(2, '0')}M`, `${String(seconds).padStart(2, '0')}S`]
    .filter(Boolean)
    .join(' ');
}

function LiveStreamPlayer({ liveStream, currentSession, sessionCount, fallbackPoster }) {
  const youtubeEmbedUrl = normalizeYoutubeEmbedUrl(liveStream?.streamUrl);
  const activeStreamUrl = youtubeEmbedUrl || liveStream?.streamUrl || '';
  const hasSessionPreview = Boolean(currentSession);
  const queuedEvent = !liveStream?.isLive && sessionCount > 0;
  const eventStart = useMemo(
    () => (queuedEvent ? resolveEventStart(currentSession, liveStream) : null),
    [currentSession, liveStream, queuedEvent],
  );
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!eventStart) {
      return undefined;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [eventStart]);

  const countdown = eventStart ? formatCountdown(eventStart.getTime() - now) : '';

  const sessionPreview = hasSessionPreview ? (
    <div className="live-stream-session-preview">
      <span className="detail-label">CURRENT EVENT PREVIEW</span>
      <strong>{currentSession.track}</strong>
      <div className="live-stream-session-meta">
        <span>{currentSession.duration || 'Duration pending'}</span>
        <span>{currentSession.genre || 'Genre pending'}</span>
        <span>{currentSession.language || 'Language pending'}</span>
      </div>
      <p>{`${sessionCount} live event item${sessionCount === 1 ? '' : 's'} loaded in the set list.`}</p>
    </div>
  ) : null;

  if (!activeStreamUrl) {
    return (
      <div className="live-stream-panel live-stream-panel-idle">
        <div className="live-stream-copy-placeholder-row">
          <div className="live-stream-copy">
            <h3>{liveStream?.title || 'Khalil Nahhat Live DJ Event'}</h3>
            <p>{liveStream?.statusLabel || 'Offline until Khalil starts the next YouTube Live stream.'}</p>
          </div>
          <div className="live-stream-placeholder">
            <VideoOff size={18} />
            <span>Stream offline</span>
          </div>
        </div>
        <div className="live-stream-empty-state">
          {queuedEvent ? (
            <>
              <strong>{`UP NEXT: ${currentSession?.track || 'LIVE EVENT'}`}</strong>
              <span>{`${sessionCount} event${sessionCount === 1 ? '' : 's'} queued for the next broadcast.`}</span>
              {countdown ? (
                <time dateTime={eventStart.toISOString()}>{`STARTS IN ${countdown}`}</time>
              ) : (
                <span>Start time to be announced.</span>
              )}
            </>
          ) : (
            <>
              <strong>No live event for now</strong>
              <span>Check back later for the next Khalil Nahhat broadcast.</span>
            </>
          )}
        </div>
        {sessionPreview}
      </div>
    );
  }

  return (
    <div className="live-stream-panel">
      <div className="live-stream-head">
        <div>
          <span className="detail-label">YOUTUBE LIVE</span>
          <h3>{liveStream.title}</h3>
        </div>
        <span className="live-stream-badge">
          <Radio size={14} />
          LIVE NOW
        </span>
      </div>
      <div className="live-stream-media-shell">
        <iframe
          key={activeStreamUrl}
          className="live-stream-frame"
          src={activeStreamUrl}
          title={liveStream.title || 'Khalil Nahhat YouTube Live'}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="live-stream-meta">
        <p>{liveStream.statusLabel || 'Broadcasting through YouTube Live with OBS.'}</p>
        <span>Paste the YouTube live URL in admin and save it.</span>
      </div>
      {sessionPreview}
    </div>
  );
}

export default LiveStreamPlayer;
