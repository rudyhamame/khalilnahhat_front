import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav} from './wavEncode.js';

const fake=(channels,length,rate=8000)=>({numberOfChannels:channels.length,sampleRate:rate,length,getChannelData:index=>Float32Array.from(channels[index])});
const read=async blob=>new DataView(await blob.arrayBuffer());

test('encodeWav writes a valid PCM header and only the chosen frames',async()=>{
 const left=[0,.5,-.5,1,-1,0],right=[0,0,0,0,0,0];
 const view=await read(encodeWav(fake([left,right],6),1,4));
 const text=(offset,length)=>String.fromCharCode(...Array.from({length},(_,i)=>view.getUint8(offset+i)));
 assert.equal(text(0,4),'RIFF');assert.equal(text(8,8),'WAVEfmt ');assert.equal(text(36,4),'data');
 assert.equal(view.getUint16(22,true),2);assert.equal(view.getUint32(24,true),8000);
 assert.equal(view.getUint32(40,true),3*2*2);assert.equal(view.byteLength,44+3*2*2);
 assert.equal(view.getInt16(44,true),Math.trunc(.5*0x7fff));
 assert.equal(view.getInt16(48,true),-Math.trunc(.5*0x7fff));
 assert.equal(view.getInt16(52,true),0x7fff);
});

test('encodeWav drops stereo to an averaged mono file when it would exceed the size limit',async()=>{
 const view=await read(encodeWav(fake([[1,1,1,1],[-1,-1,-1,-1]],4),0,4,44+4*2));
 assert.equal(view.getUint16(22,true),1);assert.equal(view.byteLength,44+4*2);assert.equal(view.getInt16(44,true),0);
 assert.throws(()=>encodeWav(fake([[1,1,1,1]],4),0,4,44+3),/still too large/);
});
