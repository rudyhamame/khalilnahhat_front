import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {guestSkeletonPrefix,makeGuestClipInPlace,retargetGuestClip} from './guestAnimation.js';

test('walk root travel is removed exactly and the remaining hip sway loops cleanly',()=>{
 const values=new Float32Array([2,10,-4,3,70,-2,1,130,-5,2,190,-4]);
 const track=new THREE.VectorKeyframeTrack('mixamorig:Hips.position',[0,.33,.66,1],values);
 const clip=makeGuestClipInPlace(new THREE.AnimationClip('walk',1,[track])),output=clip.tracks[0].values;
 assert.deepEqual([output[1],output[4],output[7],output[10]],[10,10,10,10]);
 assert.equal(output[0],output[9]);assert.equal(output[2],output[11]);
 assert.notEqual(output[3],output[0]);
});

test('non-walk clips are not modified',()=>{
 const values=new Float32Array([0,0,0,1,2,3]);
 const clip=new THREE.AnimationClip('dance1',1,[new THREE.VectorKeyframeTrack('mixamorig:Hips.position',[0,1],values)]);
 makeGuestClipInPlace(clip);assert.deepEqual([...clip.tracks[0].values],[...values]);
});

test('numbered Mixamo skeleton prefixes are detected and clips retarget to them',()=>{
 for(const name of ['mixamorig:Hips','mixamorig2:Hips','mixamorig12:Hips']){
  const root=new THREE.Group(),hips=new THREE.Bone();hips.name=name;root.add(hips);
  const prefix=guestSkeletonPrefix(root);assert.equal(prefix,name.split(':')[0]);
  const clip=new THREE.AnimationClip('walk',1,[new THREE.QuaternionKeyframeTrack('mixamorig:Hips.quaternion',[0,1],[0,0,0,1,0,0,0,1])]);
  assert.equal(retargetGuestClip(THREE,clip,prefix).tracks[0].name,`${prefix}:Hips.quaternion`);
 }
});
