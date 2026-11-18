import {test} from 'node:test';
import assert from 'node:assert/strict';
import {acknowledgeRecordingAutosave} from './recordingAutosave.js';
const submitted={id:'r1',collectionId:'c1',value:{name:'Earlier title',description:'Earlier description',workType:'MIX',audioUrl:'blob:local-audio',revision:1,status:'DRAFT',atoms:[{id:'a1',name:'Earlier atom'}]}};
test('a background acknowledgement preserves newer fields, atom identities and playback source',()=>{
 const current={...submitted,collectionId:'c2',value:{...submitted.value,name:'Still typing',description:'New description',workType:'REMIX',atoms:[{id:'a1',name:'New atom'}]}};
 const result=acknowledgeRecordingAutosave(current,submitted,{id:'r1',revision:2,status:'DRAFT',name:'Earlier title',audioUrl:'https://storage.test/audio.mp3'});
 assert.equal(result.editor.value.name,'Still typing');assert.equal(result.editor.value.description,'New description');assert.equal(result.editor.value.workType,'REMIX');assert.equal(result.editor.collectionId,'c2');
 assert.equal(result.editor.value.atoms,current.value.atoms);assert.equal(result.editor.value.audioUrl,'blob:local-audio');assert.equal(result.editor.value.revision,2);
 assert.notEqual(JSON.stringify(result.editor.value),result.baseline,'Newer edits must remain dirty for the next save');
 assert.equal(submitted.value.revision,1);assert.equal(current.value.revision,1);
});
test('an unchanged snapshot becomes clean after acknowledgement',()=>{
 const result=acknowledgeRecordingAutosave(submitted,submitted,{id:'r1',revision:2,status:'DRAFT'});
 assert.equal(JSON.stringify(result.editor.value),result.baseline);
});
test('creating a draft acknowledges its server identity without discarding new typing',()=>{
 const unsaved={...submitted,id:''},current={...unsaved,value:{...unsaved.value,name:'New typing'}};
 const result=acknowledgeRecordingAutosave(current,unsaved,{id:'new-id',revision:1,status:'DRAFT'});
 assert.equal(result.editor.id,'new-id');assert.equal(result.editor.value.name,'New typing');assert.equal(JSON.parse(result.baseline).name,'Earlier title');
});
