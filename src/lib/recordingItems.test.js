import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blankItemLyrics,blankRecordingItem,editableRecordingItems,validateRecordingItems,clearItemTiming} from './recordingItems.js';
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
