import GeneratedModelViewer from '../components/GeneratedModelViewer';
import setupDefaults from '../lib/contracts/setup-catalog.json';
import {useViewportPhase} from './useViewportPhase';
import {fitViewport} from './fitViewport';
import EquipmentModelPreview from './EquipmentModelPreview';
import EquipmentAvailability from './EquipmentAvailability';
import EquipmentWheelModel from './EquipmentWheelModel';
import {EQUIPMENT_MODELS} from './equipmentModels';
import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import {useCart} from './cart';
import {useEventOrder} from './eventOrderContext';
import {fields} from '../lib/eventOrderCore.mjs';
import EquipmentQuantityPicker,{AddToBookingButton} from './EquipmentQuantityPicker';
import './setupSimulation.css';
class SimulationBoundary extends Component {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(error){console.error('Setup simulation failed:',error);}
  render(){
    if(!this.state.failed)return this.props.children;
    const ar=this.props.ar;
    return <div className="simulation-loading" role="alert"><p>{ar?'تعذر فتح المحاكاة. يمكنك إعادة المحاولة أو العودة إلى الخدمات.':'The simulation could not open. Retry or return to services.'}</p><button type="button" onClick={()=>this.setState({failed:false})}>{ar?'إعادة المحاولة':'Retry simulation'}</button></div>;
  }
}
const SetupSimulation=lazy(()=>import('./SetupSimulation'));
import { Disc3, AudioLines, Sparkles, Monitor, WandSparkles, Building2, Play, Box, ArrowLeft, Heart, Gem, Cake, Briefcase, PartyPopper, GraduationCap, CalendarHeart } from 'lucide-react';
import { fetchEquipment, apiRequest } from '../lib/api';
import './serviceVinyl.css';
import './setupShowcase.css';
import './setupReadability.css';
import './setupEquipmentColumn.css';

