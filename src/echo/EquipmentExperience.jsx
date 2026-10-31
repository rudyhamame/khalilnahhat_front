import GeneratedModelViewer from '../components/GeneratedModelViewer';
import {resolveEquipmentModel} from './equipmentModels';
import './equipmentExperience.css';

// Selected experience for one piece of equipment: the 3D object plus what the owner wrote for it in the dashboard
// (description, what it does, and why it suits the event the client picked).
export default function EquipmentExperience({item,event,eventType,ar=false}){
  const tr=(en,arabic)=>ar?arabic:en;
  const model=resolveEquipmentModel(item),src=item.modelUrl||model?.src||'';
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
      {(item.brandModel||model?.brand)&&<small>{item.brandModel||`${model.brand} · ${model.model}`}</small>}
      {model?.subtitle&&<p>{model.subtitle[ar?1:0]}</p>}
      {item.description&&<p>{item.description}</p>}
      {model?.specs?.length>0&&<section className="setup-experience-specs" aria-label={tr('Equipment specifications','مواصفات المعدات')}>{model.specs.map(spec=><div key={spec.key}><h4>{spec.label[ar?1:0]}</h4><strong>{ar&&spec.arabicValue?spec.arabicValue:spec.value}</strong><p>{spec.detail[ar?1:0]}</p></div>)}</section>}
      {item.functionSummary&&<section><h4>{tr('What it does','ماذا يفعل')}</h4><p>{item.functionSummary}</p></section>}
      {fit?<section className="is-fit"><h4>{tr(`Why it fits: ${eventName}`,`لماذا يناسب: ${eventName}`)}</h4><p>{fit}</p></section>
        :hasAnyFit&&<section className="is-hint"><p>{eventType?tr(`Ask Echo how this works for your ${eventName.toLowerCase()}.`,'اسأل إيكو كيف يناسب هذا فعاليتك.'):tr('Pick an event type to see why this fits it.','اختر نوع الفعالية لترى لماذا يناسبها.')}</p></section>}
    </div>
  </div>;
}
