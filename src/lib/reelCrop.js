// 9:16 crop windows for Reels. A crop is saved with the video (no re-rendering): {mode:'manual'|'follow', zoom, x, y, track?}.
// x, y = centre of the window as a 0..1 fraction of the video; zoom >= 1 makes the window smaller (a closer crop); track = [{t, x, y}] seconds + centre, for auto-follow.
export const REEL_ASPECT = 9 / 16;
export const isPortrait916 = (vw, vh) => vw > 0 && vh > 0 && Math.abs(vw / vh - REEL_ASPECT) < .02;
const clamp = (value, lo, hi) => Math.min(hi, Math.max(lo, value));

// Largest 9:16 window that fits the video, as fractions of its width and height.
export function baseWindow(vw, vh) {
  if (vw / vh >= REEL_ASPECT) return { w: (vh * REEL_ASPECT) / vw, h: 1 };
  return { w: 1, h: (vw / REEL_ASPECT) / vh };
}
// Centre of the follow track at time t (linear between the saved points).
export function trackAt(track, t) {
  if (!track?.length) return null;
  if (t <= track[0].t) return { x: track[0].x, y: track[0].y };
  const last = track[track.length - 1];
  if (t >= last.t) return { x: last.x, y: last.y };
  let lo = 0, hi = track.length - 1;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (track[mid].t <= t) lo = mid; else hi = mid; }
  const a = track[lo], b = track[hi], k = (t - a.t) / Math.max(1e-6, b.t - a.t);
  return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k };
}
// The window (top-left + size, fractions of the video) to show at time t, always kept inside the picture.
export function windowAt(vw, vh, crop, t = 0) {
  const base = baseWindow(vw, vh), zoom = clamp(Number(crop?.zoom) || 1, 1, 4);
  const w = base.w / zoom, h = base.h / zoom;
  const centre = (crop?.mode === 'follow' && trackAt(crop.track, t)) || { x: crop?.x ?? .5, y: crop?.y ?? .5 };
  return { x: clamp(centre.x - w / 2, 0, 1 - w), y: clamp(centre.y - h / 2, 0, 1 - h), w, h };
}
// CSS that makes a video fill a 9:16 box showing only the window (the box must have overflow hidden).
export const cropStyle = win => ({ position: 'absolute', display: 'block', objectFit: 'fill', maxWidth: 'none', width: `${100 / win.w}%`, height: `${100 / win.h}%`, left: `${-win.x / win.w * 100}%`, top: `${-win.y / win.h * 100}%` });

// Smooth the tracker's raw positions: a small dead zone (no jitter) and an eased follow, so the window glides.
export function smoothTrack(points, { dead = .006, ease = .35 } = {}) {
  const out = [];
  let x = points[0]?.x ?? .5, y = points[0]?.y ?? .5;
  for (const p of points) {
    if (Math.hypot(p.x - x, p.y - y) > dead) { x += (p.x - x) * ease; y += (p.y - y) * ease; }
    out.push({ t: +p.t.toFixed(2), x: +x.toFixed(4), y: +y.toFixed(4) });
  }
  return out;
}
// Template tracking on a grayscale frame (Uint8Array, width gw x height gh): find the patch most like `template` (tw x th) near (cx, cy) in pixels. Returns the new centre and the match error (lower = better).
export function bestMatch(gray, gw, gh, template, tw, th, cx, cy, radius) {
  let best = Infinity, bx = cx, by = cy;
  const x0 = Math.round(cx - tw / 2), y0 = Math.round(cy - th / 2);
  for (let dy = -radius; dy <= radius; dy += 1) {
    for (let dx = -radius; dx <= radius; dx += 1) {
      const sx = x0 + dx, sy = y0 + dy;
      if (sx < 0 || sy < 0 || sx + tw > gw || sy + th > gh) continue;
      let sum = 0;
      for (let y = 0; y < th && sum < best; y += 2) {
        const row = (sy + y) * gw + sx, trow = y * tw;
        for (let x = 0; x < tw; x += 2) sum += Math.abs(gray[row + x] - template[trow + x]);
      }
      if (sum < best) { best = sum; bx = sx + tw / 2; by = sy + th / 2; }
    }
  }
  return { x: bx, y: by, error: best / Math.max(1, (tw * th) / 4) };
}
