import test from 'node:test';
import assert from 'node:assert/strict';
import {mediaFitRect,audioVisualDuration} from './audioVisualExport.js';
test('photo/video framing fills or contains without stretching',()=>{
 assert.deepEqual(mediaFitRect(1920,1080,1080,1920,'contain'),{x:0,y:656.25,w:1080,h:607.5});
 const crop=mediaFitRect(1920,1080,1080,1920,'cover');assert.equal(crop.h,1920);assert.ok(crop.x<0);assert.equal(crop.w/crop.h,1920/1080);
});
test('export length respects audio offset, video offset, and looping',()=>{
 assert.equal(audioVisualDuration({requested:30,audioDuration:40,audioStart:20}),20);
 assert.equal(audioVisualDuration({requested:30,audioDuration:60,videoDuration:20,videoStart:5}),15);
 assert.equal(audioVisualDuration({requested:30,audioDuration:60,videoDuration:20,videoStart:5,loop:true}),30);
 for(const props of [{requested:0,audioDuration:20},{requested:10,audioDuration:20,audioStart:21},{requested:NaN,audioDuration:20},{requested:10,audioDuration:20,videoStart:-1}])assert.throws(()=>audioVisualDuration(props));
});
