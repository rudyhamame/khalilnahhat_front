import test from 'node:test';import assert from 'node:assert/strict';
import {checkEventFile,EVENT_FILE_LIMITS} from './eventFileLimits.js';
import {aiFields,validValue} from './eventOrderCore.mjs';
const file=(name,type,size)=>({name,type,size});
test('photos: JPG, PNG or WebP, up to 8 MB each and 10 per booking',()=>{
 assert.equal(checkEventFile(file('a.jpg','image/jpeg',1000),'photo',0),'');
 assert.match(checkEventFile(file('a.jpg','image/jpeg',8*1024*1024+1),'photo',0),/too large.*8 MB/);
 assert.match(checkEventFile(file('a.gif','image/gif',10),'photo',0),/JPG, PNG or WebP/);
 assert.match(checkEventFile(file('a.jpg','image/jpeg',10),'photo',10),/up to 10 inspiration photos/);
});
test('documents: PDF, Word or TXT, up to 10 MB each and 5 per booking',()=>{
 assert.equal(checkEventFile(file('plan.pdf','application/pdf',1000),'file',4),'');
 assert.equal(checkEventFile(file('notes.docx','',1000),'file',0),'');
 assert.match(checkEventFile(file('run.exe','application/x-msdownload',10),'file',0),/PDF, Word/);
 assert.match(checkEventFile(file('plan.pdf','application/pdf',10),'file',5),/up to 5 event documents/);
 assert.match(checkEventFile(file('empty.pdf','application/pdf',0),'file',0),/empty/);
 assert.equal(EVENT_FILE_LIMITS.file.mb,10);
});
test('the booking rules cap the saved attachments at the same numbers',()=>{
 const photos=aiFields.find(field=>field.key==='references.photos'),files=aiFields.find(field=>field.key==='references.files');
 const item=index=>({url:`https://res.cloudinary.com/x/image/upload/v1/khalil/event-references/f${index}.jpg`,name:`f${index}`,comment:''});
 assert.equal(validValue(photos,Array.from({length:10},(_,i)=>item(i))),true);assert.equal(validValue(photos,Array.from({length:11},(_,i)=>item(i))),false);
 assert.equal(validValue(files,Array.from({length:5},(_,i)=>item(i))),true);assert.equal(validValue(files,Array.from({length:6},(_,i)=>item(i))),false);
});
