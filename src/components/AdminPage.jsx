import { Pause, Play, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import LiveSessionTable from './LiveSessionTable';

const LEGACY_LIVE_STREAM_TITLES = new Set([
  'Khalil Nahhat Live DJ Session',
  'Soft Music',
]);

const DEFAULT_OFFLINE_STATUS = 'Offline until Khalil starts the next OBS stream.';
const PAUSED_STATUS = 'Live paused.';
const LIVE_STATUS = 'Live now.';

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
    category: 'Live',
    location: '',
    date: '',
    mediaType: 'Photo',
    image: '',
    alt: '',
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

function formatDurationFromSeconds(totalSeconds) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) {
    return '';
  }

  const roundedSeconds = Math.round(totalSeconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const seconds = roundedSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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
      cleanup();
      resolve({
        track: formatTrackNameFromFile(file.name),
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
    setAudioUploadStatus('Analysis is running on the uploaded song to complete the session fields...');

    try {
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
      setAudioUploadStatus(
        analyzed.summary ||
          'Analysis completed the remaining live-session fields. Review and save when ready.',
      );
    } catch (error) {
      setAudioUploadStatus(error.message || 'Analysis could not complete this session right now.');
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
              <button type="submit" form="admin-live-session-form" className="primary-button admin-panel-head-action">
                Add Session
              </button>
            </div>

            <div className="admin-live-sessions-layout">
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
                            <label>
                              <span>Genres</span>
                              <input
                                type="text"
                                value={newSession.genres}
                                onChange={(event) => setNewSession((current) => ({
                                  ...current,
                                  genres: event.target.value,
                                  genre: event.target.value.split(',')[0]?.trim() || current.genre,
                                }))}
                              />
                            </label>
                            <label>
                              <span>Subgenres</span>
                              <input
                                type="text"
                                value={newSession.subgenres}
                                onChange={(event) => setNewSession((current) => ({ ...current, subgenres: event.target.value }))}
                              />
                            </label>
                            <label>
                              <span>Energy Level</span>
                              <input
                                type="text"
                                value={newSession.energy}
                                onChange={(event) => setNewSession((current) => ({ ...current, energy: event.target.value }))}
                              />
                            </label>
                            <label>
                              <span>Music Moods</span>
                              <input
                                type="text"
                                value={newSession.musicMoods}
                                onChange={(event) => setNewSession((current) => ({ ...current, musicMoods: event.target.value }))}
                              />
                            </label>
                            <label>
                              <span>Instruments</span>
                              <input
                                type="text"
                                value={newSession.instruments}
                                onChange={(event) => setNewSession((current) => ({ ...current, instruments: event.target.value }))}
                              />
                            </label>
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
                            <label>
                              <span>Key</span>
                              <input
                                type="text"
                                value={newSession.musicalKey}
                                onChange={(event) => setNewSession((current) => ({ ...current, musicalKey: event.target.value }))}
                              />
                            </label>
                            <label>
                              <span>Vocals</span>
                              <input
                                type="text"
                                value={newSession.vocals}
                                onChange={(event) => setNewSession((current) => ({ ...current, vocals: event.target.value }))}
                              />
                            </label>
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
                              duration: metadata.duration || newSession.duration,
                              audioUrl: uploadResult.item?.audioUrl || newSession.audioUrl,
                              audioPublicId: uploadResult.item?.audioPublicId || newSession.audioPublicId,
                              audioOriginalName: uploadResult.item?.audioOriginalName || file.name,
                            };
                            setNewSession((current) => ({
                              ...current,
                              track: metadata.track || current.track,
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
                            ? 'Analysis is completing artist, energy level, beat, and the rest of the track profile...'
                            : audioUploadStatus || 'Upload an audio file to autofill the song title, then complete the rest of the music and lyrics analysis metadata.'}
                      </p>
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => analyzeSessionDraft(newSession)}
                        disabled={isAnalyzingLiveSession || (!newSession.track && !newSession.audioUrl)}
                      >
                        {isAnalyzingLiveSession ? 'Analyzing...' : 'Complete Analysis'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              <div className="admin-live-summary-grid admin-live-sessions-viewport">
                <div className="admin-live-tabs-shell">
                  <div className="admin-live-tabs" role="tablist" aria-label="Live session summary views">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={liveSummaryTab === 'table'}
                      className={`admin-live-tab${liveSummaryTab === 'table' ? ' is-active' : ''}`}
                      onClick={() => setLiveSummaryTab('table')}
                    >
                      {`SESSION TABLE (${liveSessions.length})`}
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={liveSummaryTab === 'requests'}
                      className={`admin-live-tab${liveSummaryTab === 'requests' ? ' is-active' : ''}`}
                      onClick={() => setLiveSummaryTab('requests')}
                    >
                      {`AUDIENCE REQUESTS (${liveRequests.length})`}
                    </button>
                  </div>

                  <div className="admin-live-tab-panel">
                    {liveSummaryTab === 'table' ? (
                      <div className="admin-live-session-table-slot">
                        <LiveSessionTable
                          sessions={liveSessions}
                          onDeleteSession={onDeleteLiveSession}
                        />
                      </div>
                    ) : (
                      <div className="admin-request-section admin-live-request-section">
                        <div className="admin-request-section-head">
                          <p className="detail-label">AUDIENCE REQUESTS</p>
                          <span>{`${liveRequests.length} ITEMS`}</span>
                        </div>
                        <div className="admin-list">
                          {liveRequests.length ? (
                            liveRequests.map((item) => (
                              <article key={item.id} className="admin-item-card">
                                <div className="admin-request-head">
                                  <div>
                                    <p className="detail-label">{item.requestStatus.replace('_', ' ')}</p>
                                    <h3>{item.track}</h3>
                                  </div>
                                  <span className={`admin-request-badge admin-request-badge-${item.requestStatus}`}>
                                    {item.sourcePlatform || 'manual'}
                                  </span>
                                </div>
                                <div className="admin-request-meta">
                                  <span>{item.requesterName || 'Audience'}</span>
                                  <span>{item.artist || 'Artist pending'}</span>
                                  <span>{item.suggestedInsertLabel || 'Queue suggestion pending'}</span>
                                </div>
                                <p className="admin-helper-copy">{item.aiSummary || item.message}</p>
                                {item.sourceUrl ? (
                                  <a className="admin-request-link" href={item.sourceUrl} target="_blank" rel="noreferrer">
                                    Open source link
                                  </a>
                                ) : null}
                                {item.requestStatus === 'pending_admin' ? (
                                  <div className="admin-request-actions">
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
                                  </div>
                                ) : null}
                              </article>
                            ))
                          ) : (
                            <p className="admin-helper-copy">No audience requests have been transmitted yet.</p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

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
                            <span role="columnheader">Category</span>
                            <span role="columnheader">Location</span>
                            <span role="columnheader">Date</span>
                            <span role="columnheader">Media</span>
                          </div>

                          {filteredArchiveItems.map((item) => (
                            <div key={item.id} className="admin-archive-row" role="row">
                              <strong role="cell">{item.title}</strong>
                              <span role="cell">{item.category}</span>
                              <span role="cell">{item.location || 'Pending'}</span>
                              <span role="cell">{item.date || 'Pending'}</span>
                              <span role="cell">{item.mediaType || 'Pending'}</span>
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
        </div>
      </section>
    </main>
  );
}

export default AdminPage;
