import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {moveFurnitureInstances} from './roomFurnitureTransforms.js';

const location=(mesh,index)=>{const matrix=new THREE.Matrix4();mesh.getMatrixAt(index,matrix);return new THREE.Vector3().setFromMatrixPosition(matrix).toArray().map(n=>Math.round(n*1e5)/1e5);};
test('moving a table carries its chairs and guests without moving another table, and refreshes picking bounds',()=>{
 const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(.5,1,.5),new THREE.MeshBasicMaterial(),3);
 [[2,.5,3],[3,.5,3],[-2,.5,-3]].forEach((p,i)=>mesh.setMatrixAt(i,new THREE.Matrix4().makeTranslation(...p)));
 mesh.computeBoundingSphere();
 const table=new THREE.Group();table.position.set(2,0,3);table.userData.instances=[{mesh,index:0},{mesh,index:1}];
 const start=table.position.clone(),rotation=table.rotation.clone(),scale=table.scale.clone();
 table.position.set(7,0,1);moveFurnitureInstances(THREE,table,start,rotation,scale);
 assert.deepEqual(location(mesh,0),[7,.5,1]);assert.deepEqual(location(mesh,1),[8,.5,1]);assert.deepEqual(location(mesh,2),[-2,.5,-3]);
 assert.ok(mesh.boundingBox.max.x>=8.25);
 const ray=new THREE.Raycaster(new THREE.Vector3(8,5,1),new THREE.Vector3(0,-1,0));
 assert.ok(ray.intersectObject(mesh).some(hit=>hit.instanceId===1));
 mesh.geometry.dispose();mesh.material.dispose();
});
test('table rotation keeps attached instances relative to its centre across repeated moves',()=>{
 const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshBasicMaterial(),1);
 mesh.setMatrixAt(0,new THREE.Matrix4().makeTranslation(3,.5,3));
 const table=new THREE.Group();table.position.set(2,0,3);table.userData.instances=[{mesh,index:0}];
 let p=table.position.clone(),r=table.rotation.clone(),s=table.scale.clone();table.rotation.y=Math.PI/2;
 moveFurnitureInstances(THREE,table,p,r,s);assert.deepEqual(location(mesh,0),[2,.5,2]);
 p=table.position.clone();r=table.rotation.clone();s=table.scale.clone();table.position.z+=2;
 moveFurnitureInstances(THREE,table,p,r,s);assert.deepEqual(location(mesh,0),[2,.5,4]);
 mesh.geometry.dispose();mesh.material.dispose();
});
