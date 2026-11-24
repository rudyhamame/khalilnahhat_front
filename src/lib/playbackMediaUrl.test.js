import test from 'node:test';
import assert from 'node:assert/strict';
import {playbackMediaUrl} from './playbackMediaUrl.js';
const path=`/khalil-media/private/${'a'.repeat(64)}.mp3?expires=123&signature=abc`;
test('development audio/stem delivery keeps the entire signed query on the same origin',()=>{
 assert.equal(playbackMediaUrl('https://vps-ba7fb4cb.vps.ovh.ca'+path,{development:true}),path);
 assert.equal(playbackMediaUrl('https://vps-ba7fb4cb.vps.ovh.ca'+path.replace('.mp3','.flac'),{development:true}),path.replace('.mp3','.flac'));
});
test('production and unrelated media addresses are preserved',()=>{
 const url='https://vps-ba7fb4cb.vps.ovh.ca'+path;assert.equal(playbackMediaUrl(url,{development:false}),url);
 for(const value of ['https://other.example'+path,'https://vps-ba7fb4cb.vps.ovh.ca/admin','/local.mp3',undefined])assert.equal(playbackMediaUrl(value,{development:true}),value);
});
