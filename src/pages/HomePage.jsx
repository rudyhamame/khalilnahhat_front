import {
  ArrowDownRight,
  ArrowUpRight,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import ArchiveGrid from '../components/ArchiveGrid';
import Footer from '../components/Footer';
import Header from '../components/Header';
import LiveRequestAgent from '../components/LiveRequestAgent';
import LiveSessionTable from '../components/LiveSessionTable';
import LiveStreamPlayer from '../components/LiveStreamPlayer';
import MobileMenu from '../components/MobileMenu';
import SectionLabel from '../components/SectionLabel';
import { navigationItems, siteData } from '../data/siteData';
import { useReducedMotion } from '../hooks/useReducedMotion';

const MONTH_INDEX = {
  JAN: 0,
  FEB: 1,
  MAR: 2,
  APR: 3,
  MAY: 4,
  JUN: 5,
  JUL: 6,
  AUG: 7,
  SEP: 8,
  OCT: 9,
  NOV: 10,
  DEC: 11,
};

const CALENDAR_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const CALENDAR_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function clampChannel(value) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function toRgb(color) {
  return `rgb(${clampChannel(color.r)} ${clampChannel(color.g)} ${clampChannel(color.b)})`;
}

function toRgba(color, alpha) {
  return `rgba(${clampChannel(color.r)}, ${clampChannel(color.g)}, ${clampChannel(color.b)}, ${alpha})`;
}

function averageColor(colors, fallback) {
  if (!colors.length) {
    return fallback;
  }

  const totals = colors.reduce(
    (accumulator, color) => ({
      r: accumulator.r + color.r,
      g: accumulator.g + color.g,
      b: accumulator.b + color.b,
    }),
    { r: 0, g: 0, b: 0 },
  );

  return {
    r: totals.r / colors.length,
    g: totals.g / colors.length,
    b: totals.b / colors.length,
  };
}

function buildHeroBackgroundPalette(imageData) {
  const darkPixels = [];
  const coolPixels = [];
  const warmPixels = [];
  const brightPixels = [];

  for (let index = 0; index < imageData.length; index += 16) {
    const alpha = imageData[index + 3];

    if (alpha < 120) {
      continue;
    }

    const pixel = {
      r: imageData[index],
      g: imageData[index + 1],
      b: imageData[index + 2],
    };
    const luminance = 0.2126 * pixel.r + 0.7152 * pixel.g + 0.0722 * pixel.b;

    if (luminance < 88) {
      darkPixels.push(pixel);
    }

    if (pixel.b >= pixel.r && pixel.b >= pixel.g) {
      coolPixels.push(pixel);
    }

    if (pixel.r > pixel.g || pixel.r > pixel.b) {
      warmPixels.push(pixel);
    }

    if (luminance > 150) {
      brightPixels.push(pixel);
    }
  }

  const base = averageColor(darkPixels, { r: 9, g: 9, b: 9 });
  const cool = averageColor(coolPixels, { r: 40, g: 110, b: 190 });
  const warm = averageColor(warmPixels, { r: 143, g: 24, b: 31 });
  const bright = averageColor(brightPixels, { r: 220, g: 230, b: 255 });

  return {
    '--page-base': toRgb({
      r: base.r * 0.72,
      g: base.g * 0.74,
      b: base.b * 0.8,
    }),
    '--page-mist-cool': toRgba(
      {
        r: cool.r * 0.92,
        g: cool.g * 0.98,
        b: Math.min(255, cool.b * 1.08),
      },
      0.24,
    ),
    '--page-mist-warm': toRgba(
      {
        r: Math.min(255, warm.r * 1.02),
        g: warm.g * 0.42,
        b: warm.b * 0.62,
      },
      0.18,
    ),
    '--page-glow': toRgba(
      {
        r: bright.r * 0.82,
        g: bright.g * 0.88,
        b: bright.b,
      },
      0.18,
    ),
    '--page-line': toRgba(bright, 0.05),
    '--page-dot': toRgba(bright, 0.06),
  };
}

function parseLiveEventDate(event) {
  if (!event) {
    return null;
  }

  if (event.startsAt) {
    const startsAtDate = new Date(event.startsAt);
    return Number.isNaN(startsAtDate.getTime()) ? null : startsAtDate;
  }

  if (event.dateIso) {
    const isoDate = new Date(event.dateIso);
    return Number.isNaN(isoDate.getTime()) ? null : isoDate;
  }

  if (!event.date) {
    return null;
  }

  const dateMatch = String(event.date).trim().toUpperCase().match(/^(\d{1,2})\s+([A-Z]{3})\s+(\d{4})$/);

  if (!dateMatch) {
    return null;
  }

  const [, dayValue, monthValue, yearValue] = dateMatch;
  const monthIndex = MONTH_INDEX[monthValue];

  if (monthIndex === undefined) {
    return null;
  }

  let hours = 20;
  let minutes = 0;
  const timeSource = event.time || event.startTime || event.slot;
  const timeMatch = typeof timeSource === 'string' ? timeSource.match(/(\d{1,2}):(\d{2})/) : null;

  if (timeMatch) {
    hours = Number(timeMatch[1]);
    minutes = Number(timeMatch[2]);
  }

  return new Date(Number(yearValue), monthIndex, Number(dayValue), hours, minutes, 0, 0);
}

function buildCalendarDays(year, monthIndex, eventsByDate) {
  const firstDayOfMonth = new Date(year, monthIndex, 1);
  const lastDayOfMonth = new Date(year, monthIndex + 1, 0);
  const leadingEmptyCells = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const cells = [];

  for (let index = 0; index < leadingEmptyCells; index += 1) {
    cells.push({
      key: `empty-start-${index}`,
      isEmpty: true,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    const isoKey = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    cells.push({
      key: isoKey,
      isoKey,
      day,
      isToday: isoKey === todayKey,
      events: eventsByDate.get(isoKey) || [],
    });
  }

  while (cells.length % 7 !== 0) {
    cells.push({
      key: `empty-end-${cells.length}`,
      isEmpty: true,
    });
  }

  return cells;
}

function HomePage({
  activePage = 'signal',
  archiveItems,
  liveSessions,
  liveStream,
  isSignedIn,
  onAnalyzeLiveRequest,
  onSearchYoutubeVideos,
  onCreateLiveRequest,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState('All');
  const [activeUpcomingIndex, setActiveUpcomingIndex] = useState(0);
  const [activeLiveTab, setActiveLiveTab] = useState('stream');
  const [selectedCalendarMonth, setSelectedCalendarMonth] = useState(() => new Date().getMonth());
  const [selectedCalendarYear, setSelectedCalendarYear] = useState(() => new Date().getFullYear());
  const [mainBackgroundStyle, setMainBackgroundStyle] = useState(() => ({
    '--page-base': 'rgb(9 9 9)',
    '--page-mist-cool': 'rgba(39, 118, 214, 0.22)',
    '--page-mist-warm': 'rgba(143, 24, 31, 0.16)',
    '--page-glow': 'rgba(220, 232, 255, 0.12)',
    '--page-line': 'rgba(255, 255, 255, 0.035)',
    '--page-dot': 'rgba(255, 255, 255, 0.04)',
  }));
  const activeSection = activePage;
  const prefersReducedMotion = useReducedMotion();

  const filteredArchiveItems = useMemo(() => {
    if (archiveFilter === 'All') {
      return archiveItems;
    }

    return archiveItems.filter((item) => item.category === archiveFilter);
  }, [archiveFilter, archiveItems]);
  const activeLiveSession = useMemo(() => {
    const selectedSession =
      liveSessions.find((session) => session.id === liveStream?.activeSessionId) || null;

    if (selectedSession) {
      return selectedSession;
    }

    return liveSessions.find((session) => session.playState === 'live') || liveSessions[0] || null;
  }, [liveSessions, liveStream?.activeSessionId]);
  const renderedLiveSessions = useMemo(() => {
    if (!activeLiveSession) {
      return liveSessions;
    }

    return liveSessions.map((session) =>
      session.id === activeLiveSession.id
        ? {
            ...session,
            playState: 'live',
          }
        : session,
    );
  }, [activeLiveSession, liveSessions]);
  const heroIntroParagraphs = useMemo(() => siteData.artist.biography.slice(0, 1), []);
  const upcomingHeroDates = useMemo(() => siteData.dates.slice(0, 3), []);
  const activeUpcomingDate = upcomingHeroDates[activeUpcomingIndex] || null;
  const datedEvents = useMemo(
    () =>
      siteData.dates
        .map((event) => {
          const liveDate = parseLiveEventDate(event);

          if (!liveDate) {
            return null;
          }

          return {
            ...event,
            liveDate,
            isoKey: `${liveDate.getFullYear()}-${String(liveDate.getMonth() + 1).padStart(2, '0')}-${String(liveDate.getDate()).padStart(2, '0')}`,
          };
        })
        .filter(Boolean),
    [],
  );
  const calendarYearOptions = useMemo(() => {
    const yearSet = new Set([
      new Date().getFullYear() - 1,
      new Date().getFullYear(),
      new Date().getFullYear() + 1,
      ...datedEvents.map((event) => event.liveDate.getFullYear()),
    ]);

    return [...yearSet].sort((left, right) => left - right);
  }, [datedEvents]);
  const eventsByDate = useMemo(() => {
    const nextMap = new Map();

    datedEvents.forEach((event) => {
      const existing = nextMap.get(event.isoKey) || [];
      existing.push(event);
      nextMap.set(event.isoKey, existing);
    });

    return nextMap;
  }, [datedEvents]);
  const calendarDays = useMemo(
    () => buildCalendarDays(selectedCalendarYear, selectedCalendarMonth, eventsByDate),
    [eventsByDate, selectedCalendarMonth, selectedCalendarYear],
  );
  const visibleCalendarEvents = useMemo(
    () =>
      datedEvents.filter(
        (event) =>
          event.liveDate.getFullYear() === selectedCalendarYear &&
          event.liveDate.getMonth() === selectedCalendarMonth,
      ),
    [datedEvents, selectedCalendarMonth, selectedCalendarYear],
  );

  useEffect(() => {
    if (!isMenuOpen) {
      return undefined;
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
      }
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    let isCancelled = false;
    const image = new window.Image();

    image.src = siteData.artist.heroImage;
    image.onload = () => {
      if (isCancelled) {
        return;
      }

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d', { willReadFrequently: true });

      if (!context) {
        return;
      }

      const sampleWidth = 32;
      const sampleHeight = Math.max(18, Math.round((image.naturalHeight / image.naturalWidth) * sampleWidth));
      canvas.width = sampleWidth;
      canvas.height = sampleHeight;
      context.drawImage(image, 0, 0, sampleWidth, sampleHeight);

      const { data } = context.getImageData(0, 0, sampleWidth, sampleHeight);
      setMainBackgroundStyle(buildHeroBackgroundPalette(data));
    };

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (upcomingHeroDates.length <= 1) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setActiveUpcomingIndex((currentIndex) => (currentIndex + 1) % upcomingHeroDates.length);
    }, 3800);

    return () => window.clearInterval(intervalId);
  }, [upcomingHeroDates.length]);

  return (
    <>
      <MobileMenu
        items={navigationItems}
        isOpen={isMenuOpen}
        activeSection={activeSection}
        onClose={() => setIsMenuOpen(false)}
        isSignedIn={isSignedIn}
      />

      <div className="public-site-shell">
        <div className="public-page-header">
          <Header
            items={navigationItems}
            activeSection={activeSection}
            isMenuOpen={isMenuOpen}
            onToggleMenu={() => setIsMenuOpen((currentValue) => !currentValue)}
            onCloseMenu={() => setIsMenuOpen(false)}
            isSignedIn={isSignedIn}
          />
        </div>

        <main id="main-content" className="real-page-main" style={mainBackgroundStyle}>
        {activePage === 'signal' ? (
        <section
          id="signal"
          className="hero-section"
        >
          <div className="hero-section-media" aria-hidden="true">
            <img
              src={siteData.artist.heroImage}
              alt=""
              className="hero-section-image"
              style={{ objectPosition: siteData.artist.heroImagePosition }}
            />
          </div>
          <div className="hero-frame">
            <div className={`hero-copy ${prefersReducedMotion ? '' : 'has-motion'}`}>
              <p className="section-kicker">
                <span className="section-number-mark">KN//</span>
                <span className="section-number-value">00</span>
                {' - INTRO'}
              </p>
              <h1>
                KHALIL
                <span>NAHHAT</span>
              </h1>
              <p className="hero-tagline">{siteData.artist.tagline}</p>
              <p className="hero-location-line">{siteData.artist.locationLine}</p>
              <p className="hero-role-line">{siteData.artist.roleLine}</p>
              <p className="hero-role-line">{siteData.artist.genreLine}</p>
              <div className="hero-intro-copy">
                {heroIntroParagraphs.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </div>
              <div className="hero-actions">
                <a className="primary-button" href="/archive">
                  EXPLORE THE SOUND
                </a>
                <a className="secondary-button" href={isSignedIn ? '/dashboard' : '/login'}>
                  BOOK KHALIL
                </a>
              </div>
              {activeUpcomingDate ? (
                <div className="hero-up-next-row" aria-live="polite">
                  <span className="detail-label">UP NEXT EVENT</span>
                  <article key={activeUpcomingDate.id} className="hero-up-next-card">
                    <strong>{activeUpcomingDate.venue}</strong>
                    <span>{activeUpcomingDate.date}</span>
                    <span>{activeUpcomingDate.location}</span>
                    <span>{activeUpcomingDate.type}</span>
                  </article>
                </div>
              ) : null}
            </div>
          </div>
          <a className="scroll-indicator" href="/live">
            <span>Open live</span>
            <ArrowDownRight size={18} />
          </a>
        </section>
        ) : null}

        {activePage === 'live' ? (
        <section
          id="live"
          className="section-shell"
          style={{
            '--live-section-image': `url(${siteData.currentFrequency.backgroundImage})`,
          }}
        >
          <div className="live-section-head">
            <SectionLabel number="01" title="LIVE" />
            <div className="live-tabs" role="tablist" aria-label="Live page views">
              <button
                type="button"
                role="tab"
                aria-selected={activeLiveTab === 'stream'}
                className={`live-tab${activeLiveTab === 'stream' ? ' is-active' : ''}`}
                onClick={() => setActiveLiveTab('stream')}
              >
                LIVE
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeLiveTab === 'sessions'}
                className={`live-tab${activeLiveTab === 'sessions' ? ' is-active' : ''}`}
                onClick={() => setActiveLiveTab('sessions')}
              >
                LIVE EVENT LIST
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeLiveTab === 'requests'}
                className={`live-tab${activeLiveTab === 'requests' ? ' is-active' : ''}`}
                onClick={() => setActiveLiveTab('requests')}
              >
                REQUEST A SONG
              </button>
            </div>
          </div>
              {activeLiveTab === 'stream' ? (
                <LiveStreamPlayer
                  liveStream={liveStream}
                  currentSession={activeLiveSession}
                  sessionCount={renderedLiveSessions.length}
                  fallbackPoster={siteData.currentFrequency.backgroundImage}
                />
              ) : null}

              {activeLiveTab === 'sessions' ? (
                <LiveSessionTable sessions={renderedLiveSessions} />
              ) : null}

              {activeLiveTab === 'requests' ? (
                <div className="live-request-panel">
                  <LiveRequestAgent
                    onAnalyze={onAnalyzeLiveRequest}
                    onSearchYoutubeVideos={onSearchYoutubeVideos}
                    onCreate={onCreateLiveRequest}
                  />
                </div>
              ) : null}
        </section>
        ) : null}

        {activePage === 'archive' ? (
        <section
          id="archive"
          className="section-shell"
          style={{
            '--archive-section-image': `url(${siteData.archive.backgroundImage})`,
          }}
        >
          <SectionLabel number="02" title="ARCHIVE" />
          <ArchiveGrid
            items={filteredArchiveItems}
            activeFilter={archiveFilter}
            onFilterChange={setArchiveFilter}
            filters={siteData.archiveFilters}
          />
        </section>
        ) : null}

        {activePage === 'dates' ? (
        <section
          id="dates"
          className="section-shell"
          style={{
            '--dates-section-image': `url(${siteData.datesBackgroundImage})`,
          }}
        >
          <SectionLabel number="03" title="DATES" />
          <div className="dates-calendar-shell">
            <div className="dates-calendar-head">
              <div className="dates-calendar-heading">
                <p className="detail-label">SCHEDULE CALENDAR</p>
                <h3>{`${CALENDAR_MONTHS[selectedCalendarMonth]} ${selectedCalendarYear}`}</h3>
              </div>
              <div className="dates-calendar-toolbar">
                <div className="dates-calendar-controls">
                  <label>
                    <span>Month</span>
                    <select
                      value={selectedCalendarMonth}
                      onChange={(event) => setSelectedCalendarMonth(Number(event.target.value))}
                    >
                      {CALENDAR_MONTHS.map((monthLabel, monthIndex) => (
                        <option key={monthLabel} value={monthIndex}>
                          {monthLabel}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span>Year</span>
                    <select
                      value={selectedCalendarYear}
                      onChange={(event) => setSelectedCalendarYear(Number(event.target.value))}
                    >
                      {calendarYearOptions.map((yearOption) => (
                        <option key={yearOption} value={yearOption}>
                          {yearOption}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="dates-calendar-counter" aria-live="polite">
                  <span>Events</span>
                  <strong>{visibleCalendarEvents.length}</strong>
                </div>
              </div>
            </div>

            <div className="dates-calendar-grid-shell">
              <div className="dates-calendar-grid dates-calendar-grid-head" aria-hidden="true">
                {CALENDAR_WEEKDAYS.map((weekday) => (
                  <span key={weekday}>{weekday}</span>
                ))}
              </div>
              <div className="dates-calendar-grid dates-calendar-grid-body" role="grid" aria-label="Events calendar">
                {calendarDays.map((cell) => {
                  if (cell.isEmpty) {
                    return <div key={cell.key} className="calendar-day calendar-day-empty" aria-hidden="true" />;
                  }

                  return (
                    <article
                      key={cell.key}
                      className={`calendar-day${cell.isToday ? ' is-today' : ''}${cell.events.length ? ' has-events' : ''}`}
                      role="gridcell"
                      aria-label={`${CALENDAR_MONTHS[selectedCalendarMonth]} ${cell.day}, ${selectedCalendarYear}${cell.events.length ? `, ${cell.events.length} event${cell.events.length === 1 ? '' : 's'}` : ''}`}
                    >
                      <div className="calendar-day-head">
                        <strong>{cell.day}</strong>
                        {cell.events.length ? <span>{`${cell.events.length} live`}</span> : null}
                      </div>
                      <div className="calendar-day-events">
                        {cell.events.slice(0, 2).map((event) => (
                          <div key={event.id} className="calendar-day-event">
                            <strong>{event.venue}</strong>
                            <span>{event.type}</span>
                          </div>
                        ))}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>
        ) : null}

        {activePage === 'contact' ? (
        <section id="contact" className="section-shell contact-section">
          <SectionLabel number="05" title="CONTACT US" />
          <div className="contact-page-shell">
            <div className="contact-page-body">
              <div className="contact-page-copy">
                <p className="annotation">DIRECT BOOKING / GENERAL INQUIRIES</p>
                <h3>Bring the right energy to your room.</h3>
                <p>{siteData.artist.supportingStatement}</p>
                <p className="contact-page-note">
                  Clubs, private events, weddings, and curated live experiences. Share the date,
                  location, and type of event to start the conversation.
                </p>
                <a className="contact-primary-action" href={`mailto:${siteData.footerBookingEmail}`}>
                  <span>
                    <small>Booking inquiries</small>
                    {siteData.footerBookingEmail}
                  </span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </div>

              <nav className="contact-stack" aria-label="Contact and social links">
                {siteData.artist.socialLinks.map((link, index) => (
                  <a key={link.label} href={link.href}>
                    <span className="contact-link-index">{String(index + 1).padStart(2, '0')}</span>
                    <span className="contact-link-copy">
                      <small>{link.label}</small>
                      <strong>{link.value}</strong>
                    </span>
                    <ArrowUpRight aria-hidden="true" />
                  </a>
                ))}
                <a href="/dates">
                  <span className="contact-link-index">
                    {String(siteData.artist.socialLinks.length + 1).padStart(2, '0')}
                  </span>
                  <span className="contact-link-copy">
                    <small>Availability</small>
                    <strong>View upcoming dates</strong>
                  </span>
                  <ArrowUpRight aria-hidden="true" />
                </a>
              </nav>
            </div>
            <Footer
              items={navigationItems}
              artistName={siteData.artist.name}
              mark={siteData.artist.mark}
              message={siteData.footerMessage}
              bookingEmail={siteData.footerBookingEmail}
            />
          </div>
        </section>
        ) : null}

        </main>
      </div>
    </>
  );
}

export default HomePage;
