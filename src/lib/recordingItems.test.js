import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blankItemLyrics,blankRecordingItem,editableRecordingItems,validateRecordingItems,clearItemTiming,copyRecordingToAtom} from './recordingItems.js';
test('copy recording details to a whole atom keeps its identity, release year, sound and vocals',()=>{
 const atom={...blankRecordingItem('Old name'),releaseYear:1998,audioRange:{startSec:20,endSec:30},sound:{...blankRecordingItem().sound,keys:['C major']}};
 const copied=copyRecordingToAtom(atom,{name:'Song',durationSeconds:168});
 assert.equal(copied.id,atom.id);assert.equal(copied.name,'Song');assert.equal(copied.releaseYear,1998);
 assert.deepEqual(copied.audioRange,{startSec:0,endSec:168});assert.deepEqual(copied.sound.keys,['C major']);
 validateRecordingItems([copied]);
 assert.equal(atom.name,'Old name');
});
test('copying an instrumental recording clears old vocal details and does not copy its release date',()=>{
 const atom={...blankRecordingItem('Old song'),lyrics:blankItemLyrics()};
 const copied=copyRecordingToAtom(atom,{name:'Instrumental',durationSeconds:null});
 assert.equal(copied.releaseYear,null);assert.equal(copied.audioRange,undefined);
 assert.deepEqual(copied.sound.musicianCredits,[]);validateRecordingItems([copied]);
});
test('multiple items round trip independent release years, vocal branches and multiple credits',()=>{
 const song={...blankRecordingItem('Song'),releaseYear:1998,lyrics:{...blankItemLyrics(),languages:[{languageId:'ar',dialectIds:['levant']}],vocalistCredits:[{artistId:'a'},{artistId:'c'}]}};
 const music={...blankRecordingItem('Instrumental'),releaseYear:2001,sound:{...blankRecordingItem().sound,musicianCredits:[{artistId:'d'},{artistId:'e'}]}};
 validateRecordingItems([song,music]);const edited=editableRecordingItems({atoms:[song,music]});assert.deepEqual(edited,[song,music]);edited[0].lyrics.vocalistCredits.pop();assert.equal(song.lyrics.vocalistCredits.length,2);assert.equal(music.lyrics,null);
 
});
test('legacy shared works become independent drafts without mutating the source',()=>{
 const recording={title:'Mix',componentWorks:[{id:'shared',title:'Old song',type:'SONG',lyrics:{releaseYear:1997,languageId:'ar',artistCredits:[{artistId:'a',role:'VOCALIST'}]},melody:{musicianCredits:[{artistId:'b',role:'PERFORMER'}]}}]};
 const items=editableRecordingItems(recording);assert.equal(items[0].releaseYear,1997);assert.equal(items[0].lyrics.vocalistCredits[0].artistId,'a');items[0].name='New name';assert.equal(recording.componentWorks[0].title,'Old song');
});
test('clearing audio timing resets atom ranges',()=>{
 const original={...blankRecordingItem('Song'),audioRange:{startSec:1,endSec:2},lyrics:{...blankItemLyrics()}};const cleared=clearItemTiming([original]);assert.equal(cleared[0].audioRange,undefined);assert.equal(original.audioRange.startSec,1);
});
test('incomplete names, years, credits and invalid atom ranges block save',()=>{
 assert.throws(()=>validateRecordingItems([]),/at least one/);
 assert.throws(()=>validateRecordingItems([blankRecordingItem()]),/name/);
 assert.throws(()=>validateRecordingItems([{...blankRecordingItem('Name'),releaseYear:2}]),/year/);
 assert.throws(()=>validateRecordingItems([{...blankRecordingItem('Name'),sound:{...blankRecordingItem().sound,musicianCredits:[{artistId:''}]}}]),/person/);
});