const EVENT_ICONS={wedding:Heart,engagement:Gem,birthday:Cake,corporate:Briefcase,party:PartyPopper,graduation:GraduationCap,other:CalendarHeart};
const icons = [Disc3, AudioLines, Sparkles, Monitor, WandSparkles, Building2];
const bookingServices=fields.find(field=>field.key==='services').options;
// DJ Khalil with his mixer and laptop is shown as the one DJ Services item (catalog id 'dj-service').
const DJ_RIG = {'dj-service':{name:'DJ Khalil · Mixer & Laptop',brandModel:'DJ Khalil Nahhat',imageUrl:'/echo/dj-khalil-studio-tall-3d.webp'}};
export default function ServiceVinyl({lang}) {
  const ar=lang.lang==='ar', tr=(en,arabic)=>ar?arabic:en;
  const cart=useCart(),order=useEventOrder();
  const [simulation,setSimulation]=useState(false),[visited,setVisited]=useState(false),[flat,setFlat]=useState(false),[resetting,setResetting]=useState(false);
  // Chrome will not wheel-scroll inside a 3D-flipped face, so drop the 3D transform once the flip has settled.
  useEffect(()=>{if(!simulation)return undefined;const timer=setTimeout(()=>setFlat(true),900);return()=>clearTimeout(timer);},[simulation]);
  // Stage-curtain entrance and outro in both scroll directions: 'in', or 'above'/'below' = which edge it last left through.
  const flipRef=useRef(null);
  const phase=useViewportPhase(flipRef);
  const toggleSimulation=()=>{setVisited(true);if(simulation&&flat){setResetting(true);setFlat(false);requestAnimationFrame(()=>requestAnimationFrame(()=>{setResetting(false);setSimulation(false);}));}else{setFlat(false);setSimulation(value=>!value);}};
  const changeQuantity=(item,quantity)=>order?.setEquipment(item,quantity);
  const [selectedServiceId,setSelected]=useState('dj');
  const [catalog,setCatalog]=useState(setupDefaults),[selectedEventId,setSelectedEvent]=useState('');
  const services=useMemo(()=>catalog.filter(item=>item.kind==='service'&&item.isActive),[catalog]),events=catalog.filter(item=>item.kind==='event'&&item.isActive);
  const selected=services.findIndex(item=>item.id===selectedServiceId),service=services[selected];
  // Undefined requests the first available item; null explicitly shows the cover.
  const [equipmentSelection,setPreviewEquipment]=useState(null);
  const [items,setItems]=useState([]);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{
    let alive=true;
    const refresh=()=>Promise.allSettled([fetchEquipment(),apiRequest('/setup-catalog')]).then(([equipment,catalog])=>{
      if(!alive)return;
      if(equipment.status==='fulfilled'){setItems(equipment.value.items||[]);setFailed(false);}else setFailed(true);
      if(catalog.status==='fulfilled'&&Array.isArray(catalog.value.items))setCatalog(catalog.value.items);
    });
    refresh();window.addEventListener('focus',refresh);window.addEventListener('echo:setup-catalog-changed',refresh);
    return()=>{alive=false;window.removeEventListener('focus',refresh);window.removeEventListener('echo:setup-catalog-changed',refresh);};
  },[]);
  const none=selected<0,eventType=order?.order.event?.type||'',token=order?.token;
  const requestedServices=order?.order.services;
  const previousServices=useRef([]),previousEvent=useRef(eventType);
  useEffect(()=>{
    const requested=requestedServices||[];
    const added=requested.find(id=>!previousServices.current.includes(id)&&services.some(item=>item.id===id));
    previousServices.current=requested;
    if(added){setSelected(added);setPreviewEquipment(null);}
  },[requestedServices,services]);
  useEffect(()=>{if(previousEvent.current===eventType)return;previousEvent.current=eventType;setSelected('');setPreviewEquipment(null);},[eventType]);
  // AI scenes for the picked event type; the server caches per type, so repeat picks are free.
  const [eventImages,setEventImages]=useState([]),[frame,setFrame]=useState(0);
  useEffect(()=>{setEventImages([]);setFrame(0);if(!eventType||!order?.signedIn)return undefined;let alive=true;apiRequest('/ai-booking/event-images',{method:'POST',token,body:{type:eventType}}).then(value=>{if(alive)setEventImages(value.images||[]);}).catch(()=>{});return()=>{alive=false;};},[eventType,order?.signedIn,token]);
  useEffect(()=>{if(eventImages.length<2)return undefined;const timer=setInterval(()=>setFrame(value=>(value+1)%eventImages.length),6000);return()=>clearInterval(timer);},[eventImages]);
  const eventLabel=events.find(item=>item.id===selectedEventId&&item.bookingType===eventType)||events.find(item=>item.bookingType===eventType);
  const eventScene=none?(eventLabel?.imageUrl||eventImages[frame]):null;
  const suggested=(none?[]:items.filter(item=>item.category===service.category||(service.equipmentIds||[]).includes(item.id))).map(item=>({...item,...(DJ_RIG[item.id]?{imageUrl:item.imageUrl||DJ_RIG[item.id].imageUrl}: {})}));
  const previewEquipment=equipmentSelection===undefined?(suggested[0]||null):equipmentSelection&&suggested.find(item=>item.id===equipmentSelection.id)||null;
  const [title,description]=none?[eventLabel?tr(eventLabel.name,eventLabel.nameAr||eventLabel.name):'',eventLabel?tr(eventLabel.description,eventLabel.descriptionAr||eventLabel.description):'']:[tr(service.name,service.nameAr||service.name),tr(service.description,service.descriptionAr||service.description)];
  const isModel=Boolean(previewEquipment?.modelUrl||EQUIPMENT_MODELS[previewEquipment?.id]);
  return fitViewport(<section id="services" className="echo-section echo-service-vinyl setup-showcase" aria-labelledby="service-vinyl-title">
    <header className="service-vinyl-heading setup-showcase-heading">
      <div><p id="service-vinyl-title" className="echo-eyebrow">05 / {tr('THE SETUP','التجهيزات')}</p></div>
      <button type="button" className="setup-simulation-toggle" aria-pressed={simulation} aria-controls="setup-simulation-room" onClick={toggleSimulation}>{simulation?<ArrowLeft size={17}/>:<Box size={17}/>}<span>{simulation?tr('Back to services','العودة للخدمات'):tr('Simulation','المحاكاة')}</span></button>
    </header>
    <div ref={flipRef} className={`setup-flip${simulation?' is-flipped':''}${flat?' is-flat':''}${resetting?' is-resetting':''}${phase==='in'?' is-in':` is-away is-away-${phase}`}`}><div className="setup-flip-inner"><div className="setup-flip-front" inert={simulation} aria-hidden={simulation||undefined}>
    <div className="setup-showcase-shell has-equipment-wheel">
      <aside className="setup-events-column" aria-label={tr('Events','الفعاليات')}>
        <header><span>{tr('Events','الفعاليات')}</span><small>{tr('What are you planning?','ماذا تخطط؟')}</small></header>
        <div role="group" aria-label={tr('Event type','نوع الفعالية')}>{events.map(event => {const value=event.id,Icon=EVENT_ICONS[event.bookingType]||CalendarHeart,on=eventLabel?.id===value&&eventType===event.bookingType; return <button key={value} type="button" aria-pressed={on} onClick={() => {setSelectedEvent(on?'':value);order?.setField('event.type', on ? null : event.bookingType);if(!on){setSelected('');setPreviewEquipment(null);}}}><Icon size={17} strokeWidth={1.6} aria-hidden="true"/><span>{tr(event.name,event.nameAr||event.name)}</span></button>;})}</div>
      </aside>
      <aside className="setup-browser" aria-label={tr('Services','الخدمات')}>
        <header className="setup-browser-heading"><span>{tr('Choose what moves your event.','اختر ما يميز فعاليتك.')}</span></header>
        <div className="setup-service-grid" role="group" aria-label={tr('Choose a service','اختر خدمة')}>
          {services.map((item,index)=>{const name=tr(item.name,item.nameAr||item.name),Icon=icons[setupDefaults.filter(row=>row.kind==='service').findIndex(row=>row.id===item.id)]||Box,shared=bookingServices.includes(item.id),checked=shared?Boolean(requestedServices?.includes(item.id)):selected===index;return <button key={item.id} type="button" className={`setup-service-tile${checked?' is-selected':''}`} aria-pressed={checked} onClick={()=>{setSelected(item.id);setPreviewEquipment(undefined);if(shared)order?.setField('services',checked?(requestedServices||[]).filter(id=>id!==item.id):[...(requestedServices||[]),item.id]);}}>
            {item.imageUrl&&<img src={item.imageUrl} alt="" loading="lazy"/>}
            <span className="setup-tile-icon"><Icon size={19} strokeWidth={1.5}/></span>
            <span className="setup-tile-name">{name}</span>
          </button>;})}
        </div>
        <div className="setup-browser-foot"><i/>{tr('ONE TEAM. THE COMPLETE SETUP.','فريق واحد. تجهيزات متكاملة.')}</div>
      </aside>
      <div className={`setup-visual-stage${previewEquipment?' is-equipment':''}${isModel?' is-model':''}`} aria-live="polite">
        {!previewEquipment&&(none?eventScene&&<img key={frame} className="setup-stage-scene" src={eventScene} alt=""/>:service?.imageUrl&&<img key={service.id} className="setup-stage-scene" src={service.imageUrl} alt="" loading="lazy"/>)}
        <header className="setup-stage-meta"><span>{tr('SELECTED EXPERIENCE','التجربة المختارة')}</span><span className="setup-stage-status"><i/>{tr('ECHO / EVENT PRODUCTION','إيكو / إنتاج الفعاليات')}</span></header>
        {isModel?<div className="setup-stage-model setup-experience-art has-equipment-preview">{previewEquipment.modelUrl?<GeneratedModelViewer src={previewEquipment.modelUrl} name={previewEquipment.name} ar={ar}/>:<EquipmentModelPreview key={previewEquipment.id} equipmentId={previewEquipment.id} name={previewEquipment.name} ar={ar}/>}</div>:<>
          {previewEquipment&&<div className="setup-stage-product">{previewEquipment.imageUrl?<img src={previewEquipment.imageUrl} alt={previewEquipment.name}/>:<span>{previewEquipment.name}</span>}</div>}
          <div className="setup-stage-caption" key={previewEquipment?.id||selected}>
            <span className="setup-stage-kicker">{previewEquipment?tr('IN YOUR SETUP','ضمن تجهيزاتك'):tr('CRAFTED FOR YOUR OCCASION','مصمّمة لمناسبتك')}</span>
            <h3>{previewEquipment?.name||title}</h3>
            <p>{previewEquipment?(previewEquipment.brandModel||title):description}</p>
          </div>
        </>}
        {isModel&&!previewEquipment.modelUrl&&EQUIPMENT_MODELS[previewEquipment.id]?.youtube&&<a className="setup-stage-video" href={EQUIPMENT_MODELS[previewEquipment.id].youtube} target="_blank" rel="noopener noreferrer"><Play size={14} aria-hidden="true"/>{tr('Watch on YouTube','شاهد على YouTube')}</a>}
      </div>
      <div className="setup-equipment-rail">
      <header className="setup-browser-heading"><span id="setup-equipment-title">{tr('ECHO / EQUIPMENT','إيكو / المعدات')}</span><span className="setup-equipment-count">{suggested.length} {tr('items','عناصر')}</span></header>
      <aside className="setup-equipment-column" aria-labelledby="setup-equipment-title">
        <div className="setup-equipment-grid" role="group" aria-label={tr('Choose equipment','اختر المعدات')}>
          {suggested.map(item=>{const Icon=icons[setupDefaults.filter(row=>row.kind==='service').findIndex(row=>row.id===service?.id)]||Box,model=EQUIPMENT_MODELS[item.id],thumbnail=model?.profile||item.imageUrl;const current=previewEquipment?.id===item.id;return <div key={item.id} className={`setup-equipment-grid-item${current?' is-current':''}`}><button type="button" className="setup-equipment-preview-button" aria-label={`${tr('Preview','معاينة')} ${item.name}`} aria-pressed={current} onClick={()=>setPreviewEquipment(item)}><span className="setup-equipment-grid-art">{item.modelUrl||model?<EquipmentWheelModel equipmentId={item.id} modelUrl={item.modelUrl} name={item.name}/>:thumbnail?<img src={thumbnail} alt="" loading="lazy"/>:<Icon size={48} strokeWidth={1.5}/>}</span></button><div className="setup-equipment-order-controls"><EquipmentAvailability item={DJ_RIG[item.id]?{...item,availableQuantity:null}:item} ar={ar}/>{!DJ_RIG[item.id]&&<EquipmentQuantityPicker item={item} quantity={cart[item.id]?.quantity||0} onChange={changeQuantity} ar={ar}/>}<AddToBookingButton item={item} quantity={cart[item.id]?.quantity||0} onChange={changeQuantity} ar={ar}/></div></div>;})}
          {!suggested.length&&!none&&<p className="setup-equipment-empty" role="status">{failed?tr('Equipment is temporarily unavailable.','المعدات غير متاحة حالياً.'):tr('No equipment added to this service yet.','لم تُضف معدات لهذه الخدمة بعد.')}</p>}
        </div>
      </aside>
      </div>
    </div></div><div id="setup-simulation-room" className="setup-flip-back" inert={!simulation} aria-hidden={!simulation||undefined}>{visited&&<SimulationBoundary ar={ar}><Suspense fallback={<p className="simulation-loading" role="status">{tr('Building your room…','جارٍ إنشاء الغرفة…')}</p>}><SetupSimulation items={items} cart={cart} onQuantity={changeQuantity} services={order?.order.services||[]} event={order?.order.event} onGuestCount={value=>order?.setField('event.guestCount',value)} onVenueField={(key,value)=>order?.setField(`event.venue.${key}`,value)} requestAdvice={order?.requestSetupAdvice} requestVenueArea={order?.requestVenueArea} active={simulation} ar={ar}/></Suspense></SimulationBoundary>}</div></div></div>
  </section>);
}
