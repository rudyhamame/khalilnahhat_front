import test from 'node:test';
import assert from 'node:assert/strict';
import {getLiveQuality,setLiveQuality,LIVE_QUALITY} from './liveQuality.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('defaults to the current 720p / 1.7 Mbps and ignores unknown values',()=>{
 const s=memory();assert.equal(getLiveQuality(s).videoBitrate,1700000);
 s.setItem('echo-live-quality','nonsense');assert.equal(getLiveQuality(s).id,'standard');
 assert.equal(setLiveQuality('bogus',s).id,'standard');
});
test('high and recording-first are 1080p with higher bitrates, remembered',()=>{
 const s=memory();assert.equal(setLiveQuality('high',s).short,1080);assert.equal(getLiveQuality(s).videoBitrate,6000000);
 setLiveQuality('recording',s);assert.ok(getLiveQuality(s).videoBitrate>LIVE_QUALITY.high.videoBitrate);
});
