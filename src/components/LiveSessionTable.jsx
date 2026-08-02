import { Trash2 } from 'lucide-react';
import { useState } from 'react';

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
  const [activeTab, setActiveTab] = useState('songs');

  const renderActions = (session) => (hasActions ? (
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
  ) : null);

  const renderSongCell = (session) => (
    <strong role="cell">{session.track}</strong>
  );

  const renderRows = () => sessions.map((session) => (
    <div key={session.id} className={`live-session-row live-session-row-data live-session-row-${activeTab}`} role="row">
      {activeTab === 'songs' ? (
        <>
          {renderSongCell(session)}
          <span role="cell">{session.artist || 'Unknown'}</span>
          <span role="cell">{session.duration || 'Pending'}</span>
          <span role="cell">{session.trackClass || 'Standard'}</span>
          <span role="cell">
            {session.playState ? (
              <em className={`live-session-state live-session-state-${session.playState}`}>{session.playState}</em>
            ) : 'Pending'}
          </span>
          <span role="cell">
            {session.audioUrl ? (
              <audio className="live-session-audio-preview" controls preload="none" src={session.audioUrl} />
            ) : 'No file'}
          </span>
        </>
      ) : null}

      {activeTab === 'music' ? (
        <>
          {renderSongCell(session)}
          <span role="cell">{session.genres || session.genre || 'Pending'}</span>
          <span role="cell">{session.subgenres || 'Pending'}</span>
          <span role="cell">{session.musicMoods || 'Pending'}</span>
          <span role="cell">{session.instruments || 'Pending'}</span>
          <span role="cell">{session.bpm || session.beat || 'Pending'}</span>
          <span role="cell">{session.musicalKey || 'Pending'}</span>
          <span role="cell">{session.vocals || 'Pending'}</span>
          {renderAmplitudeMeter(session.id, 'music', session.duration, session.energy)}
        </>
      ) : null}

      {activeTab === 'lyrics' ? (
        <>
          {renderSongCell(session)}
          <span role="cell">{session.lyricsSummary || 'Pending'}</span>
          <span role="cell">{session.lyricsMoods || 'Pending'}</span>
          <span role="cell">{session.themes || 'Pending'}</span>
          <span role="cell">{session.lyricsLanguage || session.language || 'Pending'}</span>
          <span role="cell">{session.explicit || 'Pending'}</span>
          {renderAmplitudeMeter(session.id, 'lyrics', session.duration, session.lyricsEnergy)}
        </>
      ) : null}

      {renderActions(session)}
    </div>
  ));

  const tabColumns = {
    songs: ['Song / Music', 'Artist', 'Duration', 'Class', 'Play State', 'Preview'],
    music: ['Song / Music', 'Genres', 'Subgenres', 'Moods', 'Instruments', 'BPM', 'Key', 'Vocals', 'Amplitude'],
    lyrics: ['Song / Music', 'Summary', 'Moods', 'Themes', 'Language', 'Explicit', 'Amplitude'],
  };

  return (
    <div className={`live-session-panel${hasActions ? ' has-actions' : ''}`}>
      <div className="live-session-panel-head">
        <p className="detail-label">LIVE EVENT LIST</p>
        <span>{`${sessions.length} ITEMS`}</span>
      </div>

      <div className="live-session-tabs" role="tablist" aria-label="Live event metadata views">
        {[
          ['songs', 'Songs'],
          ['music', 'Music Metadata'],
          ['lyrics', 'Lyrics Metadata'],
        ].map(([tabId, label]) => (
          <button
            key={tabId}
            type="button"
            role="tab"
            aria-selected={activeTab === tabId}
            className={activeTab === tabId ? 'is-active' : ''}
            onClick={() => setActiveTab(tabId)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="live-session-panel-body">
        <div className={`live-session-table live-session-table-${activeTab}`} role="table" aria-label={`${tabColumns[activeTab][0]} live event tracks`}>
          <div className="live-session-row live-session-row-head" role="row">
            {tabColumns[activeTab].map((column) => <span key={column} role="columnheader">{column}</span>)}
            {hasActions ? <span role="columnheader">Actions</span> : null}
          </div>
          {renderRows()}
        </div>

        {requestAgent ? <div className="live-session-agent-slot">{requestAgent}</div> : null}
      </div>
    </div>
  );
}

export default LiveSessionTable;
