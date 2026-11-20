import test from 'node:test';
import assert from 'node:assert/strict';
import {isVirtualCamera} from './virtualCamera.js';
test('OBS and other virtual cameras are recognised, real cameras are not',()=>{
 assert.ok(isVirtualCamera('OBS Virtual Camera'));assert.ok(isVirtualCamera('OBS-Camera'));
 assert.ok(!isVirtualCamera('Logitech C920 HD Pro Webcam'));assert.ok(!isVirtualCamera(''));assert.ok(!isVirtualCamera(undefined));
});
