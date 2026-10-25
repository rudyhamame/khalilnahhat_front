import {useEffect,useState} from 'react';
import {EQUIPMENT_MODELS} from './equipmentModels';
export default function EquipmentWheelModel({equipmentId='es18p',name,selected}){
 const [ready,setReady]=useState(false);
 const [failed,setFailed]=useState(false);
 const [motion]=useState(()=>!matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{let alive=true;import('@google/model-viewer').then(()=>{if(alive)setReady(true);}).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;};},[]);
 const model=EQUIPMENT_MODELS[equipmentId];
 return failed?<img src={model.profile} alt=""/>:ready?<model-viewer class="setup-wheel-model" src={model.src} alt={name} auto-rotate={selected&&motion?'':undefined} auto-rotate-delay="0" rotation-per-second="20deg" exposure="1.4" camera-orbit="-28deg 72deg auto" interaction-prompt="none" loading="eager"/>:<span className="setup-wheel-model-loading">360°</span>;
}
