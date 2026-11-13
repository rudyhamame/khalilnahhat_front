import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {equipmentCues,equipmentCueAt} from './heroEquipmentCues.js';
const narration=lang=>JSON.parse(readFileSync(new URL(`./data/heroIntroduction.${lang}.json`,import.meta.url)));
test('equipment cues follow the actual English and Arabic equipment mentions',()=>{
 for(const language of ['en','ar']){
  const data=narration(language),cues=equipmentCues(data,language);
  assert.deepEqual(cues.map(c=>c.id),['qsc-k122','shure-mics','movingheads','led-screen','dry-ice','sparklers',...(language==='en'?['co2-gun']:[])]);
  for(const cue of cues){assert.ok(data.words.some(w=>w.start===cue.start));assert.ok(cue.end>cue.start);assert.equal(equipmentCueAt(cues,cue.start),cue);}
  assert.equal(equipmentCueAt(cues,0),null);assert.equal(equipmentCueAt(cues,cues.at(-1).end),null);
 }
});
test('seeking backwards and across cue boundaries selects the correct scene immediately',()=>{
 const cues=equipmentCues(narration('en'),'en');
 assert.equal(equipmentCueAt(cues,75).id,'co2-gun');assert.equal(equipmentCueAt(cues,59.5).id,'shure-mics');
 assert.equal(equipmentCueAt(cues,cues[1].start-.001).id,'qsc-k122');assert.equal(equipmentCueAt(cues,cues[1].start).id,'shure-mics');
 assert.equal(equipmentCueAt(cues,120),null);
});
test('missing narration phrases do not create invented equipment cues',()=>{
 assert.deepEqual(equipmentCues({words:[{text:'Welcome',start:0,end:1}],duration:2},'en'),[]);
});
