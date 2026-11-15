import test from 'node:test';
import assert from 'node:assert/strict';
import {createViewportWheelGesture} from './viewportWheelGesture.js';

const wheel=(deltaY,deltaX=0,deltaMode=0)=>({deltaY,deltaX,deltaMode});
test('small trackpad deltas accumulate before inertia is swallowed',()=>{
 const gesture=createViewportWheelGesture();
 assert.equal(gesture(wheel(2),0),0);
 assert.equal(gesture(wheel(4),16),0);
 assert.equal(gesture(wheel(6),32),1);
 assert.equal(gesture(wheel(100),48),0);
 assert.equal(gesture(wheel(2),160),0);
 assert.equal(gesture(wheel(30),310),1);
});
test('separate upward and downward gestures each advance once',()=>{
 const gesture=createViewportWheelGesture();
 assert.equal(gesture(wheel(120),0),1);
 assert.equal(gesture(wheel(120),30),0);
 assert.equal(gesture(wheel(-120),200),-1);
});
test('line wheels work and horizontal gestures do not advance',()=>{
 const gesture=createViewportWheelGesture();
 assert.equal(gesture(wheel(2,30),0),0);
 assert.equal(gesture(wheel(1,0,1),200),1);
});
