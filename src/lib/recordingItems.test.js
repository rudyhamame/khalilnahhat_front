import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blankItemLyrics,blankRecordingItem,editableRecordingItems,validateRecordingItems,clearItemTiming,copyRecordingToAtom} from './recordingItems.js';
test('copy recording details to a whole atom while keeping its identity and release date',()=>{
 const atom={...blankRecordingItem('Old name'),releaseDate:'1998-04-05',releaseYear:1998,audioRange:{startSec:20,endSec:30}};
 const recording={title:'Song',releaseDate:'2026-11-13',durationSeconds:168,musical:{bpms:[120],keys:['C major'],rhythmIds:['rhythm'],genreIds:['genre'],influences:['Jazz']},languages:{languageIds:['ar'],dialectIds:['levant']},recordingCredits:{vocalists:[{artistId:'singer',detail:'Lead'}],musicians:[{artistId:'player',instrumentId:'piano',detail:''}]}};
 const copied=copyRecordingToAtom(atom,recording);
 assert.equal(copied.id,atom.id);assert.equal(copied.name,'Song');assert.equal(copied.releaseDate,'1998-04-05');assert.equal(copied.releaseYear,1998);
 assert.deepEqual(copied.audioRange,{startSec:0,endSec:168});assert.equal(copied.sound.bpm,120);assert.deepEqual(copied.sound.keys,['C major']);
 assert.deepEqual(copied.musicianCredits,recording.recordingCredits.musicians);assert.deepEqual(copied.lyrics.vocalistCredits,recording.recordingCredits.vocalists);
 assert.equal(copied.lyrics.languageId,'ar');assert.equal(copied.lyrics.dialectId,'levant');assert.equal(copied.lyrics.endSec,168);
 validateRecordingItems([copied],'INDIVIDUAL');
 copied.sound.keys.push('A minor');copied.lyrics.languageIds.push('en');copied.musicianCredits[0].detail='Changed';
 assert.deepEqual(recording.musical.keys,['C major']);assert.deepEqual(recording.languages.languageIds,['ar']);assert.equal(recording.recordingCredits.musicians[0].detail,'');assert.equal(atom.name,'Old name');
});
test('copying an instrumental recording clears old vocal details and does not copy its release date',()=>{
 const atom={...blankRecordingItem('Old song'),hasLyrics:true,lyrics:blankItemLyrics()};
 const copied=copyRecordingToAtom(atom,{title:'Instrumental',releaseDate:'2026-11-13',durationSeconds:null});
 assert.equal(copied.releaseDate,'');assert.equal(copied.releaseYear,null);assert.equal(copied.hasLyrics,false);assert.equal(copied.lyrics,null);assert.equal(copied.audioRange,undefined);
 assert.deepEqual(copied.musicianCredits,[]);validateRecordingItems([copied],'INDIVIDUAL');
});
test('multiple items round trip independent release years, vocal branches and multiple credits',()=>{
 const song={...blankRecordingItem('Song'),releaseYear:1998,hasLyrics:true,lyrics:{...blankItemLyrics(),languageId:'ar',dialectId:'levant',vocalistCredits:[{artistId:'a',detail:''},{artistId:'c',detail:''}]}};
 const music={...blankRecordingItem('Instrumental'),releaseYear:2001,musicianCredits:[{artistId:'d',detail:'Piano'},{artistId:'e',detail:'Drums'}]};
 validateRecordingItems([song,music],'MULTIPLE');const edited=editableRecordingItems({items:[song,music]});assert.deepEqual(edited,[song,music]);edited[0].lyrics.vocalistCredits.pop();assert.equal(song.lyrics.vocalistCredits.length,2);assert.equal(music.lyrics,null);
 assert.throws(()=>validateRecordingItems([song,music],'INDIVIDUAL'),/Multiple/);
});
test('legacy shared works become independent drafts without mutating the source',()=>{
 const recording={title:'Mix',recordingAmount:'MULTIPLE',componentWorks:[{id:'shared',title:'Old song',type:'SONG',lyrics:{releaseYear:1997,languageId:'ar',artistCredits:[{artistId:'a',role:'VOCALIST'}]},melody:{musicianCredits:[{artistId:'b',role:'PERFORMER'}]}}]};
 const items=editableRecordingItems(recording);assert.equal(items[0].releaseYear,1997);assert.equal(items[0].lyrics.vocalistCredits[0].artistId,'a');items[0].name='New name';assert.equal(recording.componentWorks[0].title,'Old song');
});
test('clearing audio timing resets atom ranges',()=>{
 const original={...blankRecordingItem('Song'),audioRange:{startSec:1,endSec:2},hasLyrics:true,lyrics:{...blankItemLyrics(),startSec:1,endSec:2}};const cleared=clearItemTiming([original]);assert.equal(cleared[0].audioRange,undefined);assert.equal(cleared[0].lyrics.startSec,null);assert.equal(original.lyrics.startSec,1);
});
test('incomplete names, years, credits and invalid atom ranges block save',()=>{
 assert.throws(()=>validateRecordingItems([],'MULTIPLE'),/at least one/);
 assert.throws(()=>validateRecordingItems([blankRecordingItem()],'MULTIPLE'),/name/);
 assert.throws(()=>validateRecordingItems([{...blankRecordingItem('Name'),releaseYear:2}],'MULTIPLE'),/year/);
 assert.throws(()=>validateRecordingItems([{...blankRecordingItem('Name'),musicianCredits:[{artistId:'',detail:''}]}],'MULTIPLE'),/person/);
 const song={...blankRecordingItem('Song'),hasLyrics:true,lyrics:{...blankItemLyrics(),startSec:20,endSec:10}};
 assert.throws(()=>validateRecordingItems([song],'MULTIPLE'),/start and end/);
});
