import { Trash2 } from 'lucide-react';

function parseDurationSeconds(durationValue) {
  const value = String(durationValue || '').trim();

  if (!value) {
    return 0;
  }

  const parts = value.split(':').map((part) => Number.parseInt(part, 10));

  if (parts.some((part) => Number.isNaN(part))) {
    return 0;
  }

  if (parts.length === 2) {
    return (parts[0] * 60) + parts[1];
  }

  if (parts.length === 3) {
    return (parts[0] * 3600) + (parts[1] * 60) + parts[2];
  }

  return 0;
}

function resolveEnergyLevel(value) {
  const normalized = String(value || '').toLowerCase();

  if (!normalized) {
    return 0.24;
  }

  if (/\b(very high|peak|explosive|max)\b/.test(normalized)) {
    return 0.95;
  }

  if (/\b(high|driving|strong|intense)\b/.test(normalized)) {
    return 0.8;
  }

  if (/\b(medium|balanced|steady|moderate)\b/.test(normalized)) {
    return 0.6;
  }

  if (/\b(low|soft|calm|gentle|subtle)\b/.test(normalized)) {
    return 0.35;
  }

  return 0.52;
}

function buildAmplitudeBars(durationValue, energyValue) {
  const durationSeconds = parseDurationSeconds(durationValue);
  const durationRatio = Math.max(0.25, Math.min(durationSeconds / 480, 1));
  const energyRatio = resolveEnergyLevel(energyValue);
  const barCount = Math.max(8, Math.min(18, Math.round(8 + (durationRatio * 10))));

  return Array.from({ length: barCount }, (_, index) => {
    const wavePosition = barCount === 1 ? 0.5 : index / (barCount - 1);
    const arc = Math.sin(wavePosition * Math.PI);
    const microVariation = 0.82 + (Math.cos(index * 1.35) * 0.18);
    const height = Math.max(18, Math.round((18 + (arc * 42 * energyRatio)) * microVariation));
    const opacity = 0.38 + (energyRatio * 0.52) + (arc * 0.08);

    return {
      height,
      opacity: Math.min(opacity, 1),
    };
  });
}

function renderAmplitudeMeter(sessionId, type, durationValue, energyValue) {
  const bars = buildAmplitudeBars(durationValue, energyValue);

  return (
    <span role="cell" className={`live-session-amplitude live-session-amplitude-${type}`}>
      <span className="live-session-amplitude-bars" aria-hidden="true">
        {bars.map((bar, index) => (
          <i
            key={`${sessionId}-${type}-${index}`}
            className="live-session-amplitude-bar"
            style={{ height: `${bar.height}%`, opacity: bar.opacity }}
          />
        ))}
      </span>
      <small>{energyValue || 'Pending'}</small>
    </span>
  );
}

function LiveSessionTable({ sessions, requestAgent, onDeleteSession }) {
  const hasActions = typeof onDeleteSession === 'function';

  return (
    <div className={`live-session-panel${hasActions ? ' has-actions' : ''}`}>
      <div className="live-session-panel-head">
        <p className="detail-label">LIVE SESSION LIST</p>
        <span>{`${sessions.length} ITEMS`}</span>
      </div>

      <div className="live-session-panel-body">
        <div className="live-session-table" role="table" aria-label="Live session tracks">
          <div className="live-session-row live-session-row-head live-session-row-head-groups" role="row">
            <span role="columnheader">Song / Music</span>
            <span role="columnheader">Artist</span>
            <span role="columnheader">Duration</span>
            <span role="columnheader" className="live-session-group-header live-session-group-header-music">
              Music Metadata
            </span>
            <span role="columnheader" className="live-session-group-header live-session-group-header-lyrics">
              Lyrics Metadata
            </span>
            <span role="columnheader">Play State</span>
            <span role="columnheader">Preview</span>
            {hasActions ? <span role="columnheader">Actions</span> : null}
          </div>

          <div className="live-session-row live-session-row-head live-session-row-head-details" role="row">
            <span role="presentation" className="live-session-header-blank" />
            <span role="presentation" className="live-session-header-blank" />
            <span role="presentation" className="live-session-header-blank" />
            <span role="columnheader">Genres</span>
            <span role="columnheader">Subgenres</span>
            <span role="columnheader">Moods</span>
            <span role="columnheader">Instruments</span>
            <span role="columnheader">BPM</span>
            <span role="columnheader">Key</span>
            <span role="columnheader">Vocals</span>
            <span role="columnheader">Amplitude</span>
            <span role="columnheader">Summary</span>
            <span role="columnheader">Moods</span>
            <span role="columnheader">Themes</span>
            <span role="columnheader">Language</span>
            <span role="columnheader">Explicit</span>
            <span role="columnheader">Amplitude</span>
            <span role="presentation" className="live-session-header-blank" />
            <span role="presentation" className="live-session-header-blank" />
            {hasActions ? <span role="presentation" className="live-session-header-blank" /> : null}
          </div>

          {sessions.map((session) => {
            return (
              <div key={session.id} className="live-session-row live-session-row-data" role="row">
                <strong role="cell">{session.track}</strong>
                <span role="cell">{session.artist || 'Unknown'}</span>
                <span role="cell">{session.duration || 'Pending'}</span>
                <span role="cell">{session.genres || session.genre || 'Pending'}</span>
                <span role="cell">{session.subgenres || 'Pending'}</span>
                <span role="cell">{session.musicMoods || session.energy || 'Pending'}</span>
                <span role="cell">{session.instruments || 'Pending'}</span>
                <span role="cell">{session.bpm || session.beat || 'Pending'}</span>
                <span role="cell">{session.musicalKey || 'Pending'}</span>
                <span role="cell">{session.vocals || 'Pending'}</span>
                {renderAmplitudeMeter(session.id, 'music', session.duration, session.energy)}
                <span role="cell">{session.lyricsSummary || 'Pending'}</span>
                <span role="cell">{session.lyricsMoods || 'Pending'}</span>
                <span role="cell">{session.themes || 'Pending'}</span>
                <span role="cell">{session.lyricsLanguage || session.language || 'Pending'}</span>
                <span role="cell">{session.explicit || 'Pending'}</span>
                {renderAmplitudeMeter(session.id, 'lyrics', session.duration, session.lyricsEnergy)}
                <span role="cell">
                  {session.playState ? (
                    <em className={`live-session-state live-session-state-${session.playState}`}>{session.playState}</em>
                  ) : (
                    'Pending'
                  )}
                </span>
                <span role="cell">
                  {session.audioUrl ? (
                    <audio
                      className="live-session-audio-preview"
                      controls
                      preload="none"
                      src={session.audioUrl}
                    />
                  ) : (
                    'No file'
                  )}
                </span>
                {hasActions ? (
                  <span role="cell" className="live-session-row-actions">
                    <button
                      type="button"
                      className="live-session-delete-button"
                      onClick={() => onDeleteSession(session.id)}
                      aria-label={`Delete ${session.track}`}
                      title={`Delete ${session.track}`}
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {requestAgent ? <div className="live-session-agent-slot">{requestAgent}</div> : null}
      </div>
    </div>
  );
}

export default LiveSessionTable;
