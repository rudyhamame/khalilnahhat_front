import test from 'node:test';
import assert from 'node:assert/strict';
import { baseWindow, windowAt, trackAt, smoothTrack, bestMatch, isPortrait916 } from './reelCrop.js';

test('a landscape video gives a tall 9:16 window; a 9:16 video gives the whole frame', () => {
  const b = baseWindow(1920, 1080);
  assert.equal(b.h, 1);
  assert.ok(Math.abs(b.w * 1920 / 1080 - 9 / 16) < 1e-9);
  assert.deepEqual(baseWindow(1080, 1920), { w: 1, h: 1 });
  assert.ok(isPortrait916(1080, 1920));
  assert.ok(!isPortrait916(1920, 1080));
});
test('the window follows its centre, zooms in, and never leaves the picture', () => {
  const left = windowAt(1920, 1080, { mode: 'manual', zoom: 1, x: 0, y: .5 });
  assert.equal(left.x, 0);
  const right = windowAt(1920, 1080, { mode: 'manual', zoom: 1, x: 1, y: .5 });
  assert.ok(Math.abs(right.x + right.w - 1) < 1e-9);
  const zoomed = windowAt(1920, 1080, { mode: 'manual', zoom: 2, x: .5, y: .5 });
  assert.ok(Math.abs(zoomed.h - .5) < 1e-9);
  assert.ok(zoomed.y > 0 && zoomed.y + zoomed.h <= 1);
});
test('auto-follow interpolates between saved points', () => {
  const track = [{ t: 0, x: .2, y: .5 }, { t: 2, x: .6, y: .5 }];
  assert.deepEqual(trackAt(track, 1), { x: .4, y: .5 });
  assert.deepEqual(trackAt(track, 9), { x: .6, y: .5 });
  const win = windowAt(1920, 1080, { mode: 'follow', zoom: 1, track }, 1);
  assert.ok(Math.abs(win.x + win.w / 2 - .4) < 1e-9);
});
test('smoothing removes jitter and keeps real movement', () => {
  const still = smoothTrack([{ t: 0, x: .5, y: .5 }, { t: 1, x: .502, y: .5 }, { t: 2, x: .499, y: .5 }]);
  assert.ok(still.every(p => Math.abs(p.x - .5) < .002));
  const moved = smoothTrack([{ t: 0, x: .2, y: .5 }, { t: 1, x: .8, y: .5 }, { t: 2, x: .8, y: .5 }]);
  assert.ok(moved[0].x < moved[1].x && moved[2].x > .5 && moved[2].x <= .8);
});
test('template matching finds the moved patch', () => {
  const gw = 40, gh = 30, gray = new Uint8Array(gw * gh).fill(20);
  const put = (cx, cy) => { for (let y = -4; y < 4; y++) for (let x = -4; x < 4; x++) gray[(cy + y) * gw + cx + x] = 200 + ((x + y) & 7) * 6; };
  put(14, 15);
  const tpl = new Uint8Array(64); for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) tpl[y * 8 + x] = gray[(11 + y) * gw + 10 + x];
  gray.fill(20); put(19, 17);
  const m = bestMatch(gray, gw, gh, tpl, 8, 8, 14, 15, 8);
  assert.ok(Math.abs(m.x - 19) <= 1 && Math.abs(m.y - 17) <= 1);
});
