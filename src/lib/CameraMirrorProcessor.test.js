import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CameraMirrorProcessor } from './CameraMirrorProcessor.js';

test('camera mirror publishes a flipped video track and releases its render loop without stopping the camera', async () => {
  const originalDocument = globalThis.document, originalStream = globalThis.MediaStream, originalImage = globalThis.Image;
  const transforms = [], draws = [];
  let stopped = 0, cancelled = 0, callback;
  const output = { stop() { stopped++; } }, camera = { id: 'original-camera' };
  const video = { videoWidth: 1280, videoHeight: 720, play: async () => {}, pause() {}, requestVideoFrameCallback(fn) { callback = fn; return 7; }, cancelVideoFrameCallback(id) { assert.equal(id, 7); cancelled++; } };
  const canvas = { getContext: () => ({ filter: 'none', setTransform: (...args) => transforms.push(args), drawImage: (...args) => draws.push(args) }), captureStream: fps => { assert.equal(fps, 30); return { getVideoTracks: () => [output], getTracks: () => [output] }; } };
  globalThis.document = { createElement: kind => kind === 'video' ? video : canvas };
  globalThis.MediaStream = class { constructor(tracks) { this.tracks = tracks; } };
  try {
    globalThis.Image = class { naturalWidth = 240; naturalHeight = 90; async decode() {} };
    const processor = new CameraMirrorProcessor({watermark:true});
    await processor.init({ track: camera });
    assert.deepEqual(video.srcObject.tracks, [camera]);
    assert.equal(processor.processedTrack, output);
    assert.deepEqual(transforms[0], [-1, 0, 0, 1, 1280, 0]);
    assert.equal(draws[0][0], video);
    assert.ok(draws[1][0] instanceof globalThis.Image);
    assert.deepEqual(transforms[1], [1,0,0,1,0,0]);
    assert.equal(draws[1][3],144);
    video.videoWidth = 720; video.videoHeight = 1280; callback();
    assert.equal(canvas.width, 720); assert.equal(canvas.height, 1280);
    assert.deepEqual(transforms.at(-2), [-1, 0, 0, 1, 720, 0]);
    assert.equal(draws.at(-1)[3],86);
    await processor.destroy();
    const count = draws.length; callback();
    assert.equal(draws.length, count); assert.equal(stopped, 1); assert.equal(cancelled, 1); assert.equal(video.srcObject, null);
    assert.equal(processor.processedTrack, undefined);
  } finally { globalThis.document = originalDocument; globalThis.MediaStream = originalStream; globalThis.Image = originalImage; }
});

test('unsupported camera mirroring cleans up instead of publishing a fake transformed preview', async () => {
  const originalDocument = globalThis.document, originalStream = globalThis.MediaStream;
  const video = { play: async () => {}, pause() {} };
  globalThis.document = { createElement: kind => kind === 'video' ? video : {} };
  globalThis.MediaStream = class {};
  try {
    const processor = new CameraMirrorProcessor();
    await assert.rejects(processor.init({ track: {} }), /unavailable/);
    assert.equal(video.srcObject, null); assert.equal(processor.processedTrack, undefined);
  } finally { globalThis.document = originalDocument; globalThis.MediaStream = originalStream; }
});

test('camera frames keep updating without video presentation callbacks and are closed after drawing', async () => {
 const saved={document:globalThis.document,MediaStream:globalThis.MediaStream,MediaStreamTrackProcessor:globalThis.MediaStreamTrackProcessor};
 let deliver,cancelled=false,released=false,closed=0,stopped=0;
 const draws=[],output={requestFrame(){},stop(){stopped++;}};
 const reader={read:()=>new Promise(resolve=>{deliver=resolve;}),async cancel(){cancelled=true;deliver?.({done:true});},releaseLock(){released=true;}};
 const video={videoWidth:640,videoHeight:480,play:async()=>{},pause(){}};
 const canvas={getContext:()=>({filter:'none',setTransform(){},drawImage(source){draws.push(source);}}),captureStream:()=>({getVideoTracks:()=>[output],getTracks:()=>[output]})};
 globalThis.document={createElement:kind=>kind==='video'?video:canvas};
 globalThis.MediaStream=class {};
 globalThis.MediaStreamTrackProcessor=class {readable={getReader:()=>reader};};
 const processor=new CameraMirrorProcessor();
 try {
  await processor.init({track:{}});
  const frame={displayWidth:1280,displayHeight:720,close(){closed++;}};
  deliver({value:frame,done:false});await new Promise(resolve=>setImmediate(resolve));
  assert.equal(draws.at(-1),frame);assert.equal(canvas.width,1280);assert.equal(closed,1);
  await processor.destroy();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(cancelled,true);assert.equal(released,true);assert.equal(stopped,1);
 }finally{await processor.destroy();Object.assign(globalThis,saved);}
});
