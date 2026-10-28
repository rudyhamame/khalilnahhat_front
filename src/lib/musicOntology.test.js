import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync,existsSync} from 'node:fs';import {createServer} from 'vite';import {createHash} from 'node:crypto';
const server=await createServer({root:process.cwd(),cacheDir:'/tmp/khalil-music-ontology-contract-cache',server:{middlewareMode:true},appType:'custom'});
const model=await server.ssrLoadModule('/src/lib/musicOntology.js');
await server.close();
test('frontend and backend share the exact ontology vocabulary contract',()=>{
 const front=JSON.parse(readFileSync(new URL('./contracts/music-ontology.json',import.meta.url)));
 const bytes=readFileSync(new URL('./contracts/music-ontology.json',import.meta.url));const expected=readFileSync(new URL('./contracts/music-ontology.sha256',import.meta.url),'utf8').trim();assert.equal(createHash('sha256').update(bytes).digest('hex'),expected);
 const sibling=new URL('../../../khalil-back/contracts/music-ontology.json',import.meta.url);if(existsSync(sibling))assert.deepEqual(front,JSON.parse(readFileSync(sibling)));
});
test('legacy metadata is explicitly unmapped and Music never has Lyrics',()=>{
 assert.equal(model.validateRecording({id:'legacy',title:'Legacy',ontologyStatus:'UNMAPPED',work:null,recordingType:null}).id,'legacy');
 assert.throws(()=>model.validateRecording({id:'bad',title:'Bad',ontologyStatus:'MAPPED',recordingType:'MIX',workId:'w',work:{id:'w',type:'MUSIC',melody:{},lyrics:{}}}));
 assert.doesNotThrow(()=>model.validateRecording({id:'ok',title:'Music',ontologyStatus:'MAPPED',recordingType:'MIX',workId:'w',work:{id:'w',type:'MUSIC',melody:{},lyrics:null}}));
});
test('server filter queries retain canonical scope and omit unknown query fields',()=>{
 const params=new URLSearchParams(model.ontologyQuery({language:'ar',bpmMin:120,bpmScope:'recording',workType:'SONG',inventedCategory:'ignored',genre:''}));
 assert.equal(params.get('bpmScope'),'recording');assert.equal(params.get('language'),'ar');assert.equal(params.has('inventedCategory'),false);assert.equal(params.has('genre'),false);
});
test('editing DTOs preserve identity references and remove hydrated display objects',()=>{
 const value=model.editableWork({id:'w',type:'SONG',title:'Shared',revision:3,melody:{id:'m',bpm:120,genreIds:['g'],genres:[{id:'g',name:'Pop'}]},lyrics:{languageId:'ar',artistCredits:[{artistId:'a',role:'LYRICIST',artist:{id:'a',name:'Writer'}}]}});
 assert.deepEqual(value.lyrics.artistCredits,[{artistId:'a',role:'LYRICIST',detail:''}]);assert.equal(value.melody.id,undefined);assert.equal(value.melody.genres,undefined);assert.equal(value.revision,3);
 const record=model.editableRecording({title:'R',id:'r',revision:1,storedAudioUrl:'stored',audioUrl:'signed',recordingMetadata:{bpm:130,key:'C minor'},audio:{durationSeconds:120}});assert.equal(record.audioUrl,'stored');assert.equal(record.durationSeconds,120);assert.equal(record.recordingMetadata.bpm,130);
});

test('Music editing retains instrument identities and clean musician credits',()=>{const dto=model.editableWork({type:'MUSIC',title:'Instrumental',melody:{key:'A minor',instrumentIds:['piano'],musicianCredits:[{artistId:'a',role:'PERFORMER',artist:{id:'a',name:'Musician'}}]}});assert.deepEqual(dto.melody.instrumentIds,['piano']);assert.deepEqual(dto.melody.musicianCredits,[{artistId:'a',role:'PERFORMER',detail:''}]);assert.equal(dto.melody.key,'A minor');});
