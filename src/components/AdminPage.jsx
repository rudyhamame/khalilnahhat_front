import { useEffect, useMemo, useState } from 'react';

function blankSession() {
  return {
    track: '',
    duration: '',
    genre: '',
    language: '',
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

function createLiveStreamDraft(liveStream) {
  return {
    isLive: Boolean(liveStream?.isLive),
    title: liveStream?.title || 'Khalil Nahhat Live DJ Session',
    streamUrl: liveStream?.streamUrl || '',
    posterImage: liveStream?.posterImage || '',
    statusLabel: liveStream?.statusLabel || 'Offline until Khalil starts the next OBS stream.',
  };
}

function AdminPage({
  username,
  liveSessions,
  liveStream,
  archiveItems,
  archiveFilters,
  onLogout,
  onUpdateLiveStream,
  onAddLiveSession,
  onUpdateLiveSession,
  onDeleteLiveSession,
  onAddArchiveItem,
  onUpdateArchiveItem,
  onDeleteArchiveItem,
}) {
  const [newSession, setNewSession] = useState(blankSession());
  const [newArchiveItem, setNewArchiveItem] = useState(blankArchiveItem());
  const [liveStreamDraft, setLiveStreamDraft] = useState(() => createLiveStreamDraft(liveStream));
  const selectableArchiveFilters = useMemo(
    () => archiveFilters.filter((filter) => filter !== 'All'),
    [archiveFilters],
  );

  useEffect(() => {
    setLiveStreamDraft(createLiveStreamDraft(liveStream));
  }, [liveStream]);

  return (
    <main className="admin-page">
      <section className="admin-shell">
        <div className="admin-header">
          <div>
            <p className="section-kicker">KN//ADMIN</p>
            <h1>Content Control</h1>
            <p>{`Signed in as ${username}`}</p>
          </div>
          <div className="admin-header-actions">
            <a className="secondary-button" href="#signal">
              VIEW SITE
            </a>
            <button type="button" className="primary-button" onClick={onLogout}>
              LOG OUT
            </button>
          </div>
        </div>

        <div className="admin-grid">
          <section className="admin-panel">
            <div className="admin-panel-head">
              <p className="detail-label">LIVE STREAM</p>
              <h2>OBS + YouTube Live</h2>
            </div>

            <form
              className="admin-create-form"
              onSubmit={(event) => {
                event.preventDefault();
                onUpdateLiveStream(liveStreamDraft);
              }}
            >
              <label className="admin-toggle-row">
                <span>Broadcast live now</span>
                <input
                  type="checkbox"
                  checked={liveStreamDraft.isLive}
                  onChange={(event) =>
                    setLiveStreamDraft((current) => ({ ...current, isLive: event.target.checked }))
                  }
                />
              </label>
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
              <button type="submit" className="primary-button">
                Save Live Stream
              </button>
            </form>

            <div className="admin-create-form">
              <h3>OBS Flow</h3>
              <p className="admin-helper-copy">
                Create the live event in YouTube first, connect OBS to YouTube, then paste the YouTube live URL here and save it.
              </p>
            </div>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <p className="detail-label">LIVE SESSIONS</p>
              <h2>Edit Session Rows</h2>
            </div>

            <div className="admin-list">
              {liveSessions.map((session) => (
                <article key={session.id} className="admin-item-card">
                  <div className="admin-item-grid">
                    <label>
                      <span>Song / Music</span>
                      <input
                        type="text"
                        value={session.track}
                        onChange={(event) =>
                          onUpdateLiveSession(session.id, { track: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Duration</span>
                      <input
                        type="text"
                        value={session.duration}
                        onChange={(event) =>
                          onUpdateLiveSession(session.id, { duration: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Genre</span>
                      <input
                        type="text"
                        value={session.genre}
                        onChange={(event) =>
                          onUpdateLiveSession(session.id, { genre: event.target.value })
                        }
                      />
                    </label>
                    <label>
                      <span>Language</span>
                      <input
                        type="text"
                        value={session.language}
                        onChange={(event) =>
                          onUpdateLiveSession(session.id, { language: event.target.value })
                        }
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    className="admin-delete-button"
                    onClick={() => onDeleteLiveSession(session.id)}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>

            <form
              className="admin-create-form"
              onSubmit={(event) => {
                event.preventDefault();
                onAddLiveSession(newSession);
                setNewSession(blankSession());
              }}
            >
              <h3>Add Live Session</h3>
              <div className="admin-item-grid">
                <label>
                  <span>Song / Music</span>
                  <input
                    type="text"
                    value={newSession.track}
                    onChange={(event) => setNewSession((current) => ({ ...current, track: event.target.value }))}
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
                  <span>Genre</span>
                  <input
                    type="text"
                    value={newSession.genre}
                    onChange={(event) => setNewSession((current) => ({ ...current, genre: event.target.value }))}
                  />
                </label>
                <label>
                  <span>Language</span>
                  <input
                    type="text"
                    value={newSession.language}
                    onChange={(event) => setNewSession((current) => ({ ...current, language: event.target.value }))}
                  />
                </label>
              </div>
              <button type="submit" className="primary-button">
                Add Session
              </button>
            </form>
          </section>

          <section className="admin-panel">
            <div className="admin-panel-head">
              <p className="detail-label">ARCHIVE</p>
              <h2>Add / Edit Work</h2>
            </div>

            <div className="admin-list">
              {archiveItems.map((item) => (
                <article key={item.id} className="admin-item-card">
                  <div className="admin-item-grid">
                    <label>
                      <span>Title</span>
                      <input
                        type="text"
                        value={item.title}
                        onChange={(event) => onUpdateArchiveItem(item.id, { title: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Category</span>
                      <select
                        value={item.category}
                        onChange={(event) => onUpdateArchiveItem(item.id, { category: event.target.value })}
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
                        value={item.location}
                        onChange={(event) => onUpdateArchiveItem(item.id, { location: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Date</span>
                      <input
                        type="text"
                        value={item.date}
                        onChange={(event) => onUpdateArchiveItem(item.id, { date: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Media Type</span>
                      <input
                        type="text"
                        value={item.mediaType}
                        onChange={(event) => onUpdateArchiveItem(item.id, { mediaType: event.target.value })}
                      />
                    </label>
                    <label>
                      <span>Image URL / Path</span>
                      <input
                        type="text"
                        value={item.image}
                        onChange={(event) => onUpdateArchiveItem(item.id, { image: event.target.value })}
                      />
                    </label>
                    <label className="admin-item-grid-span">
                      <span>Alt Text</span>
                      <input
                        type="text"
                        value={item.alt}
                        onChange={(event) => onUpdateArchiveItem(item.id, { alt: event.target.value })}
                      />
                    </label>
                  </div>
                  <button
                    type="button"
                    className="admin-delete-button"
                    onClick={() => onDeleteArchiveItem(item.id)}
                  >
                    Delete
                  </button>
                </article>
              ))}
            </div>

            <form
              className="admin-create-form"
              onSubmit={(event) => {
                event.preventDefault();
                onAddArchiveItem(newArchiveItem);
                setNewArchiveItem(blankArchiveItem());
              }}
            >
              <h3>Add Archive Work</h3>
              <div className="admin-item-grid">
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
              <button type="submit" className="primary-button">
                Add Archive Work
              </button>
            </form>
          </section>
        </div>
      </section>
    </main>
  );
}

export default AdminPage;
