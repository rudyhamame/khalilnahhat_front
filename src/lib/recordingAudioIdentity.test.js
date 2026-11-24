import test from 'node:test';
import assert from 'node:assert/strict';
import {recordingAudioIdentity} from './recordingAudioIdentity.js';
const hash='ab'.repeat(32);
test('migrated OVH private and public files expose their fingerprint without downloading or exposing signed queries',()=>{
 for(const visibility of ['private','public'])for(const extension of ['mp3','flac','wav']){
  const key=`khalil-media/${visibility}/${hash}.${extension}`;
  const id=recordingAudioIdentity(`https://vps-ba7fb4cb.vps.ovh.ca/${key}?expires=123&signature=secret`);
  assert.deepEqual(id,{hash,storageId:key,provider:'OVH',version:''});assert.ok(!id.storageId.includes('secret'));
  assert.equal(recordingAudioIdentity('/'+key).hash,hash);
 }
});
test('existing Cloudinary files retain their fingerprint, public ID and version',()=>{
 assert.deepEqual(recordingAudioIdentity(`https://res.cloudinary.com/demo/video/upload/v123/khalil/assets/audio/${hash}.mp3`),{hash,storageId:`khalil/assets/audio/${hash}`,provider:'Cloudinary',version:'123'});
});
test('recording identifiers and unrelated file names are not mistaken for byte fingerprints',()=>{
 for(const value of [undefined,'recording-511b821d-946e-4aa1-b265-25c11e8ac2ca','blob:https://local/abc','https://example.com/song.mp3'])assert.equal(recordingAudioIdentity(value).hash,'');
});
