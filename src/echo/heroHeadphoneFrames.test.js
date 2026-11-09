import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function fixture(){
 const images=[];
 class Image {
  constructor(){images.push(this);this.decoded=new Promise((resolve,reject)=>{this.resolveDecode=resolve;this.rejectDecode=reject;});}
  decode(){return this.decoded;}
 }
 const source=readFileSync(new URL('./heroHeadphoneFrames.js',import.meta.url),'utf8').replace(/^import .*;\n/,'').replaceAll('export ','');
 const context={Image,cloudAsset:path=>path};
 vm.runInNewContext(source+';globalThis.prepare=prepareHeroHeadphoneFrames;',context);
 return {images,prepare:context.prepare};
}

test('all eight frames are fetched eagerly and readiness waits for decoding',async()=>{
 const {images,prepare}=fixture();const pending=prepare();let ready=false;pending.then(()=>{ready=true;});
 assert.equal(images.length,8);
 assert.ok(images.every(image=>image.fetchPriority==='high'&&image.decoding==='async'&&image.src));
 for(const image of images){image.onload();}
 for(const image of images.slice(0,7))image.resolveDecode();
 await Promise.resolve();await Promise.resolve();assert.equal(ready,false);
 images[7].resolveDecode();assert.deepEqual(Array.from(await pending),Array(8).fill(true));
 assert.equal(prepare(),pending);assert.equal(images.length,8);
});

test('retry keeps decoded frames and retries only the missing frame',async()=>{
 const {images,prepare}=fixture();const pending=prepare();
 images.slice(0,7).forEach(image=>{image.onload();image.resolveDecode();});images[7].onerror();
 assert.equal((await pending)[7],false);
 const retry=prepare({retry:true});assert.equal(images.length,9);
 images[8].onload();images[8].resolveDecode();
 assert.ok((await retry).every(Boolean));assert.equal(images.length,9);
});
