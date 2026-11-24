import test from 'node:test';
import assert from 'node:assert/strict';
import {createStemDeckGraph} from './stemDeckGraph.js';
test('auxiliary deck stereo and stems share a single strip rather than doubling the original',()=>{
 const node=()=>({gain:{value:1,setTargetAtTime(value,time,smoothing){this.last={value,time,smoothing};}},frequency:{value:0,setTargetAtTime(){}},delayTime:{value:0},connections:[],connect(value){this.connections.push(value);},disconnect(value){if(value)this.connections=this.connections.filter(item=>item!==value);else this.connections=[];}});
 const source=node(),destination=node(),element={currentTime:99,paused:false};let creates=0;
 const context={currentTime:0,createGain:node,createBiquadFilter:node,createDelay:node,createAnalyser:node,createMediaElementSource:value=>{assert.equal(value,element);creates++;return source;}};
 const graph=createStemDeckGraph(context,element,destination);assert.equal(creates,1);assert.deepEqual(source.connections,[graph.originalGain]);assert.deepEqual(graph.originalGain.connections,[graph.stemInput]);assert.equal(graph.originalGain.gain.value,1);assert.equal(graph.strip.inputMeter.fftSize,2048);assert.equal(graph.strip.trimMeter.fftSize,2048);
 graph.strip.set('trim',.5,.4);assert.equal(graph.strip.trim.gain.last.value,2);assert.equal(graph.strip.trim.gain.last.smoothing,.4);assert.deepEqual(graph.strip.gain.connections,[destination]);assert.equal(element.currentTime,99);assert.equal(element.paused,false);
 graph.disconnect();graph.disconnect();assert.equal(source.connections.length,0);assert.equal(graph.stemInput.connections.length,0);
});
