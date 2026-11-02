import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCameraAppearance, cameraAppearanceFilter, CAMERA_APPEARANCE_PRESETS } from './cameraAppearance.js';
test('appearance bounds reject invalid settings and strength zero restores natural colour', () => {
  assert.equal(normalizeCameraAppearance({ brightness: Infinity }).brightness, 0);
  assert.equal(normalizeCameraAppearance({ strength: 500 }).strength, 100);
  assert.equal(normalizeCameraAppearance({ contrast: -100 }).contrast, -30);
  assert.equal(cameraAppearanceFilter({strength:0,brightness:40,contrast:30,tone:100}), 'brightness(1) contrast(1) saturate(1)');
});
test('low light preset increases exposure while softening contrast, independently of mirror', () => {
  const filter=cameraAppearanceFilter(CAMERA_APPEARANCE_PRESETS.lowLight);
  assert.match(filter,/brightness\(1.2\)/);assert.ok(Math.abs(Number(filter.match(/contrast\(([^)]+)\)/)[1])-.92)<1e-10);
  assert.equal(normalizeCameraAppearance(CAMERA_APPEARANCE_PRESETS.off).strength,0);
});
test('background and side light settings are bounded with safe defaults', () => {
  const a = normalizeCameraAppearance({ background: 'evil', bgBlur: 900, bgColor: 'red', sideLight: -500 });
  assert.deepEqual([a.background, a.bgBlur, a.bgColor, a.sideLight], ['off', 100, '#101214', -100]);
  assert.equal(normalizeCameraAppearance({ background: 'blur' }).background, 'blur');
});
