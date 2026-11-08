import test from 'node:test';import assert from 'node:assert/strict';import {capturePresentationSource} from './livePresentationSource.js';
test('tab sharing asks for source audio and releases every captured track',async()=>{
 const saved=Object.getOwnPropertyDescriptor(globalThis,'navigator'),cancel=globalThis.cancelAnimationFrame;let options,ended,stops=0;
 const video={contentHint:'',addEventListener(_name,fn){ended=fn;},stop(){stops++;}},audio={stop(){stops++;}};
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{async getDisplayMedia(value){options=value;return {getVideoTracks:()=>[video],getTracks:()=>[video,audio]};}}}});globalThis.cancelAnimationFrame=()=>{};
 try{let notified=false;const source=await capturePresentationSource({kind:'display',width:1920,height:1080,onEnded:()=>{notified=true;}});assert.equal(options.audio,true);assert.equal(options.video.width.ideal,1920);assert.equal(options.video.frameRate.max,30);ended();assert.equal(notified,true);source.cleanup();assert.equal(stops,2);}finally{Object.defineProperty(globalThis,'navigator',saved);globalThis.cancelAnimationFrame=cancel;}
});
test('denied sharing propagates the permission error instead of opening camera capture',async()=>{
 const saved=Object.getOwnPropertyDescriptor(globalThis,'navigator'),cancel=globalThis.cancelAnimationFrame;Object.defineProperty(globalThis,'navigator',{configurable:true,value:{mediaDevices:{getDisplayMedia:async()=>{throw new Error('Permission denied');}}}});globalThis.cancelAnimationFrame=()=>{};
 try{await assert.rejects(capturePresentationSource({kind:'display'}),/Permission denied/);}finally{Object.defineProperty(globalThis,'navigator',saved);globalThis.cancelAnimationFrame=cancel;}
});
