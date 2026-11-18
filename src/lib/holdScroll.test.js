import test from 'node:test';
import assert from 'node:assert/strict';
import {holdScroll} from './holdScroll.js';
test('a scroll the user did not cause is undone, one they did is kept',()=>{
 const listeners={};let now=0;globalThis.performance={now:()=>now};
 const element={scrollTop:0,scrollHeight:2000,clientHeight:500,children:[],addEventListener:(n,fn)=>{listeners[n]=fn;},removeEventListener(){}};
 globalThis.ResizeObserver=undefined;
 holdScroll(element);
 // the user wheels to 400
 now=1000;listeners.wheel();element.scrollTop=400;listeners.scroll();
 // later something kicks it to 0 with no input
 now=3000;element.scrollTop=0;listeners.scroll();assert.equal(element.scrollTop,400);
 // a real scroll right after input is accepted
 now=4000;listeners.wheel();element.scrollTop=700;listeners.scroll();assert.equal(element.scrollTop,700);
});
