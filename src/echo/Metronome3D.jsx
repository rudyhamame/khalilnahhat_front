import {useEffect,useRef} from 'react';
import {metronomeAngle,metronomeTick,weightHeight} from '../lib/metronome';
import './metronome3d.css';
// A small 3D metronome (three.js, loaded on demand) for the Tempo card. It follows the recording's own audio element: while the music plays, the arm
// swings with the atom's tempo, locked to the audio clock, and the weight flashes on each beat. Paused: the arm settles upright.
export default function Metronome3D({bpm=null,range=null}){
 const host=useRef(null),live=useRef({bpm,start:range?.startSec||0});
 live.current={bpm,start:range?.startSec||0};
 useEffect(()=>{
  let disposed=false,stop=()=>{};
  import('three').then(THREE=>{
   const el=host.current;if(disposed||!el)return;
   let renderer;try{renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});}catch{return;}// no WebGL: the card simply shows no metronome
   renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));el.appendChild(renderer.domElement);
   const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(30,1,.1,50);camera.position.set(0,1.75,6.6);camera.lookAt(0,1.45,0);
   scene.add(new THREE.AmbientLight(0xffffff,.8));
   const key=new THREE.DirectionalLight(0xffffff,2.4);key.position.set(3,5,4);scene.add(key);
   const rim=new THREE.DirectionalLight(0xa3a8c6,1.4);rim.position.set(-4,2,-3);scene.add(rim);
   const mat=(color,roughness=.65,metalness=.08)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
   const group=new THREE.Group();scene.add(group);
   // Body: a tapered four-sided pyramid on a base plate, in the editor's slate and charcoal.
   const bodyGeometry=new THREE.CylinderGeometry(.46,1.02,2.7,4,1);bodyGeometry.rotateY(Math.PI/4);
   const body=new THREE.Mesh(bodyGeometry,mat(0x2a2a32,.72,.05));body.scale.z=.62;body.position.y=1.5;group.add(body);
   const face=new THREE.Mesh(new THREE.BoxGeometry(.16,1.9,.04),mat(0x0e0e12,.9,0));face.position.set(0,1.75,.4);group.add(face);// the dark slot the arm swings in front of
   const base=new THREE.Mesh(new THREE.BoxGeometry(2.5,.16,1.4),mat(0x17171c,.6,.1));base.position.y=.08;group.add(base);
   const cap=new THREE.Mesh(new THREE.BoxGeometry(.62,.1,.34),mat(0x4b4f5c,.5,.2));cap.position.y=2.87;group.add(cap);
   // Pendulum: a pivot at the bottom of the slot, a pale rod, a counterweight below and the sliding brass weight.
   const pivot=new THREE.Group();pivot.position.set(0,.62,.46);group.add(pivot);
   const rod=new THREE.Mesh(new THREE.BoxGeometry(.05,2.6,.05),mat(0xc9cde4,.35,.55));rod.position.y=1.3-.25;pivot.add(rod);
   const counter=new THREE.Mesh(new THREE.CylinderGeometry(.13,.13,.12,20),mat(0x7a7f9a,.4,.5));counter.rotation.x=Math.PI/2;counter.position.y=-.22;pivot.add(counter);
   const weightMaterial=new THREE.MeshStandardMaterial({color:0x8d8070,roughness:.4,metalness:.6,emissive:0xffb86b,emissiveIntensity:0});
   const weight=new THREE.Mesh(new THREE.BoxGeometry(.36,.26,.14),weightMaterial);pivot.add(weight);
   // Fit the canvas to its box.
   const fit=()=>{const width=el.clientWidth||180,height=el.clientHeight||200;renderer.setSize(width,height);camera.aspect=width/height;camera.updateProjectionMatrix();};
   fit();const resize=new ResizeObserver(fit);resize.observe(el);
   let visible=true;const seen=new IntersectionObserver(entries=>{visible=entries[0]?.isIntersecting!==false;});seen.observe(el);
   let angle=0,frame=0;
   const loop=()=>{
    frame=requestAnimationFrame(loop);
    if(!visible||document.hidden)return;
    const {bpm:tempo,start}=live.current,audio=document.querySelector('.transcription-audio-tape audio');
    const playing=Boolean(audio&&!audio.paused&&Number.isFinite(audio.currentTime)&&tempo>0);
    angle=playing?metronomeAngle(audio.currentTime,start,tempo):angle*.88;// follow the audio clock, or settle
    pivot.rotation.z=angle;
    weight.position.y=weightHeight(tempo);weight.visible=Boolean(tempo);
    weightMaterial.emissiveIntensity=playing?metronomeTick(audio.currentTime,start,tempo)*1.4:0;
    // Coronal (front-on) view: fixed facing the viewer, so the arm swings in the plane of the screen.
    renderer.render(scene,camera);
   };
   frame=requestAnimationFrame(loop);
   stop=()=>{cancelAnimationFrame(frame);resize.disconnect();seen.disconnect();scene.traverse(object=>{object.geometry?.dispose?.();const material=object.material;(Array.isArray(material)?material:material?[material]:[]).forEach(item=>item.dispose());});renderer.dispose();renderer.domElement.remove();};
   if(disposed)stop();
  });
  return()=>{disposed=true;stop();};
 },[]);
 return <div className="metronome-3d" ref={host} role="img" aria-label={bpm?`3D metronome at ${bpm} BPM`:'3D metronome'}/>;
}
