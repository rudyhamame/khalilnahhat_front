import {useViewportPhase} from './useViewportPhase';
import {fitViewport} from './fitViewport';
import EquipmentModelPreview from './EquipmentModelPreview';
import EquipmentAvailability from './EquipmentAvailability';
import EquipmentWheelModel from './EquipmentWheelModel';
import {EQUIPMENT_MODELS} from './equipmentModels';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import {useCart} from './cart';
import {useEventOrder} from './eventOrderContext';
import EquipmentQuantityPicker from './EquipmentQuantityPicker';
import './setupSimulation.css';
const SetupSimulation=lazy(()=>import('./SetupSimulation'));
import { Disc3, AudioLines, Sparkles, Monitor, WandSparkles, Building2, Play, Box, ArrowLeft, Heart, Gem, Cake, Briefcase, PartyPopper, GraduationCap, CalendarHeart } from 'lucide-react';
import { fetchEquipment, apiRequest } from '../lib/api';
import './serviceVinyl.css';
import './setupShowcase.css';
import './setupReadability.css';
import './setupEquipmentColumn.css';

const scenes = ['https://res.cloudinary.com/nqiooluk/image/upload/v1793064090/khalil/site-assets/29c75d573b48/echo/dj-services-cover-v1.webp','https://res.cloudinary.com/nqiooluk/image/upload/v1793064142/khalil/site-assets/ef45b01a838e/echo/sound-systems-cover-v1.webp','https://res.cloudinary.com/nqiooluk/image/upload/v1793064106/khalil/site-assets/4d2b7b997237/echo/lighting-cover-v1.webp','https://res.cloudinary.com/nqiooluk/image/upload/v1793064106/khalil/site-assets/813f1b66133b/echo/led-walls-cover-v1.webp','https://res.cloudinary.com/nqiooluk/image/upload/v1793064143/khalil/site-assets/3bd4d0849a5b/echo/special-effects-cover-v1.webp','https://res.cloudinary.com/nqiooluk/image/upload/v1793064084/khalil/site-assets/0d149e65f0f8/echo/corporate-events-cover-v1.webp'];

