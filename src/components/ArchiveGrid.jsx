import { Pause, Play } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

function ArchiveCard({ item }) {
  const audioRef = useRef(null);
  const [isFlipped, setIsFlipped] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return undefined;
    }

    const handleEnded = () => setIsPlaying(false);
    const handlePause = () => setIsPlaying(false);
    const handlePlay = () => setIsPlaying(true);

    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);

    return () => {
      audio.pause();
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
    };
  }, []);

  const togglePlayback = async (event) => {
    event.stopPropagation();

    const audio = audioRef.current;

    if (!audio || !item.audioUrl) {
      return;
    }

    if (audio.paused) {
      try {
        await audio.play();
      } catch {
        setIsPlaying(false);
      }
      return;
    }

    audio.pause();
  };

  return (
    <article className={`archive-item${isFlipped ? ' is-flipped' : ''}`}>
      <div
        className="archive-card"
        onClick={() => setIsFlipped((currentValue) => !currentValue)}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            setIsFlipped((currentValue) => !currentValue);
          }
        }}
        role="button"
        tabIndex={0}
        aria-pressed={isFlipped}
      >
        <span className="archive-card-inner">
          <span className="archive-face archive-face-front">
            <img loading="lazy" src={item.image} alt={item.alt} />
            <span className="archive-front-overlay">
              <span className="detail-label">{item.category || 'Archive'}</span>
              <strong>{item.title}</strong>
              <span>{item.artist || 'Khalil Nahhat'}</span>
            </span>
          </span>

          <span className="archive-face archive-face-back">
            <span className="archive-back-media">
              <img loading="lazy" src={item.image} alt="" aria-hidden="true" />
            </span>
            <span className="archive-back-overlay" />
            <span className="archive-back-copy">
              <span className="detail-label">{item.mediaType || 'Original work'}</span>
              <strong>{item.title}</strong>
              <span className="archive-back-artist">{item.artist || 'Khalil Nahhat'}</span>

              <span className="archive-meta-row">
                <span>{item.genre || 'Uncategorized'}</span>
                <span>{item.duration || 'Preview pending'}</span>
              </span>
              <span className="archive-meta-row">
                <span>{item.location || 'Studio archive'}</span>
                <span>{item.date || 'Date pending'}</span>
              </span>

              <span className="archive-description">
                {item.description || 'This work is part of Khalil Nahhat’s personal archive.'}
              </span>

              <span className="archive-actions">
                <span className="archive-preview-label">
                  {item.audioUrl ? 'Preview available' : 'Audio preview not uploaded yet'}
                </span>
                <span className="archive-playback-shell">
                  <button
                    type="button"
                    className="archive-playback-button"
                    onClick={togglePlayback}
                    disabled={!item.audioUrl}
                  >
                    {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                    <span>{isPlaying ? 'Pause preview' : 'Play preview'}</span>
                  </button>
                </span>
              </span>
            </span>
          </span>
        </span>
      </div>
      {item.audioUrl ? <audio ref={audioRef} preload="none" src={item.audioUrl} /> : null}
    </article>
  );
}

function ArchiveGrid({ items, activeFilter, onFilterChange, filters }) {
  return (
    <div className="archive-block">
      <div className="archive-head">
        <div className="archive-head-copy">
          <p className="detail-label">ORIGINAL MUSIC ARCHIVE</p>
          <p className="archive-head-summary">Khalil's stored works, artwork, and playable previews.</p>
        </div>
        <span className="archive-count">{`${items.length} TRACK${items.length === 1 ? '' : 'S'}`}</span>
      </div>

      <div className="filter-row" role="tablist" aria-label="Archive categories">
        {filters.map((filter) => {
          const isActive = activeFilter === filter;
          return (
            <button
              key={filter}
              type="button"
              role="tab"
              aria-selected={isActive}
              className={isActive ? 'is-active' : ''}
              onClick={() => onFilterChange(filter)}
            >
              {filter}
            </button>
          );
        })}
      </div>

      <div className="archive-grid">
        {items.length ? (
          items.map((item) => (
            <ArchiveCard key={item.id} item={item} />
          ))
        ) : (
          <div className="archive-empty-state">
            <p className="detail-label">NO ARCHIVE TRACKS YET</p>
            <p>Khalil’s music archive will appear here once works are published from the control panel.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ArchiveGrid;
