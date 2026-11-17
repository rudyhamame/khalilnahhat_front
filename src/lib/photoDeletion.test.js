import {test} from 'node:test';
import assert from 'node:assert/strict';
import {documentDeletionRequest,numberedDocumentChoices,numberedPhotoChoices,photoDeletionRequest} from './photoDeletion.js';

test('a vague photo deletion asks for a numbered choice instead of changing links',()=>{
 assert.deepEqual(photoDeletionRequest('delete it',{photoContext:true,count:3}),{kind:'ask'});
 assert.deepEqual(photoDeletionRequest('remove an inspiration photo',{count:3}),{kind:'ask'});
 assert.match(numberedPhotoChoices([{name:'Entrance.jpg'},{name:'Cake.png'}]),/1\. Entrance\.jpg\n2\. Cake\.png/);
});

test('the pending photo choice accepts valid numbers and rejects invalid ones',()=>{
 assert.deepEqual(photoDeletionRequest('2',{pending:true,count:3}),{kind:'delete',indices:[1]});
 assert.deepEqual(photoDeletionRequest('photos 1 and 3',{pending:true,count:3}),{kind:'delete',indices:[0,2]});
 assert.deepEqual(photoDeletionRequest('9',{pending:true,count:3}),{kind:'invalid'});
 assert.deepEqual(photoDeletionRequest('cancel',{pending:true,count:3}),{kind:'cancel'});
});

test('photo deletion and inspiration-link deletion remain separate',()=>{
 assert.equal(photoDeletionRequest('delete the inspiration link',{count:2}),null);
 assert.deepEqual(photoDeletionRequest('delete photo 1',{count:2}),{kind:'delete',indices:[0]});
 assert.deepEqual(photoDeletionRequest('delete the photo',{count:0}),{kind:'empty'});
});
test('document deletion uses its own numbered Event documents list',()=>{
 assert.deepEqual(documentDeletionRequest('delete a document',{count:2}),{kind:'ask'});
 assert.deepEqual(documentDeletionRequest('2',{pending:true,count:2}),{kind:'delete',indices:[1]});
 assert.deepEqual(documentDeletionRequest('5',{pending:true,count:2}),{kind:'invalid'});
 assert.match(numberedDocumentChoices([{name:'Timeline.pdf'},{name:'Contract.docx'}]),/1\. Timeline\.pdf\n2\. Contract\.docx/);
 assert.equal(photoDeletionRequest('delete document 1',{count:2}),null);
});
