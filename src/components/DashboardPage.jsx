import {
  CalendarDays,
  Disc3,
  MapPin,
  Sparkles,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import AnamAvatarPanel from './AnamAvatarPanel';
import { siteData } from '../data/siteData';

const defaultAvailability = [
  { id: 'slot-01', date: '2026-08-08', time: '20:00', label: '08 Aug 2026 / 8:00 PM / Toronto' },
  { id: 'slot-02', date: '2026-08-14', time: '21:30', label: '14 Aug 2026 / 9:30 PM / Montréal' },
  { id: 'slot-03', date: '2026-08-22', time: '22:00', label: '22 Aug 2026 / 10:00 PM / Toronto' },
  { id: 'slot-04', date: '2026-09-05', time: '19:30', label: '05 Sep 2026 / 7:30 PM / Vancouver' },
];

const vibeLibrary = {
  Club: {
    title: 'Peak-time pressure with elegant control',
    direction: 'Rhythm-driven house and techno built for movement, pressure, and late-room lift.',
    songs: ['Peggy Gou - It Goes Like Nanana', 'Anyma - Explore Your Future', 'John Summit - Where You Are'],
  },
  Festival: {
    title: 'Wide-energy festival drive',
    direction: 'Big-room momentum, melodic lift, and tracks that open up for larger crowds.',
    songs: ['Swedish House Mafia - Ray of Solar', 'ARTBAT - Flame', 'CamelPhat - Cola'],
  },
  'Private event': {
    title: 'Adaptive social flow',
    direction: 'Flexible selections that move from warm groove into recognizable energy without breaking the room.',
    songs: ['Purple Disco Machine - Fireworks', 'Dua Lipa - Houdini', 'Robin S - Show Me Love'],
  },
  Wedding: {
    title: 'Elegant warmth into celebration',
    direction: 'Emotional, familiar, and cross-generational transitions for a full-night arc.',
    songs: ['Whitney Houston - I Wanna Dance with Somebody', 'ABBA - Gimme! Gimme! Gimme!', 'Calvin Harris - Feel So Close'],
  },
  'Corporate event': {
    title: 'Polished, social, upscale energy',
    direction: 'Clean groove, restrained tempo changes, and premium crowd-friendly selections.',
    songs: ['Kaytranada - Lite Spots', 'Disclosure - Tondo', 'Jungle - Back On 74'],
  },
  'Brand activation': {
    title: 'Curated and image-aware',
    direction: 'Modern, stylish sound design with a contemporary edge for branded experiences.',
    songs: ['Fred again.. - Delilah', 'Jamie xx - Loud Places', 'Bicep - Glue'],
  },
  Other: {
    title: 'Custom room reading',
    direction: 'A hybrid direction shaped around your audience, timing, and mood references.',
    songs: ['Mall Grab - Liverpool Street In The Rain', 'Bonobo - Kerala', 'RÜFÜS DU SOL - On My Knees'],
  },
};

function storageKeyForUser(user) {
  return `khalil-dashboard-${user?.username || 'guest'}`;
}

function readDashboardState(user) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(storageKeyForUser(user));
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

function DashboardPage({ user, onLogout }) {
  const storedState = useMemo(() => readDashboardState(user), [user]);
  const [eventCategory, setEventCategory] = useState(
    storedState?.eventCategory || siteData.booking.eventTypes[0] || 'Club',
  );
  const [searchPrompt, setSearchPrompt] = useState(storedState?.searchPrompt || '');
  const [preferredSong, setPreferredSong] = useState('');
  const [preferredSongs, setPreferredSongs] = useState(storedState?.preferredSongs || []);
  const [bookingDraft, setBookingDraft] = useState(
    storedState?.bookingDraft || {
      slotId: '',
      slotLabel: '',
      location: '',
      duration: '',
    },
  );

  const activeVibe = vibeLibrary[eventCategory] || vibeLibrary.Other;
  const aiSuggestions = useMemo(() => {
    if (!searchPrompt.trim()) {
      return activeVibe.songs;
    }

    const terms = searchPrompt.toLowerCase().split(/\s+/).filter(Boolean);
    const scored = activeVibe.songs
      .map((song) => ({
        song,
        score: terms.reduce((score, term) => score + (song.toLowerCase().includes(term) ? 1 : 0), 0),
      }))
      .sort((left, right) => right.score - left.score);

    return scored.some((entry) => entry.score > 0)
      ? scored.map((entry) => entry.song)
      : [
          ...activeVibe.songs,
          `AI focus: ${searchPrompt.trim()} / ${eventCategory}`,
        ];
  }, [activeVibe, eventCategory, searchPrompt]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      storageKeyForUser(user),
        JSON.stringify({
          eventCategory,
          searchPrompt,
          preferredSongs,
          bookingDraft,
        }),
      );
  }, [bookingDraft, eventCategory, preferredSongs, searchPrompt, user]);

  const handleAddPreferredSong = () => {
    if (!preferredSong.trim()) {
      return;
    }

    setPreferredSongs((currentSongs) => [...currentSongs, preferredSong.trim()]);
    setPreferredSong('');
  };

  const handleSlotChange = (slotId) => {
    const selectedSlot = defaultAvailability.find((slot) => slot.id === slotId);

    setBookingDraft((currentDraft) => ({
      ...currentDraft,
      slotId,
      slotLabel: selectedSlot?.label || '',
    }));
  };

  return (
    <main className="dashboard-page">
      <section className="dashboard-shell">
        <div className="dashboard-header">
          <div>
            <p className="section-kicker">KN//DASHBOARD</p>
            <h1>{user?.firstName ? `${user.firstName}'S SESSION DESK` : 'SESSION DASHBOARD'}</h1>
            <p>{user?.email || user?.username}</p>
          </div>
          <div className="dashboard-header-actions">
            <a className="secondary-button" href="#signal">
              VIEW SITE
            </a>
            {user?.isAdmin ? (
              <a className="secondary-button" href="#admin">
                OPEN ADMIN
              </a>
            ) : null}
            <button type="button" className="primary-button" onClick={onLogout}>
              LOG OUT
            </button>
          </div>
        </div>

        <div className="dashboard-grid">
          <section className="dashboard-panel">
            <div className="dashboard-panel-head">
              <p className="detail-label">01 / YOUR VIBE</p>
              <h2>
                <Sparkles size={18} />
                AI Search
              </h2>
            </div>
            <div className="dashboard-stack">
              <label>
                Event Category
                <select value={eventCategory} onChange={(event) => setEventCategory(event.target.value)}>
                  {siteData.booking.eventTypes.map((eventType) => (
                    <option key={eventType} value={eventType}>
                      {eventType}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Describe the energy you want
                <input
                  type="text"
                  value={searchPrompt}
                  onChange={(event) => setSearchPrompt(event.target.value)}
                  placeholder="Warm, elegant, peak-time, classy, Arabic crossover..."
                />
              </label>
              <article className="dashboard-card dashboard-vibe-card">
                <span className="detail-label">AI MATCH</span>
                <h3>{activeVibe.title}</h3>
                <p>{activeVibe.direction}</p>
              </article>
              <div className="dashboard-song-list">
                <p className="detail-label">Suggested tracks</p>
                {aiSuggestions.map((song) => (
                  <article key={song}>
                    <Disc3 size={15} />
                    <span>{song}</span>
                  </article>
                ))}
              </div>
              <div className="dashboard-inline-form">
                <input
                  type="text"
                  value={preferredSong}
                  onChange={(event) => setPreferredSong(event.target.value)}
                  placeholder="Add a must-play song"
                />
                <button type="button" className="primary-button" onClick={handleAddPreferredSong}>
                  Add Song
                </button>
              </div>
              <div className="dashboard-song-list">
                <p className="detail-label">Your preference list</p>
                {preferredSongs.length ? (
                  preferredSongs.map((song) => (
                    <article key={song}>
                      <Disc3 size={15} />
                      <span>{song}</span>
                    </article>
                  ))
                ) : (
                  <p className="dashboard-empty">No songs added yet.</p>
                )}
              </div>
            </div>
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel-head">
              <p className="detail-label">02 / BOOK A SESSION</p>
              <h2>
                <CalendarDays size={18} />
                Reserve a working slot
              </h2>
            </div>
            <div className="dashboard-stack">
              <div className="dashboard-availability">
                {defaultAvailability.map((slot) => (
                  <button
                    key={slot.id}
                    type="button"
                    className={bookingDraft.slotId === slot.id ? 'dashboard-slot is-active' : 'dashboard-slot'}
                    onClick={() => handleSlotChange(slot.id)}
                  >
                    <span>{slot.label}</span>
                  </button>
                ))}
              </div>
              <label>
                Location
                <input
                  type="text"
                  value={bookingDraft.location}
                  onChange={(event) =>
                    setBookingDraft((currentDraft) => ({
                      ...currentDraft,
                      location: event.target.value,
                    }))
                  }
                  placeholder="City, venue, or private address"
                />
              </label>
              <label>
                Duration
                <input
                  type="text"
                  value={bookingDraft.duration}
                  onChange={(event) =>
                    setBookingDraft((currentDraft) => ({
                      ...currentDraft,
                      duration: event.target.value,
                    }))
                  }
                  placeholder="Example: 3 hours / 90 min / full-night"
                />
              </label>
              <article className="dashboard-card">
                <span className="detail-label">Booking summary</span>
                <p>{bookingDraft.slotLabel || 'Choose an available date and time.'}</p>
                <p>
                  <MapPin size={15} />
                  <span>{bookingDraft.location || 'Location still needed.'}</span>
                </p>
                <p>
                  <CalendarDays size={15} />
                  <span>{bookingDraft.duration || 'Duration still needed.'}</span>
                </p>
              </article>
            </div>
          </section>

          <section className="dashboard-panel dashboard-panel-wide">
            <div className="dashboard-panel-head">
              <p className="detail-label">03 / ANAM AVATAR</p>
              <h2>Booking Assistant</h2>
            </div>
            <AnamAvatarPanel />
          </section>
        </div>
      </section>
    </main>
  );
}

export default DashboardPage;
