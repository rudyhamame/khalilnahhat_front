import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {configureDjBooth} from './djBoothSetup.js';

async function fixture(t,djAdded){
 const bytes=await readFile(new URL('../../public/echo/models/dj-booth.glb',import.meta.url));
 const {scene}=await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const setup=configureDjBooth(THREE,scene,{djAdded});
 t.after(()=>{const resources=new Set();scene.traverse(node=>{if(node.geometry)resources.add(node.geometry);for(const material of Array.isArray(node.material)?node.material:[node.material])if(material)resources.add(material);});for(const resource of resources)resource.dispose();});
 return {scene,...setup};
}
const visibleMeshes=root=>{const meshes=[];root.traverseVisible(node=>{if(node.isMesh)meshes.push(node);});return meshes;};
test('without DJ service the real booth model shows its support table and no controller or laptop',async t=>{
 const {scene,rig}=await fixture(t,false);
 assert.equal(rig.visible,false);assert.deepEqual(visibleMeshes(scene).map(mesh=>mesh.name),['Booth_table']);
 assert.equal(scene.getObjectByName('Booth_table').visible,true);
});
test('adding/removing DJ service toggles controller and laptop together without replacing the table or duplicating parts',async t=>{
 const {scene,rig,laptop,setDjAdded}=await fixture(t,false),table=scene.getObjectByName('Booth_table'),count=rig.children.length;
 table.position.x=.5;
 setDjAdded(true);assert.ok(visibleMeshes(scene).some(mesh=>mesh.name==='Left_deck'));assert.ok(visibleMeshes(laptop).some(mesh=>mesh.name==='Laptop screen'));
 setDjAdded(false);assert.deepEqual(visibleMeshes(scene).map(mesh=>mesh.name),['Booth_table']);
 setDjAdded(true);assert.equal(rig.children.length,count);assert.equal(table.position.x,.5);assert.equal(scene.getObjectByName('Booth_table'),table);
});
test('the laptop sits on the actual table beside the controller with an open display',async t=>{
 const {scene,rig,laptop}=await fixture(t,true);
 const tableBounds=new THREE.Box3().setFromObject(scene.getObjectByName('Booth_table'));
 const laptopBounds=new THREE.Box3().setFromObject(laptop),controllerBounds=new THREE.Box3();
 for(const child of rig.children)if(child!==laptop)controllerBounds.union(new THREE.Box3().setFromObject(child));
 assert.ok(laptopBounds.min.x>controllerBounds.max.x+.1);
 assert.ok(laptopBounds.max.x<tableBounds.max.x);
 assert.ok(Math.abs(laptopBounds.min.y-tableBounds.max.y)<.001);
 assert.ok(laptopBounds.min.z>=tableBounds.min.z&&laptopBounds.max.z<=tableBounds.max.z);
 assert.ok(laptop.getObjectByName('Open laptop lid').rotation.x<0);
 assert.ok(laptop.getObjectByName('Laptop screen').material.emissiveIntensity>0);
});
