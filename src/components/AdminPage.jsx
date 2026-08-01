import { Pause, Play, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AdminServicesPanel from './AdminServicesPanel';
import LiveSessionTable from './LiveSessionTable';

const LEGACY_LIVE_STREAM_TITLES = new Set([
  'Khalil Nahhat Live DJ Session',
  'Soft Music',
]);

const DEFAULT_OFFLINE_STATUS = 'Offline until Khalil starts the next OBS stream.';
const PAUSED_STATUS = 'Live paused.';
const LIVE_STATUS = 'Live now.';
const CYANITE_POLL_DELAY_MS = 3500;
const CYANITE_MAX_POLL_ATTEMPTS = 6;
const CUSTOM_OPTION_VALUE = '__custom__';

const GENRE_OPTIONS = [
  'House',
  'Tech House',
  'Deep House',
  'Progressive House',
  'Afro House',
  'Melodic House',
  'Melodic Techno',
  'Techno',
  'Peak Time Techno',
  'Minimal Techno',
  'Organic House',
  'Open Format',
  'Disco',
  'Nu Disco',
  'Electronica',
  'Downtempo',
  'Lounge',
  'Hip Hop',
  'R&B',
  'Pop',
  'Arabic Pop',
  'Arabic Dance',
  'World',
];

const SUBGENRE_OPTIONS = [
  'Jackin House',
  'Soulful House',
  'Latin House',
  'Minimal House',
  'Bass House',
  'Future House',
  'Organic Melodic',
  'Driving Techno',
  'Raw Techno',
  'Hypnotic Techno',
  'Minimal Deep Tech',
  'Microhouse',
  'Indie Dance',
  'Afro Tech',
  'Progressive Melodic',
  'Afterhours',
  'Warm-up',
  'Peak-time',
  'Sunset',
  'Open-air',
  'Commercial Crossover',
];

const ENERGY_OPTIONS = [
  'Very Low',
  'Low',
  'Low-Medium',
  'Medium',
  'Medium-High',
  'High',
  'Very High',
  'Warm-up',
  'Steady',
  'Driving',
  'Peak-time',
  'Explosive',
];

const MUSIC_MOOD_OPTIONS = [
  'Warm',
  'Dark',
  'Uplifting',
  'Euphoric',
  'Hypnotic',
  'Driving',
  'Atmospheric',
  'Moody',
  'Soulful',
  'Groovy',
  'Sensual',
  'Emotional',
  'Aggressive',
  'Playful',
  'Dreamy',
  'Cinematic',
  'Late-night',
  'Sunrise',
];

const INSTRUMENT_OPTIONS = [
  'Vocals',
  'Female Vocals',
  'Male Vocals',
  'Synth',
  'Bass',
  'Piano',
  'Keys',
  'Strings',
  'Guitar',
  'Percussion',
  'Drums',
  'Hand Drums',
  'Arabic Percussion',
  'Oud',
  'Saxophone',
  'Trumpet',
  'Flute',
  'Pads',
  'FX',
];

const KEY_OPTIONS = [
  'C Major',
  'C Minor',
  'C# Major',
  'C# Minor',
  'D Major',
  'D Minor',
  'D# Major',
  'D# Minor',
  'E Major',
  'E Minor',
  'F Major',
  'F Minor',
  'F# Major',
  'F# Minor',
  'G Major',
  'G Minor',
  'G# Major',
  'G# Minor',
  'A Major',
  'A Minor',
  'A# Major',
  'A# Minor',
  'B Major',
  'B Minor',
];

const VOCAL_OPTIONS = [
  'Instrumental',
  'Male Vocals',
  'Female Vocals',
  'Mixed Vocals',
  'Chopped Vocals',
  'Spoken Word',
  'Rap Vocal',
  'Soul Vocal',
  'Arabic Vocal',
  'Choir',
  'Vocal Textures',
];

function blankSession() {
  return {
    track: '',
    artist: '',
    duration: '',
    genre: '',
    genres: '',
    subgenres: '',
    language: '',
    musicMoods: '',
    instruments: '',
    bpm: '',
    musicalKey: '',
    vocals: '',
    energy: '',
    beat: '',
    lyricsSummary: '',
    lyricsMoods: '',
    lyricsEnergy: '',
    themes: '',
    lyricsLanguage: '',
    explicit: '',
    playState: 'queued',
    audioUrl: '',
    audioPublicId: '',
    audioOriginalName: '',
  };
}

function blankArchiveItem() {
  return {
    title: '',
    artist: '',
    category: 'Live',
    genre: '',
    duration: '',
    location: '',
    date: '',
    mediaType: 'Original track',
    description: '',
    image: '',
    alt: '',
    audioUrl: '',
  };
}

function formatTrackNameFromFile(fileName) {
  const withoutExtension = String(fileName || '').replace(/\.[^.]+$/, '');

  return withoutExtension
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function inferTrackArtistFromFileName(fileName) {
  const normalizedName = formatTrackNameFromFile(fileName);

  if (!normalizedName) {
    return {
      track: '',
      artist: '',
    };
  }

  const dashParts = normalizedName.split(/\s[-–]\s/);

  if (dashParts.length >= 2) {
    return {
      artist: dashParts[0].trim(),
      track: dashParts.slice(1).join(' - ').trim(),
    };
  }

  return {
    track: normalizedName,
    artist: '',
  };
}

function formatDurationFromSeconds(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '';
  }

  const roundedSeconds = Math.round(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function normalizeCommaSeparatedList(value) {
  return String(value || '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function appendUniqueOption(currentValue, nextOption) {
  const normalizedOption = String(nextOption || '').trim();

  if (!normalizedOption) {
    return currentValue;
  }

  const entries = normalizeCommaSeparatedList(currentValue);

  if (entries.some((entry) => entry.toLowerCase() === normalizedOption.toLowerCase())) {
    return entries.join(', ');
  }

  return [...entries, normalizedOption].join(', ');
}

function removeOption(currentValue, optionToRemove) {
  return normalizeCommaSeparatedList(currentValue)
    .filter((entry) => entry.toLowerCase() !== String(optionToRemove || '').trim().toLowerCase())
    .join(', ');
}

function extractAudioFileMetadata(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const audio = document.createElement('audio');

    const cleanup = () => {
      audio.src = '';
      URL.revokeObjectURL(objectUrl);
    };

    audio.preload = 'metadata';
    audio.onloadedmetadata = () => {
      const duration = formatDurationFromSeconds(audio.duration);
      const inferred = inferTrackArtistFromFileName(file.name);
      cleanup();
      resolve({
        track: inferred.track,
        artist: inferred.artist,
        duration,
      });
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error('Could not read audio metadata from this file.'));
    };
    audio.src = objectUrl;
  });
}

function AdminCuratedMultiField({
  label,
  options,
  value,
  selectedValue,
  customValue,
  onSelectedValueChange,
  onCustomValueChange,
  onValueChange,
}) {
  const selectedItems = normalizeCommaSeparatedList(value);

  return (
    <label className="admin-curated-field admin-curated-field-multi">
      <span>{label}</span>
      <div className="admin-curated-control">
        <select
          value={selectedValue}
          onChange={(event) => onSelectedValueChange(event.target.value)}
        >
          <option value="">Choose option</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
          <option value={CUSTOM_OPTION_VALUE}>Add custom...</option>
        </select>
        {selectedValue === CUSTOM_OPTION_VALUE ? (
          <div className="admin-curated-custom-row">
            <input
              type="text"
              value={customValue}
              placeholder={`Add custom ${label.toLowerCase()}`}
              onChange={(event) => onCustomValueChange(event.target.value)}
            />
            <button
              type="button"
              className="secondary-button admin-curated-button"
              onClick={() => {
                const nextValue = String(customValue || '').trim();
                if (!nextValue) {
                  return;
                }
                onValueChange(appendUniqueOption(value, nextValue));
                onCustomValueChange('');
                onSelectedValueChange('');
              }}
            >
              Add
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="secondary-button admin-curated-button"
            onClick={() => {
              if (!selectedValue) {
                return;
              }
              onValueChange(appendUniqueOption(value, selectedValue));
              onSelectedValueChange('');
            }}
          >
            Add
          </button>
        )}
      </div>
      <div className="admin-curated-values">
        {selectedItems.length ? (
          selectedItems.map((item) => (
            <button
              key={item}
              type="button"
              className="admin-curated-chip"
              onClick={() => onValueChange(removeOption(value, item))}
              title={`Remove ${item}`}
            >
              {item}
            </button>
          ))
        ) : (
          <small>No options selected yet.</small>
        )}
      </div>
    </label>
  );
}

function AdminCuratedSingleField({
  label,
  options,
  value,
  customValue,
  onValueChange,
  onCustomValueChange,
}) {
  const isCustom = Boolean(value) && !options.includes(value);

  return (
    <label className="admin-curated-field">
      <span>{label}</span>
      <select
        value={isCustom ? CUSTOM_OPTION_VALUE : value}
        onChange={(event) => {
          const nextValue = event.target.value;

          if (nextValue === CUSTOM_OPTION_VALUE) {
            onValueChange(customValue || '');
            return;
          }

          onValueChange(nextValue);
        }}
      >
        <option value="">Choose option</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        <option value={CUSTOM_OPTION_VALUE}>Add custom...</option>
      </select>
      {(isCustom || value === CUSTOM_OPTION_VALUE) ? (
        <input
          type="text"
          value={isCustom ? value : customValue}
          placeholder={`Add custom ${label.toLowerCase()}`}
          onChange={(event) => {
            onCustomValueChange(event.target.value);
            onValueChange(event.target.value);
          }}
        />
      ) : null}
    </label>
  );
}

function createLiveStreamDraft(liveStream) {
  const normalizedTitle = LEGACY_LIVE_STREAM_TITLES.has(liveStream?.title || '')
    ? ''
    : liveStream?.title || '';

  return {
    isLive: Boolean(liveStream?.isLive),
    title: normalizedTitle,
    streamUrl: liveStream?.streamUrl || '',
    posterImage: liveStream?.posterImage || '',
    statusLabel: liveStream?.statusLabel || DEFAULT_OFFLINE_STATUS,
    activeSessionId: liveStream?.activeSessionId || '',
  };
}

function createDeletedLiveStreamDraft(liveStream) {
  return {
    ...createLiveStreamDraft(liveStream),
    isLive: false,
    title: '',
    streamUrl: '',
    posterImage: '',
    statusLabel: DEFAULT_OFFLINE_STATUS,
    activeSessionId: '',
  };
}

function hasSavedLiveSession(liveStream) {
  return Boolean(
    liveStream?.streamUrl?.trim() ||
    liveStream?.posterImage?.trim() ||
    liveStream?.title?.trim(),
  );
}

function getAdminPreviewUrl(streamUrl) {
  if (!streamUrl) {
    return '';
  }

  const match = streamUrl.trim().match(
    /(?:youtube\.com\/(?:live\/|watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );

  return match?.[1] ? `https://www.youtube.com/embed/${match[1]}?playsinline=1` : streamUrl;
}

function extractYoutubeVideoId(streamUrl) {
  if (!streamUrl) {
    return '';
  }

  const match = streamUrl.trim().match(
    /(?:youtube\.com\/(?:live\/|watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/,
  );

  return match?.[1] || '';
}

function AdminPage({
  username,
  liveSessions,
  liveStream,
  liveRequests,
  serviceRequests,
  archiveItems,
  archiveFilters,
  onLogout,
  onUpdateLiveStream,
  onAddLiveSession,
  onUploadLiveSessionAudio,
  onAnalyzeLiveSession,
  onUpdateLiveSession,
  onDeleteLiveSession,
  onReviewLiveRequest,
  onDeleteLiveRequest,
  onPublishServiceQuote,
  onAddArchiveItem,
  onUpdateArchiveItem,
  onDeleteArchiveItem,
}) {
  const [newSession, setNewSession] = useState(blankSession());
  const [newArchiveItem, setNewArchiveItem] = useState(blankArchiveItem());
  const [liveStreamDraft, setLiveStreamDraft] = useState(() => createLiveStreamDraft(liveStream));
  const [liveSummaryTab, setLiveSummaryTab] = useState('table');
  const [adminArchiveFilter, setAdminArchiveFilter] = useState('All');
  const [uploadedAudioName, setUploadedAudioName] = useState('');
  const [audioUploadStatus, setAudioUploadStatus] = useState('');
  const [isExtractingAudioMetadata, setIsExtractingAudioMetadata] = useState(false);
  const [isAnalyzingLiveSession, setIsAnalyzingLiveSession] = useState(false);
  const [liveStreamSaveStatus, setLiveStreamSaveStatus] = useState('');
  const [isSavingLiveStream, setIsSavingLiveStream] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState('');
  const [requestActionStatus, setRequestActionStatus] = useState('');
  const [curatedSelections, setCuratedSelections] = useState({
    genres: '',
    subgenres: '',
    musicMoods: '',
    instruments: '',
    vocals: '',
  });
  const [curatedCustomValues, setCuratedCustomValues] = useState({
    genres: '',
    subgenres: '',
    energy: '',
    musicMoods: '',
    instruments: '',
    musicalKey: '',
    vocals: '',
  });
  const selectableArchiveFilters = useMemo(
    () => archiveFilters.filter((filter) => filter !== 'All'),
    [archiveFilters],
  );
  const filteredArchiveItems = useMemo(() => {
    if (adminArchiveFilter === 'All') {
      return archiveItems;
    }

    return archiveItems.filter((item) => item.category === adminArchiveFilter);
  }, [adminArchiveFilter, archiveItems]);
  useEffect(() => {
    setLiveStreamDraft(createLiveStreamDraft(liveStream));
  }, [liveStream]);

  useEffect(() => {
    if (!liveStream?.streamUrl && !liveStream?.title && !liveStream?.statusLabel) {
      return;
    }

    setLiveStreamSaveStatus('');
    setIsSavingLiveStream(false);
  }, [liveStream]);

  const analyzeSessionDraft = async (draft) => {
    if (typeof onAnalyzeLiveSession !== 'function') {
      return;
    }

    setIsAnalyzingLiveSession(true);
    setAudioUploadStatus('Cyanite is analyzing the uploaded song to complete the session fields...');

    try {
      let attempt = 0;
      let isProcessing = true;

      while (isProcessing && attempt < CYANITE_MAX_POLL_ATTEMPTS) {
        const result = await onAnalyzeLiveSession({
          track: draft.track,
          artist: draft.artist,
          duration: draft.duration,
          genre: draft.genre,
          genres: draft.genres,
          subgenres: draft.subgenres,
          language: draft.language,
          musicMoods: draft.musicMoods,
          instruments: draft.instruments,
          bpm: draft.bpm,
          musicalKey: draft.musicalKey,
          vocals: draft.vocals,
          energy: draft.energy,
          beat: draft.beat,
          lyricsSummary: draft.lyricsSummary,
          lyricsMoods: draft.lyricsMoods,
          lyricsEnergy: draft.lyricsEnergy,
          themes: draft.themes,
          lyricsLanguage: draft.lyricsLanguage,
          explicit: draft.explicit,
          sourceUrl: draft.sourceUrl || draft.audioUrl,
          audioUrl: draft.audioUrl,
          audioOriginalName: draft.audioOriginalName,
        });

        const analyzed = result.item || {};
        setNewSession((current) => ({
          ...current,
          track: analyzed.track || current.track,
          artist: analyzed.artist || current.artist,
          duration: analyzed.duration || current.duration,
          genre: analyzed.genre || current.genre,
          genres: analyzed.genres || current.genres,
          subgenres: analyzed.subgenres || current.subgenres,
          language: analyzed.language || current.language,
          musicMoods: analyzed.musicMoods || current.musicMoods,
          instruments: analyzed.instruments || current.instruments,
          bpm: analyzed.bpm || current.bpm,
          musicalKey: analyzed.musicalKey || current.musicalKey,
          vocals: analyzed.vocals || current.vocals,
          energy: analyzed.energy || current.energy,
          beat: analyzed.beat || analyzed.bpm || current.beat,
          lyricsSummary: analyzed.lyricsSummary || current.lyricsSummary,
          lyricsMoods: analyzed.lyricsMoods || current.lyricsMoods,
          lyricsEnergy: analyzed.lyricsEnergy || current.lyricsEnergy,
          themes: analyzed.themes || current.themes,
          lyricsLanguage: analyzed.lyricsLanguage || analyzed.language || current.lyricsLanguage,
          explicit: analyzed.explicit || current.explicit,
        }));

        if (analyzed.analysisStatus === 'processing') {
          attempt += 1;
          setAudioUploadStatus(
            analyzed.summary ||
              `Cyanite is still processing the song. Refreshing analysis (${attempt}/${CYANITE_MAX_POLL_ATTEMPTS})...`,
          );

          if (attempt >= CYANITE_MAX_POLL_ATTEMPTS) {
            break;
          }

          await new Promise((resolve) => {
            window.setTimeout(resolve, CYANITE_POLL_DELAY_MS);
          });
          continue;
        }

        isProcessing = false;
        setAudioUploadStatus(
          analyzed.summary ||
            'Cyanite completed the remaining live-session fields. Review and save when ready.',
        );
      }

      if (isProcessing && attempt >= CYANITE_MAX_POLL_ATTEMPTS) {
        setAudioUploadStatus(
          'Cyanite is still processing this song. Wait a little and click Complete With Cyanite again.',
        );
      }
    } catch (error) {
      setAudioUploadStatus(error.message || 'Cyanite could not complete this session right now.');
    } finally {
      setIsAnalyzingLiveSession(false);
    }
  };

  const handleStartLive = async () => {
    const nextStatusLabel =
      !liveStreamDraft.statusLabel ||
      liveStreamDraft.statusLabel === DEFAULT_OFFLINE_STATUS ||
      liveStreamDraft.statusLabel === PAUSED_STATUS
        ? LIVE_STATUS
        : liveStreamDraft.statusLabel;

    const nextDraft = {
      ...liveStreamDraft,
      isLive: true,
      statusLabel: nextStatusLabel,
    };
    setLiveStreamDraft(nextDraft);
    await onUpdateLiveStream(nextDraft);
  };

  const handlePauseLive = async () => {
    const nextDraft = {
      ...liveStreamDraft,
      isLive: false,
      statusLabel: PAUSED_STATUS,
    };
    setLiveStreamDraft(nextDraft);
    await onUpdateLiveStream(nextDraft);
  };

  const handleDeleteLive = async () => {
    const nextDraft = createDeletedLiveStreamDraft(liveStreamDraft);
    setLiveStreamDraft(nextDraft);
    await onUpdateLiveStream(nextDraft);
  };

  const handleDeleteAudienceRequest = async (item) => {
    const shouldDelete = window.confirm(
      `Delete the audience request for "${item.track || 'this song'}"? This will not delete a song already added to the live session list.`,
    );

    if (!shouldDelete) {
      return;
    }

    setDeletingRequestId(item.id);
    setRequestActionStatus('');

    try {
      await onDeleteLiveRequest(item.id);
      setRequestActionStatus(`Deleted the request for ${item.track || 'the selected song'}.`);
    } catch (error) {
      setRequestActionStatus(error.message || 'The audience request could not be deleted.');
    } finally {
      setDeletingRequestId('');
    }
  };

  const handleSaveLiveStream = async (event) => {
    event.preventDefault();
    setIsSavingLiveStream(true);
    setLiveStreamSaveStatus('Saving live stream configuration...');

    try {
      await onUpdateLiveStream(liveStreamDraft);
      const youtubeId = extractYoutubeVideoId(liveStreamDraft.streamUrl);
      const configuredTarget = youtubeId
        ? `YouTube video ${youtubeId}`
        : liveStreamDraft.streamUrl || 'the current live source';

      setLiveStreamSaveStatus(`Live stream configured successfully for ${configuredTarget}.`);
    } catch (error) {
      setLiveStreamSaveStatus(error.message || 'Live stream configuration failed.');
    } finally {
      setIsSavingLiveStream(false);
    }
  };

  const previewUrl = getAdminPreviewUrl(liveStreamDraft.streamUrl);
  const showLiveControls = hasSavedLiveSession(liveStream);

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <header className="header-shell admin-header-shell">
          <a className="brand-lockup" href="#admin-live-stream">
            <span className="brand-mark" aria-label="KN slash slash">KN //</span>
            <span className="brand-name" aria-label="Khalil Nahhat">
              <span className="brand-name-first">KHALIL</span>
              <span className="brand-name-last">NAHHAT</span>
            </span>
          </a>

          <nav className="desktop-nav" aria-label="Content control">
            <a href="#admin-live-stream">KN//00 LIVE STREAM</a>
            <a href="#admin-live-sessions">KN//01 LIVE SESSIONS</a>
            <a href="#admin-archive">KN//02 ARCHIVE</a>
            <a href="#admin-services">KN//03 SERVICES</a>
          </nav>

          <div className="admin-header-meta">
            <span className="admin-header-user">{`SIGNED IN AS ${username}`}</span>
            <div className="admin-header-actions">
              <a className="secondary-button" href="#signal">
                VIEW SITE
              </a>
              <button type="button" className="primary-button" onClick={onLogout}>
                LOG OUT
              </button>
            </div>
          </div>
        </header>

        <div className="admin-grid">
          <section id="admin-live-stream" className="admin-panel admin-live-stream-panel">
            <div className="section-label admin-panel-head">
              <p className="section-number">
                <span className="section-number-mark">KN//</span>
                <span className="section-number-value">00</span>
              </p>
              <h2>LIVE STREAM</h2>
            </div>

            <div className="admin-live-layout">
              <aside className="admin-live-preview">
                <div className="admin-live-preview-head">
                  <p className="detail-label">LIVE PREVIEW</p>
                  <span>{liveStreamDraft.isLive ? 'ON AIR' : 'OFFLINE'}</span>
                </div>
                {showLiveControls ? (
                  <div className="admin-live-controls" role="group" aria-label="Live controls">
                    <button
                      type="button"
                      className={`admin-live-control ${
                        liveStreamDraft.isLive ? 'admin-live-control-pause' : 'admin-live-control-start'
                      }`}
                      onClick={liveStreamDraft.isLive ? handlePauseLive : handleStartLive}
                    >
                      {liveStreamDraft.isLive ? <Pause size={16} /> : <Play size={16} />}
                      <span>{liveStreamDraft.isLive ? 'Pause Live' : 'Start Live'}</span>
                    </button>
                    <button
                      type="button"
                      className="admin-live-control admin-live-control-delete"
                      onClick={handleDeleteLive}
                    >
                      <Trash2 size={16} />
                      <span>Delete Live</span>
                    </button>
                  </div>
                ) : null}
                <div className="admin-live-preview-frame-shell">
                  {previewUrl ? (
                    <iframe
                      key={previewUrl}
                      className="admin-live-preview-frame"
                      src={previewUrl}
                      title={liveStreamDraft.title || 'Live preview'}
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                      allowFullScreen
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : liveStreamDraft.posterImage ? (
                    <img
                      className="admin-live-preview-image"
                      src={liveStreamDraft.posterImage}
                      alt=""
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="admin-live-preview-empty">
                      <span>NO LIVE SOURCE</span>
                    </div>
                  )}
                </div>
                <div className="admin-live-preview-copy">
                  <strong>{liveStreamDraft.title || 'Khalil Nahhat Live DJ Session'}</strong>
                  <p>{liveStreamDraft.statusLabel || 'Offline until Khalil starts the next OBS stream.'}</p>
                </div>
              </aside>

              <form
                className="admin-create-form"
                onSubmit={handleSaveLiveStream}
              >
                <div className="admin-item-grid">
                  <label>
                    <span>Stream Title</span>
                    <input
                      type="text"
                      value={liveStreamDraft.title}
                      onChange={(event) =>
                        setLiveStreamDraft((current) => ({ ...current, title: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>YouTube Live URL</span>
                    <input
                      type="text"
                      value={liveStreamDraft.streamUrl}
                      placeholder="https://www.youtube.com/watch?v=... or https://www.youtube.com/embed/..."
                      onChange={(event) =>
                        setLiveStreamDraft((current) => ({ ...current, streamUrl: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>Poster Image URL</span>
                    <input
                      type="text"
                      value={liveStreamDraft.posterImage}
                      onChange={(event) =>
                        setLiveStreamDraft((current) => ({ ...current, posterImage: event.target.value }))
                      }
                    />
                  </label>
                  <label>
                    <span>Active Live Session</span>
                    <select
                      value={liveStreamDraft.activeSessionId}
                      onChange={(event) =>
                        setLiveStreamDraft((current) => ({ ...current, activeSessionId: event.target.value }))
                      }
                    >
                      <option value="">None selected</option>
                      {liveSessions.map((session) => (
                        <option key={session.id} value={session.id}>
                          {session.track}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Status Text</span>
                    <input
                      type="text"
                      value={liveStreamDraft.statusLabel}
                      onChange={(event) =>
                        setLiveStreamDraft((current) => ({ ...current, statusLabel: event.target.value }))
                      }
                    />
                  </label>
                </div>
                <p className="admin-helper-copy">
                  {liveStreamSaveStatus || 'Configure the live stream after changing the YouTube URL, poster, or active session.'}
                </p>
                <button type="submit" className="primary-button">
                  {isSavingLiveStream ? 'Configuring Live Stream...' : 'Configure Live Stream'}
                </button>
              </form>
            </div>

           
          </section>

          <section id="admin-live-sessions" className="admin-panel admin-live-sessions-panel">
            <div className="section-label admin-panel-head">
              <div className="admin-panel-head-copy">
                <p className="section-number">
                  <span className="section-number-mark">KN//</span>
                  <span className="section-number-value">01</span>
                </p>
                <h2>LIVE SESSIONS</h2>
              </div>
              {liveSummaryTab === 'add' ? (
                <button type="submit" form="admin-live-session-form" className="primary-button admin-panel-head-action">
                  Add Session
                </button>
              ) : null}
            </div>

            <div className="admin-live-sessions-layout admin-live-tabs-shell admin-live-sessions-page-tabs">
              <div className="admin-live-tabs" role="tablist" aria-label="Live Sessions page views">
                <button
                  type="button"
                  role="tab"
                  aria-controls="admin-live-sessions-tab-panel"
                  aria-selected={liveSummaryTab === 'table'}
                  className={`admin-live-tab${liveSummaryTab === 'table' ? ' is-active' : ''}`}
                  onClick={() => setLiveSummaryTab('table')}
                >
                  {`SESSION TABLE (${liveSessions.length})`}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-controls="admin-live-sessions-tab-panel"
                  aria-selected={liveSummaryTab === 'requests'}
                  className={`admin-live-tab${liveSummaryTab === 'requests' ? ' is-active' : ''}`}
                  onClick={() => setLiveSummaryTab('requests')}
                >
                  {`AUDIENCE REQUESTS (${liveRequests.length})`}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-controls="admin-live-sessions-tab-panel"
                  aria-selected={liveSummaryTab === 'add'}
                  className={`admin-live-tab${liveSummaryTab === 'add' ? ' is-active' : ''}`}
                  onClick={() => setLiveSummaryTab('add')}
                >
                  ADD LIVE SESSION
                </button>
              </div>

              <div
                id="admin-live-sessions-tab-panel"
                className="admin-live-tab-panel admin-live-sessions-page-panel"
                role="tabpanel"
              >
                {liveSummaryTab === 'add' ? (
                  <div className="admin-create-form admin-live-create-form admin-live-sessions-viewport">
                <h3>Add Live Session</h3>
                <form
                  id="admin-live-session-form"
                  className="admin-live-create-form-body"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onAddLiveSession(newSession);
                    setNewSession(blankSession());
                    setUploadedAudioName('');
                    setAudioUploadStatus('');
                    setCuratedSelections({
                      genres: '',
                      subgenres: '',
                      musicMoods: '',
                      instruments: '',
                      vocals: '',
                    });
                    setCuratedCustomValues({
                      genres: '',
                      subgenres: '',
                      energy: '',
                      musicMoods: '',
                      instruments: '',
                      musicalKey: '',
                      vocals: '',
                    });
                  }}
                >
                  <div className="admin-live-create-cards">
                    <div className="admin-live-manual-card">
                      <div className="admin-live-metadata-groups">
                        <section className="admin-live-metadata-group">
                          <div className="admin-live-metadata-head">
                            <p className="detail-label">MUSIC METADATA</p>
                            <span>Playback + sonic profile</span>
                          </div>
                          <div className="admin-item-grid admin-live-metadata-grid">
                            <label>
                              <span>Song / Music</span>
                              <input
                                type="text"
                                value={newSession.track}
                                onChange={(event) => setNewSession((current) => ({ ...current, track: event.target.value }))}
                              />
                            </label>
                            <label>
                              <span>Artist</span>
                              <input
                                type="text"
                                value={newSession.artist}
                                onChange={(event) => setNewSession((current) => ({ ...current, artist: event.target.value }))}
                              />
                            </label>
                            <label>
                              <span>Duration</span>
                              <input
                                type="text"
                                value={newSession.duration}
                                onChange={(event) => setNewSession((current) => ({ ...current, duration: event.target.value }))}
                              />
                            </label>
                            <label>
                              <span>Play State</span>
                              <select
                                value={newSession.playState}
                                onChange={(event) =>
                                  setNewSession((current) => ({ ...current, playState: event.target.value }))
                                }
                              >
                                <option value="played">Played</option>
                                <option value="live">Live</option>
                                <option value="queued">Queued</option>
                                <option value="requested">Requested</option>
                              </select>
                            </label>
                            <AdminCuratedMultiField
                              label="Genres"
                              options={GENRE_OPTIONS}
                              value={newSession.genres}
                              selectedValue={curatedSelections.genres}
                              customValue={curatedCustomValues.genres}
                              onSelectedValueChange={(nextValue) =>
                                setCuratedSelections((current) => ({ ...current, genres: nextValue }))
                              }
                              onCustomValueChange={(nextValue) =>
                                setCuratedCustomValues((current) => ({ ...current, genres: nextValue }))
                              }
                              onValueChange={(nextValue) =>
                                setNewSession((current) => ({
                                  ...current,
                                  genres: nextValue,
                                  genre: nextValue.split(',')[0]?.trim() || current.genre,
                                }))
                              }
                            />
                            <AdminCuratedMultiField
                              label="Subgenres"
                              options={SUBGENRE_OPTIONS}
                              value={newSession.subgenres}
                              selectedValue={curatedSelections.subgenres}
                              customValue={curatedCustomValues.subgenres}
                              onSelectedValueChange={(nextValue) =>
                                setCuratedSelections((current) => ({ ...current, subgenres: nextValue }))
                              }
                              onCustomValueChange={(nextValue) =>
                                setCuratedCustomValues((current) => ({ ...current, subgenres: nextValue }))
                              }
                              onValueChange={(nextValue) =>
                                setNewSession((current) => ({ ...current, subgenres: nextValue }))
                              }
                            />
                            <AdminCuratedSingleField
                              label="Energy Level"
                              options={ENERGY_OPTIONS}
                              value={newSession.energy}
                              customValue={curatedCustomValues.energy}
                              onCustomValueChange={(nextValue) =>
                                setCuratedCustomValues((current) => ({ ...current, energy: nextValue }))
                              }
                              onValueChange={(nextValue) =>
                                setNewSession((current) => ({ ...current, energy: nextValue }))
                              }
                            />
                            <AdminCuratedMultiField
                              label="Music Moods"
                              options={MUSIC_MOOD_OPTIONS}
                              value={newSession.musicMoods}
                              selectedValue={curatedSelections.musicMoods}
                              customValue={curatedCustomValues.musicMoods}
                              onSelectedValueChange={(nextValue) =>
                                setCuratedSelections((current) => ({ ...current, musicMoods: nextValue }))
                              }
                              onCustomValueChange={(nextValue) =>
                                setCuratedCustomValues((current) => ({ ...current, musicMoods: nextValue }))
                              }
                              onValueChange={(nextValue) =>
                                setNewSession((current) => ({ ...current, musicMoods: nextValue }))
                              }
                            />
                            <AdminCuratedMultiField
                              label="Instruments"
                              options={INSTRUMENT_OPTIONS}
                              value={newSession.instruments}
                              selectedValue={curatedSelections.instruments}
                              customValue={curatedCustomValues.instruments}
                              onSelectedValueChange={(nextValue) =>
                                setCuratedSelections((current) => ({ ...current, instruments: nextValue }))
                              }
                              onCustomValueChange={(nextValue) =>
                                setCuratedCustomValues((current) => ({ ...current, instruments: nextValue }))
                              }
                              onValueChange={(nextValue) =>
                                setNewSession((current) => ({ ...current, instruments: nextValue }))
                              }
                            />
                            <label>
                              <span>BPM</span>
                              <input
                                type="text"
                                value={newSession.bpm}
                                onChange={(event) => setNewSession((current) => ({
                                  ...current,
                                  bpm: event.target.value,
                                  beat: event.target.value,
                                }))}
                              />
                            </label>
                            <AdminCuratedSingleField
                              label="Key"
                              options={KEY_OPTIONS}
                              value={newSession.musicalKey}
                              customValue={curatedCustomValues.musicalKey}
                              onCustomValueChange={(nextValue) =>
                                setCuratedCustomValues((current) => ({ ...current, musicalKey: nextValue }))
                              }
                              onValueChange={(nextValue) =>
                                setNewSession((current) => ({ ...current, musicalKey: nextValue }))
                              }
                            />
                            <AdminCuratedMultiField
                              label="Vocals"
                              options={VOCAL_OPTIONS}
                              value={newSession.vocals}
                              selectedValue={curatedSelections.vocals}
                              customValue={curatedCustomValues.vocals}
                              onSelectedValueChange={(nextValue) =>
                                setCuratedSelections((current) => ({ ...current, vocals: nextValue }))
                              }
                              onCustomValueChange={(nextValue) =>
                                setCuratedCustomValues((current) => ({ ...current, vocals: nextValue }))
                              }
                              onValueChange={(nextValue) =>
                                setNewSession((current) => ({ ...current, vocals: nextValue }))
                              }
                            />
                          </div>
                        </section>

                        <section className="admin-live-metadata-group">
                          <div className="admin-live-metadata-head">
                            <p className="detail-label">LYRICS METADATA</p>
                            <span>Meaning + language profile</span>
                          </div>
                          <div className="admin-item-grid admin-live-lyrics-grid">
                            <label className="admin-item-grid-span">
                              <span>Lyrics Summary</span>
                              <input
                                type="text"
                                value={newSession.lyricsSummary}
                                onChange={(event) => setNewSession((current) => ({ ...current, lyricsSummary: event.target.value }))}
                              />
                            </label>
                            <label>
                              <span>Lyrics Moods</span>
                              <input
                                type="text"
                                value={newSession.lyricsMoods}
                                onChange={(event) => setNewSession((current) => ({ ...current, lyricsMoods: event.target.value }))}
                              />
                            </label>
                            <label>
                              <span>Lyrics Energy</span>
                              <input
                                type="text"
                                value={newSession.lyricsEnergy}
                                onChange={(event) => setNewSession((current) => ({ ...current, lyricsEnergy: event.target.value }))}
                              />
                            </label>
                            <label>
                              <span>Themes</span>
                              <input
                                type="text"
                                value={newSession.themes}
                                onChange={(event) => setNewSession((current) => ({ ...current, themes: event.target.value }))}
                              />
                            </label>
                            <label>
                              <span>Lyrics Language</span>
                              <input
                                type="text"
                                value={newSession.lyricsLanguage}
                                onChange={(event) => setNewSession((current) => ({
                                  ...current,
                                  lyricsLanguage: event.target.value,
                                  language: event.target.value,
                                }))}
                              />
                            </label>
                            <label>
                              <span>Explicit</span>
                              <input
                                type="text"
                                value={newSession.explicit}
                                onChange={(event) => setNewSession((current) => ({ ...current, explicit: event.target.value }))}
                              />
                            </label>
                          </div>
                        </section>
                      </div>
                    </div>
                    <div className="admin-upload-card admin-live-smart-card">
                      <div className="admin-upload-card-head">
                        <p className="detail-label">UPLOAD SONG</p>
                        <span>{uploadedAudioName || 'Audio metadata autofill'}</span>
                      </div>
                      <label className="admin-upload-field">
                        <span>Audio File</span>
                        <input
                          type="file"
                          accept="audio/*"
                          onChange={async (event) => {
                            const file = event.target.files?.[0];

                            if (!file) {
                              return;
                            }

                          setUploadedAudioName(file.name);
                          setAudioUploadStatus('');
                          setIsExtractingAudioMetadata(true);

                          try {
                            const [metadata, uploadResult] = await Promise.all([
                              extractAudioFileMetadata(file),
                              onUploadLiveSessionAudio(file),
                            ]);
                            const nextDraft = {
                              ...newSession,
                              track: metadata.track || newSession.track,
                              artist: metadata.artist || newSession.artist,
                              duration: metadata.duration || newSession.duration,
                              audioUrl: uploadResult.item?.audioUrl || newSession.audioUrl,
                              audioPublicId: uploadResult.item?.audioPublicId || newSession.audioPublicId,
                              audioOriginalName: uploadResult.item?.audioOriginalName || file.name,
                            };
                            setNewSession((current) => ({
                              ...current,
                              track: metadata.track || current.track,
                              artist: metadata.artist || current.artist,
                              duration: metadata.duration || current.duration,
                              audioUrl: uploadResult.item?.audioUrl || current.audioUrl,
                              audioPublicId: uploadResult.item?.audioPublicId || current.audioPublicId,
                              audioOriginalName: uploadResult.item?.audioOriginalName || file.name,
                            }));
                            await analyzeSessionDraft(nextDraft);
                          } catch (error) {
                            setAudioUploadStatus(
                              error.message || 'Song upload or metadata extraction failed.',
                            );
                          } finally {
                              setIsExtractingAudioMetadata(false);
                              event.target.value = '';
                            }
                          }}
                        />
                      </label>
                      <p className="admin-helper-copy">
                        {isExtractingAudioMetadata
                          ? 'Reading audio metadata...'
                          : isAnalyzingLiveSession
                            ? 'Cyanite is completing artist, energy level, beat, and the rest of the track profile...'
                            : audioUploadStatus || 'Upload an audio file to autofill the song title, then let Cyanite complete the available analysis metadata.'}
                      </p>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => analyzeSessionDraft(newSession)}
                        disabled={isAnalyzingLiveSession || (!newSession.track && !newSession.audioUrl)}
                      >
                        {isAnalyzingLiveSession ? 'Analyzing...' : 'Complete With Cyanite'}
                      </button>
                    </div>
                  </div>
                </form>
                  </div>
                ) : liveSummaryTab === 'table' ? (
                  <div className="admin-live-summary-grid admin-live-sessions-viewport">
                    <div className="admin-live-session-table-slot">
                        <LiveSessionTable
                          sessions={liveSessions}
                          onDeleteSession={onDeleteLiveSession}
                        />
                    </div>
                  </div>
                ) : (
                  <div className="admin-live-summary-grid admin-live-sessions-viewport">
                    <div className="admin-request-section admin-live-request-section">
                        <div className="admin-request-section-head">
                          <p className="detail-label">AUDIENCE REQUESTS</p>
                          <span>{`${liveRequests.length} ITEMS`}</span>
                        </div>
                        {requestActionStatus ? (
                          <p className="admin-request-feedback" role="status">
                            {requestActionStatus}
                          </p>
                        ) : null}
                        <div className="admin-request-table-shell">
                          <table className="admin-request-action-status">
                            <thead>
                              <tr>
                                <th scope="col">Song</th>
                                <th scope="col">Artist</th>
                                <th scope="col">Requested By</th>
                                <th scope="col">Source</th>
                                <th scope="col">Queue Fit</th>
                                <th scope="col">Status</th>
                                <th scope="col">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {liveRequests.length ? (
                                liveRequests.map((item) => {
                                  const requestStatus = item.requestStatus || 'pending_admin';

                                  return (
                                    <tr key={item.id}>
                                      <th scope="row">
                                        <strong>{item.track || 'Track pending'}</strong>
                                        <span>{item.aiSummary || item.message || 'Analysis pending'}</span>
                                      </th>
                                      <td>{item.artist || 'Artist pending'}</td>
                                      <td>{item.requesterName || 'Audience'}</td>
                                      <td>
                                        <span className={`admin-request-badge admin-request-badge-${requestStatus}`}>
                                          {item.sourcePlatform || 'manual'}
                                        </span>
                                        {item.sourceUrl ? (
                                          <a
                                            className="admin-request-link"
                                            href={item.sourceUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                          >
                                            Open link
                                          </a>
                                        ) : null}
                                      </td>
                                      <td>{item.suggestedInsertLabel || 'Queue suggestion pending'}</td>
                                      <td>
                                        <span className={`admin-request-status admin-request-status-${requestStatus}`}>
                                          {requestStatus.replaceAll('_', ' ')}
                                        </span>
                                      </td>
                                      <td>
                                        <div className="admin-request-actions admin-request-table-actions">
                                          {requestStatus === 'pending_admin' ? (
                                            <>
                                              <button
                                                type="button"
                                                className="primary-button"
                                                onClick={() => onReviewLiveRequest(item.id, { decision: 'approved' })}
                                              >
                                                APPROVE
                                              </button>
                                              <button
                                                type="button"
                                                className="secondary-button"
                                                onClick={() => onReviewLiveRequest(item.id, { decision: 'rejected' })}
                                              >
                                                REJECT
                                              </button>
                                            </>
                                          ) : null}
                                          <button
                                            type="button"
                                            className="admin-request-delete-button"
                                            onClick={() => handleDeleteAudienceRequest(item)}
                                            disabled={deletingRequestId === item.id}
                                            aria-label={`Delete request for ${item.track}`}
                                            title="Delete request"
                                          >
                                            <Trash2 size={15} aria-hidden="true" />
                                            <span className="sr-only">
                                              {deletingRequestId === item.id ? 'Deleting request' : 'Delete request'}
                                            </span>
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                              ) : (
                                <tr>
                                  <td colSpan="7" className="admin-request-table-empty">
                                    No audience requests have been transmitted yet.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section id="admin-archive" className="admin-panel admin-archive-panel">
            <div className="section-label admin-panel-head">
              <p className="section-number">
                <span className="section-number-mark">KN//</span>
                <span className="section-number-value">02</span>
              </p>
              <h2>ARCHIVE</h2>
            </div>

            <div className="admin-archive-layout">
              <div className="admin-archive-create-viewport admin-archive-viewport">
                <form
                  className="admin-create-form admin-archive-create-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onAddArchiveItem(newArchiveItem);
                    setNewArchiveItem(blankArchiveItem());
                  }}
                >
                  <h3>Add Archive Work</h3>
                  <div className="admin-live-create-cards admin-archive-create-cards">
                    <div className="admin-live-manual-card admin-archive-main-card">
                      <div className="admin-live-metadata-groups">
                        <section className="admin-live-metadata-group">
                          <div className="admin-live-metadata-head">
                            <p className="detail-label">ARCHIVE CONTENT</p>
                            <span>Core piece information</span>
                          </div>
                          <div className="admin-item-grid admin-live-metadata-grid admin-archive-metadata-grid">
                            <label>
                              <span>Title</span>
                              <input
                                type="text"
                                value={newArchiveItem.title}
                                onChange={(event) =>
                                  setNewArchiveItem((current) => ({ ...current, title: event.target.value }))
                                }
                              />
                            </label>
                            <label>
                              <span>Artist</span>
                              <input
                                type="text"
                                value={newArchiveItem.artist}
                                onChange={(event) =>
                                  setNewArchiveItem((current) => ({ ...current, artist: event.target.value }))
                                }
                              />
                            </label>
                            <label>
                              <span>Category</span>
                              <select
                                value={newArchiveItem.category}
                                onChange={(event) =>
                                  setNewArchiveItem((current) => ({ ...current, category: event.target.value }))
                                }
                              >
                                {selectableArchiveFilters.map((filter) => (
                                  <option key={filter} value={filter}>
                                    {filter}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <span>Genre</span>
                              <input
                                type="text"
                                value={newArchiveItem.genre}
                                onChange={(event) =>
                                  setNewArchiveItem((current) => ({ ...current, genre: event.target.value }))
                                }
                              />
                            </label>
                            <label>
                              <span>Duration</span>
                              <input
                                type="text"
                                value={newArchiveItem.duration}
                                onChange={(event) =>
                                  setNewArchiveItem((current) => ({ ...current, duration: event.target.value }))
                                }
                              />
                            </label>
                            <label>
                              <span>Location</span>
                              <input
                                type="text"
                                value={newArchiveItem.location}
                                onChange={(event) =>
                                  setNewArchiveItem((current) => ({ ...current, location: event.target.value }))
                                }
                              />
                            </label>
                            <label>
                              <span>Date</span>
                              <input
                                type="text"
                                value={newArchiveItem.date}
                                onChange={(event) =>
                                  setNewArchiveItem((current) => ({ ...current, date: event.target.value }))
                                }
                              />
                            </label>
                            <label className="admin-item-grid-span">
                              <span>Description</span>
                              <textarea
                                rows="4"
                                value={newArchiveItem.description}
                                onChange={(event) =>
                                  setNewArchiveItem((current) => ({ ...current, description: event.target.value }))
                                }
                              />
                            </label>
                          </div>
                        </section>
                      </div>
                    </div>

                    <div className="admin-live-manual-card admin-archive-side-card">
                      <div className="admin-live-metadata-groups">
                        <section className="admin-live-metadata-group">
                          <div className="admin-live-metadata-head">
                            <p className="detail-label">MEDIA DETAILS</p>
                            <span>Asset + accessibility</span>
                          </div>
                          <div className="admin-item-grid admin-live-lyrics-grid admin-archive-media-grid">
                            <label>
                              <span>Media Type</span>
                              <input
                                type="text"
                                value={newArchiveItem.mediaType}
                                onChange={(event) =>
                                  setNewArchiveItem((current) => ({ ...current, mediaType: event.target.value }))
                                }
                              />
                            </label>
                            <label>
                              <span>Image URL / Path</span>
                              <input
                                type="text"
                                value={newArchiveItem.image}
                                onChange={(event) =>
                                  setNewArchiveItem((current) => ({ ...current, image: event.target.value }))
                                }
                              />
                            </label>
                            <label>
                              <span>Audio URL</span>
                              <input
                                type="text"
                                value={newArchiveItem.audioUrl}
                                onChange={(event) =>
                                  setNewArchiveItem((current) => ({ ...current, audioUrl: event.target.value }))
                                }
                              />
                            </label>
                            <label className="admin-item-grid-span">
                              <span>Alt Text</span>
                              <input
                                type="text"
                                value={newArchiveItem.alt}
                                onChange={(event) =>
                                  setNewArchiveItem((current) => ({ ...current, alt: event.target.value }))
                                }
                              />
                            </label>
                          </div>
                        </section>
                      </div>
                    </div>
                  </div>
                  <button type="submit" className="primary-button">
                    Add Archive Work
                  </button>
                </form>
              </div>

              <div className="admin-archive-summary-grid admin-archive-viewport">
                <div className="admin-archive-tabs-shell">
                  <div className="admin-archive-table-head">
                    <p className="detail-label">ARCHIVE TABLE</p>
                    <span>{`${archiveItems.length} ITEMS`}</span>
                  </div>

                  <div className="admin-archive-tab-panel">
                    <div className="admin-archive-preview-panel">
                      <div className="admin-archive-table-panel">
                        <div className="filter-row" role="tablist" aria-label="Archive categories">
                          {archiveFilters.map((filter) => {
                            const isActive = adminArchiveFilter === filter;
                            return (
                              <button
                                key={filter}
                                type="button"
                                role="tab"
                                aria-selected={isActive}
                                className={isActive ? 'is-active' : ''}
                                onClick={() => setAdminArchiveFilter(filter)}
                              >
                                {filter}
                              </button>
                            );
                          })}
                        </div>

                        <div className="admin-archive-table" role="table" aria-label="Archive items">
                          <div className="admin-archive-row admin-archive-row-head" role="row">
                            <span role="columnheader">Title</span>
                            <span role="columnheader">Artist</span>
                            <span role="columnheader">Genre</span>
                            <span role="columnheader">Duration</span>
                            <span role="columnheader">Date</span>
                            <span role="columnheader">Preview</span>
                          </div>

                          {filteredArchiveItems.map((item) => (
                            <div key={item.id} className="admin-archive-row" role="row">
                              <strong role="cell">{item.title}</strong>
                              <span role="cell">{item.artist || 'Pending'}</span>
                              <span role="cell">{item.genre || 'Pending'}</span>
                              <span role="cell">{item.duration || 'Pending'}</span>
                              <span role="cell">{item.date || 'Pending'}</span>
                              <span role="cell">{item.audioUrl ? 'Ready' : 'Missing'}</span>
                            </div>
                          ))}

                          {!filteredArchiveItems.length ? (
                            <p className="admin-helper-copy">No archive items in this category yet.</p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </section>
          <AdminServicesPanel
            requests={serviceRequests}
            onPublishQuote={onPublishServiceQuote}
          />
        </div>
      </section>
    </main>
  );
}

export default AdminPage;
