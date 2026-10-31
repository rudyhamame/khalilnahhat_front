import AdminSelect from './AdminSelect';
import YouTubeConnection from './YouTubeConnection';
import ObsBroadcast from './ObsBroadcast';
import WebrtcViewer from './WebrtcViewer';
import AdminWorkspace from './AdminWorkspace';
import { Upload, ImagePlus, Music2, Disc3, Search, Radio, Trash2, Video, VideoOff, Maximize2, Minimize2, Archive, CalendarDays, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import AdminServicesPanel from './AdminServicesPanel';
import AdminCatalogPanel from './AdminCatalogPanel';
import { GalleryImageField } from '../echo/GalleryPicker';
import AdminTransactionsPanel from './AdminTransactionsPanel';
import AdminAudienceRequestsPanel from './AdminAudienceRequestsPanel';
import AdminAudienceComments from './AdminAudienceComments';
import DjServiceBuilder from './DjServiceBuilder';
import LiveSessionTable from './LiveSessionTable';
import LiveGoalPicker from './LiveGoalPicker';
import RegisteredClients from './RegisteredClients';
import MicLevelMeter from './MicLevelMeter';
import { useWebrtcBroadcast } from '../hooks/useWebrtcBroadcast';

const DEFAULT_OFFLINE_STATUS = 'Offline until Khalil starts the next OBS stream.';
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

const TRACK_CLASS_OPTIONS = [
  'DJ Edit / Re-edit',
  'Bootleg',
  'Mashup',
  'VIP (Variation in Production)',
  'Remix',
];

const LANGUAGE_OPTIONS = [
  'Instrumental',
  'English',
  'Arabic',
  'French',
  'Spanish',
  'Portuguese',
  'Italian',
  'German',
  'Turkish',
  'Mixed',
];

function blankSession() {
  return {
    track: '',
    artist: '',
    duration: '',
    trackClass: '',
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
    audioUrl: '',
    audioPublicId: '',
    audioOriginalName: '',
    coverImage: '',
    coverPublicId: '',
    coverOriginalName: '',
    coverZoom: 1,
    coverPositionX: 50,
    coverPositionY: 50,
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
    coverImage: '',
    coverPublicId: '',
    coverOriginalName: '',
    coverZoom: 1,
    coverPositionX: 50,
    coverPositionY: 50,
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
      cleanup();
      resolve({
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
        <AdminSelect
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
        </AdminSelect>
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
      <AdminSelect
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
      </AdminSelect>
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

function AdminSongMetadataFields({
  draft,
  setDraft,
  curatedSelections,
  setCuratedSelections,
  curatedCustomValues,
  setCuratedCustomValues,
  uploadedAudioName,
  audioUploadStatus,
  isExtractingAudioMetadata,
  onUploadAudio,
  onUploadCover,
  coverUploadStatus,
  token,
  title = 'Add Archive Work',
  compactEditor = false,
}) {
  const update = (field, value) => setDraft((current) => ({ ...current, [field]: value }));
  const coverDragRef = useRef(null);

  const handleAudioUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const [metadata, uploadResult] = await Promise.all([
        extractAudioFileMetadata(file),
        onUploadAudio(file),
      ]);
      const uploaded = uploadResult.item || {};
      const nextDraft = {
        ...draft,
        duration: metadata.duration || draft.duration,
        audioUrl: uploaded.audioUrl || draft.audioUrl,
        audioPublicId: uploaded.audioPublicId || draft.audioPublicId,
        audioOriginalName: uploaded.audioOriginalName || file.name,
      };
      setDraft((current) => ({ ...current, ...nextDraft }));
    } finally {
      event.target.value = '';
    }
  };

  const handleCoverPointerDown = (event) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    coverDragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      positionX: Number(draft.coverPositionX ?? 50),
      positionY: Number(draft.coverPositionY ?? 50),
    };
  };

  const handleCoverPointerMove = (event) => {
    const drag = coverDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const nextPositionX = Math.max(0, Math.min(100, drag.positionX + ((event.clientX - drag.startX) / rect.width) * 100));
    const nextPositionY = Math.max(0, Math.min(100, drag.positionY + ((event.clientY - drag.startY) / rect.height) * 100));
    update('coverPositionX', Math.round(nextPositionX));
    update('coverPositionY', Math.round(nextPositionY));
  };

  const handleCoverPointerUp = (event) => {
    if (coverDragRef.current?.pointerId === event.pointerId) {
      coverDragRef.current = null;
    }
  };

  const handleCoverWheel = (event) => {
    event.preventDefault();
    const nextZoom = Math.max(1, Math.min(2.5, Number(draft.coverZoom || 1) - (event.deltaY * 0.0015)));
    update('coverZoom', Number(nextZoom.toFixed(2)));
  };

  return (
    <>
      <h3>{title}</h3>
      <div className="admin-live-create-cards admin-archive-song-create-cards">
        <div className="admin-live-manual-card">
          <div className="admin-live-metadata-groups">
            <section className="admin-live-metadata-group admin-live-song-info-group">
              <div className="admin-live-metadata-head"><p className="detail-label">SONG INFO</p><span>Track identity</span></div>
              <div className="admin-item-grid admin-live-song-info-grid">
                <label className="admin-upload-card admin-live-smart-card">
                  <div className="admin-upload-card-head">
                    <p className="detail-label">{compactEditor ? 'Audio file' : 'UPLOAD SONG'}</p>
                    <span>{uploadedAudioName}</span>
                  </div>
                  <span className="admin-upload-field">
                    <input type="file" accept="audio/*" onChange={handleAudioUpload} className={compactEditor ? 'archive-upload-input' : undefined} aria-label="Upload audio file" />
                    {compactEditor ? <span className="archive-upload-action"><Upload size={18} aria-hidden="true" /><span><strong>{uploadedAudioName || 'Choose an audio file'}</strong><small>Browse your files</small></span></span> : null}
                  </span>
                  <p className="admin-helper-copy">
                    {isExtractingAudioMetadata
                      ? 'Reading audio metadata...'
                      : audioUploadStatus}
                  </p>
                </label>
                {[
                  ['Song / Music', 'track'], ['Artist', 'artist'], ['Duration', 'duration'],
                ].map(([label, field]) => (
                  <label key={field}>
                    <span>{compactEditor && field === 'track' ? 'Track title' : label}</span>
                    <input
                      value={draft[field] || ''}
                      onChange={(event) => update(field, event.target.value)}
                      readOnly={field === 'duration'}
                      aria-readonly={field === 'duration'}
                      placeholder={field === 'duration' ? 'Detected from audio' : compactEditor ? (field === 'track' ? 'Name of your track' : 'Artist name') : ''}
                    />
                  </label>
                ))}
                <label>
                  <span>Language</span>
                  <AdminSelect value={draft.language || ''} onChange={(event) => update('language', event.target.value)}>
                    <option value="">Select language</option>
                    {LANGUAGE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </AdminSelect>
                </label>
                <div className="admin-cover-upload-field admin-upload-card admin-live-smart-card">
                  <div className="admin-cover-upload-head admin-upload-card-head">
                    <span>Image Cover Upload</span>
                    <small>Square 1:1 cover</small>
                  </div>
                  <GalleryImageField token={token} label="Cover image" value={draft.coverImage} onChange={(url) => setDraft((current) => ({ ...current, coverImage: url, coverPublicId: '', coverOriginalName: '' }))} />
                  {draft.coverImage ? (
                    <div className="admin-cover-editor" style={{ '--cover-position-x': `${draft.coverPositionX || 50}%`, '--cover-position-y': `${draft.coverPositionY || 50}%`, '--cover-zoom': draft.coverZoom || 1 }}>
                      <div
                        className="admin-cover-preview"
                        onPointerDown={handleCoverPointerDown}
                        onPointerMove={handleCoverPointerMove}
                        onPointerUp={handleCoverPointerUp}
                        onPointerCancel={handleCoverPointerUp}
                        onWheel={handleCoverWheel}
                        title="Drag to pan. Scroll or pinch to zoom."
                      >
                        <img src={draft.coverImage} alt="Song cover preview" draggable="false" />
                      </div>
                    </div>
                  ) : null}
                  {coverUploadStatus ? <small>{coverUploadStatus}</small> : null}
                </div>
                <label><span>Class</span><AdminSelect value={draft.trackClass || ''} onChange={(event) => update('trackClass', event.target.value)}><option value="">Standard</option>{TRACK_CLASS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}</AdminSelect></label>
              </div>
            </section>

            <section className="admin-live-metadata-group">
              <div className="admin-live-metadata-head"><p className="detail-label">MUSIC METADATA</p><span>Sonic profile</span></div>
              <div className="admin-item-grid admin-live-metadata-grid">
                <AdminCuratedMultiField label="Genres" options={GENRE_OPTIONS} value={draft.genres} selectedValue={curatedSelections.genres} customValue={curatedCustomValues.genres} onSelectedValueChange={(value) => setCuratedSelections((current) => ({ ...current, genres: value }))} onCustomValueChange={(value) => setCuratedCustomValues((current) => ({ ...current, genres: value }))} onValueChange={(value) => setDraft((current) => ({ ...current, genres: value, genre: value.split(',')[0]?.trim() || current.genre }))} />
                <AdminCuratedMultiField label="Subgenres" options={SUBGENRE_OPTIONS} value={draft.subgenres} selectedValue={curatedSelections.subgenres} customValue={curatedCustomValues.subgenres} onSelectedValueChange={(value) => setCuratedSelections((current) => ({ ...current, subgenres: value }))} onCustomValueChange={(value) => setCuratedCustomValues((current) => ({ ...current, subgenres: value }))} onValueChange={(value) => update('subgenres', value)} />
                <AdminCuratedSingleField label="Energy Level" options={ENERGY_OPTIONS} value={draft.energy} customValue={curatedCustomValues.energy} onCustomValueChange={(value) => setCuratedCustomValues((current) => ({ ...current, energy: value }))} onValueChange={(value) => update('energy', value)} />
                <AdminCuratedMultiField label="Music Moods" options={MUSIC_MOOD_OPTIONS} value={draft.musicMoods} selectedValue={curatedSelections.musicMoods} customValue={curatedCustomValues.musicMoods} onSelectedValueChange={(value) => setCuratedSelections((current) => ({ ...current, musicMoods: value }))} onCustomValueChange={(value) => setCuratedCustomValues((current) => ({ ...current, musicMoods: value }))} onValueChange={(value) => update('musicMoods', value)} />
                <AdminCuratedMultiField label="Instruments" options={INSTRUMENT_OPTIONS} value={draft.instruments} selectedValue={curatedSelections.instruments} customValue={curatedCustomValues.instruments} onSelectedValueChange={(value) => setCuratedSelections((current) => ({ ...current, instruments: value }))} onCustomValueChange={(value) => setCuratedCustomValues((current) => ({ ...current, instruments: value }))} onValueChange={(value) => update('instruments', value)} />
                <label><span>BPM / Beat</span><input value={draft.bpm || ''} onChange={(event) => setDraft((current) => ({ ...current, bpm: event.target.value, beat: event.target.value }))} /></label>
                <AdminCuratedSingleField label="Key" options={KEY_OPTIONS} value={draft.musicalKey} customValue={curatedCustomValues.musicalKey} onCustomValueChange={(value) => setCuratedCustomValues((current) => ({ ...current, musicalKey: value }))} onValueChange={(value) => update('musicalKey', value)} />
                <AdminCuratedMultiField label="Vocals" options={VOCAL_OPTIONS} value={draft.vocals} selectedValue={curatedSelections.vocals} customValue={curatedCustomValues.vocals} onSelectedValueChange={(value) => setCuratedSelections((current) => ({ ...current, vocals: value }))} onCustomValueChange={(value) => setCuratedCustomValues((current) => ({ ...current, vocals: value }))} onValueChange={(value) => update('vocals', value)} />
              </div>
            </section>

          </div>
        </div>
      </div>
    </>
  );
}

function AdminPage({
  activePanel = 'live-stream',
  username,
  token,
  onLiveStreamChange,
  liveSessions,
  liveStream,
  liveRequests,
  serviceRequests,
  servicePrices,
  transactions,
  archiveItems,
  archiveFilters,
  onLogout,
  onGoLiveWebrtc,
  onEndLiveWebrtc,
  onAddLiveSession,
  onUploadLiveSessionAudio,
  onUploadLiveSessionCover,
  onDeleteLiveSession,
  onReviewLiveRequest,
  onDeleteLiveRequest,
  onConvertLiveRequestToWav,
  onPublishServiceQuote,
  onQuoteAction,
  confirmedBookings = [],
  onUpdateAdminPrice,
  onRefreshTransactions,
  onAddArchiveItem,
}) {
  const [previewAudioControlsTarget, setPreviewAudioControlsTarget] = useState(null);
  const [broadcastSource, setBroadcastSource] = useState('obs');
  const [newSession, setNewSession] = useState(blankSession());
  const [archiveEditorTab, setArchiveEditorTab] = useState('track');
  const [archiveYoutubeUrl, setArchiveYoutubeUrl] = useState('');
  const [archiveSaving, setArchiveSaving] = useState(false);
  const [archiveSaveStatus, setArchiveSaveStatus] = useState('');
  const archiveSavingRef = useRef(false);
  const [archiveSearch, setArchiveSearch] = useState('');
  const [newArchiveItem, setNewArchiveItem] = useState(blankArchiveItem());
  const liveSummaryTab = 'table';
  const [liveStreamTab, setLiveStreamTab] = useState('stream');
  // Full screen for the live window (the preview frame).
  const liveFrame = useRef(null);
  const [liveFullscreen, setLiveFullscreen] = useState(false);
  useEffect(() => {
    const sync = () => setLiveFullscreen(Boolean(liveFrame.current) && document.fullscreenElement === liveFrame.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);
  const toggleLiveFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.();
    else liveFrame.current?.requestFullscreen?.().catch(() => {});
  };
  const [uploadedAudioName, setUploadedAudioName] = useState('');
  const [audioUploadStatus, setAudioUploadStatus] = useState('');
  const [coverUploadStatus] = useState('');
  const [isExtractingAudioMetadata, setIsExtractingAudioMetadata] = useState(false);
  const [deletingRequestId, setDeletingRequestId] = useState('');
  const [convertingRequestId, setConvertingRequestId] = useState('');
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
  const webrtc = useWebrtcBroadcast({ onGoLive: onGoLiveWebrtc, onEndLive: onEndLiveWebrtc });
  const obsSelected = liveStream?.obs?.roomName || (liveStream?.isLive ? liveStream.broadcastSource === 'obs' : broadcastSource === 'obs');
  const isWebrtcLive = liveStream?.broadcastMode === 'webrtc' && Boolean(liveStream?.isLive);
  const isLiveOnAir = webrtc.isBroadcasting || isWebrtcLive;

  const handleDeleteAudienceRequest = async (item) => {
    const shouldDelete = window.confirm(
      `Delete the audience request for "${item.track || 'this song'}"? This will not delete a song already added to the event list.`,
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

  const handleConvertAudienceRequest = async (item) => {
    if (!item.sourceUrl || item.sourcePlatform !== 'youtube' || typeof onConvertLiveRequestToWav !== 'function') {
      return;
    }

    setConvertingRequestId(item.id);
    setRequestActionStatus('');

    try {
      await onConvertLiveRequestToWav(item.id);
      setRequestActionStatus(`Converted ${item.track || 'the requested song'} to WAV and saved it to Cloudinary.`);
    } catch (error) {
      setRequestActionStatus(error.message || 'The audience request could not be converted to WAV.');
    } finally {
      setConvertingRequestId('');
    }
  };

  const archiveEditor = (
<div className="admin-archive-create-viewport admin-archive-viewport" data-editor-tab={archiveEditorTab}>
                <div className="archive-editor-heading"><div className="archive-editor-title"><Music2 size={20} aria-hidden="true" /><div><h3>Add music</h3><p>Build your music library</p></div></div>
                  <button type="submit" form="admin-archive-form" className="primary-button" disabled={archiveSaving || isExtractingAudioMetadata}>{archiveSaving ? 'Saving…' : 'Add track'}</button>
                </div>
                <div className="archive-editor-tabs" role="tablist" aria-label="Track details">
                  <button type="button" role="tab" aria-selected={archiveEditorTab === 'track'} aria-controls="admin-archive-form" onClick={() => setArchiveEditorTab('track')}>Track</button>
                  <button type="button" role="tab" aria-selected={archiveEditorTab === 'metadata'} aria-controls="admin-archive-form" onClick={() => setArchiveEditorTab('metadata')}>Metadata</button>
                </div>
                <form
                  id="admin-archive-form"
                  className="admin-create-form admin-archive-create-form"
                  role="tabpanel" aria-label={archiveEditorTab === 'track' ? 'Track details' : 'Music metadata'}
                  aria-busy={archiveSaving}
                  onSubmit={async (event) => {
                    event.preventDefault();
                    if (archiveSavingRef.current) return;
                    if (!newSession.audioUrl) {
                      setArchiveSaveStatus('Choose and upload an audio file first.');
                      setArchiveEditorTab('track');
                      return;
                    }
                    if (!newSession.track.trim()) {
                      setArchiveSaveStatus('Enter a track title.');
                      setArchiveEditorTab('track');
                      return;
                    }
                    archiveSavingRef.current = true;
                    setArchiveSaving(true);
                    setArchiveSaveStatus('Saving your track…');
                    try {
                    await onAddArchiveItem({
                      ...newArchiveItem,
                      title: newSession.track,
                      artist: newSession.artist,
                      genre: newSession.genres || newSession.genre,
                      duration: newSession.duration,
                      audioUrl: newSession.audioUrl,
                      audioPublicId: newSession.audioPublicId,
                      audioOriginalName: newSession.audioOriginalName,
                      image: newSession.coverImage,
                      coverImage: newSession.coverImage,
                      coverPublicId: newSession.coverPublicId,
                      coverOriginalName: newSession.coverOriginalName,
                      coverZoom: newSession.coverZoom,
                      coverPositionX: newSession.coverPositionX,
                      coverPositionY: newSession.coverPositionY,
                      mediaType: newSession.trackClass || 'Original track',
                      description: newSession.lyricsSummary || '',
                      alt: `${newSession.track || 'Archive'} by ${newSession.artist || 'Khalil Nahhat'}`,
                    });
                    setNewArchiveItem(blankArchiveItem());
                    setNewSession(blankSession());
                    setArchiveYoutubeUrl('');
                    setArchiveSaveStatus('Track added to your music archive.');
                    } catch (error) {
                      setArchiveSaveStatus(error.message || 'Could not add this track. Please try again.');
                    } finally {
                      archiveSavingRef.current = false;
                      setArchiveSaving(false);
                    }
                  }}
                >
                  <p className="admin-helper-copy" role="status" aria-live="polite">{archiveSaveStatus}</p>
                  <fieldset disabled={archiveSaving} className="archive-create-fields">
                  <AdminSongMetadataFields
                    compactEditor
                    draft={newSession}
                    setDraft={setNewSession}
                    curatedSelections={curatedSelections}
                    setCuratedSelections={setCuratedSelections}
                    curatedCustomValues={curatedCustomValues}
                    setCuratedCustomValues={setCuratedCustomValues}
                    uploadedAudioName={uploadedAudioName}
                    audioUploadStatus={audioUploadStatus}
                    isExtractingAudioMetadata={isExtractingAudioMetadata}
                    onUploadAudio={onUploadLiveSessionAudio}
                    onUploadCover={onUploadLiveSessionCover}
                    coverUploadStatus={coverUploadStatus}
                    token={token}
                  />
                  </fieldset>
                  <div className="admin-live-create-cards admin-archive-create-cards admin-archive-legacy-fields">
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
                              <AdminSelect
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
                              </AdminSelect>
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
  );

  return (
    <AdminWorkspace activeKey={activePanel} username={username} onLogout={onLogout} secondary={activePanel === 'archive' ? archiveEditor : null}>
        <div className="admin-grid">
          {activePanel === 'registered-clients' && <RegisteredClients token={token} />}
          {activePanel === 'dj-service-builder' && <DjServiceBuilder token={token} />}
          {(activePanel === 'accounts' || activePanel === 'youtube') && (
            <section className="admin-panel youtube-account-panel" aria-label="Connected account settings">
              <header className="accounts-heading"><div><h2 className="admin-title-with-icon"><Play size={18} aria-hidden="true" />Accounts</h2><p>Your connected services, in one place.</p></div><span>Connections / 01</span></header>
              <YouTubeConnection token={token} sourceUrl={archiveYoutubeUrl} workspace sourceField={<label className="youtube-check-link"><span>Video URL</span><input type="url" placeholder="Paste a YouTube video link" value={archiveYoutubeUrl} onChange={event => setArchiveYoutubeUrl(event.target.value)} /></label>} />
            </section>
          )}
          <section id="admin-live-stream" className="admin-panel admin-live-stream-panel" hidden={activePanel !== 'live-stream'}>
            <div className="section-label admin-panel-head">
              <div className="admin-panel-head-copy">
                <p className="section-number">
                  <span className="section-number-mark">KN//</span>
                  <span className="section-number-value">00</span>
                </p>
                <h2 className="admin-title-with-icon"><Radio size={18} aria-hidden="true" /><span className="admin-crumb">Live</span><span className="admin-crumb-sep" aria-hidden="true">/</span>Live stream</h2>
              </div>
            </div>

            <div className="admin-live-sessions-layout admin-live-tabs-shell admin-live-sessions-page-tabs">
              <div className="admin-live-tab-panel admin-live-sessions-page-panel" role="tabpanel">
              <div className="admin-live-single has-requests-aside">
              <div className="admin-live-left-column">
              <aside className="admin-live-requests-aside" aria-label="Audience requests">
                <AdminAudienceRequestsPanel
                  liveRequests={liveRequests}
                  requestActionStatus={requestActionStatus}
                  deletingRequestId={deletingRequestId}
                  convertingRequestId={convertingRequestId}
                  onDeleteRequest={handleDeleteAudienceRequest}
                  onConvertRequest={handleConvertAudienceRequest}
                  onReviewRequest={onReviewLiveRequest}
                />
              </aside>
              <aside className="admin-live-comments-aside" aria-label="Audience comments">
                <AdminAudienceComments live={Boolean(liveStream?.isLive) || isLiveOnAir} />
              </aside>
              </div>
              <div className="admin-live-preview">
                <div className="admin-live-monitor">
                <div className="admin-live-preview-frame-shell" ref={liveFrame}>
                  <div className="admin-live-preview-head">
                    <p className="detail-label">Preview</p>
                    <span>{isLiveOnAir ? 'On air' : 'Offline'}</span>
                    <button type="button" className="admin-live-fullscreen" onClick={toggleLiveFullscreen} aria-label={liveFullscreen ? 'Exit full screen' : 'Full screen'} title={liveFullscreen ? 'Exit full screen' : 'Full screen'}>{liveFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}</button>
                  </div>
                  {isLiveOnAir && liveStream?.broadcastSource === 'obs' ? <WebrtcViewer key={liveStream.webrtcRoomName} muted showAudioControls audioControlsTarget={previewAudioControlsTarget} /> : isLiveOnAir ? (
                    <video
                      ref={webrtc.videoRef}
                      className="admin-live-preview-frame"
                      autoPlay
                      playsInline
                      muted
                    />
                  ) : liveStream?.posterImage ? (
                    <img
                      className="admin-live-preview-image"
                      src={liveStream.posterImage}
                      alt=""
                      aria-hidden="true"
                    />
                  ) : (
                    <div className="admin-live-preview-empty">
                      <VideoOff size={18} />
                      <span>No live source</span>
                    </div>
                  )}
                </div>
                </div>
                <div className="admin-live-settings">
                <LiveGoalPicker token={token} goal={liveStream?.goal} onChange={onLiveStreamChange} />
                <div ref={setPreviewAudioControlsTarget} className="admin-preview-sound-slot" />
                <div className="live-source-field">
                <p className="detail-label admin-live-setup-title">LIVE STREAM SOURCE</p>
                <label className="obs-source">
                  <AdminSelect aria-label="Broadcast source" value={obsSelected ? 'obs' : 'browser'} disabled={isLiveOnAir || Boolean(liveStream?.obs?.roomName)} onChange={event => setBroadcastSource(event.target.value)}>
                    <option value="obs">OBS Studio</option><option value="browser">This browser</option>
                  </AdminSelect>
                </label>
                </div>
                {obsSelected ? <ObsBroadcast token={token} title={liveStream?.title} enabled={activePanel === 'live-stream' && liveStreamTab === 'stream'} onUpdate={onLiveStreamChange} /> : <>

                {!isLiveOnAir ? (
                  <div className="admin-live-device-picker">
                    <label>
                      <span>Camera</span>
                      <AdminSelect
                        value={webrtc.selectedVideoDeviceId}
                        onChange={(event) => webrtc.setSelectedVideoDeviceId(event.target.value)}
                      >
                        <option value="">Default camera</option>
                        {webrtc.videoInputs.map((device, index) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Camera ${index + 1}`}
                          </option>
                        ))}
                      </AdminSelect>
                    </label>
                    <label>
                      <span>Microphone</span>
                      <AdminSelect
                        value={webrtc.selectedAudioDeviceId}
                        onChange={(event) => webrtc.setSelectedAudioDeviceId(event.target.value)}
                      >
                        <option value="">Default microphone</option>
                        {webrtc.audioInputs.map((device, index) => (
                          <option key={device.deviceId} value={device.deviceId}>
                            {device.label || `Microphone ${index + 1}`}
                          </option>
                        ))}
                      </AdminSelect>
                    </label>
                  </div>
                ) : null}
                <MicLevelMeter
                  deviceId={webrtc.selectedAudioDeviceId}
                  track={webrtc.micMediaStreamTrack}
                  enabled={
                    activePanel === 'live-stream' && !obsSelected && (isLiveOnAir ? Boolean(webrtc.micMediaStreamTrack) : true)
                  }
                />
                <div className="admin-live-controls" role="group" aria-label="Live controls">
                  <button
                    type="button"
                    className={`admin-live-control ${isLiveOnAir ? 'admin-live-control-delete' : 'admin-live-control-start'}`}
                    onClick={isLiveOnAir ? webrtc.endLive : () => webrtc.goLive(liveStream?.title)}
                    disabled={webrtc.isConnecting}
                  >
                    {isLiveOnAir ? <VideoOff size={16} /> : <Video size={16} />}
                    <span>
                      {webrtc.isConnecting
                        ? 'Working...'
                        : isLiveOnAir
                          ? 'End Browser Broadcast'
                          : 'Go Live From Browser'}
                    </span>
                  </button>
                  {isLiveOnAir ? (
                    <span className="live-stream-badge">
                      <Radio size={14} />
                      LIVE
                    </span>
                  ) : null}
                </div>
                </>}
                </div>
              </div>
            </div>
              </div>
            </div>

           
          </section>

          <section id="admin-live-sessions" className="admin-panel admin-live-sessions-panel" hidden={activePanel !== 'live-sessions'}>
            <div className="section-label admin-panel-head">
              <div className="admin-panel-head-copy">
                <p className="section-number">
                  <span className="section-number-mark">KN//</span>
                  <span className="section-number-value">01</span>
                </p>
                <h2 className="admin-title-with-icon"><CalendarDays size={18} aria-hidden="true" />Events</h2>
              </div>
              <button type="submit" form="admin-live-session-form" className="primary-button admin-panel-head-action">
                Add Event
              </button>
            </div>

            <div className="admin-live-sessions-layout admin-live-tabs-shell admin-live-sessions-page-tabs admin-events-workspace">
              <div
                id="admin-live-sessions-tab-panel"
                className="admin-live-tab-panel admin-live-sessions-page-panel"
                role="tabpanel"
              >
                <>
                  <div className="admin-create-form admin-live-create-form admin-live-sessions-viewport">
                  <h3>Add Event From Archive</h3>
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
                  <label className="admin-event-archive-select">
                    <span>Archive Song</span>
                    <AdminSelect
                      required
                      value={newSession.track}
                      onChange={(event) => {
                        const selectedArchiveItem = archiveItems.find((item) => item.title === event.target.value);
                        if (!selectedArchiveItem) {
                          setNewSession(blankSession());
                          return;
                        }

                        setNewSession({
                          ...blankSession(),
                          track: selectedArchiveItem.title || '',
                          artist: selectedArchiveItem.artist || '',
                          duration: selectedArchiveItem.duration || '',
                          genre: selectedArchiveItem.genre || '',
                          genres: selectedArchiveItem.genre || '',
                          audioUrl: selectedArchiveItem.audioUrl || '',
                          audioPublicId: selectedArchiveItem.audioPublicId || '',
                          audioOriginalName: selectedArchiveItem.audioOriginalName || '',
                          coverImage: selectedArchiveItem.coverImage || selectedArchiveItem.image || '',
                          coverPublicId: selectedArchiveItem.coverPublicId || '',
                          coverOriginalName: selectedArchiveItem.coverOriginalName || '',
                          coverZoom: selectedArchiveItem.coverZoom || 1,
                          coverPositionX: selectedArchiveItem.coverPositionX ?? 50,
                          coverPositionY: selectedArchiveItem.coverPositionY ?? 50,
                          trackClass: selectedArchiveItem.trackClass || '',
                          subgenres: selectedArchiveItem.subgenres || '',
                          language: selectedArchiveItem.language || '',
                          musicMoods: selectedArchiveItem.musicMoods || '',
                          instruments: selectedArchiveItem.instruments || '',
                          bpm: selectedArchiveItem.bpm || '',
                          musicalKey: selectedArchiveItem.musicalKey || '',
                          vocals: selectedArchiveItem.vocals || '',
                          energy: selectedArchiveItem.energy || '',
                          beat: selectedArchiveItem.beat || '',
                          lyricsSummary: selectedArchiveItem.lyricsSummary || '',
                          lyricsMoods: selectedArchiveItem.lyricsMoods || '',
                          lyricsEnergy: selectedArchiveItem.lyricsEnergy || '',
                          themes: selectedArchiveItem.themes || '',
                          lyricsLanguage: selectedArchiveItem.lyricsLanguage || '',
                          explicit: selectedArchiveItem.explicit || '',
                        });
                      }}
                    >
                      <option value="">Choose a song from Archive</option>
                      {archiveItems.map((item) => (
                        <option key={item.id} value={item.title}>
                          {item.title}{item.artist ? ` - ${item.artist}` : ''}
                        </option>
                      ))}
                    </AdminSelect>
                  </label>
                  {!archiveItems.length ? (
                    <p className="admin-helper-copy">Add a song to Archive first. Events can only use archived songs.</p>
                  ) : null}
                  <div className="admin-live-create-cards">
                    <div className="admin-live-manual-card">
                      <div className="admin-live-metadata-groups">
                        <section className="admin-live-metadata-group admin-live-song-info-group">
                          <div className="admin-live-metadata-head">
                            <p className="detail-label">SONG INFO</p>
                            <span>Set and queue the event track</span>
                          </div>
                          <div className="admin-item-grid admin-live-song-info-grid">
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
                                readOnly
                                aria-readonly="true"
                                placeholder="Select an archive song"
                              />
                            </label>
                            <label>
                              <span>Class</span>
                              <AdminSelect
                                value={newSession.trackClass}
                                onChange={(event) => setNewSession((current) => ({
                                  ...current,
                                  trackClass: event.target.value,
                                }))}
                              >
                                <option value="">Standard</option>
                                {TRACK_CLASS_OPTIONS.map((trackClass) => (
                                  <option key={trackClass} value={trackClass}>{trackClass}</option>
                                ))}
                              </AdminSelect>
                            </label>
                          </div>
                        </section>
                        <section className="admin-live-metadata-group admin-lyrics-metadata-removed">
                          <div className="admin-live-metadata-head">
                            <p className="detail-label">MUSIC METADATA</p>
                            <span>Playback + sonic profile</span>
                          </div>
                          <div className="admin-item-grid admin-live-metadata-grid">
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
                        <span>{uploadedAudioName}</span>
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
                            setNewSession((current) => ({
                              ...current,
                              duration: metadata.duration || current.duration,
                              audioUrl: uploadResult.item?.audioUrl || current.audioUrl,
                              audioPublicId: uploadResult.item?.audioPublicId || current.audioPublicId,
                              audioOriginalName: uploadResult.item?.audioOriginalName || file.name,
                            }));
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
                          : audioUploadStatus || 'Upload an audio file to autofill the song title and artist.'}
                      </p>
                    </div>
                  </div>
                </form>
                  </div>
                  <div className="admin-live-summary-grid admin-live-sessions-viewport">
                    <div className="admin-live-session-table-slot">
                        <LiveSessionTable
                          sessions={liveSessions}
                          onDeleteSession={onDeleteLiveSession}
                        />
                    </div>
                  </div>
                {liveSummaryTab === 'requests' ? (
                  <div className="admin-live-summary-grid admin-live-sessions-viewport">
                    <>
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
                                          {item.sourcePlatform === 'youtube' && item.sourceUrl ? (
                                            <button
                                              type="button"
                                              className="secondary-button admin-request-convert-button"
                                              onClick={() => handleConvertAudienceRequest(item)}
                                              disabled={convertingRequestId === item.id || Boolean(item.audioUrl)}
                                            >
                                              {convertingRequestId === item.id
                                                ? 'CONVERTING...'
                                                : item.audioUrl
                                                  ? 'WAV READY'
                                                  : 'CONVERT WAV'}
                                            </button>
                                          ) : null}
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
                    </>
                  </div>
                ) : null}
                </>
              </div>
            </div>
          </section>

          <section id="admin-archive" className="admin-panel admin-archive-panel" hidden={activePanel !== 'archive'}>
            <div className="section-label admin-panel-head">
              <div className="admin-panel-head-copy">
                <p className="section-number">
                  <span className="section-number-mark">KN//</span>
                  <span className="section-number-value">02</span>
                </p>
                <h2 className="admin-title-with-icon"><Archive size={18} aria-hidden="true" />Recordings</h2>
              </div>

            </div>

            <div className="admin-live-sessions-layout admin-live-tabs-shell admin-live-sessions-page-tabs admin-archive-workspace">
              <div className="admin-live-tab-panel admin-live-sessions-page-panel" role="tabpanel">
              <>
              <div className="admin-archive-summary-grid admin-archive-viewport">
                <div className="admin-archive-tabs-shell">
                  <div className="live-session-panel-head admin-archive-table-head">
                    <div className="archive-library-heading"><h3>Library</h3><span>{archiveItems.length} tracks</span></div>
                    <label className="archive-library-search"><Search size={15} aria-hidden="true" /><input type="search" aria-label="Search music library" placeholder="Search tracks or artists" value={archiveSearch} onChange={event => setArchiveSearch(event.target.value)} /></label>
                  </div>

                  <div className="admin-archive-tab-panel">
                    <div className="admin-archive-preview-panel">
                      <div className="admin-archive-table-panel">
                        <table className="admin-archive-table" aria-label="Archive items">
                          <thead><tr>
                            <th scope="col">Track</th><th scope="col">Artist</th><th scope="col">Genre</th>
                            <th scope="col">Duration</th><th scope="col">Date</th><th scope="col">Audio</th>
                          </tr></thead>
                          <tbody>
                            {archiveItems.filter(item => `${item.title} ${item.artist || ''} ${item.genre || ''}`.toLowerCase().includes(archiveSearch.trim().toLowerCase())).map((item) => (
                              <tr key={item.id}>
                                <th scope="row"><div className="archive-track-identity">{item.image ? <img src={item.image} alt="" loading="lazy" /> : <span className="archive-track-art"><Disc3 size={20} aria-hidden="true" /></span>}<strong>{item.title}</strong></div></th>
                                <td>{item.artist || '—'}</td>
                                <td>{item.genre || '—'}</td>
                                <td>{item.duration || '—'}</td>
                                <td>{item.date || '—'}</td>
                                <td><span className={`admin-archive-audio-status${item.audioUrl ? ' is-ready' : ''}`}>{item.audioUrl ? 'Ready' : 'Missing'}</span></td>
                              </tr>
                            ))}
                            {!archiveItems.some(item => `${item.title} ${item.artist || ''} ${item.genre || ''}`.toLowerCase().includes(archiveSearch.trim().toLowerCase())) ? <tr><td colSpan={6} className="admin-archive-empty">{archiveSearch ? 'No tracks match your search.' : 'Your uploaded tracks will appear here.'}</td></tr> : null}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              </>
              </div>
            </div>
          </section>
          {activePanel === 'prices' ? (
            <AdminCatalogPanel token={token} />
          ) : null}
          {activePanel === 'transactions' ? (
            <AdminTransactionsPanel
              transactions={transactions}
              onRefresh={onRefreshTransactions}
            />
          ) : null}
          {activePanel === 'services' ? (
            <AdminServicesPanel
              requests={serviceRequests}
              onPublishQuote={onPublishServiceQuote}
              onQuoteAction={onQuoteAction}
              confirmedBookings={confirmedBookings}
            />
          ) : null}
        </div>
    </AdminWorkspace>
  );
}

export default AdminPage;
