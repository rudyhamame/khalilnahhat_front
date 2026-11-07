// Author the editable catalogue's microphone and lectern scene as a GLB asset.
import * as THREE from 'three';
import {GLTFExporter} from 'three/examples/jsm/exporters/GLTFExporter.js';
import {writeFile} from 'node:fs/promises';
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}};
const scene=new THREE.Scene();
const black=new THREE.MeshStandardMaterial({color:0x171c1b,metalness:.65,roughness:.35});
const metal=new THREE.MeshStandardMaterial({color:0x777e78,metalness:.9,roughness:.25});
const gold=new THREE.MeshStandardMaterial({color:0x9a8962,metalness:.8,roughness:.3});
const glass=new THREE.MeshPhysicalMaterial({color:0x6d9388,metalness:0,roughness:.15,transparent:true,opacity:.3,transmission:.65,thickness:.012,side:THREE.DoubleSide});
function mesh(name,geometry,material,position,rotation){const m=new THREE.Mesh(geometry,material);m.name=name;m.position.set(...position);if(rotation)m.rotation.set(...rotation);scene.add(m);return m;}
function box(name,size,material,position,rotation){return mesh(name,new THREE.BoxGeometry(...size),material,position,rotation);}
function cylinder(name,top,bottom,height,material,position){return mesh(name,new THREE.CylinderGeometry(top,bottom,height,48),material,position);}
const x=-.45;
cylinder('Microphone stand weighted base',.17,.18,.025,black,[x,.0125,0]);
cylinder('Microphone stand lower pole',.012,.012,.7,black,[x,.375,0]);
cylinder('Microphone stand telescopic pole',.007,.007,.42,metal,[x,.91,0]);
cylinder('Stand adjustment collar',.022,.022,.065,black,[x,.71,0]);
box('Microphone clip',[.045,.065,.05],black,[x,1.13,0]);
cylinder('Wireless microphone body',.025,.019,.22,black,[x,1.25,0]);
cylinder('Microphone grille collar',.032,.032,.018,gold,[x,1.367,0]);
mesh('Microphone mesh grille',new THREE.SphereGeometry(.043,32,24),black,[x,1.41,0]);
for(let i=-5;i<=5;i++){const y=i*.0065,r=Math.sqrt(.043**2-y**2);mesh('Grille horizontal wire',new THREE.TorusGeometry(r,.00065,4,48),metal,[x,1.41+y,0],[Math.PI/2,0,0]);}
for(let i=0;i<12;i++)mesh('Grille vertical wire',new THREE.TorusGeometry(.043,.00065,4,48),metal,[x,1.41,0],[0,i*Math.PI/12,0]);
mesh('Microphone status LED',new THREE.SphereGeometry(.002,8,8),new THREE.MeshStandardMaterial({color:0x83dca9,emissive:0x3b7755}),[x,1.29,.023]);
const px=.28;
box('Lectern weighted base',[.52,.035,.36],black,[px,.0175,0]);
box('Lectern base trim',[.53,.009,.37],gold,[px,.037,0]);
for(const dx of [-.2,.2])cylinder('Lectern brushed metal support',.012,.012,1.01,metal,[px+dx,.55,.06]);
box('Smoked glass lectern front',[.4,.94,.012],glass,[px,.53,-.01]);
box('Angled lectern reading surface',[.62,.022,.43],glass,[px,1.10,0],[.20,0,0]);
box('Reading surface lower lip',[.62,.025,.018],gold,[px,1.065,.21],[.20,0,0]);
for(const dx of [-.2,.2])cylinder('Lectern glass mounting cap',.022,.022,.015,gold,[px+dx,1.075,.06]);
scene.updateMatrixWorld(true);
const glb=await new GLTFExporter().parseAsync(scene,{binary:true});
await writeFile(new URL('../public/echo/mc-hosting/mc-hosting-scene-v1.glb',import.meta.url),Buffer.from(glb));
console.log('Created MC hosting scene GLB',glb.byteLength,'bytes');
