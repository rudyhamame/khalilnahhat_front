import test from 'node:test';
import assert from 'node:assert/strict';
import {metronomeAngle,metronomeTick,weightHeight} from './metronome.js';
test('the arm is at an extreme on every beat and swings to the other side on the next',()=>{
 const bpm=120,beat=.5; // 120 BPM = one beat every 0.5 s
 assert.ok(Math.abs(metronomeAngle(0,0,bpm)-.5)<1e-9);
 assert.ok(Math.abs(metronomeAngle(beat,0,bpm)+.5)<1e-9);
 assert.ok(Math.abs(metronomeAngle(2*beat,0,bpm)-.5)<1e-9);
 assert.ok(Math.abs(metronomeAngle(beat/2,0,bpm))<1e-9); // upright half-way between beats
});
test('the beat grid starts at the atom start',()=>{
 assert.ok(Math.abs(metronomeAngle(10,10,90)-.5)<1e-9);
 assert.ok(Math.abs(metronomeAngle(10+60/90,10,90)+.5)<1e-9);
});
test('no tempo, no swing; ticks peak on beats',()=>{
 assert.equal(metronomeAngle(3,0,null),0);assert.equal(metronomeAngle(3,0,0),0);
 assert.ok(metronomeTick(0,0,120)>.99);assert.ok(metronomeTick(.25,0,120)<.01);
});
test('the weight sits higher for slower tempos and stays on the arm',()=>{
 assert.ok(weightHeight(40)>weightHeight(120));assert.ok(weightHeight(120)>weightHeight(208));
 assert.equal(weightHeight(1000),.75);assert.equal(weightHeight(1),2.15);
});
