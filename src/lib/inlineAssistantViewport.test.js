import {test} from 'node:test';
import assert from 'node:assert/strict';
import {revealInlineAssistant,assistantAvailableBelowIntro} from './inlineAssistantViewport.js';
for(const left of [-420,420])test(`opening Echo pans ${left}px horizontally without scrolling vertically`,()=>{
 let movement;const view={document:{getElementById:()=>({hidden:false,getBoundingClientRect:()=>({left})})},matchMedia:()=>({matches:false}),scrollBy:value=>{movement=value;}};
 assert.equal(revealInlineAssistant(view),true);assert.deepEqual(movement,{left,top:0,behavior:'smooth'});
});
test('intro hides Echo while subsequent chapters allow it',()=>{
 assert.equal(assistantAvailableBelowIntro({getBoundingClientRect:()=>({bottom:800})},800),false);
 assert.equal(assistantAvailableBelowIntro({getBoundingClientRect:()=>({bottom:200})},800),false);
 assert.equal(assistantAvailableBelowIntro({getBoundingClientRect:()=>({bottom:0})},800),true);
 assert.equal(assistantAvailableBelowIntro(null,800),true);
});
test('hidden panels do not pan and reduced motion reveals instantly',()=>{
 const view={document:{getElementById:()=>({hidden:true})},scrollBy:()=>assert.fail()};assert.equal(revealInlineAssistant(view),false);
 view.document.getElementById=()=>({getBoundingClientRect:()=>({left:-360})});view.matchMedia=()=>({matches:true});view.scrollBy=value=>assert.equal(value.behavior,'instant');revealInlineAssistant(view);
});
