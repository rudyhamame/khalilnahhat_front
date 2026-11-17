import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from 'three';
import {configureDjKhalilPerformer} from './djKhalilPerformer.js';

test('Khalil appears only when DJ service and Party mode are both active',()=>{
 const texture=new THREE.Texture(),setup=configureDjKhalilPerformer(THREE,texture,{depth:20});
 assert.equal(setup.performer.visible,false);
 setup.setDjAdded(true);assert.equal(setup.performer.visible,false);
 setup.setParty(true);assert.equal(setup.performer.visible,true);
 setup.setDjAdded(false);assert.equal(setup.performer.visible,false);
 setup.performer.geometry.dispose();setup.performer.material.dispose();texture.dispose();
});

test('performer stands behind the booth and uses restrained looped movement',()=>{
 const texture=new THREE.Texture(),setup=configureDjKhalilPerformer(THREE,texture,{depth:20});
 setup.setDjAdded(true);setup.setParty(true);
 const start=setup.performer.position.clone(),camera=new THREE.PerspectiveCamera();camera.position.set(8,4,0);
 setup.animate(1.25,camera);
 assert.ok(Math.abs(setup.performer.position.x-start.x)<=.0181);
 assert.ok(Math.abs(setup.performer.position.y-start.y)<=.0091);
 assert.equal(setup.performer.position.z,-8.54);
 assert.ok(Math.abs(setup.performer.rotation.z)<=.0061);
 assert.notEqual(setup.performer.rotation.y,0);
 assert.equal(setup.performer.material.depthTest,true);
 assert.equal(setup.performer.material.depthWrite,false);
 setup.performer.geometry.dispose();setup.performer.material.dispose();texture.dispose();
});

test('the shipped performer asset is an embedded-alpha PNG',async()=>{
 const bytes=await readFile(new URL('../../public/echo/models/dj-khalil-party.png',import.meta.url));
 assert.equal(bytes.subarray(1,4).toString(),'PNG');
 assert.equal(bytes.readUInt32BE(16),1024);assert.equal(bytes.readUInt32BE(20),1536);
 assert.equal(bytes[25],6);
});
