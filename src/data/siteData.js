import heroImage from '../assets/images/hero.png';
import liveImage from '../assets/images/live.png';
import portraitImage from '../assets/images/portrait-placeholder.svg';
import archiveLive from '../assets/images/archive-live.svg';
import archivePortrait from '../assets/images/archive-portrait.svg';
import archiveCrowd from '../assets/images/archive-crowd.svg';
import archiveMotion from '../assets/images/archive-motion.svg';

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

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';

export const navigationItems = [
  { id: 'signal', label: 'Intro', sectionNumber: '00' },
  { id: 'live', label: 'Live', sectionNumber: '01' },
  { id: 'archive', label: 'Archive', sectionNumber: '02' },
  { id: 'dates', label: 'Dates', sectionNumber: '03' },
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
    sessions: [
      { id: 'live-session-01', track: 'Midnight Drive', duration: '06:42', genre: 'House', language: 'Instrumental' },
      { id: 'live-session-02', track: 'Velvet Pressure', duration: '05:18', genre: 'Tech House', language: 'English' },
      { id: 'live-session-03', track: 'Signal Rouge', duration: '07:04', genre: 'Melodic Techno', language: 'French' },
      { id: 'live-session-04', track: 'Afterlight Pulse', duration: '04:56', genre: 'Progressive House', language: 'Instrumental' },
      { id: 'live-session-05', track: 'Room Theory', duration: '05:37', genre: 'Open Format', language: 'Arabic / English' },
    ],
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
  archiveItems: [
    {
      id: 'archive-01',
      title: 'Control Booth',
      category: 'Live',
      location: 'TORONTO',
      date: 'APR 2026',
      mediaType: 'Photo',
      image: archiveLive,
      alt: 'Dark stage placeholder showing a performance setup and control console.',
    },
    {
      id: 'archive-02',
      title: 'Portrait Study',
      category: 'Portrait',
      location: '[CITY]',
      date: 'MAY 2026',
      mediaType: 'Photo',
      image: archivePortrait,
      alt: 'Monochrome portrait placeholder framed in an editorial layout.',
    },
    {
      id: 'archive-03',
      title: 'Room Response',
      category: 'Crowd',
      location: 'MONTRÉAL',
      date: 'JUN 2026',
      mediaType: 'Photo',
      image: archiveCrowd,
      alt: 'Abstract crowd placeholder with layered silhouettes and stage lighting.',
    },
    {
      id: 'archive-04',
      title: 'Motion Scan',
      category: 'Motion',
      location: 'VANCOUVER',
      date: 'JUN 2026',
      mediaType: 'Video still',
      image: archiveMotion,
      alt: 'Motion-focused placeholder with diagonal light streaks.',
    },
    {
      id: 'archive-05',
      title: 'Load-in Detail',
      category: 'Live',
      location: 'OTTAWA',
      date: 'FEB 2026',
      mediaType: 'Photo',
      image: archiveLive,
      alt: 'Editorial live placeholder showing venue detail panels and stage structure.',
    },
    {
      id: 'archive-06',
      title: 'Afterhours Frame',
      category: 'Portrait',
      location: '[LOCATION]',
      date: 'JUL 2026',
      mediaType: 'Photo',
      image: archivePortrait,
      alt: 'Portrait placeholder with dark tonal treatment and minimal red accents.',
    },
    {
      id: 'archive-07',
      title: 'Peak Window',
      category: 'Crowd',
      location: 'TORONTO',
      date: 'JUL 2026',
      mediaType: 'Photo',
      image: archiveCrowd,
      alt: 'Crowd placeholder featuring layered figures and a kinetic red signal line.',
    },
    {
      id: 'archive-08',
      title: 'Signal Trails',
      category: 'Motion',
      location: '[CITY]',
      date: 'AUG 2026',
      mediaType: 'Video still',
      image: archiveMotion,
      alt: 'Abstract motion placeholder with diagonal red and white streaks.',
    },
  ],
  dates: [
    {
      id: 'date-01',
      date: '08 AUG 2026',
      venue: 'CODA',
      location: 'TORONTO, CANADA',
      type: 'CLUB SET',
      status: 'Tickets',
      actionLabel: 'Get tickets',
      actionHref: '#booking',
    },
    {
      id: 'date-02',
      date: '22 AUG 2026',
      venue: 'PRIVATE EVENT',
      location: 'MONTRÉAL, CANADA',
      type: 'FULL-NIGHT SET',
      status: 'Invite only',
      actionLabel: 'Request details',
      actionHref: '#booking',
    },
    {
      id: 'date-03',
      date: '05 SEP 2026',
      venue: 'EVENT NAME',
      location: 'VANCOUVER, CANADA',
      type: 'FESTIVAL SET',
      status: 'Details soon',
      actionLabel: 'Stay updated',
      actionHref: '#booking',
    },
  ],
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
    apiUrl: import.meta.env.VITE_BOOKING_API_URL || `${apiBaseUrl}/bookings`,
  },
  footerMessage: 'SOUND IN MOTION',
  footerBookingEmail: 'booking@example.com',
};

// REPLACE: Update booking and management emails in siteData.booking.directContacts.
// REPLACE: Update the active year and social links in siteData.artist.
