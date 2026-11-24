import test from 'node:test';
import assert from 'node:assert/strict';
import {createAutoDjRemix} from './autoDjRemix.js';
function setup(){const calls=[];return {calls,controller:createAutoDjRemix({start:()=>calls.push('start'),stop:()=>calls.push('restore'),select:n=>calls.push(`deck ${n}`)})};}
const live={enabled:true,phase:'armed',active:1,selectedDeck:1,trackId:'song'};
test('AI DJ automatically remixes once, restores for crossfade and follows the new live deck',()=>{
 const {calls,controller}=setup();controller.sync(live);controller.sync({...live,phase:'planning'});assert.deepEqual(calls,['start']);
 controller.sync({...live,phase:'mixing'});assert.deepEqual(calls,['start','restore']);
 controller.sync({...live,phase:'playing',active:2});assert.equal(calls.at(-1),'deck 2');
 controller.sync({...live,active:2,selectedDeck:2,trackId:'next'});assert.equal(calls.at(-1),'start');
 controller.sync({...live,enabled:false});assert.equal(calls.at(-1),'restore');
});
test('manual opt-out holds until re-enabled and style changes restart with restoration',()=>{
 const {calls,controller}=setup();controller.sync(live);controller.sync({...live,remixEnabled:false});controller.sync({...live,remixEnabled:false,phase:'planning'});assert.deepEqual(calls,['start','restore']);
 controller.sync(live);controller.sync({...live,style:'vocal'});assert.deepEqual(calls,['start','restore','start','restore','start']);
});
test('disabled integration leaves a standalone manual remix alone',()=>{
 const {calls,controller}=setup();controller.sync({...live,enabled:false});controller.stop();assert.deepEqual(calls,[]);
});
