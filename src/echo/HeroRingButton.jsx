import {useEffect,useRef,useState} from 'react';
import './heroRingButton.css';

// Neon ring: a white core circle plus thin coloured loops that tilt, swirl and periodically converge into one clean circle.
// The label sits in the middle. ponytail: tubes + CSS glow instead of a bloom pass; add UnrealBloomPass if a stronger glow is wanted.
const COLORS=[0xd9b46e,0xfff0ba,0xa6e3ce,0x6fd0b3];
export default function HeroRingButton({label,onClick}){
 const host=useRef(null),[fallback,setFallback]=useState(false);
 useEffect(()=>{
  const el=host.current;let stop=()=>{},dead=false;
  (async()=>{
   try{
    const THREE=await import('three');
    if(dead)return;
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,powerPreference:'low-power'});
    renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    el.prepend(renderer.domElement);
    const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.3,1.3,1.3,-1.3,.1,10);camera.position.z=5;
    const mat=(color,opacity)=>new THREE.MeshBasicMaterial({color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false});
    const core=new THREE.Mesh(new THREE.TorusGeometry(1,.016,16,200),mat(0xffffff,1));scene.add(core);
    const halo=new THREE.Mesh(new THREE.TorusGeometry(1,.035,16,200),mat(0xe9dcb0,.16));scene.add(halo);
    const loops=Array.from({length:14},(_,i)=>{
     const pivot=new THREE.Group(),ring=new THREE.Mesh(new THREE.TorusGeometry(1,.011,8,160),mat(COLORS[i%COLORS.length],.85));
     pivot.add(ring);scene.add(pivot);return {pivot,ring,phase:i*.9,speed:.35+(i%5)*.07,tilt:.55+(i%4)*.18};
    });
    const size=()=>{const w=el.clientWidth||160;renderer.setSize(w,w,false);renderer.domElement.style.cssText='width:100%;height:100%';};size();
    const ro=new ResizeObserver(size);ro.observe(el);
    let hover=0,target=0;const over=()=>{target=1;},out=()=>{target=0;};
    el.addEventListener('pointerenter',over);el.addEventListener('pointerleave',out);el.addEventListener('focus',over);el.addEventListener('blur',out);
    const still=matchMedia('(prefers-reduced-motion:reduce)').matches;let raf=0,t0=performance.now();
    const frame=now=>{
     const t=(now-t0)/1000;hover+=(target-hover)*.07;
     // converge: 0 = loops collapse onto the core ring, 1 = fully spread (hover spreads them wider and faster).
     const spread=(.5+.5*Math.sin(t*.55))*(.75+.55*hover);
     loops.forEach(({pivot,ring,phase,speed,tilt})=>{
      pivot.rotation.z=phase+t*speed*(1+hover*1.2);
      ring.rotation.x=Math.sin(t*speed*1.3+phase)*tilt*spread+.04;
      ring.rotation.y=Math.cos(t*speed+phase)*.35*spread;
     });
     const pulse=1+Math.sin(t*2)*.02+hover*.03;core.scale.setScalar(pulse);halo.scale.setScalar(pulse);
     renderer.render(scene,camera);
     if(!still)raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    stop=()=>{cancelAnimationFrame(raf);ro.disconnect();['pointerenter','pointerleave','focus','blur'].forEach((n,i)=>el.removeEventListener(n,i%2?out:over));
     scene.traverse(o=>{o.geometry?.dispose();o.material?.dispose?.();});renderer.dispose();renderer.domElement.remove();};
   }catch{if(!dead)setFallback(true);}
  })();
  return()=>{dead=true;stop();};
 },[]);
 return <button type="button" ref={host} className={`hero-ring-cta${fallback?' is-fallback':''}`} onClick={onClick} aria-label={label}><span className="hero-ring-label" aria-hidden="true">{label}</span></button>;
}
