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

const lectern=new THREE.Scene();
for(const object of [...scene.children])if(/lectern|reading surface/i.test(object.name))lectern.add(object.clone());
lectern.updateMatrixWorld(true);
const lecternGlb=await new GLTFExporter().parseAsync(lectern,{binary:true});
await writeFile(new URL('../public/echo/mc-hosting/lectern-v1.glb',import.meta.url),Buffer.from(lecternGlb));
console.log('Created lectern GLB',lecternGlb.byteLength,'bytes');

const microphone=new THREE.Scene();
for(const object of scene.children)if(!/lectern|reading surface/i.test(object.name))microphone.add(object.clone());
microphone.updateMatrixWorld(true);
const micGlb=await new GLTFExporter().parseAsync(microphone,{binary:true});
await writeFile(new URL('../public/echo/mc-hosting/microphone-v1.glb',import.meta.url),Buffer.from(micGlb));
console.log('Created microphone GLB',micGlb.byteLength,'bytes');

// A deliberately stylized human MC, independent from the rentable microphone.
const host=new THREE.Scene();
const suit=new THREE.MeshStandardMaterial({color:0x283730,roughness:.9});
const skin=new THREE.MeshStandardMaterial({color:0xc58c68,roughness:.9});
const hair=new THREE.MeshStandardMaterial({color:0x2b211c,roughness:1});
const shirt=new THREE.MeshStandardMaterial({color:0xeee5cf,roughness:1});
function hostMesh(name,geometry,mat,at,scale=[1,1,1],rotation=[0,0,0]){const m=new THREE.Mesh(geometry,mat);m.name=name;m.position.set(...at);m.scale.set(...scale);m.rotation.set(...rotation);host.add(m);return m;}
function oval(name,mat,at,scale){return hostMesh(name,new THREE.SphereGeometry(1,24,16),mat,at,scale);}
function limb(name,a,b,r,mat){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),v=bv.clone().sub(av);const m=hostMesh(name,new THREE.CapsuleGeometry(r,Math.max(.001,v.length()-r*2),8,16),mat,av.clone().add(bv).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
for(const x of [-.105,.105]){limb('Trouser leg',[x,.12,0],[x,.75,0],.075,suit);oval('Dress shoe',black,[x,.065,.055],[.085,.06,.15]);}
oval('Jacket',suit,[0,.99,0],[.245,.35,.135]);
hostMesh('Shirt front',new THREE.BoxGeometry(.13,.4,.02),shirt,[0,1.12,.125]);
for(const x of [-.12,.12])hostMesh('Suit lapel',new THREE.BoxGeometry(.075,.30,.025),suit,[x,1.15,.14],[1,1,1],[0,0,x<0?-.3:.3]);
limb('Neck',[0,1.26,0],[0,1.4,0],.06,skin);
oval('Cartoon head',skin,[0,1.57,0],[.175,.205,.15]);
oval('Stylized hair',hair,[0,1.70,-.02],[.183,.105,.153]);
for(const x of [-.065,.065]){oval('Eye',black,[x,1.60,.138],[.018,.026,.009]);hostMesh('Eyebrow',new THREE.BoxGeometry(.052,.012,.012),hair,[x,1.648,.139]);}
oval('Nose',skin,[0,1.553,.157],[.023,.028,.022]);
hostMesh('Smile',new THREE.TorusGeometry(.038,.004,4,20,Math.PI),black,[0,1.51,.139],[1,1,1],[0,0,Math.PI]);
for(const x of [-.045,.045])hostMesh('Bow tie',new THREE.ConeGeometry(.05,.065,3),gold,[x,1.32,.14],[1,1,.4],[0,0,x<0?Math.PI/2:-Math.PI/2]);
limb('Microphone arm',[.2,1.18,0],[.32,1.02,.06],.065,suit);limb('Microphone forearm',[.32,1.02,.06],[.26,1.30,.19],.058,suit);oval('Microphone hand',skin,[.26,1.32,.19],[.06,.065,.055]);
limb('Handheld microphone',[.26,1.30,.22],[.26,1.53,.22],.022,black);oval('Handheld grille',metal,[.26,1.54,.22],[.033,.04,.033]);
limb('Cue card arm',[-.2,1.18,0],[-.32,.99,.03],.065,suit);limb('Cue card forearm',[-.32,.99,.03],[-.45,1.10,.12],.055,suit);oval('Cue card hand',skin,[-.46,1.11,.13],[.06,.05,.055]);
hostMesh('Cue card',new THREE.BoxGeometry(.2,.14,.012),shirt,[-.48,1.20,.15],[1,1,1],[0,0,-.15]);
for(const y of [.93,1.01])oval('Jacket button',gold,[.03,y,.135],[.012,.012,.006]);
host.updateMatrixWorld(true);
const hostGlb=await new GLTFExporter().parseAsync(host,{binary:true});
await writeFile(new URL('../public/echo/mc-hosting/mc-host-v1.glb',import.meta.url),Buffer.from(hostGlb));
console.log('Created stylized MC host GLB',hostGlb.byteLength,'bytes');
