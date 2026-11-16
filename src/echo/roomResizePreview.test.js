import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createRoomResizePreview} from './roomResizePreview.js';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-5,`${a} ≠ ${b}`);
function fixture(t,reducedMotion=false){
 const scene=new THREE.Scene(),table=new THREE.Group();table.position.set(2,0,3);scene.add(table);
 const seats=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,1,.5),new THREE.MeshBasicMaterial(),2);scene.add(seats);
 seats.setMatrixAt(0,new THREE.Matrix4().makeTranslation(3,.5,3));seats.setMatrixAt(1,new THREE.Matrix4().makeTranslation(-3,.5,-2));seats.userData.pickGroups=[table];
 let time=0;const movable=[table];
 const preview=createRoomResizePreview({scene,width:10,depth:12,movable:()=>movable,now:()=>time,reducedMotion:()=>reducedMotion});
 const at=value=>{time=value;preview.tick(time);scene.updateMatrixWorld(true);};
 t.after(()=>{seats.geometry.dispose();seats.material.dispose();});
 return {scene,table,seats,preview,at,movable};
}
test('room width/depth animate through intermediate sizes while furniture keeps its physical size',t=>{
 const {scene,table,preview,at}=fixture(t);
 preview.to({width:20,depth:24});near(scene.scale.x,1);
 at(140);assert.ok(scene.scale.x>1&&scene.scale.x<2);near(table.getWorldScale(new THREE.Vector3()).x,1);
 at(280);near(scene.scale.x,2);near(scene.scale.z,2);near(table.getWorldScale(new THREE.Vector3()).z,1);
});
test('instanced chairs stay beside their table while independent guests follow the envelope',t=>{
 const {table,seats,preview,at}=fixture(t);preview.to({width:20,depth:24});at(280);
 const matrix=new THREE.Matrix4(),world=new THREE.Vector3();seats.getMatrixAt(0,matrix);world.setFromMatrixPosition(matrix).applyMatrix4(seats.matrixWorld);
 near(world.x-table.getWorldPosition(new THREE.Vector3()).x,1);near(world.z,6);
 seats.getMatrixAt(1,matrix);world.setFromMatrixPosition(matrix).applyMatrix4(seats.matrixWorld);near(world.x,-6);near(world.z,-4);
 near(seats.getWorldScale(new THREE.Vector3()).x,1);
});
test('rapid edits retarget from the current animation without jumping back or accumulating distortion',t=>{
 const {scene,preview,at}=fixture(t);preview.to({width:20,depth:24});at(140);const halfway=scene.scale.x;
 preview.to({width:30,depth:18});near(scene.scale.x,halfway);at(420);near(scene.scale.x,3);near(scene.scale.z,1.5);
 preview.to({width:10,depth:12});at(700);near(scene.scale.x,1);near(scene.scale.z,1);
});
test('reduced-motion sizing updates immediately and invalid input leaves the room unchanged',t=>{
 const {scene,preview}=fixture(t,true);preview.to({width:20,depth:24});near(scene.scale.x,2);near(scene.scale.z,2);
 for(const size of [{width:NaN,depth:12},{width:10,depth:0},{width:-10,depth:12}])preview.to(size);
 near(scene.scale.x,2);near(scene.scale.z,2);
});
test('a booth model that finishes loading mid-resize keeps its physical dimensions',t=>{
 const {scene,preview,at,movable}=fixture(t);preview.to({width:20,depth:24});at(100);
 const booth=new THREE.Group();booth.scale.setScalar(1.5);scene.add(booth);movable.push(booth);at(280);
 near(booth.getWorldScale(new THREE.Vector3()).x,1.5);near(booth.getWorldScale(new THREE.Vector3()).z,1.5);
});
