import {preflightRequests, preflightArtwork} from './preflightReadiness';
import {waitForPreflightSession} from './preflightSession';

function pause(ms, signal) {
  return new Promise((resolve, reject) => {
    const abort = () => { clearTimeout(timer); reject(new DOMException('Loading canceled', 'AbortError')); };
    const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, ms);
    if (signal.aborted) abort();
    else signal.addEventListener('abort', abort, {once:true});
  });
}

function bounded(task, signal, ms = 25000) {
  return new Promise((resolve, reject) => {
    const finish = (callback, value) => { clearTimeout(timer); signal.removeEventListener('abort', abort); callback(value); };
    const abort = () => finish(reject, new DOMException('Loading canceled', 'AbortError'));
    const timer = setTimeout(() => finish(reject, new Error('Content took too long to load.')), ms);
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, {once:true});
    Promise.resolve(task).then(value => finish(resolve, value), error => finish(reject, error));
  });
}

function loadImage(src, signal) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      image.onload = image.onerror = null;
      if (error) { image.src = ''; reject(error); } else resolve();
    };
    const abort = () => finish(new DOMException('Loading canceled', 'AbortError'));
    const timer = setTimeout(() => finish(new Error('An image took too long to load.')), 25000);
    image.onload = async () => {
      try { if (image.decode) await bounded(image.decode(), signal); finish(); }
      catch (error) { finish(error); }
    };
    image.onerror = () => finish(new Error('An image could not load.'));
    if (signal.aborted) { abort(); return; }
    signal.addEventListener('abort', abort, {once:true});
    image.src = src;
  });
}

function pageArtwork(root) {
  const urls = new Set();
  for (const image of root.querySelectorAll('img')) {
    // Hidden sections still need their images ready when the client scrolls.
    image.loading = 'eager';
    if (image.currentSrc || image.src) urls.add(image.currentSrc || image.src);
  }
  for (const video of root.querySelectorAll('video[poster]')) if (video.poster) urls.add(video.poster);
  const collect = value => {
    for (const match of value.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*?))\s*\)/g)) {
      const src = match[1] || match[2] || match[3];
      if (src && !src.startsWith('#')) urls.add(new URL(src, document.baseURI).href);
    }
  };
  for (const element of [root, ...root.querySelectorAll('*')]) {
    const style = getComputedStyle(element);
    collect(style.backgroundImage);
    collect(style.maskImage || '');
    for (const pseudo of ['::before', '::after']) {
      const css = getComputedStyle(element, pseudo);
      if (css.content !== 'none' && css.content !== 'normal') { collect(css.backgroundImage); collect(css.content); }
    }
  }
  return urls;
}

async function requestsReady(signal) {
  let previous = -1;
  while (true) {
    const state = preflightRequests();
    if (!state.pending && state.revision === previous) {
      if (state.failed) throw new Error('Some page content could not load. Please retry.');
      return state.revision;
    }
    previous = state.pending ? -1 : state.revision;
    await pause(400, signal);
  }
}

export async function preparePreflightContent(root, {signal, assets = [], onProgress}) {
  onProgress(5, 'session');
  const ready = await bounded(waitForPreflightSession(document, {signal}), signal, 45000);
  if (!ready || signal.aborted) throw new DOMException('Loading canceled', 'AbortError');
  await requestsReady(signal);
  onProgress(30, 'artwork');
  const loaded = new Set();
  let stable = 0;
  while (stable < 2) {
    const revision = await requestsReady(signal);
    const urls = new Set([...assets, ...preflightArtwork(), ...pageArtwork(root)]);
    const remaining = [...urls].filter(url => !loaded.has(url));
    let cursor = 0;
    // Limit parallel downloads so artwork does not starve API/session traffic.
    const results = await Promise.allSettled(Array.from({length: Math.min(6, remaining.length)}, async () => {
      while (cursor < remaining.length) {
        const src = remaining[cursor++];
        await loadImage(src, signal);
        loaded.add(src);
        onProgress(Math.min(90, 30 + Math.round(loaded.size / Math.max(urls.size, loaded.size) * 60)), 'artwork');
      }
    }));
    if (signal.aborted) throw new DOMException('Loading canceled', 'AbortError');
    if (results.some(result => result.status === 'rejected')) throw new Error('Some artwork could not load. Please retry.');
    onProgress(95, 'fonts');
    await bounded(document.fonts?.ready || Promise.resolve(), signal);
    // Allow API consumers and newly mounted sections to commit their artwork.
    await pause(400, signal);
    const next = preflightRequests();
    const newArtwork = [...preflightArtwork(), ...pageArtwork(root)].some(url => !loaded.has(url));
    stable = !remaining.length && !newArtwork && !next.pending && next.revision === revision ? stable + 1 : 0;
  }
  onProgress(100, 'ready');
}
