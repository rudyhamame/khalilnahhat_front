import {fitViewport} from './fitViewport';
import EquipmentModelPreview from './EquipmentModelPreview';
import { useEffect, useState } from 'react';
import { ArrowUpRight, Disc3, AudioLines, Sparkles, Monitor, WandSparkles, Building2, Check, Plus, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchEquipment } from '../lib/api';
import { setCartItem, useCart } from './cart';
import './serviceVinyl.css';

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
  const cart=useCart();
  useEffect(()=>{let alive=true;fetchEquipment().then(value=>{if(alive)setItems(value.items||[]);}).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;};},[]);
  const suggested=setups[selected].map(id=>items.find(item=>item.id===id)).filter(Boolean);
  const activeEquipmentIndex=Math.max(0,suggested.findIndex(item=>item.id===previewEquipment?.id));
  const stepEquipment=direction=>{
    if(suggested.length)setPreviewEquipment(suggested[(activeEquipmentIndex+direction+suggested.length)%suggested.length]);
  };
  const [title,description]=lang.t.services[selected];
  const SelectedIcon=icons[selected];
  return fitViewport(<section id="services" className="echo-section echo-service-vinyl" aria-labelledby="service-vinyl-title">
    <header className="service-vinyl-heading"><div><p className="echo-eyebrow">02 / {tr('THE SETUP','التجهيزات')}</p><h2 id="service-vinyl-title">{tr('Your event. Every element.','فعاليتك. بكل تفاصيلها.')}</h2></div></header>
    <div className="service-vinyl-layout">
      <div className="service-vinyl-console">
        <div className="service-vinyl-index"><span><AudioLines size={15}/>{tr('Your experience','تجربتك')}</span><span>06</span></div>
        <p className="setup-panel-subtitle">{tr('Choose what moves your event.','اختر ما يميز فعاليتك.')}</p>
        <div className="service-vinyl-orbit" role="group" aria-label={tr('Choose a service','اختر خدمة')}>
          {lang.t.services.map(([name],index)=>{const Icon=icons[index];return <div key={name} hidden={expanded!==null&&expanded!==index} className={`setup-service-accordion${expanded===index?' is-expanded':''}`}><button type="button" className={`service-vinyl-choice${selected===index?' is-selected':''}`} aria-pressed={selected===index} aria-expanded={expanded===index} aria-controls={expanded===index?`setup-service-equipment-${index}`:undefined} onClick={()=>{setSelected(index);setPreviewEquipment(null);setExpanded(value=>value===index?null:index);}}><span className="setup-choice-icon"><Icon size={18} strokeWidth={1.4}/></span><span>{name}</span><span className="setup-service-toggle"><small>0{index+1}</small><ChevronDown size={13} aria-hidden="true"/></span></button>
            {expanded===index&&(<div className="setup-inline-equipment" id={`setup-service-equipment-${index}`} role="region" aria-label={`${name} — ${tr('Suggested equipment','المعدات المقترحة')}`}>
          <div className="service-vinyl-equipment setup-equipment-wheel" role="region" aria-roledescription="carousel" aria-label={tr('Equipment wheel','عجلة المعدات')} onKeyDown={event=>{if(event.target.closest('input'))return;if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();stepEquipment(event.key==='ArrowRight'?1:-1);}}}>
            {suggested.map((item,index)=>{const inCart=cart[item.id];const Icon=icons[selected];const thumbnail=item.id==='es18p'?'/echo/models/es18p-profile.jpg':item.imageUrl;const offset=(index-activeEquipmentIndex+suggested.length+Math.floor(suggested.length/2))%suggested.length-Math.floor(suggested.length/2);return <article key={item.id} style={{'--wheel-offset':offset,'--wheel-depth':Math.abs(offset),zIndex:suggested.length-Math.abs(offset)}} className={index===activeEquipmentIndex?'is-previewed':''} aria-roledescription="slide" aria-label={`${index+1} / ${suggested.length}`}><button type="button" className="setup-equipment-inspect" aria-label={`${item.id==='es18p'?tr('View in 360 degrees','عرض بزاوية 360 درجة'):tr('Preview','معاينة')} ${item.name}`} aria-pressed={previewEquipment?.id===item.id} onClick={()=>setPreviewEquipment(item)}><span className="service-equipment-art">{thumbnail?<img src={thumbnail} alt="" loading="lazy"/>:<Icon size={25} strokeWidth={1} aria-hidden="true"/>}</span><span className="setup-equipment-info"><span className="service-equipment-number">0{index+1} / {lang.t.cats[item.category]||item.category}</span><strong className="setup-equipment-name">{item.name}</strong>{item.brandModel&&<span className="setup-equipment-brand">{item.brandModel}</span>}{item.minQuantity>1&&<small>{lang.t.minQty(item.minQuantity)}</small>}{item.id==='es18p'&&<span className="setup-equipment-360">360°</span>}</span></button><button type="button" aria-label={`${inCart?tr('Remove','إزالة'):tr('Add','أضف')} ${item.name}`} aria-pressed={Boolean(inCart)} onClick={()=>setCartItem(item,inCart?0:item.minQuantity)}>{inCart?<Check size={14}/>:<Plus size={14}/>}</button></article>;})}
            {!suggested.length&&<p className="echo-muted">{failed?tr('Equipment is temporarily unavailable. Explore the catalog or request your setup.','المعدات غير متاحة حالياً. تصفّح الكتالوج أو اطلب تجهيزاتك.'):tr('Loading suggested equipment…','جارٍ تحميل المعدات المقترحة…')}</p>}
          </div>
          {suggested.length>0&&<div className="setup-wheel-navigation"><button type="button" aria-label={tr('Previous equipment','المعدة السابقة')} onClick={()=>stepEquipment(-1)} disabled={suggested.length<2}><ChevronLeft size={16}/></button><span aria-live="polite">{String(activeEquipmentIndex+1).padStart(2,'0')} / {String(suggested.length).padStart(2,'0')}</span><button type="button" aria-label={tr('Next equipment','المعدة التالية')} onClick={()=>stepEquipment(1)} disabled={suggested.length<2}><ChevronRight size={16}/></button></div>}
          <small className="setup-gear-note">{tr('Add gear to your quote. Khalil will refine the final selection.','أضف المعدات لطلبك. خليل يراجع الاختيارات النهائية.')}</small>
        </div>)}
          </div>;})}
        </div>
        <div className="setup-console-foot"><i/><span>{tr('ONE TEAM. THE COMPLETE SETUP.','فريق واحد. تجهيزات متكاملة.')}</span></div>
      </div>
      <div className="service-vinyl-details" id="service-vinyl-details" aria-live="polite">
        <div className={`setup-experience-panel${previewEquipment?.id==='es18p'?' is-3d-preview':''}`}>
          <header><span>{tr('SELECTED EXPERIENCE','التجربة المختارة')}</span><span>0{selected+1} / 06</span></header>
          <div className={`setup-experience-art${previewEquipment?' has-equipment-preview':''}`}>
            {previewEquipment?.id==='es18p'?<EquipmentModelPreview key={previewEquipment.id} src="/echo/models/es18p-subwoofer.glb?v=black-2" name={previewEquipment.name} ar={ar}/>:previewEquipment?.imageUrl?<img className="setup-equipment-photo" src={previewEquipment.imageUrl} alt={previewEquipment.name}/>:<><div className="setup-art-ring" aria-hidden="true"/><SelectedIcon size={76} strokeWidth={.8} aria-hidden="true"/><span>ECHO / PRODUCTION</span></>}
          </div>
          {previewEquipment?.id!=='es18p'&&<div className="setup-experience-copy"><p className="echo-eyebrow">0{selected+1} / {tr('THE EXPERIENCE','التجربة')}</p><h3>{previewEquipment?.name||title}</h3><p className="service-vinyl-description">{previewEquipment?(previewEquipment.brandModel||title):description}</p>{previewEquipment&&<button type="button" className="setup-back-to-service" onClick={()=>setPreviewEquipment(null)}>{tr('Back to service overview','العودة للخدمة')}</button>}</div>}
          {previewEquipment?.id==='es18p'&&<button type="button" className="setup-back-to-service" onClick={()=>setPreviewEquipment(null)}>{tr('Back to service overview','العودة للخدمة')}</button>}
          <div className="service-vinyl-links"><a className="echo-btn" href="/quote">{tr('Build your event','جهّز فعاليتك')}<ArrowUpRight size={16}/></a><a className="echo-text-link" href="/meeting">{tr('Talk through your setup','ناقش تجهيزاتك معنا')}<ArrowUpRight size={13}/></a></div>
          <small className="service-vinyl-note">{tr('Tailored to your venue. Planned around your night.','تجهيزات تناسب مكانك. وتخطيط يليق بليلتك.')}</small>
        </div>

      </div>
    </div>
  </section>);
}
