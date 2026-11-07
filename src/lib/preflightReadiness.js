// Initial GETs participate until the mounted page and its artwork are ready.
// Polling and later navigation keep their normal loading behavior after entry.
let active = true;
let serial = 0;
let revision = 0;
const pending = new Map();
const latest = new Map();
const failures = new Map();
const artwork = new Set();

function collectArtwork(value) {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (typeof child === 'object') collectArtwork(child);
    else if (typeof child === 'string' && /^(imageUrl|artworkUrl|coverImage|posterImage|thumbnailUrl|avatarUrl)$/.test(key) && child) artwork.add(child);
    else if (key === 'mediaUrl' && value.kind === 'photo' && child) artwork.add(child);
  }
}

export function preflightArtwork() { return [...artwork]; }

export function trackPreflightRequest(path, options = {}) {
  if (!active || (options.method || 'GET').toUpperCase() !== 'GET') return null;
  const id = ++serial;
  const key = `${options.token ? 'account' : 'public'}:${path}`;
  latest.set(key, id);
  pending.set(id, key);
  revision++;
  return (error, payload) => {
    pending.delete(id);
    revision++;
    if (latest.get(key) !== id) return;
    if (!error && active && /^\/(bootstrap|equipment|rental|content\/media|music-ontology)(?:[/?]|$)/.test(path)) collectArtwork(payload);
    // Unauthorized sessions are handled by the normal sign-in flow.
    if (error && error.status !== 401 && error.name !== 'AbortError') failures.set(key, error);
    else failures.delete(key);
  };
}

export function preflightRequests() {
  return { pending: pending.size, failed: failures.size, revision };
}

export function finishPreflight() {
  active = false;
  pending.clear();
  latest.clear();
  failures.clear();
  artwork.clear();
}
