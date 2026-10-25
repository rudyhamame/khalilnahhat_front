import {fitViewport} from './fitViewport';
import EquipmentModelPreview from './EquipmentModelPreview';
import EquipmentWheelModel from './EquipmentWheelModel';
import { useEffect, useState } from 'react';
import { Disc3, AudioLines, Sparkles, Monitor, WandSparkles, Building2, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { fetchEquipment } from '../lib/api';
import './serviceVinyl.css';
import './setupShowcase.css';

const scenes = ['/echo/dj-services-cover-v1.webp','/echo/sound-systems-cover-v1.webp','/echo/lighting-cover-v1.webp','/echo/led-walls-cover-v1.webp','/echo/special-effects-cover-v1.webp','/echo/corporate-events-cover-v1.webp'];

const icons = [Disc3, AudioLines, Sparkles, Monitor, WandSparkles, Building2];
// Suggested setups, using actual catalog IDs. Quantities follow catalog minimums.
const setups = [
  ['soundcraft','qsc-k122','shure-mics'],
  ['qsc-k122','es18p','jbl-system'],
  ['movingheads','trussing','uplights'],
  ['led-screen','projector'],
  ['smoke','sparklers','dry-ice','co2-gun'],
  ['shure-mics','soundcraft','projector','led-screen'],
];

export default function ServiceVinyl({lang}) {
  const ar=lang.lang==='ar', tr=(en,arabic)=>ar?arabic:en;
  const [selected,setSelected]=useState(0);
  const [expanded,setExpanded]=useState(null);
  const [previewEquipment,setPreviewEquipment]=useState(null);
  const [items,setItems]=useState([]);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{let alive=true;fetchEquipment().then(value=>{if(alive)setItems(value.items||[]);}).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;};},[]);
  const suggested=setups[selected].map(id=>items.find(item=>item.id===id)).filter(Boolean);
  const activeEquipmentIndex=Math.max(0,suggested.findIndex(item=>item.id===previewEquipment?.id));
  const stepEquipment=direction=>{
    if(suggested.length)setPreviewEquipment(suggested[(activeEquipmentIndex+direction+suggested.length)%suggested.length]);
  };
  const [title,description]=lang.t.services[selected];
  const isModel=previewEquipment?.id==='es18p';
  const closeEquipment=()=>{setExpanded(null);setPreviewEquipment(null);};
  return fitViewport(<section id="services" className="echo-section echo-service-vinyl setup-showcase" aria-labelledby="service-vinyl-title">
    <header className="service-vinyl-heading setup-showcase-heading">
      <div><p className="echo-eyebrow">02 / {tr('THE SETUP','التجهيزات')}</p><h2 id="service-vinyl-title">{tr('Your event. Every element.','فعاليتك. بكل تفاصيلها.')}</h2></div>
    </header>
    <div className="setup-showcase-shell">
      <aside className={`setup-browser${expanded!==null?' is-exploring':''}`} aria-label={tr('Services and equipment','الخدمات والمعدات')}>
        <header className="setup-browser-heading"><span>{expanded===null?tr('Choose what moves your event.','اختر ما يميز فعاليتك.'):tr('Explore your setup','استكشف تجهيزاتك')}</span>{expanded!==null&&<button type="button" onClick={closeEquipment} aria-label={tr('Back to all services','العودة لكل الخدمات')}><X size={18}/><span>{tr('All services','كل الخدمات')}</span></button>}</header>
        {expanded===null?<div className="setup-service-grid" role="group" aria-label={tr('Choose a service','اختر خدمة')}>
          {lang.t.services.map(([name],index)=>{const Icon=icons[index];return <button key={name} type="button" className={`setup-service-tile${selected===index?' is-selected':''}`} aria-pressed={selected===index} onClick={()=>{setSelected(index);setPreviewEquipment(null);setExpanded(index);}}>
            <img src={scenes[index]} alt="" loading="lazy"/>
            <span className="setup-tile-icon"><Icon size={19} strokeWidth={1.5}/></span>
            <span className="setup-tile-name">{name}</span>
          </button>;})}
        </div>:<div className="setup-browser-equipment">
          <div className="setup-open-service"><span>{tr('Your selected service','الخدمة المختارة')}</span><h3>{title}</h3></div>
          <div className="setup-inline-equipment" role="region" aria-label={`${title} — ${tr('Equipment','المعدات')}`}>
          <div className="service-vinyl-equipment setup-equipment-wheel" role="region" aria-roledescription="carousel" aria-label={tr('Equipment wheel','عجلة المعدات')} onKeyDown={event=>{if(event.target.closest('input'))return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();stepEquipment(event.key==='ArrowRight'?1:-1);}}}>
            {suggested.map((item,index)=>{const Icon=icons[selected];const thumbnail=item.id==='es18p'?'/echo/models/es18p-profile.jpg':item.imageUrl;const offset=(index-activeEquipmentIndex+suggested.length+Math.floor(suggested.length/2))%suggested.length-Math.floor(suggested.length/2);return <article key={item.id} style={{'--wheel-offset':offset,'--wheel-depth':Math.abs(offset),zIndex:suggested.length-Math.abs(offset)}} className={index===activeEquipmentIndex?'is-previewed':''} aria-roledescription="slide" aria-label={`${index+1} / ${suggested.length}`}><button type="button" className="setup-equipment-inspect" aria-label={`${item.id==='es18p'?tr('View in 360 degrees','عرض بزاوية 360 درجة'):tr('Preview','معاينة')} ${item.name}`} aria-pressed={previewEquipment?.id===item.id} onClick={()=>setPreviewEquipment(item)}><span className="service-equipment-art">{item.id==='es18p'?<EquipmentWheelModel name={item.name} selected={index===activeEquipmentIndex}/>:thumbnail?<img src={thumbnail} alt="" loading="lazy"/>:<Icon size={25} strokeWidth={1} aria-hidden="true"/>}</span><span className="setup-equipment-info"><strong className="setup-equipment-name">{item.name}</strong></span></button></article>;})}
            {!suggested.length&&<p className="echo-muted">{failed?tr('Equipment is temporarily unavailable. Please request your setup.','المعدات غير متاحة حالياً. يرجى طلب تجهيزاتك.'):tr('Loading suggested equipment…','جارٍ تحميل المعدات المقترحة…')}</p>}
          </div>
          {suggested.length>0&&<div className="setup-wheel-navigation"><button type="button" aria-label={tr('Previous equipment','المعدة السابقة')} onClick={()=>stepEquipment(-1)} disabled={suggested.length<2}><ChevronLeft size={16}/></button><span aria-live="polite">{String(activeEquipmentIndex+1).padStart(2,'0')} / {String(suggested.length).padStart(2,'0')}</span><button type="button" aria-label={tr('Next equipment','المعدة التالية')} onClick={()=>stepEquipment(1)} disabled={suggested.length<2}><ChevronRight size={16}/></button></div>}
          <small className="setup-gear-note">{tr('Select an item to explore it.','اختر قطعة لاستكشافها.')}</small>
          </div>
        </div>}
        <div className="setup-browser-foot"><i/>{tr('ONE TEAM. THE COMPLETE SETUP.','فريق واحد. تجهيزات متكاملة.')}</div>
      </aside>
      <div className={`setup-visual-stage${previewEquipment?' is-equipment':''}${isModel?' is-model':''}`} aria-live="polite">
        {!previewEquipment&&<img key={selected} className="setup-stage-scene" src={scenes[selected]} alt="" loading="lazy"/>}
        <header className="setup-stage-meta"><span>{tr('SELECTED EXPERIENCE','التجربة المختارة')}</span><span className="setup-stage-status"><i/>{tr('ECHO / EVENT PRODUCTION','إيكو / إنتاج الفعاليات')}</span></header>
        {isModel?<div className="setup-stage-model setup-experience-art has-equipment-preview"><EquipmentModelPreview src="/echo/models/es18p-subwoofer.glb?v=black-2" name={previewEquipment.name} ar={ar}/></div>:<>
          {previewEquipment&&<div className="setup-stage-product">{previewEquipment.imageUrl?<img src={previewEquipment.imageUrl} alt={previewEquipment.name}/>:<span>{previewEquipment.name}</span>}</div>}
          <div className="setup-stage-caption" key={previewEquipment?.id||selected}>
            <span className="setup-stage-kicker">{previewEquipment?tr('IN YOUR SETUP','ضمن تجهيزاتك'):tr('CRAFTED FOR YOUR OCCASION','مصمّمة لمناسبتك')}</span>
            <h3>{previewEquipment?.name||title}</h3>
            <p>{previewEquipment?(previewEquipment.brandModel||title):description}</p>
          </div>
        </>}
        {previewEquipment&&<footer className="setup-stage-footer">
          <button type="button" className="setup-stage-return" onClick={()=>setPreviewEquipment(null)}>{tr('Service overview','نظرة على الخدمة')}</button>
        </footer>}
      </div>
    </div>
  </section>);
}
