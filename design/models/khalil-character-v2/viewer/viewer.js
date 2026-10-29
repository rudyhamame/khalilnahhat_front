import * as THREE from 'three';
import {GLTFLoader} from 'three/examples/jsm/loaders/GLTFLoader.js';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
const canvas=document.getElementById('c'),msg=document.getElementById('msg');
const still=new URLSearchParams(location.search).has('still'); // headless/software GL: one frame, no shadows
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,preserveDrawingBuffer:true}); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.05; renderer.shadowMap.enabled=!still; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
const scene=new THREE.Scene(); scene.background=new THREE.Color(0x10161a);
const cam=new THREE.PerspectiveCamera(24,1,.05,20);
const controls=new OrbitControls(cam,canvas); controls.enableDamping=true; controls.minDistance=.25; controls.maxDistance=2.2; controls.autoRotateSpeed=1.2;
scene.add(new THREE.HemisphereLight(0xdfe9ff,0x2a2018,.55));
const key=new THREE.DirectionalLight(0xfff1e0,2.4); key.position.set(1.2,1.9,1.8); key.castShadow=!still; key.shadow.mapSize.set(2048,2048); key.shadow.bias=-.0004; scene.add(key);
const fill=new THREE.DirectionalLight(0xb8d2ff,.7); fill.position.set(-1.6,1.4,1.0); scene.add(fill);
const rim=new THREE.DirectionalLight(0xffffff,1.3); rim.position.set(-.4,1.9,-1.8); scene.add(rim);
let hair,beard,center=new THREE.Vector3(0,1.55,0);
const views={front:[0,0,1],three:[.62,.08,.78],side:[-1,0,0],back:[0,.05,-1]};
function setView(name,dist=.95){const v=new THREE.Vector3(...views[name]).normalize().multiplyScalar(dist);cam.position.copy(center).add(v);controls.target.copy(center);controls.update();}
new GLTFLoader().load('../out/khalil-full-v2.glb',gltf=>{
  const root=gltf.scene; scene.add(root);
  root.traverse(o=>{ if(!o.isMesh) return; o.castShadow=true; o.receiveShadow=true;
    const n=o.name.toLowerCase(); if(n.includes('hair')) hair=o; else if(n.includes('beard')) beard=o;
    else {o.material.roughness=.58; o.material.metalness=0; o.material.envMapIntensity=.4;}
    if(n.includes('hair')||n.includes('beard')){o.material.roughness=.5;o.material.vertexColors=true;o.material.side=THREE.DoubleSide;o.receiveShadow=true;}
  });
  const box=new THREE.Box3().setFromObject(hair||root); center.set(0,box.max.y-.085,0);
  const face=new THREE.Box3().setFromObject(root); msg.textContent='Drag to orbit · scroll to zoom · fitted MPFB head + strand hair & beard (local preview)';
  setView(new URLSearchParams(location.search).get('view')||'three'); if(still) window.renderOnce();
},undefined,e=>{msg.textContent='Could not load model: '+e;});
function size(){const w=innerWidth,h=innerHeight;renderer.setSize(w,h,false);cam.aspect=w/h;cam.updateProjectionMatrix();}
addEventListener('resize',size); size();
document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
const tog=(id,get)=>{const b=document.getElementById(id);b.onclick=()=>{const on=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',on);const o=get();if(o)o.visible=on;};};
tog('hair',()=>hair);tog('beard',()=>beard);
document.getElementById('spin').onclick=e=>{const on=e.currentTarget.getAttribute('aria-pressed')!=='true';e.currentTarget.setAttribute('aria-pressed',on);controls.autoRotate=on;};
if(still){window.renderOnce=()=>{controls.update();renderer.render(scene,cam);};}
else(function loop(){controls.update();renderer.render(scene,cam);requestAnimationFrame(loop);})();
