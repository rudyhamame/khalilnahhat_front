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

function LiveStreamPlayer({ liveStream, currentSession, sessionCount, fallbackPoster }) {
  const youtubeEmbedUrl = normalizeYoutubeEmbedUrl(liveStream?.streamUrl);
  const activeStreamUrl = youtubeEmbedUrl || liveStream?.streamUrl || '';
  const hasSessionPreview = Boolean(currentSession);

  const sessionPreview = hasSessionPreview ? (
    <div className="live-stream-session-preview">
      <span className="detail-label">CURRENT SESSION PREVIEW</span>
      <strong>{currentSession.track}</strong>
      <div className="live-stream-session-meta">
        <span>{currentSession.duration || 'Duration pending'}</span>
        <span>{currentSession.genre || 'Genre pending'}</span>
        <span>{currentSession.language || 'Language pending'}</span>
      </div>
      <p>{`${sessionCount} live session item${sessionCount === 1 ? '' : 's'} loaded in the set list.`}</p>
    </div>
  ) : null;

  if (!activeStreamUrl) {
    return (
      <div className="live-stream-panel live-stream-panel-idle">
        <div className="live-stream-copy">
          <span className="detail-label">YOUTUBE LIVE</span>
          <h3>{liveStream?.title || 'Khalil Nahhat Live DJ Session'}</h3>
          <p>{liveStream?.statusLabel || 'Offline until Khalil starts the next YouTube Live stream.'}</p>
        </div>
        <div className="live-stream-placeholder">
          <VideoOff size={18} />
          <span>Stream offline</span>
        </div>
        <div className="live-stream-empty-state">
          <strong>No live session for now</strong>
          <span>Check back later for the next Khalil Nahhat broadcast.</span>
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
