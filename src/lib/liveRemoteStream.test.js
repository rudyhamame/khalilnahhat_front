import {test} from 'node:test';
import assert from 'node:assert/strict';
import {clearRemoteStream,replaceRemoteTrack} from './liveRemoteStream.js';
function stream(){const tracks=[];return {getTracks:()=>[...tracks],addTrack:t=>tracks.push(t),removeTrack:t=>tracks.splice(tracks.indexOf(t),1)};}
function track(kind,id){return {kind,id,readyState:'live',stops:0,stop(){this.stops++;this.readyState='ended';}};}
test('reconnection replaces audio without accumulating playback tracks or disturbing video',()=>{
 const media=stream(),video=track('video','v'),first=track('audio','a');
 replaceRemoteTrack(media,video);replaceRemoteTrack(media,first);
 for(let i=0;i<100;i++)replaceRemoteTrack(media,track('audio',String(i)));
 assert.equal(media.getTracks().length,2);assert.equal(first.stops,1);assert.equal(video.stops,0);
 const current=media.getTracks().find(t=>t.kind==='audio');
 assert.equal(replaceRemoteTrack(media,current),false);assert.equal(current.stops,0);
 clearRemoteStream(media);assert.equal(media.getTracks().length,0);assert.equal(current.stops,1);assert.equal(video.stops,1);
});
test('an ended late track cannot displace a live replacement',()=>{
 const media=stream(),current=track('audio','current'),late=track('audio','late');late.stop();
 replaceRemoteTrack(media,current);assert.equal(replaceRemoteTrack(media,late),false);
 assert.deepEqual(media.getTracks(),[current]);
});
