import {test} from 'node:test';
import assert from 'node:assert/strict';
import {fitModel} from './modelViewerFit.js';

function viewer(){return{clientWidth:300,clientHeight:500,getDimensions:()=>({x:1,y:2,z:.5}),getBoundingBoxCenter:()=>({x:0,y:1,z:0}),getFieldOfView:()=>30,getCameraOrbit:()=>({theta:1.2,phi:.8,radius:4}),resetTurntableRotation(){},jumpCameraToGoal(){}};}
test('resizing the equipment frame preserves the angle chosen by dragging',()=>{
 const model=viewer();fitModel(model,{preserveOrbit:true});
 const orbit=model.cameraOrbit.split(' ');assert.equal(orbit[0],'1.2rad');assert.equal(orbit[1],'0.8rad');assert.ok(parseFloat(orbit[2])>0);
 model.clientWidth=180;fitModel(model,{preserveOrbit:true});
 assert.deepEqual(model.cameraOrbit.split(' ').slice(0,2),['1.2rad','0.8rad']);
});
test('explicit reset restores the equipment presentation angle',()=>{
 const model=viewer();fitModel(model);
 assert.ok(Math.abs(parseFloat(model.cameraOrbit.split(' ')[0])-(-Math.PI/12))<1e-10);
});
test('a temporarily hidden frame does not reset the camera',()=>{
 const model=viewer();model.clientWidth=0;model.cameraOrbit='user angle';fitModel(model,{preserveOrbit:true});assert.equal(model.cameraOrbit,'user angle');
});
