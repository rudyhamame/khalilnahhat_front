import test from 'node:test';
import assert from 'node:assert/strict';
import {retainArchiveSource,archiveAudioIdentity} from './archivePlaybackSource.js';
const media=`https://media.example/khalil-media/private/${'a'.repeat(64)}.mp3`;
test('30-second catalog signature refreshes do not change the active song source',()=>{
 const initial=retainArchiveSource(null,{id:'song',audioUrl:`${media}?expires=100&signature=old`});
 for(let i=1;i<=100;i++)assert.equal(retainArchiveSource(initial,{id:'song',audioUrl:`${media}?expires=${100+i}&signature=new${i}`}),initial);
 assert.ok(initial.url.includes('signature=old'));
});
test('a different track, different media asset or real media query change loads a new source',()=>{
 const first=retainArchiveSource(null,{id:'song',audioUrl:media});
 assert.notEqual(retainArchiveSource(first,{id:'other',audioUrl:media}),first);
 assert.notEqual(retainArchiveSource(first,{id:'song',audioUrl:media.replace('a'.repeat(64),'b'.repeat(64))}),first);
 assert.notEqual(retainArchiveSource(first,{id:'song',audioUrl:media+'?format=wav'}),first);
 assert.notEqual(archiveAudioIdentity('https://example.com/audio?token=one'),archiveAudioIdentity('https://example.com/audio?token=two'));
 assert.deepEqual(retainArchiveSource(first,null),{id:'',url:''});
});
