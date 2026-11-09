const READY_KEY = 'echo-preflight-complete';
let completed = false;

export function hasCompletedPreflight(browser = globalThis) {
  if (completed) return true;
  for (const name of ['localStorage', 'sessionStorage']) {
    try {
      if (browser[name]?.getItem(READY_KEY) === 'true') {
        rememberPreflightCompletion(browser);
        return true;
      }
    } catch { /* Storage may be unavailable. */ }
  }
  return false;
}

export function rememberPreflightCompletion(browser = globalThis) {
  completed = true;
  for (const name of ['localStorage', 'sessionStorage']) {
    try { browser[name]?.setItem(READY_KEY, 'true'); }
    catch { /* Keep the in-memory fallback when storage is unavailable. */ }
  }
}
