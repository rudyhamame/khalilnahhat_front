import test from 'node:test';import assert from 'node:assert/strict';
import {captureAudioSource} from './audioSource.js';
globalThis.MediaStream??=class{constructor(tracks){this.tracks=tracks;}getAudioTracks(){return this.tracks;}};
const track=kind=>({kind,stopped:0,stop(){this.stopped++;},addEventListener(){}});
test('tab audio keeps only the sound and drops the picture at once',async()=>{
  const video=track('video'),audio=track('audio');
  const media={getDisplayMedia:async()=>({getAudioTracks:()=>[audio],getVideoTracks:()=>[video],getTracks:()=>[video,audio]})};
  const source=await captureAudioSource({kind:'tab',media});assert.equal(video.stopped,1);assert.equal(audio.stopped,0);assert.equal(source.stream.getAudioTracks()[0],audio);
  source.cleanup();assert.equal(audio.stopped,1);
});
test('a shared tab without audio is refused with a clear message and fully released',async()=>{
  const video=track('video');const media={getDisplayMedia:async()=>({getAudioTracks:()=>[],getVideoTracks:()=>[video],getTracks:()=>[video]})};
  await assert.rejects(captureAudioSource({kind:'tab',media}),/Share tab audio/);assert.equal(video.stopped,2);
});
test('file audio needs a file that really has sound',async()=>{
  await assert.rejects(captureAudioSource({kind:'file',file:null}),/Choose an audio or video file/);
  const picture=track('video'),sound=track('audio');let cleaned=0;
  const ok=await captureAudioSource({kind:'file',file:{type:'video/mp4'},capture:async()=>({stream:{getAudioTracks:()=>[sound],getVideoTracks:()=>[picture]},cleanup:()=>{cleaned++;}})});
  assert.equal(picture.stopped,1);assert.equal(ok.stream.getAudioTracks()[0],sound);ok.cleanup();assert.equal(cleaned,1);
  await assert.rejects(captureAudioSource({kind:'file',file:{type:'video/mp4'},capture:async()=>({stream:{getAudioTracks:()=>[],getVideoTracks:()=>[]},cleanup:()=>{cleaned++;}})}),/no audio/);assert.equal(cleaned,2);
});
