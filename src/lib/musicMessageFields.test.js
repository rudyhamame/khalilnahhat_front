import {test} from 'node:test';
import assert from 'node:assert/strict';
import {musicMessageFields,musicPatchFields} from './musicMessageFields.js';

test('labelled music sections become separate values and preserve unrelated event text',()=>{
 const text='Event type: Wedding. Music language: Arabic and English. Favourite artists: Fairuz, Najwa Karam. Music preferences: Upbeat dancing, no explicit lyrics. Event name: Test Wedding';
 const parsed=musicMessageFields(text);
 assert.deepEqual(parsed.fields.map(row=>row.path),['music.styles','music.favouriteArtists','music.otherPreferences']);
 assert.deepEqual(parsed.fields[0].value,['Arabic','English']);
 assert.deepEqual(parsed.fields[1].value,['Fairuz','Najwa Karam']);
 assert.equal(parsed.fields[2].value,'Upbeat dancing, no explicit lyrics');
 assert.match(parsed.text,/Event type: Wedding/);assert.match(parsed.text,/Event name: Test Wedding/);
 assert.doesNotMatch(parsed.text,/Favourite artists/);
});
test('suggested song moments, artists and links remain separate ordered records',()=>{
 const text='Suggested songs: Grand entrance: Ahla Marra – Melhem Zein https://www.youtube.com/watch?v=first ; First dance: Perfect — Ed Sheeran https://youtu.be/second';
 const {fields}=musicMessageFields(text);
 assert.equal(fields[0].value.length,2);
 assert.deepEqual(fields[0].value[0],{song:'Ahla Marra',artist:'Melhem Zein',phase:'Grand entrance',link:'https://www.youtube.com/watch?v=first'});
 assert.equal(fields[0].value[1].phase,'First dance');assert.equal(fields[0].value[1].artist,'Ed Sheeran');
});
test('unlabelled conversations remain untouched; JSON task arrays are decoded without truncation',()=>{
 const text='Can we have Arabic music during dinner?';assert.deepEqual(musicMessageFields(text),{text,fields:[]});
 const songs=Array.from({length:10},(_,index)=>({song:'Song '+index,phase:''}));
 assert.deepEqual(musicPatchFields([{path:'event.type',value:'wedding'},{path:'music.suggestedSongs',value:JSON.stringify(songs)}]),[{path:'music.suggestedSongs',value:songs}]);
});
