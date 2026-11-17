import {test} from 'node:test';
import assert from 'node:assert/strict';
import {musicMessageFields,musicPatchFields} from './musicMessageFields.js';

test('labelled music sections become separate values and preserve unrelated event text',()=>{
 const text='Event type: Wedding. Languages: Arabic and English. Favourite artists: Fairuz, Najwa Karam. Genres: House, Dabke. Guests: 150';
 const parsed=musicMessageFields(text);
 assert.deepEqual(parsed.fields.map(row=>row.path),['music.languagePairs','music.favouriteArtists','music.genres']);
 assert.deepEqual(parsed.fields[0].value.map(row=>row.language),['Arabic','English']);
 assert.deepEqual(parsed.fields[1].value,['Fairuz','Najwa Karam']);
 assert.deepEqual(parsed.fields[2].value,['House','Dabke']);
 assert.match(parsed.text,/Event type: Wedding/);assert.match(parsed.text,/Guests: 150/);
 assert.doesNotMatch(parsed.text,/Favourite artists/);
});
test('a label never swallows what is written after it: an equipment list stays outside the artists',()=>{
 const blank=musicMessageFields('Favourite artists: Fairuz, Ed Sheeran\n\nEquipment:\n- 2 tall floor-standing speakers\n- 1 subwoofer\n- 8 uplights\n- a smoke machine');
 assert.deepEqual(blank.fields[0].value,['Fairuz','Ed Sheeran']);
 for(const item of ['2 tall floor-standing speakers','1 subwoofer','8 uplights','a smoke machine'])assert.match(blank.text,new RegExp(item));
 assert.match(blank.text,/Equipment:/);
 const tight=musicMessageFields('Favourite artists: Ed Sheeran\n2 tall floor-standing speakers\n1 subwoofer');
 assert.deepEqual(tight.fields[0].value,['Ed Sheeran']);assert.match(tight.text,/1 subwoofer/);
 const labelled=musicMessageFields('Favourite artists: Fairuz\nEquipment: 2 speakers');
 assert.deepEqual(labelled.fields[0].value,['Fairuz']);assert.match(labelled.text,/Equipment: 2 speakers/);
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
