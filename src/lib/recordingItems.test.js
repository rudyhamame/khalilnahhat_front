import {test} from 'node:test';
import assert from 'node:assert/strict';
import {blankItemLyrics,blankRecordingItem,editableRecordingItems,validateRecordingItems,transcriptForItem,clearItemTiming} from './recordingItems.js';
test('multiple items round trip independent release years, lyric branches and multiple credits',()=>{
 const song={...blankRecordingItem('Song'),releaseYear:1998,hasLyrics:true,lyrics:{...blankItemLyrics(),languageId:'ar',dialectId:'levant',lyricistCredits:[{artistId:'a',detail:''},{artistId:'b',detail:''}],vocalistCredits:[{artistId:'c',detail:''}]}};
 const music={...blankRecordingItem('Instrumental'),releaseYear:2001,musicianCredits:[{artistId:'d',detail:'Piano'},{artistId:'e',detail:'Drums'}]};
 validateRecordingItems([song,music],'MULTIPLE');const edited=editableRecordingItems({items:[song,music]});assert.deepEqual(edited,[song,music]);edited[0].lyrics.lyricistCredits.pop();assert.equal(song.lyrics.lyricistCredits.length,2);assert.equal(music.lyrics,null);
 assert.throws(()=>validateRecordingItems([song,music],'INDIVIDUAL'),/Multiple/);
});
test('legacy shared works become independent drafts without mutating the source',()=>{
 const recording={title:'Mix',recordingAmount:'MULTIPLE',componentWorks:[{id:'shared',title:'Old song',type:'SONG',lyrics:{releaseYear:1997,languageId:'ar',artistCredits:[{artistId:'a',role:'LYRICIST'}]},melody:{musicianCredits:[{artistId:'b',role:'PERFORMER'}]}}]};
 const items=editableRecordingItems(recording);assert.equal(items[0].releaseYear,1997);assert.equal(items[0].lyrics.lyricistCredits[0].artistId,'a');items[0].name='New name';assert.equal(recording.componentWorks[0].title,'Old song');
});
test('AI timing selects only complete lines for the current item and audio changes clear timestamps',()=>{
 const result={segments:[{start:1,end:2,text:'first'},{start:10,end:12,text:'second'},{start:19,end:21,text:'crosses boundary'}]};
 const timing=transcriptForItem(result,'audio',{startSec:10,endSec:20});assert.deepEqual(timing.lines,[{start:10,end:12,text:'second'}]);
 assert.throws(()=>transcriptForItem(result,'audio',{startSec:25,endSec:30}),/No complete/);
 const original={...blankRecordingItem('Song'),hasLyrics:true,lyrics:{...blankItemLyrics(),timedLyrics:timing,text:'second'}};const cleared=clearItemTiming([original]);assert.equal(cleared[0].lyrics.timedLyrics,null);assert.equal(original.lyrics.timedLyrics,timing);assert.equal(cleared[0].lyrics.text,'second');
});
test('incomplete names, years, credits and out-of-range timed lyrics block save',()=>{
 assert.throws(()=>validateRecordingItems([],'MULTIPLE'),/at least one/);
 assert.throws(()=>validateRecordingItems([blankRecordingItem()],'MULTIPLE'),/name/);
 assert.throws(()=>validateRecordingItems([{...blankRecordingItem('Name'),releaseYear:2}],'MULTIPLE'),/year/);
 assert.throws(()=>validateRecordingItems([{...blankRecordingItem('Name'),musicianCredits:[{artistId:'',detail:''}]}],'MULTIPLE'),/person/);
 const song={...blankRecordingItem('Song'),hasLyrics:true,lyrics:{...blankItemLyrics(),startSec:10,endSec:20,timedLyrics:{audioUrl:'audio',model:'whisper-1',lines:[{start:0,end:2,text:'outside'}]}}};
 assert.throws(()=>validateRecordingItems([song],'MULTIPLE'),/range/);
});
