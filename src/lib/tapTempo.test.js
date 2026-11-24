import test from 'node:test';
import assert from 'node:assert/strict';
import {createTapTempo} from './tapTempo.js';
import {trackBpm} from './aiDjPlanner.js';
import {djTimingVisual} from './djTimingVisual.js';
test('taps average recent beats, correct for playback speed and reset after a gap or song change',()=>{
 const tap=createTapTempo();assert.equal(tap.tap('one',0),null);assert.equal(tap.tap('one',500).manualBpm,120);
 tap.tap('one',1000);assert.equal(tap.tap('one',1510).manualBpm,120);
 assert.equal(tap.tap('two',2000),null);assert.equal(tap.tap('two',2500,{rate:1.2}).manualBpm,100);
 assert.equal(tap.tap('two',5000),null);tap.reset();assert.equal(tap.tap('two',5500),null);
});
test('tapped tempo overrides detected BPM without falsely verifying a first downbeat',()=>{
 const track={id:'one',manualBpm:110,manualBeatOffset:.3,bpm:120};
 assert.equal(trackBpm({...track,audioBeatGrid:{tempoVerified:true,bpm:130}}),110);
 const view=djTimingVisual({deck:{track,position:10,playing:true,rate:1.2}});assert.equal(view.effective,132);assert.match(view.basis,/Tapped BPM/);assert.equal(view.firstBeatVerified,false);
});
