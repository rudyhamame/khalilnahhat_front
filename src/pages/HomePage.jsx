import {
  ArrowDownRight,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import ArchiveGrid from '../components/ArchiveGrid';
import EventRow from '../components/EventRow';
import Footer from '../components/Footer';
import Header from '../components/Header';
import LiveStreamPlayer from '../components/LiveStreamPlayer';
import LiveSessionTable from '../components/LiveSessionTable';
import MobileMenu from '../components/MobileMenu';
import Modal from '../components/Modal';
import SectionLabel from '../components/SectionLabel';
import { navigationItems, siteData } from '../data/siteData';
import { useActiveSection } from '../hooks/useActiveSection';
import { useReducedMotion } from '../hooks/useReducedMotion';

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

function HomePage({ archiveItems, liveSessions, liveStream, isSignedIn }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [archiveFilter, setArchiveFilter] = useState('All');
  const [activeArchiveItem, setActiveArchiveItem] = useState(null);
  const [activeUpcomingIndex, setActiveUpcomingIndex] = useState(0);
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

  const filteredArchiveItems = useMemo(() => {
    if (archiveFilter === 'All') {
      return archiveItems;
    }

    return archiveItems.filter((item) => item.category === archiveFilter);
  }, [archiveFilter, archiveItems]);
  const heroIntroParagraphs = useMemo(() => siteData.artist.biography.slice(0, 1), []);
  const upcomingHeroDates = useMemo(() => siteData.dates.slice(0, 3), []);
  const activeUpcomingDate = upcomingHeroDates[activeUpcomingIndex] || null;

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

  useEffect(() => () => {
    if (navigationResetRef.current) {
      window.clearTimeout(navigationResetRef.current);
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

  const handleSectionNavigation = (event, sectionId) => {
    const targetSection = document.getElementById(sectionId);

    if (!targetSection) {
      return;
    }

    event.preventDefault();
    setIsMenuOpen(false);

    if (navigationResetRef.current) {
      window.clearTimeout(navigationResetRef.current);
    }

    window.history.pushState(null, '', `#${sectionId}`);

    const root = document.documentElement;
    const previousSnapType = root.style.scrollSnapType;
    const previousBehavior = root.style.scrollBehavior;
    const nextTop = targetSection.getBoundingClientRect().top + window.scrollY;
    const isTouchDevice =
      window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;

    root.style.scrollSnapType = 'none';
    root.style.scrollBehavior = 'auto';
    window.scrollTo({ top: nextTop, behavior: prefersReducedMotion || isTouchDevice ? 'auto' : 'smooth' });

    navigationResetRef.current = window.setTimeout(() => {
      root.style.scrollSnapType = previousSnapType;
      root.style.scrollBehavior = previousBehavior;
    }, prefersReducedMotion || isTouchDevice ? 80 : 420);
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
                <a className="primary-button" href="#live">
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
          <div className="current-frequency-layout">
            <LiveStreamPlayer
              liveStream={liveStream}
              currentSession={liveSessions[0] || null}
              sessionCount={liveSessions.length}
              fallbackPoster={siteData.currentFrequency.backgroundImage}
            />
            <LiveSessionTable sessions={liveSessions} />
          </div>
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

        <section className="section-shell footer-section">
          <Footer
            items={navigationItems}
            artistName={siteData.artist.name}
            mark={siteData.artist.mark}
            message={siteData.footerMessage}
            bookingEmail={siteData.footerBookingEmail}
          />
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