// Event types from the booking form; picking one is saved to the draft's event type.
const EVENT_TYPES = [
  ['wedding', 'Wedding', 'حفل زفاف', Heart], ['engagement', 'Engagement', 'خطوبة', Gem], ['birthday', 'Birthday', 'عيد ميلاد', Cake],
  ['corporate', 'Corporate', 'فعالية شركات', Briefcase], ['party', 'Party', 'حفلة', PartyPopper], ['graduation', 'Graduation', 'تخرج', GraduationCap], ['other', 'Other', 'أخرى', CalendarHeart],
];
const icons = [Disc3, AudioLines, Sparkles, Monitor, WandSparkles, Building2];
// Suggested setups, using actual catalog IDs. Quantities follow catalog minimums.
const setups = [
  ['soundcraft','qsc-k122','shure-mics'],
  ['qsc-k122','elite-15','es18p','jbl-system'],
  ['movingheads','trussing','uplights'],
  ['led-screen','projector'],
  ['smoke','sparklers','dry-ice','co2-gun'],
  ['shure-mics','soundcraft','projector','led-screen'],
];

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
  const [selected,setSelected]=useState(0);
  // Undefined requests the first available item; null explicitly shows the cover.
  const [equipmentSelection,setPreviewEquipment]=useState(null);
  const [items,setItems]=useState([]);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{let alive=true;fetchEquipment().then(value=>{if(alive)setItems(value.items||[]);}).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;};},[]);
  const none=selected<0,eventType=order?.order.event?.type||'',token=order?.token;
  // AI scenes for the picked event type; the server caches per type, so repeat picks are free.
  const [eventImages,setEventImages]=useState([]),[frame,setFrame]=useState(0);
  useEffect(()=>{setEventImages([]);setFrame(0);if(!eventType||!order?.signedIn)return undefined;let alive=true;apiRequest('/ai-booking/event-images',{method:'POST',token,body:{type:eventType}}).then(value=>{if(alive)setEventImages(value.images||[]);}).catch(()=>{});return()=>{alive=false;};},[eventType,order?.signedIn,token]);
  useEffect(()=>{if(eventImages.length<2)return undefined;const timer=setInterval(()=>setFrame(value=>(value+1)%eventImages.length),6000);return()=>clearInterval(timer);},[eventImages]);
  const eventScene=none?eventImages[frame]:null;
  const suggested=(none?[]:setups[selected]).map(id=>items.find(item=>item.id===id)).filter(Boolean);
  const previewEquipment=equipmentSelection===undefined?(suggested[0]||null):equipmentSelection;
  const eventLabel=EVENT_TYPES.find(([value])=>value===eventType),[title,description]=none?[eventLabel?tr(eventLabel[1],eventLabel[2]):'','']:lang.t.services[selected];
  const isModel=Boolean(EQUIPMENT_MODELS[previewEquipment?.id]);
  return fitViewport(<section id="services" className="echo-section echo-service-vinyl setup-showcase" aria-labelledby="service-vinyl-title">
    <header className="service-vinyl-heading setup-showcase-heading">
      <div><p id="service-vinyl-title" className="echo-eyebrow">03 / {tr('THE SETUP','التجهيزات')}</p></div>
      <button type="button" className="setup-simulation-toggle" aria-pressed={simulation} aria-controls="setup-simulation-room" onClick={toggleSimulation}>{simulation?<ArrowLeft size={17}/>:<Box size={17}/>}<span>{simulation?tr('Back to services','العودة للخدمات'):tr('Simulation','المحاكاة')}</span></button>
    </header>
    <div ref={flipRef} className={`setup-flip${simulation?' is-flipped':''}${flat?' is-flat':''}${resetting?' is-resetting':''}${phase==='in'?' is-in':` is-away is-away-${phase}`}`}><div className="setup-flip-inner"><div className="setup-flip-front" inert={simulation} aria-hidden={simulation||undefined}>
    <div className="setup-showcase-shell has-equipment-wheel">
      <aside className="setup-events-column" aria-label={tr('Events','الفعاليات')}>
        <header><span>{tr('Events','الفعاليات')}</span><small>{tr('What are you planning?','ماذا تخطط؟')}</small></header>
        <div role="group" aria-label={tr('Event type','نوع الفعالية')}>{EVENT_TYPES.map(([value, en, arabic, Icon]) => {const on = order?.order.event?.type === value; return <button key={value} type="button" aria-pressed={on} onClick={() => {order?.setField('event.type', on ? '' : value);if(!on){setSelected(-1);setPreviewEquipment(null);}}}><Icon size={17} strokeWidth={1.6} aria-hidden="true"/><span>{tr(en, arabic)}</span></button>;})}</div>
      </aside>
      <aside className="setup-browser" aria-label={tr('Services','الخدمات')}>
        <header className="setup-browser-heading"><span>{tr('Choose what moves your event.','اختر ما يميز فعاليتك.')}</span></header>
        <div className="setup-service-grid" role="group" aria-label={tr('Choose a service','اختر خدمة')}>
          {lang.t.services.map(([name],index)=>{const Icon=icons[index];return <button key={name} type="button" className={`setup-service-tile${selected===index?' is-selected':''}`} aria-pressed={selected===index} onClick={()=>{setSelected(index);setPreviewEquipment(undefined);}}>
            <img src={scenes[index]} alt="" loading="lazy"/>
            <span className="setup-tile-icon"><Icon size={19} strokeWidth={1.5}/></span>
            <span className="setup-tile-name">{name}</span>
          </button>;})}
        </div>
        <div className="setup-browser-foot"><i/>{tr('ONE TEAM. THE COMPLETE SETUP.','فريق واحد. تجهيزات متكاملة.')}</div>
      </aside>
      <div className={`setup-visual-stage${previewEquipment?' is-equipment':''}${isModel?' is-model':''}`} aria-live="polite">
        {!previewEquipment&&(none?eventScene&&<img key={frame} className="setup-stage-scene" src={eventScene} alt=""/>:<img key={selected} className="setup-stage-scene" src={scenes[selected]} alt="" loading="lazy"/>)}
        <header className="setup-stage-meta"><span>{tr('SELECTED EXPERIENCE','التجربة المختارة')}</span><span className="setup-stage-status"><i/>{tr('ECHO / EVENT PRODUCTION','إيكو / إنتاج الفعاليات')}</span></header>
        {isModel?<div className="setup-stage-model setup-experience-art has-equipment-preview"><EquipmentModelPreview key={previewEquipment.id} equipmentId={previewEquipment.id} name={previewEquipment.name} ar={ar}/></div>:<>
          {previewEquipment&&<div className="setup-stage-product">{previewEquipment.imageUrl?<img src={previewEquipment.imageUrl} alt={previewEquipment.name}/>:<span>{previewEquipment.name}</span>}</div>}
          <div className="setup-stage-caption" key={previewEquipment?.id||selected}>
            <span className="setup-stage-kicker">{previewEquipment?tr('IN YOUR SETUP','ضمن تجهيزاتك'):tr('CRAFTED FOR YOUR OCCASION','مصمّمة لمناسبتك')}</span>
            <h3>{previewEquipment?.name||title}</h3>
            <p>{previewEquipment?(previewEquipment.brandModel||title):description}</p>
          </div>
        </>}
        {isModel&&EQUIPMENT_MODELS[previewEquipment.id].youtube&&<a className="setup-stage-video" href={EQUIPMENT_MODELS[previewEquipment.id].youtube} target="_blank" rel="noopener noreferrer"><Play size={14} aria-hidden="true"/>{tr('Watch on YouTube','شاهد على YouTube')}</a>}
      </div>
      <div className="setup-equipment-rail">
      <header className="setup-browser-heading"><span id="setup-equipment-title">{tr('ECHO / EQUIPMENT','إيكو / المعدات')}</span></header>
      <aside className="setup-equipment-column" aria-labelledby="setup-equipment-title">
        <p className="setup-equipment-hint">{tr('Explore every item','استكشف جميع المعدات')}<span>{suggested.length} {tr('items','عناصر')}</span></p>
        <div className="setup-equipment-grid" role="group" aria-label={tr('Choose equipment','اختر المعدات')}>
          {suggested.map(item=>{const Icon=icons[selected],model=EQUIPMENT_MODELS[item.id],thumbnail=model?.profile||item.imageUrl;const current=previewEquipment?.id===item.id;return <div key={item.id} className={`setup-equipment-grid-item${current?' is-current':''}`}><button type="button" className="setup-equipment-preview-button" aria-label={`${tr('Preview','معاينة')} ${item.name}`} aria-pressed={current} onClick={()=>setPreviewEquipment(item)}><span className="setup-equipment-grid-art">{model?<EquipmentWheelModel equipmentId={item.id} name={item.name}/>:thumbnail?<img src={thumbnail} alt="" loading="lazy"/>:<Icon size={48} strokeWidth={1.5}/>}</span></button><div className="setup-equipment-order-controls"><EquipmentAvailability item={item} ar={ar}/><EquipmentQuantityPicker item={item} quantity={cart[item.id]?.quantity||0} onChange={changeQuantity} ar={ar}/></div></div>;})}
          {!suggested.length&&!none&&<p className="setup-equipment-empty" role="status">{failed?tr('Equipment is temporarily unavailable.','المعدات غير متاحة حالياً.'):tr('Loading equipment…','جارٍ تحميل المعدات…')}</p>}
        </div>
      </aside>
      </div>
    </div></div><div id="setup-simulation-room" className="setup-flip-back" inert={!simulation} aria-hidden={!simulation||undefined}>{visited&&<Suspense fallback={<p className="simulation-loading" role="status">{tr('Building your room…','جارٍ إنشاء الغرفة…')}</p>}><SetupSimulation items={items} cart={cart} onQuantity={changeQuantity} services={order?.order.services||[]} event={order?.order.event} onGuestCount={value=>order?.setField('event.guestCount',value)} onVenueField={(key,value)=>order?.setField(`event.venue.${key}`,value)} requestAdvice={order?.requestSetupAdvice} requestVenueArea={order?.requestVenueArea} active={simulation} ar={ar}/></Suspense>}</div></div></div>
  </section>);
}
