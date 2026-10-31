import GeneratedModelViewer from '../components/GeneratedModelViewer';
import {EQUIPMENT_MODELS} from './equipmentModels';
import './equipmentExperience.css';

// Selected experience for one piece of equipment: the 3D object plus what the owner wrote for it in the dashboard
// (description, what it does, and why it suits the event the client picked).
export default function EquipmentExperience({item,event,eventType,ar=false}){
  const tr=(en,arabic)=>ar?arabic:en;
  const src=item.modelUrl||EQUIPMENT_MODELS[item.id]?.src||'';
  const fit=(item.eventFit&&eventType&&item.eventFit[eventType])||'';
  const hasAnyFit=Object.values(item.eventFit||{}).some(Boolean);
  const eventName=event?tr(event.name,event.nameAr||event.name):String(eventType||'').replace(/^./,c=>c.toUpperCase());
  return <div className="setup-experience" key={item.id}>
    <div className="setup-experience-3d">
      {src?<GeneratedModelViewer src={src} name={item.name} ar={ar}/>:item.imageUrl?<img src={item.imageUrl} alt={item.name}/>:<span>{item.name}</span>}
    </div>
    <div className="setup-experience-info">
      <span className="setup-stage-kicker">{tr('IN YOUR SETUP','ضمن تجهيزاتك')}</span>
      <h3>{item.name}</h3>
      {item.brandModel&&<small>{item.brandModel}</small>}
      {item.description&&<p>{item.description}</p>}
      {item.functionSummary&&<section><h4>{tr('What it does','ماذا يفعل')}</h4><p>{item.functionSummary}</p></section>}
      {fit?<section className="is-fit"><h4>{tr(`Why it fits: ${eventName}`,`لماذا يناسب: ${eventName}`)}</h4><p>{fit}</p></section>
        :hasAnyFit&&<section className="is-hint"><p>{eventType?tr(`Ask Echo how this works for your ${eventName.toLowerCase()}.`,'اسأل إيكو كيف يناسب هذا فعاليتك.'):tr('Pick an event type to see why this fits it.','اختر نوع الفعالية لترى لماذا يناسبها.')}</p></section>}
    </div>
  </div>;
}
