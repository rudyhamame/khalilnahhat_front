import test from 'node:test';
import assert from 'node:assert/strict';
import {saveLocalRecordingMp4} from './localRecordingMp4.js';
const session={filename:'Echo-live-test-landscape-1280x720.webm',height:720};
function fixture({writeFails=false,playFails=false}={}){
 const events=[],chunks=[],video={ended:false,muted:false,playsInline:false,
  set src(value){queueMicrotask(()=>this.onloadeddata());},
  captureStream:()=>({getVideoTracks:()=>[{}],getTracks:()=>[{stop(){events.push('track stopped');}}]}),
  async play(){if(playFails)throw Error('Playback blocked');queueMicrotask(()=>{this.ended=true;this.onended();});},
  pause(){events.push('paused');},removeAttribute(){},load(){}};
 const writer={async write(blob){if(writeFails)throw Error('Disk full');chunks.push([...new Uint8Array(await blob.arrayBuffer())]);},async close(){events.push('closed');},async abort(){events.push('aborted');}};
 class Recorder{
  static isTypeSupported(type){return type.startsWith('video/mp4');}
  constructor(stream,options){assert.match(options.mimeType,/^video\/mp4/);this.state='inactive';}
  start(){this.state='recording';}
  stop(){this.state='inactive';this.ondataavailable({data:new Blob([new Uint8Array([1,2,3])])});this.onstop();}
 }
 const store={directory:{async getFileHandle(name){events.push(name);return {getFile:async()=>new Blob(['original']),createWritable:async()=>writer};}},async exportFile(){events.push('rebuilt');return session.filename;}};
 const urls={createObjectURL:()=> 'blob:test',revokeObjectURL(){events.push('revoked');}};
 return {events,chunks,video,options:{store,Recorder,document:{createElement:()=>video},urls}};
}
test('converts a rebuilt WebM to a separate MP4 and closes its disk writer',async()=>{
 const f=fixture();assert.equal(await saveLocalRecordingMp4(session,f.options),'Echo-live-test-landscape-1280x720.mp4');
 assert.deepEqual(f.chunks,[[1,2,3]]);assert.ok(f.events.includes('closed'));assert.ok(f.events.includes('revoked'));assert.ok(!f.events.includes('aborted'));
});
test('disk failures abort MP4 output and release playback resources',async()=>{
 const f=fixture({writeFails:true});await assert.rejects(saveLocalRecordingMp4(session,f.options),/Disk full/);
 assert.ok(f.events.includes('aborted'));assert.ok(f.events.includes('track stopped'));assert.ok(f.events.includes('revoked'));assert.ok(!f.events.includes('closed'));
});
test('playback failure aborts output while retaining the source',async()=>{
 const f=fixture({playFails:true});await assert.rejects(saveLocalRecordingMp4(session,f.options),/Playback blocked/);
 assert.ok(f.events.includes('aborted'));assert.ok(!f.events.includes('closed'));
});
test('unsupported MP4 encoding fails before touching disk files',async()=>{
 const f=fixture();await assert.rejects(saveLocalRecordingMp4(session,{...f.options,Recorder:{isTypeSupported:()=>false}}),/cannot encode MP4/);
 assert.deepEqual(f.events,[]);
});
test('existing MP4 is rebuilt directly without encoding',async()=>{
 let rebuilt=false;assert.equal(await saveLocalRecordingMp4({filename:'clip.mp4'},{store:{directory:{},exportFile:async()=>{rebuilt=true;return 'clip.mp4';}}}),'clip.mp4');assert.ok(rebuilt);
});
