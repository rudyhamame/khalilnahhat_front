import {useEffect,useState} from 'react';
import {EQUIPMENT_MODELS} from './equipmentModels';
export default function EquipmentWheelModel({equipmentId='es18p',name}){
 const [ready,setReady]=useState(false);
 const [failed,setFailed]=useState(false);
 useEffect(()=>{let alive=true;import('@google/model-viewer').then(()=>{if(alive)setReady(true);}).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;};},[]);
 const model=EQUIPMENT_MODELS[equipmentId];
 return failed?<img src={model.profile} alt=""/>:ready?<model-viewer class="setup-wheel-model" src={model.src} alt={name} exposure="2.2" camera-orbit="-28deg 72deg auto" interaction-prompt="none" loading="eager"/>:<span className="setup-wheel-model-loading">360°</span>;
}
