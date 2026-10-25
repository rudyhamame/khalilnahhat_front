import {useEffect,useState} from 'react';
export default function EquipmentWheelModel({name,selected}){
 const [ready,setReady]=useState(false);
 const [motion]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{let alive=true;import('@google/model-viewer').then(()=>{if(alive)setReady(true);});return()=>{alive=false;};},[]);
 return ready?<model-viewer class="setup-wheel-model" src="/echo/models/es18p-subwoofer.glb?v=black-2" alt={name} auto-rotate={selected&&motion?'':undefined} auto-rotate-delay="0" rotation-per-second="20deg" exposure="1.4" camera-orbit="-28deg 72deg auto" interaction-prompt="none" loading="eager"/>:<span className="setup-wheel-model-loading">360°</span>;
}
