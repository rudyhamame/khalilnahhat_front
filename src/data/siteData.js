import heroImage from '../assets/images/hero.png';
import liveImage from '../assets/images/live.png';
import archiveImage from '../assets/images/archive.png';
import datesImage from '../assets/images/dates.png';
import portraitImage from '../assets/images/portrait-placeholder.svg';
import archiveLive from '../assets/images/archive-live.svg';
import archivePortrait from '../assets/images/archive-portrait.svg';
import archiveCrowd from '../assets/images/archive-crowd.svg';
import archiveMotion from '../assets/images/archive-motion.svg';
import { resolveApiBaseUrl, resolveBookingApiUrl } from '../lib/runtimeConfig';

function formatAudioTrackName(filePath) {
  const fileName = filePath.split('/').pop() || '';
  const withoutExtension = fileName.replace(/\.[^.]+$/, '');

  return withoutExtension
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const audioTrackModules = import.meta.glob('../assets/audios/*.{mp3,wav,ogg,m4a,aac,flac}', {
  eager: true,
  import: 'default',
});

const audioTracks = Object.entries(audioTrackModules)
  .sort(([leftPath], [rightPath]) => leftPath.localeCompare(rightPath))
  .map(([filePath, src], index) => ({
    id: `track-${index + 1}`,
    title: formatAudioTrackName(filePath),
    src,
  }));

const apiBaseUrl = resolveApiBaseUrl();

export const navigationItems = [
  { id: 'signal', label: 'Intro', sectionNumber: '00' },
  { id: 'live', label: 'Live', sectionNumber: '01' },
  { id: 'archive', label: 'Archive', sectionNumber: '02' },
  { id: 'dates', label: 'Dates', sectionNumber: '03' },
  { id: 'contact', label: 'Contact', sectionNumber: '04' },
];

export const archiveAssetMap = {
  'asset:archive-live': archiveLive,
  'asset:archive-portrait': archivePortrait,
  'asset:archive-crowd': archiveCrowd,
  'asset:archive-motion': archiveMotion,
};

export const siteData = {
  artist: {
    name: 'KHALIL NAHHAT',
    mark: 'KN//',
    tagline: 'BUILT FOR THE ROOM.',
    supportingStatement:
      'Khalil Nahhat builds rhythm-driven sets through tension, movement, and release.',
    roleLine: 'DJ / PRODUCER / LIVE PERFORMANCE',
    locationLine: 'TORONTO, CANADA',
    genreLine: 'HOUSE / TECHNO / OPEN FORMAT',
    basedIn: 'TORONTO, CANADA',
    activeSince: '[YEAR]',
    genres: 'House / Techno / Open Format',
    availability:
      'Clubs, festivals, private events, weddings, corporate events, and curated experiences',
    biography: [
      'A DJ and live performer focused on constructing sets that evolve with the room. His sound moves through rhythm, tension, atmosphere, and controlled release rather than following a fixed playlist.',
      'Each performance is treated as a live response to the audience, the venue, and the energy of the night.',
    ],
    heroImage,
    heroImagePosition: 'right center',
    // REPLACE: Swap portraitImage with Khalil's real portrait.
    portraitImage,
    localTimeZone: 'America/Toronto',
    technicalMeta: ['CHANNEL KN-001', 'STEREO OUTPUT', 'SIGNAL PATH: ANALOG / DIGITAL'],
    socialLinks: [
      { label: 'Instagram', value: '@khalilnahhat', href: 'https://instagram.com/' },
      { label: 'SoundCloud', value: '[PLACEHOLDER]', href: '#' },
      { label: 'Email', value: 'booking@example.com', href: 'mailto:booking@example.com' },
    ],
  },
  currentFrequency: {
    sectionKicker: 'KN//LATEST TRANSMISSION',
    heading: 'CURRENT FREQUENCY',
    backgroundImage: liveImage,
    title: audioTracks[0]?.title || 'MIDNIGHT TRANSMISSION 001',
    type: 'LIVE SESSION',
    duration: '48:32',
    description:
      'A precision-built late-night session that moves from sparse pressure to full-room release.',
    sessionNotes:
      'Each live session entry tracks the music flow of the set, including duration, style, and language profile.',
    sessions: [],
    status: audioTracks.length
      ? `${audioTracks.length} audio file${audioTracks.length > 1 ? 's are' : ' is'} ready in src/assets/audios.`
      : 'Audio placeholder ready. Replace the source URL below when the final mix is available.',
    audioTracks,
    audioSrc: audioTracks[0]?.src || '',
    audioFallbackDuration: '48:32',
    waveformMoments: ['00:00', '11:54', '24:08', '36:15', '48:32'],
    replaceNote: audioTracks.length
      ? 'Use the controller to move through every audio file in src/assets/audios.'
      : "REPLACE: Add Khalil's real audio file URL or imported MP3 path to currentFrequency.audioSrc.",
  },
  archive: {
    backgroundImage: archiveImage,
  },
  dates: {
    backgroundImage: datesImage,
  },
  transmissions: [
    {
      id: 'KN//TRANSMISSION 014',
      venue: 'VENUE NAME',
      city: 'TORONTO',
      country: 'CANADA',
      date: '18 JUL 2026',
      eventType: 'PEAK-TIME SET',
      duration: '90 MIN',
      audience: '[CAPACITY]',
      image: archiveLive,
      description:
        'A tightly paced club set built on long transitions, heavy low-end restraint, and a precise final lift.',
      videoState: 'Video excerpt placeholder',
      featured: true,
    },
    {
      id: 'KN//TRANSMISSION 011',
      venue: 'ROOFTOP SESSION',
      city: 'MONTRÉAL',
      country: 'CANADA',
      date: '03 JUN 2026',
      eventType: 'SUNSET SESSION',
      duration: '75 MIN',
      audience: '[PRIVATE CAPACITY]',
      image: archiveMotion,
      description: 'A warm-to-driving progression designed for open-air momentum and steady release.',
      videoState: 'No public video',
    },
    {
      id: 'KN//TRANSMISSION 009',
      venue: 'FESTIVAL STAGE',
      city: 'VANCOUVER',
      country: 'CANADA',
      date: '24 MAY 2026',
      eventType: 'FESTIVAL SET',
      duration: '60 MIN',
      audience: '[AUDIENCE SIZE]',
      image: archiveCrowd,
      description: 'Fast-building sequences shaped for broad energy without losing edge or detail.',
      videoState: 'Behind-the-scenes footage',
    },
    {
      id: 'KN//TRANSMISSION 006',
      venue: 'PRIVATE RESIDENCY',
      city: 'OTTAWA',
      country: 'CANADA',
      date: '14 MAR 2026',
      eventType: 'OPEN FORMAT',
      duration: '120 MIN',
      audience: '[INVITE-ONLY]',
      image: archivePortrait,
      description:
        'An adaptive format built around room reading, pacing changes, and broad audience control.',
      videoState: 'Available on request',
    },
  ],
  frequencies: [
    {
      id: 'arrival',
      number: '01',
      name: 'ARRIVAL',
      description:
        'Warm, controlled selections designed to establish the room without overwhelming it.',
      energy: 'Low to medium',
      duration: '60-90 MIN',
      mixCount: '06 SELECTS',
      actionLabel: 'Warmup architecture',
    },
    {
      id: 'motion',
      number: '02',
      name: 'MOTION',
      description:
        'Rhythm-forward sets built to create continuous movement and sustained attention.',
      energy: 'Medium',
      duration: '90 MIN',
      mixCount: '10 MIXES',
      actionLabel: 'Driven continuity',
    },
    {
      id: 'pressure',
      number: '03',
      name: 'PRESSURE',
      description:
        'Peak-time selections with greater density, impact, and physical energy.',
      energy: 'High',
      duration: '60 MIN',
      mixCount: '08 SETS',
      actionLabel: 'Peak-time control',
    },
    {
      id: 'afterhours',
      number: '04',
      name: 'AFTERHOURS',
      description:
        'Deeper, darker, and more hypnotic sessions for late-night environments.',
      energy: 'Medium to high',
      duration: '120 MIN',
      mixCount: '05 SESSIONS',
      actionLabel: 'Hypnotic tension',
    },
    {
      id: 'open-format',
      number: '05',
      name: 'OPEN FORMAT',
      description:
        'Adaptive performances created for mixed audiences, private events, and flexible programming.',
      energy: 'Variable',
      duration: 'Flexible',
      mixCount: 'CUSTOM PROGRAMS',
      actionLabel: 'Audience adaptive',
    },
  ],
  archiveFilters: ['All', 'Live', 'Portrait', 'Crowd', 'Motion'],
  archiveItems: [],
  dates: [],
  booking: {
    heading: 'CONFIGURE A PERFORMANCE',
    description:
      'Provide the event details below. Booking requests are reviewed based on date, location, format, and production requirements.',
    directContacts: [
      { label: 'BOOKING', value: 'booking@example.com', href: 'mailto:booking@example.com' },
      { label: 'MANAGEMENT', value: 'management@example.com', href: 'mailto:management@example.com' },
      { label: 'INSTAGRAM', value: '@khalilnahhat', href: 'https://instagram.com/' },
      { label: 'SOUNDCLOUD', value: '[PLACEHOLDER]', href: '#' },
    ],
    eventTypes: ['Club', 'Festival', 'Private event', 'Wedding', 'Corporate event', 'Brand activation', 'Other'],
    budgetRanges: ['Under C$1,000', 'C$1,000-C$2,500', 'C$2,500-C$5,000', 'C$5,000+', 'Prefer to discuss'],
    apiUrl: resolveBookingApiUrl() || `${apiBaseUrl}/bookings`,
  },
  footerMessage: 'SOUND IN MOTION',
  footerBookingEmail: 'booking@example.com',
};

// REPLACE: Update booking and management emails in siteData.booking.directContacts.
// REPLACE: Update the active year and social links in siteData.artist.
