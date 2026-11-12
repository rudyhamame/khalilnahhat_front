import test from 'node:test';
import assert from 'node:assert/strict';
import {buildPyramid,pyramidPath} from './waveformPyramid.js';
const fs=8000,tone=Float32Array.from({length:fs*10},(_,i)=>.8*Math.sin(2*Math.PI*50*i/fs));
test('the pyramid keeps every peak and reports the loudest sample',()=>{
 const pyramid=buildPyramid(tone,fs);assert.ok(Math.abs(pyramid.top-.8)<.01);assert.equal(pyramid.duration,10);
 assert.ok(pyramid.levels.length>=4);
});
test('zoomed out draws peak columns; zoomed in draws the real sample line',()=>{
 const pyramid=buildPyramid(tone,fs),wide=pyramidPath(pyramid,0,10),deep=pyramidPath(pyramid,1,1.01);
 assert.ok(wide.startsWith('M')&&wide.includes('V'));assert.ok(!deep.includes('V')&&deep.includes('L'));
 const ys=[...deep.matchAll(/,([\d.]+)/g)].map(match=>Number(match[1]));assert.ok(Math.min(...ys)<15&&Math.max(...ys)>38);
});
