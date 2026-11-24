import test from 'node:test';
import assert from 'node:assert/strict';
import {fetchStemAudio} from './stemAudioFetch.js';
const hash='a'.repeat(64),signed=`https://vps-ba7fb4cb.vps.ovh.ca/khalil-media/private/${hash}.flac?expires=123&signature=exact`;
test('OVH channel waveforms, downloads and stash requests preserve signatures through the same-origin proxy without sending API credentials',async()=>{
 const calls=[],signal=new AbortController().signal,response={ok:true};
 assert.equal(await fetchStemAudio(signed,{token:'private-token',signal,development:true},async(...args)=>{calls.push(args);return response;}),response);
 assert.equal(calls[0][0],signed.replace('https://vps-ba7fb4cb.vps.ovh.ca',''));assert.equal(calls[0][1].headers,undefined);assert.equal(calls[0][1].signal,signal);
});
test('temporary separator API channels retain authentication; absolute and blob URLs remain independent of API base',async()=>{
 const calls=[],request=async(...args)=>{calls.push(args);return {ok:true};};
 await fetchStemAudio('/api/admin/stems/channel',{apiBaseUrl:'https://api.example/api',token:'token'},request);
 assert.equal(calls[0][0],'https://api.example/api/admin/stems/channel');assert.equal(calls[0][1].headers.Authorization,'Bearer token');
 for(const url of ['blob:https://example.com/123','https://storage.example/drums.flac',signed]){
  await fetchStemAudio(url,{apiBaseUrl:'https://api.example/api',token:'token',development:false},request);assert.equal(calls.at(-1)[0],url);assert.equal(calls.at(-1)[1].headers,undefined);
 }
});
test('failed or expired channel downloads report an error rather than quietly leaving blank lanes',async()=>{
 await assert.rejects(fetchStemAudio(signed,{},async()=>({ok:false,status:403})),/Channel audio download failed \(403\)/);
});
