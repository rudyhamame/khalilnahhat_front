import { loadFaceDetector, detectFaces, splitPeople, headBox } from './faces.js';
// "Blur other people" for the live stream. One shared setting (the studio toggle and the camera processor read the same object).
export const peopleBlur = { enabled: false, anchor: null, pick: false, boxes: [], error: '' };
// The portrait camera (2 windows) has its own DJ pick; the on/off switch is shared with the landscape one.
export const portraitBlur = { anchor: null, pick: false, boxes: [] };
const listeners = new Set();
export const subscribePeopleBlur = fn => { listeners.add(fn); return () => listeners.delete(fn); };
export function setPeopleBlur(patch) { Object.assign(peopleBlur, patch); listeners.forEach(fn => fn()); }
export function setPortraitBlur(patch) { Object.assign(portraitBlur, patch); listeners.forEach(fn => fn()); }

// One pass per camera processor: detect (about every 90 ms), then pixel-blur the other faces on the already composed frame.
export function createBlurPass(cfg = peopleBlur) {
  let detector = null, loading = false, last = 0, others = [], state = { lost: 0 }, small = null;
  return function run(ctx, canvas, width, height) {
    if (!peopleBlur.enabled) { others = []; return; }
    if (!detector && !loading) { loading = true; loadFaceDetector().then(d => { detector = d; setPeopleBlur({ error: '' }); }).catch(() => setPeopleBlur({ error: 'Face detection could not load.' })).finally(() => { loading = false; }); }
    const now = performance.now();
    if (detector && now - last > 90) {
      last = now;
      try {
        const boxes = detectFaces(detector, canvas, width, height), result = splitPeople(boxes, cfg.anchor, state);
        state = result.state; others = result.others;
        cfg.boxes = boxes; if (result.anchor !== cfg.anchor) cfg.anchor = result.anchor;
        listeners.forEach(fn => fn()); // the preview squares follow the faces
      } catch { /* skip this detection */ }
    }
    if (!others.length) return;
    small ||= document.createElement('canvas');
    const sctx = small.getContext('2d');
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
    for (const person of others) {
      const b = headBox(person), bw = Math.max(8, Math.round(b.w * width)), bh = Math.max(8, Math.round(b.h * height)), x = Math.round(b.cx * width - bw / 2), y = Math.round(b.cy * height - bh / 2);
      small.width = Math.max(2, Math.round(bw / 14)); small.height = Math.max(2, Math.round(bh / 14));
      sctx.drawImage(canvas, x, y, bw, bh, 0, 0, small.width, small.height);
      ctx.save(); ctx.beginPath(); ctx.ellipse(x + bw / 2, y + bh / 2, bw / 2, bh / 2, 0, 0, Math.PI * 2); ctx.clip();
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(small, 0, 0, small.width, small.height, x, y, bw, bh); ctx.restore();
    }
    ctx.restore();
  };
}
