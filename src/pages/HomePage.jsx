import {
  ArrowDownRight,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ArchiveGrid from '../components/ArchiveGrid';
import EventRow from '../components/EventRow';
import Footer from '../components/Footer';
import Header from '../components/Header';
import LiveRequestAgent from '../components/LiveRequestAgent';
import LiveSessionTable from '../components/LiveSessionTable';
import LiveStreamPlayer from '../components/LiveStreamPlayer';
import MobileMenu from '../components/MobileMenu';
import Modal from '../components/Modal';
import SectionLabel from '../components/SectionLabel';
import { navigationItems, siteData } from '../data/siteData';
import { useActiveSection } from '../hooks/useActiveSection';
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

function formatCountdownParts(timeDifference) {
  const totalSeconds = Math.max(0, Math.floor(timeDifference / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return { days, hours, minutes, seconds };
}

function isReloadNavigation() {
  if (typeof window === 'undefined' || typeof window.performance === 'undefined') {
    return false;
  }

  const navigationEntries = window.performance.getEntriesByType?.('navigation');
  const latestNavigation = navigationEntries?.[0];

  if (latestNavigation && 'type' in latestNavigation) {
    return latestNavigation.type === 'reload';
  }

  return window.performance.navigation?.type === 1;
}

function easeOutCubic(progress) {
  return 1 - ((1 - progress) ** 3);
}

function HomePage({
  archiveItems,
  liveSessions,
  liveStream,
  isSignedIn,
  onAnalyzeLiveRequest,
  onCreateLiveRequest,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState('All');
  const [activeArchiveItem, setActiveArchiveItem] = useState(null);
  const [activeUpcomingIndex, setActiveUpcomingIndex] = useState(0);
  const [activeLiveTab, setActiveLiveTab] = useState('stream');
  const [countdownNow, setCountdownNow] = useState(() => Date.now());
  const [mainBackgroundStyle, setMainBackgroundStyle] = useState(() => ({
    '--page-base': 'rgb(9 9 9)',
    '--page-mist-cool': 'rgba(39, 118, 214, 0.22)',
    '--page-mist-warm': 'rgba(143, 24, 31, 0.16)',
    '--page-glow': 'rgba(220, 232, 255, 0.12)',
    '--page-line': 'rgba(255, 255, 255, 0.035)',
    '--page-dot': 'rgba(255, 255, 255, 0.04)',
  }));
  const activeSection = useActiveSection(navigationItems.map((item) => item.id));
  const prefersReducedMotion = useReducedMotion();
  const navigationResetRef = useRef(null);
  const scrollSettleTimeoutRef = useRef(null);
  const isAutoSnappingRef = useRef(false);
  const settleAnimationFrameRef = useRef(null);

  const filteredArchiveItems = useMemo(() => {
    if (archiveFilter === 'All') {
      return archiveItems;
    }

    return archiveItems.filter((item) => item.category === archiveFilter);
  }, [archiveFilter, archiveItems]);
  const hasActiveLiveStream = Boolean(liveStream?.streamUrl?.trim());
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
  const nextLiveEvent = useMemo(() => {
    const now = new Date(countdownNow);

    return siteData.dates
      .map((event) => ({
        ...event,
        liveDate: parseLiveEventDate(event),
      }))
      .filter((event) => event.liveDate && event.liveDate.getTime() > now.getTime())
      .sort((left, right) => left.liveDate.getTime() - right.liveDate.getTime())[0] || null;
  }, [countdownNow]);
  const nextLiveCountdown = useMemo(
    () =>
      nextLiveEvent?.liveDate
        ? formatCountdownParts(nextLiveEvent.liveDate.getTime() - countdownNow)
        : null,
    [countdownNow, nextLiveEvent],
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
    if (typeof window === 'undefined') {
      return undefined;
    }

    const previousScrollRestoration = window.history.scrollRestoration;

    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }

    if (isReloadNavigation()) {
      const sectionIds = navigationItems.map((item) => item.id);
      const requestedHash = (window.location.hash || '').replace(/^#/, '');
      const restoredSectionId = sectionIds.includes(requestedHash) ? requestedHash : 'signal';
      const restoredSection = document.getElementById(restoredSectionId);
      const root = document.documentElement;
      const previousSnapType = root.style.scrollSnapType;
      const previousBehavior = root.style.scrollBehavior;

      root.style.scrollSnapType = 'none';
      root.style.scrollBehavior = 'auto';
      window.history.replaceState(null, '', `#${restoredSectionId}`);

      if (restoredSection) {
        window.scrollTo({
          top: restoredSection.offsetTop,
          left: 0,
          behavior: 'auto',
        });
      } else {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
      }

      window.setTimeout(() => {
        root.style.scrollSnapType = previousSnapType;
        root.style.scrollBehavior = previousBehavior;
      }, 80);
    }

    return () => {
      if ('scrollRestoration' in window.history) {
        window.history.scrollRestoration = previousScrollRestoration || 'auto';
      }
    };
  }, []);

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

  useEffect(() => () => {
    if (navigationResetRef.current) {
      window.clearTimeout(navigationResetRef.current);
    }

    if (scrollSettleTimeoutRef.current) {
      window.clearTimeout(scrollSettleTimeoutRef.current);
    }

    if (settleAnimationFrameRef.current) {
      window.cancelAnimationFrame(settleAnimationFrameRef.current);
    }
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

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCountdownNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const scrollToSection = (sectionId, options = {}) => {
    const targetSection = document.getElementById(sectionId);

    if (!targetSection) {
      return false;
    }

    if (navigationResetRef.current) {
      window.clearTimeout(navigationResetRef.current);
    }

    const { updateHistory = true, historyMode = 'push', useNativeScroll = false } = options;

    if (updateHistory) {
      const nextHash = `#${sectionId}`;
      if (historyMode === 'replace') {
        window.history.replaceState(null, '', nextHash);
      } else {
        window.history.pushState(null, '', nextHash);
      }
    }

    const root = document.documentElement;
    const previousSnapType = root.style.scrollSnapType;
    const previousBehavior = root.style.scrollBehavior;
    const nextTop = targetSection.getBoundingClientRect().top + window.scrollY;
    const isTouchDevice =
      window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

    isAutoSnappingRef.current = true;

    if (useNativeScroll) {
      targetSection.scrollIntoView({
        block: 'start',
        behavior: prefersReducedMotion || isTouchDevice ? 'auto' : 'smooth',
      });

      navigationResetRef.current = window.setTimeout(() => {
        isAutoSnappingRef.current = false;
      }, prefersReducedMotion || isTouchDevice ? 120 : 700);

      return true;
    }

    root.style.scrollSnapType = 'none';
    root.style.scrollBehavior = 'auto';
    window.scrollTo({ top: nextTop, behavior: prefersReducedMotion || isTouchDevice ? 'auto' : 'smooth' });

    navigationResetRef.current = window.setTimeout(() => {
      root.style.scrollSnapType = previousSnapType;
      root.style.scrollBehavior = previousBehavior;
      isAutoSnappingRef.current = false;
    }, prefersReducedMotion || isTouchDevice ? 80 : 420);

    return true;
  };

  const glideToSectionTop = (sectionId) => {
    const targetSection = document.getElementById(sectionId);

    if (!targetSection) {
      return;
    }

    const startTop = window.scrollY;
    const targetTop = targetSection.offsetTop;
    const distance = targetTop - startTop;

    if (Math.abs(distance) < 4) {
      window.history.replaceState(null, '', `#${sectionId}`);
      return;
    }

    if (settleAnimationFrameRef.current) {
      window.cancelAnimationFrame(settleAnimationFrameRef.current);
    }

    const root = document.documentElement;
    const previousSnapType = root.style.scrollSnapType;
    const previousBehavior = root.style.scrollBehavior;
    const duration = Math.max(180, Math.min(340, 150 + Math.abs(distance) * 0.1));
    const startTime = window.performance.now();

    root.style.scrollSnapType = 'none';
    root.style.scrollBehavior = 'auto';
    isAutoSnappingRef.current = true;

    const finish = () => {
      root.style.scrollSnapType = previousSnapType;
      root.style.scrollBehavior = previousBehavior;
      isAutoSnappingRef.current = false;
      window.history.replaceState(null, '', `#${sectionId}`);
    };

    if (prefersReducedMotion) {
      window.scrollTo({ top: targetTop, behavior: 'auto' });
      finish();
      return;
    }

    const animate = (timestamp) => {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);
      const nextTop = startTop + distance * easedProgress;

      window.scrollTo({ top: nextTop, behavior: 'auto' });

      if (progress < 1) {
        settleAnimationFrameRef.current = window.requestAnimationFrame(animate);
        return;
      }

      finish();
    };

    settleAnimationFrameRef.current = window.requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const sections = Array.from(document.querySelectorAll('main > section[id]'));

    if (!sections.length) {
      return undefined;
    }

    const snapToNearestSection = () => {
      if (isMenuOpen || isAutoSnappingRef.current) {
        return;
      }

      const viewportMidpoint = window.scrollY + window.innerHeight / 2;
      const nearestSection = sections.reduce(
        (closestSection, currentSection) => {
          const currentMidpoint = currentSection.offsetTop + currentSection.offsetHeight / 2;
          const currentDistance = Math.abs(currentMidpoint - viewportMidpoint);

          if (!closestSection || currentDistance < closestSection.distance) {
            return {
              node: currentSection,
              distance: currentDistance,
            };
          }

          return closestSection;
        },
        null,
      );

      if (!nearestSection?.node?.id) {
        return;
      }

      const targetTop = nearestSection.node.offsetTop;

      if (Math.abs(window.scrollY - targetTop) < 4) {
        return;
      }

      glideToSectionTop(nearestSection.node.id);
    };

    const scheduleSnap = () => {
      if (scrollSettleTimeoutRef.current) {
        window.clearTimeout(scrollSettleTimeoutRef.current);
      }

      scrollSettleTimeoutRef.current = window.setTimeout(snapToNearestSection, 85);
    };

    window.addEventListener('scroll', scheduleSnap, { passive: true });

    return () => {
      window.removeEventListener('scroll', scheduleSnap);
      if (scrollSettleTimeoutRef.current) {
        window.clearTimeout(scrollSettleTimeoutRef.current);
      }
    };
  }, [isMenuOpen, prefersReducedMotion]);

  const handleSectionNavigation = (event, sectionId) => {
    event.preventDefault();
    setIsMenuOpen(false);
    scrollToSection(sectionId, { useNativeScroll: true });
  };

  return (
    <>
      <MobileMenu
        items={navigationItems}
        isOpen={isMenuOpen}
        activeSection={activeSection}
        onClose={() => setIsMenuOpen(false)}
        onNavigate={handleSectionNavigation}
        isSignedIn={isSignedIn}
      />

      <main id="main-content" style={mainBackgroundStyle}>
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
          <Header
            items={navigationItems}
            activeSection={activeSection}
            isMenuOpen={isMenuOpen}
            onToggleMenu={() => setIsMenuOpen((currentValue) => !currentValue)}
            onCloseMenu={() => setIsMenuOpen(false)}
            onNavigate={handleSectionNavigation}
            isSignedIn={isSignedIn}
          />
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
                <a className="primary-button" href="#archive" onClick={(event) => handleSectionNavigation(event, 'archive')}>
                  EXPLORE THE SOUND
                </a>
                <a className="secondary-button" href={isSignedIn ? '#dashboard' : '#login'}>
                  BOOK KHALIL
                </a>
              </div>
              {activeUpcomingDate ? (
                <div className="hero-up-next-row" aria-live="polite">
                  <span className="detail-label">UP NEXT SESSION</span>
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
          <a className="scroll-indicator" href="#live">
            <span>Scroll for live</span>
            <ArrowDownRight size={18} />
          </a>
        </section>

        <section
          id="live"
          className="section-shell"
          style={{
            '--live-section-image': `url(${siteData.currentFrequency.backgroundImage})`,
          }}
        >
          <SectionLabel number="01" title="LIVE" />
          <div className="live-tabs-shell">
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
                LIVE SESSION LIST
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

            <div className="live-tab-panel">
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
                    onCreate={onCreateLiveRequest}
                  />
                </div>
              ) : null}
            </div>
          </div>
          {!hasActiveLiveStream ? (
            <div className="live-countdown" aria-live="polite">
              <span className="live-countdown-kicker">NEXT LIVE SESSION</span>
              {nextLiveEvent && nextLiveCountdown ? (
                <>
                  <div className="live-countdown-values">
                    <div>
                      <strong>{String(nextLiveCountdown.days).padStart(2, '0')}</strong>
                      <span>DAYS</span>
                    </div>
                    <div>
                      <strong>{String(nextLiveCountdown.hours).padStart(2, '0')}</strong>
                      <span>HRS</span>
                    </div>
                    <div>
                      <strong>{String(nextLiveCountdown.minutes).padStart(2, '0')}</strong>
                      <span>MIN</span>
                    </div>
                    <div>
                      <strong>{String(nextLiveCountdown.seconds).padStart(2, '0')}</strong>
                      <span>SEC</span>
                    </div>
                  </div>
                  <p className="live-countdown-meta">
                    <strong>{nextLiveEvent.venue || nextLiveEvent.title || 'Upcoming session'}</strong>
                    <span>{nextLiveEvent.date}</span>
                    {nextLiveEvent.location ? <span>{nextLiveEvent.location}</span> : null}
                  </p>
                </>
              ) : (
                <p className="live-countdown-empty">Next live session to be announced.</p>
              )}
            </div>
          ) : null}
        </section>

        <section id="archive" className="section-shell">
          <SectionLabel number="02" title="ARCHIVE" />
          <ArchiveGrid
            items={filteredArchiveItems}
            activeFilter={archiveFilter}
            onFilterChange={setArchiveFilter}
            onSelectItem={setActiveArchiveItem}
            filters={siteData.archiveFilters}
          />
        </section>

        <section id="dates" className="section-shell">
          <SectionLabel number="03" title="DATES" />
          <div className="dates-stack">
            {siteData.dates.length ? (
              siteData.dates.map((event) => <EventRow key={event.id} event={event} />)
            ) : (
              <p className="empty-state">NO PUBLIC TRANSMISSIONS CURRENTLY SCHEDULED.</p>
            )}
          </div>
        </section>

        <section id="contact" className="section-shell contact-section">
          <SectionLabel number="04" title="CONTACT US" />
          <div className="contact-page-shell">
            <div className="contact-page-copy">
              <p className="annotation">{siteData.artist.supportingStatement}</p>
              <h3>Book Khalil for clubs, private events, weddings, and curated live experiences.</h3>
              <p>
                Reach out for bookings, availability, live session questions, or production details.
              </p>
              <div className="contact-stack">
                {siteData.artist.socialLinks.map((link) => (
                  <a key={link.label} href={link.href}>
                    <span>{link.label}</span>
                    <span>{link.value}</span>
                  </a>
                ))}
                <a href={`mailto:${siteData.footerBookingEmail}`}>
                  <span>Bookings</span>
                  <span>{siteData.footerBookingEmail}</span>
                </a>
                <a href="#dates" onClick={(event) => handleSectionNavigation(event, 'dates')}>
                  <span>Upcoming</span>
                  <span>View Dates</span>
                </a>
              </div>
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

      </main>

      <Modal
        isOpen={Boolean(activeArchiveItem)}
        title={activeArchiveItem?.title ?? 'Archive item'}
        onClose={() => setActiveArchiveItem(null)}
      >
        {activeArchiveItem ? (
          <div className="archive-modal-content">
            <img src={activeArchiveItem.image} alt={activeArchiveItem.alt} />
            <div className="archive-modal-copy">
              <p className="detail-label">{activeArchiveItem.category}</p>
              <p>
                {activeArchiveItem.location} / {activeArchiveItem.date}
              </p>
              <p>{activeArchiveItem.mediaType}</p>
            </div>
          </div>
        ) : null}
      </Modal>
    </>
  );
}

export default HomePage;
