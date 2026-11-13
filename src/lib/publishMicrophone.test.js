import test from 'node:test';
import assert from 'node:assert/strict';
import {publishVocalMicrophone} from './publishVocalMicrophone.js';

test('publishes the existing Studio audio without capturing or processing it',async()=>{
 const track={kind:'audio',stop(){throw Error('Live track must not stop');},setProcessor(){throw Error('Audio must stay unprocessed');}};
 let published;
 const participant={createTracks(){throw Error('Do not capture twice');},async publishTrack(value,options){published=value;assert.equal(options.source,'microphone');return {track:value};}};
 const result=await publishVocalMicrophone(participant,{track});
 assert.equal(published,track);assert.equal(result.publication.track,track);
});
test('failed publishing and canceled captures release the microphone',async()=>{
 for(const canceled of [false,true]){
  let stops=0,publishes=0;
  const track={kind:'audio',stop(){stops++;}};
  const participant={async createTracks(){return [track];},async publishTrack(){publishes++;throw Error('Transport failed');}};
  await assert.rejects(publishVocalMicrophone(participant,{isCurrent:()=>!canceled}),canceled?/closed/:/Transport failed/);
  assert.equal(stops,1);assert.equal(publishes,canceled?0:1);
 }
});
