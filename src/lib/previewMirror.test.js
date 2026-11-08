import test from 'node:test';
import assert from 'node:assert/strict';
import {mirrorPreviewVideo} from './previewMirror.js';

function fixture(){
 let changed,disconnected=false,stops=0;
 const stream={getTracks:()=>[{stop(){stops++;}}]};
 const source={srcObject:stream};
 const container=new EventTarget();container.querySelector=()=>source;
 const attrs=new Map();const target={srcObject:null,muted:false,play:async()=>{},pause(){},getAttribute:key=>attrs.get(key)||null,setAttribute:(key,value)=>attrs.set(key,value),removeAttribute:key=>attrs.delete(key)};
 class Observer{constructor(callback){changed=callback;}observe(){}disconnect(){disconnected=true;}}
 return {container,source,target,stream,Observer,changed:()=>changed(),get stops(){return stops;},get disconnected(){return disconnected;}};
}
test('both previews share a muted stream and mirror cleanup never stops capture',()=>{
 const f=fixture();const close=mirrorPreviewVideo(f.container,f.target,{Observer:f.Observer});
 assert.equal(f.target.srcObject,f.stream);assert.equal(f.target.muted,true);
 close();assert.equal(f.target.srcObject,null);assert.equal(f.stops,0);assert.equal(f.disconnected,true);
});
test('reconnecting or removing the primary video updates the mirror without owning its tracks',()=>{
 const f=fixture();const close=mirrorPreviewVideo(f.container,f.target,{Observer:f.Observer});
 const next={};f.source.srcObject=next;f.container.dispatchEvent(new Event('loadedmetadata'));assert.equal(f.target.srcObject,next);
 f.container.querySelector=()=>null;f.changed();assert.equal(f.target.srcObject,null);
 close();f.source.srcObject=f.stream;f.container.dispatchEvent(new Event('playing'));assert.equal(f.target.srcObject,null);assert.equal(f.stops,0);
});
