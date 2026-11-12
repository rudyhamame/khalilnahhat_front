import test from 'node:test';
import assert from 'node:assert/strict';
import {parseId3} from './id3.js';
const frame=(id,text)=>{const body=Uint8Array.from([3,...new TextEncoder().encode(text)]);return [...new TextEncoder().encode(id),0,0,0,body.length,0,0,...body];};
test('reads title, artist and year from an ID3v2.3 tag',()=>{
 const frames=[...frame('TIT2','Lshhad Hobak'),...frame('TPE1','Najwa Karam'),...frame('TYER','2019')];
 const bytes=Uint8Array.from([0x49,0x44,0x33,3,0,0,0,0,0,frames.length,...frames]);
 assert.deepEqual(parseId3(bytes.buffer),{title:'Lshhad Hobak',artist:'Najwa Karam',year:'2019'});
});
test('a file without a tag gives nothing',()=>{assert.deepEqual(parseId3(new Uint8Array(20).buffer),{});});
