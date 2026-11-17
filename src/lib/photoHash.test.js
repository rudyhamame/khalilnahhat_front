import {test} from 'node:test';
import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import {attachmentHash,attachmentPhotoHash,duplicateAttachmentHash,duplicatePhotoHash,hashFile,hashPhoto} from './photoHash.js';

const digest='a'.repeat(64);

test('photo hashing detects identical bytes even when filenames differ',async()=>{
 const first=new Blob(['same photo bytes']),renamed=new Blob(['same photo bytes']),different=new Blob(['different']);
 const hash=await hashPhoto(first,webcrypto);
 assert.equal(await hashPhoto(renamed,webcrypto),hash);
 assert.notEqual(await hashPhoto(different,webcrypto),hash);
 assert.equal(duplicatePhotoHash([{url:'https://res.cloudinary.com/demo/image/upload/photo.jpg',name:'first.jpg',sha256:hash}],hash),true);
});
test('event documents use the same content hash duplicate rule',async()=>{
 const first=new Blob(['same document']),renamed=new Blob(['same document']);
 const hash=await hashFile(first,webcrypto);
 assert.equal(await hashFile(renamed,webcrypto),hash);
 assert.equal(duplicateAttachmentHash([{url:'https://res.cloudinary.com/demo/raw/upload/plan.pdf',name:'plan.pdf',sha256:hash}],hash),true);
 assert.equal(attachmentHash({sha256:hash}),hash);
});

test('legacy content-addressed photo URLs expose their SHA-256 digest',()=>{
 const item={url:`https://res.cloudinary.com/demo/image/upload/v1/khalil/assets/profile/${digest}.jpg`,name:'old.jpg'};
 assert.equal(attachmentPhotoHash(item),digest);
 assert.equal(duplicatePhotoHash([item],digest),true);
 assert.equal(duplicatePhotoHash([item],'b'.repeat(64)),false);
});
