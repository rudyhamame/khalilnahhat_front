import test from 'node:test';
import assert from 'node:assert/strict';
import {getLiveQuality,liveQualityResolution,setLiveQuality,LIVE_QUALITY} from './liveQuality.js';
const memory=()=>{const m=new Map();return {getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,v)};};
test('defaults to the current 720p / 1.7 Mbps and ignores unknown values',()=>{
 const s=memory();assert.equal(getLiveQuality(s).videoBitrate,1700000);
 s.setItem('echo-live-quality','nonsense');assert.equal(getLiveQuality(s).id,'standard');
 assert.equal(setLiveQuality('bogus',s).id,'standard');
});
test('1080p is higher resolution and bitrate, remembered; the removed third preset falls back to 720p',()=>{
 const s=memory();assert.equal(setLiveQuality('high',s).short,1080);assert.equal(getLiveQuality(s).videoBitrate,6000000);
 s.setItem('echo-live-quality','recording');assert.equal(getLiveQuality(s).id,'standard');assert.equal(Object.keys(LIVE_QUALITY).length,2);
});
test('preview resolution labels follow landscape and portrait quality',()=>{
 assert.equal(liveQualityResolution('standard'),'1280×720');assert.equal(liveQualityResolution('standard',true),'720×1280');
 assert.equal(liveQualityResolution('high'),'1920×1080');assert.equal(liveQualityResolution('high',true),'1080×1920');
});
