// Free, on-device face detection (MediaPipe, loaded once from a public CDN; no account, no per-use cost, no video leaves the browser).
const BASE = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14';
const MODEL = 'https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite';
let loading = null;
export function loadFaceDetector() {
  loading ||= (async () => {
    const { FaceDetector, FilesetResolver } = await import(/* @vite-ignore */ `${BASE}/vision_bundle.mjs`);
    const files = await FilesetResolver.forVisionTasks(`${BASE}/wasm`);
    return FaceDetector.createFromOptions(files, { baseOptions: { modelAssetPath: MODEL }, runningMode: 'VIDEO' });
  })().catch(error => { loading = null; throw error; });
  return loading;
}
let lastStamp = 0;
// Detects faces in a video/canvas; boxes are {cx,cy,w,h,score} as fractions of the picture. Timestamps must increase, also across callers.
// The detector reads a small copy of the frame: the short-range model resizes its input to ~128 px anyway, so a 1080p readback is wasted work on the main thread.
const DETECT_WIDTH = 320;
let scratch = null;
export function detectFaces(detector, source, width, height) {
  const stamp = Math.max(performance.now(), lastStamp + 1); lastStamp = stamp;
  let input = source, w = width, h = height;
  if (width > DETECT_WIDTH && typeof document !== 'undefined') {
    w = DETECT_WIDTH; h = Math.max(1, Math.round(height * DETECT_WIDTH / width));
    scratch ||= document.createElement('canvas');
    if (scratch.width !== w || scratch.height !== h) { scratch.width = w; scratch.height = h; }
    scratch.getContext('2d').drawImage(source, 0, 0, w, h); input = scratch;
  }
  return (detector.detectForVideo(input, stamp).detections || []).filter(d => d.boundingBox)
    .map(d => { const b = d.boundingBox; return { cx: (b.originX + b.width / 2) / w, cy: (b.originY + b.height / 2) / h, w: b.width / w, h: b.height / h, score: d.categories?.[0]?.score }; });
}
// Who is DJ Khalil: the face nearest to where he was last seen (anchor). Without an anchor the biggest face is assumed until the editor clicks him.
// Returns {anchor, others}; others = every other face. A DJ who cannot be matched is not trusted: everyone is blurred (privacy first),
// except when a single unmatched face stays for ~1.5 s, which is taken as the DJ moving fast.
export function splitPeople(boxes, anchor, state = { lost: 0 }) {
  if (!boxes.length) return { anchor, others: [], state };
  if (!anchor) { const dj = [...boxes].sort((a, b) => b.w - a.w)[0]; return { anchor: { cx: dj.cx, cy: dj.cy, w: dj.w, score: dj.score }, others: boxes.filter(b => b !== dj), state: { lost: 0 } }; }
  const dist = b => Math.hypot(b.cx - anchor.cx, b.cy - anchor.cy), near = [...boxes].sort((a, b) => dist(a) - dist(b))[0];
  if (dist(near) < Math.max(.15, anchor.w * 2.5)) return { anchor: { cx: near.cx, cy: near.cy, w: near.w, score: near.score }, others: boxes.filter(b => b !== near), state: { lost: 0 } };
  const lost = state.lost + 1;
  if (boxes.length === 1 && lost >= 15) return { anchor: { cx: near.cx, cy: near.cy, w: near.w, score: near.score }, others: [], state: { lost: 0 } };
  return { anchor, others: boxes, state: { lost } };
}
// The head plus some margin, so hair, ears and chin are hidden too.
export const headBox = b => ({ cx: b.cx, cy: b.cy - b.h * .08, w: b.w * 1.7, h: b.h * 2 });
