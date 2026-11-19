import test from 'node:test';
import assert from 'node:assert/strict';
import {recordingRulerTicks} from './recordingRuler.js';
test('ruler uses graduated ticks and keeps labels apart at different widths',()=>{
 for(const width of [240,600,1200]){
  const ticks=recordingRulerTicks(0,247.62,247.62,width),labels=ticks.filter(t=>t.label);
  assert.ok(ticks.length>labels.length*3);
  for(let i=1;i<labels.length;i++)assert.ok((labels[i].position-labels[i-1].position)*width/100>=79);
  assert.ok(ticks.some(t=>t.medium));
 }
});
test('deep zoom labels milliseconds and keeps panned ticks within the recording',()=>{
 const ticks=recordingRulerTicks(59.982,.04,60.01,800);
 assert.ok(ticks.filter(t=>t.label).every(t=>/^\d+:\d{2}\.\d{3}$/.test(t.label)));
 assert.ok(ticks.some(t=>t.label==='1:00.000'));
 assert.ok(ticks.every(t=>t.time>=59.982&&t.time<=60.01&&t.position>=0&&t.position<=100));
});
test('invalid ruler windows are empty',()=>{
 assert.deepEqual(recordingRulerTicks(0,0,10),[]);
 assert.deepEqual(recordingRulerTicks(0,10,0),[]);
});
