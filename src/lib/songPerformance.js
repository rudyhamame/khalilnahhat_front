const BEATS_PER_GESTURE = 16; // Four measures in 4/4.

// Every track uses the same live detected-beat count, including the test song.
export function performancePose(_profile, { time, playing, measureLocked = false, beatsFromDownbeat = 0 }) {
  if (!playing || !Number.isFinite(time)) return 0;
  const count = measureLocked && Number.isFinite(beatsFromDownbeat) ? Math.max(0, Math.floor(beatsFromDownbeat)) : 0;
  const gestures = [6, 8, 9, 10, 8, 6, 10, 9];
  return gestures[Math.floor(count / BEATS_PER_GESTURE) % gestures.length];
}

// Start audio only after the mounted hero acknowledges the headphones entrance.
export function preparePerformer({ signal, target = window, documentRoot = document, timeout = 20000 } = {}) {
  if (signal?.aborted) return Promise.resolve(false);
  if (!documentRoot.querySelector('[data-echo-performer]')) return Promise.resolve(true);
  return new Promise(resolve => {
    const requestId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`;
    let timer;
    const cleanup = () => { clearTimeout(timer); target.removeEventListener('echo:performer-ready', ready); signal?.removeEventListener('abort', abort); };
    const ready = event => { if (event.detail?.requestId === requestId) { cleanup(); resolve(true); } };
    const abort = () => { cleanup(); target.dispatchEvent(new CustomEvent('echo:performer-cancel', { detail: { requestId } })); resolve(false); };
    target.addEventListener('echo:performer-ready', ready);
    signal?.addEventListener('abort', abort, { once: true });
    timer = setTimeout(() => { cleanup(); target.dispatchEvent(new CustomEvent('echo:performer-cancel', { detail: { requestId } })); resolve(false); }, timeout);
    target.dispatchEvent(new CustomEvent('echo:performer-prepare', { detail: { requestId } }));
  });
}
