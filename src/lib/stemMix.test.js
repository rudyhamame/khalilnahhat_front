import test from 'node:test';
import assert from 'node:assert/strict';
import { initialStemMix, STEM_CHANNELS, stemGain, scheduleStemSources } from './stemMix.js';
test('solo and mute isolate real stems while respecting master volume',()=>{
  const mix=initialStemMix();
  assert.equal(stemGain(mix,'vocals',.75),.75);
  mix.vocals.solo=true;
  assert.equal(stemGain(mix,'drums',.75),0);
  mix.vocals.volume=.5;
  assert.equal(stemGain(mix,'vocals',.8),.4);
  mix.vocals.muted=true;
  assert.equal(stemGain(mix,'vocals',.8),0);
  mix.drums.solo=true;
  assert.equal(stemGain(mix,'drums',0),0);
  assert.equal(stemGain(mix,'drums',1),1);
});
test('four decoded stems share precisely the same scheduled tick and seek offset',()=>{
  const starts=[];
  const context={currentTime:10,createBufferSource:()=>({playbackRate:{value:1},connect(){},start(at,offset){starts.push([at,offset,this.playbackRate.value]);}})};
  const buffers=Object.fromEntries(STEM_CHANNELS.map(name=>[name,{duration:180}]));
  const sources=scheduleStemSources(context,buffers,{},32,1.25);
  assert.equal(sources.length,4);
  assert.deepEqual(starts,Array(4).fill([10.04,32.05,1.25]));
});
test('a scheduling failure stops every partially started stem',()=>{
  let stopped=0,disconnected=0,count=0;
  const context={currentTime:0,createBufferSource:()=>({playbackRate:{value:1},connect(){},start(){if(++count===3)throw new Error('failed');},stop(){stopped++;},disconnect(){disconnected++;}})};
  const buffers=Object.fromEntries(STEM_CHANNELS.map(name=>[name,{duration:180}]));
  assert.throws(()=>scheduleStemSources(context,buffers,{},0),/failed/);
  assert.equal(stopped,3);assert.equal(disconnected,3);
});
