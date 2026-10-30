import {useEffect,useState} from 'react';
import {EQUIPMENT_MODELS} from './equipmentModels';
export default function EquipmentWheelModel({equipmentId='es18p',name,modelUrl}){
 const [ready,setReady]=useState(false);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true;import('@google/model-viewer').then(()=>{if(alive)setReady(true);}).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;};},[]);
 const model=EQUIPMENT_MODELS[equipmentId]||{};
 return failed?(model.profile?<img src={model.profile} alt=""/>:<span>3D</span>):ready?<model-viewer class="setup-wheel-model" src={modelUrl||model.src} alt={name} exposure="2.8" environment-image="neutral" camera-orbit={model.thumbnailOrbit||'-28deg 72deg 105%'} interaction-prompt="none" loading="eager"/>:<span className="setup-wheel-model-loading">360°</span>;
}
