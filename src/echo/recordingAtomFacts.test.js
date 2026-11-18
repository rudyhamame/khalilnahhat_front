import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {createServer} from 'vite';

const server=await createServer({server:{middlewareMode:true,hmr:false},appType:'custom'});
after(()=>server.close());
const {atomFacts}=await server.ssrLoadModule('/src/echo/RecordingItemsEditor.jsx');

test('an atom shows exactly its saved JSON fields, in order',()=>{
 const vocabulary=[{id:'m1',name:'Rami'},{id:'i1',name:'Oud'},{id:'v1',name:'Najwa'},{id:'g1',name:'House'},{id:'r1',name:'Dabke'},{id:'l1',name:'Arabic'},{id:'d1',name:'Lebanese'}];
 const atom={id:'a1',name:'Intro',releaseYear:1998,audioRange:{startSec:5,endSec:65},
  sound:{musicianCredits:[{artistId:'m1',instrumentId:'i1'}],bpm:124,key:'A minor',rhythmIds:['r1'],genreIds:['g1']},
  lyrics:{languages:[{languageId:'l1',dialectIds:['d1']}],vocalistCredits:[{artistId:'v1'}]}};
 const facts=Object.fromEntries(atomFacts(atom,vocabulary));
 assert.deepEqual(Object.keys(facts),['Release year','Audio range','Musicians','BPM','Key','Rhythms','Genres','Languages','Vocalists']);
 assert.equal(facts['Release year'],1998);assert.equal(facts.Musicians,'Rami · Oud');assert.equal(facts.BPM,124);assert.equal(facts.Key,'A minor');
 assert.equal(facts.Languages,'Arabic (Lebanese)');assert.equal(facts.Vocalists,'Najwa');assert.match(facts['Audio range'],/–/);
 // no vocals, nothing else saved: empty values, no invented ones
 const bare=Object.fromEntries(atomFacts({id:'a2',name:'Bare'},[]));
 assert.equal(bare.Languages,'');assert.equal(bare.Vocalists,'');assert.equal(bare.Musicians,'');
});
