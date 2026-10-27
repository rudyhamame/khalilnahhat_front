import {fitViewport} from './fitViewport';
import EquipmentModelPreview from './EquipmentModelPreview';
import EquipmentAvailability from './EquipmentAvailability';
import EquipmentWheelModel from './EquipmentWheelModel';
import {EQUIPMENT_MODELS} from './equipmentModels';
import { useEffect, useRef, useState } from 'react';
import { Disc3, AudioLines, Sparkles, Monitor, WandSparkles, Building2 } from 'lucide-react';
import { fetchEquipment } from '../lib/api';
import './serviceVinyl.css';
import './setupShowcase.css';
import './setupReadability.css';
import './setupEquipmentColumn.css';

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
  const touchStart=useRef(null);
  // Undefined requests the first available item; null explicitly shows the cover.
  const [equipmentSelection,setPreviewEquipment]=useState(null);
  const [items,setItems]=useState([]);
  const [failed,setFailed]=useState(false);
  useEffect(()=>{let alive=true;fetchEquipment().then(value=>{if(alive)setItems(value.items||[]);}).catch(()=>{if(alive)setFailed(true);});return()=>{alive=false;};},[]);
  const suggested=setups[selected].map(id=>items.find(item=>item.id===id)).filter(Boolean);
  const previewEquipment=equipmentSelection===undefined?(suggested[0]||null):equipmentSelection;
  const activeEquipmentIndex=Math.max(0,suggested.findIndex(item=>item.id===previewEquipment?.id));
  const stepEquipment=direction=>{
    if(suggested.length)setPreviewEquipment(suggested[(activeEquipmentIndex+direction+suggested.length)%suggested.length]);
  };
  const [title,description]=lang.t.services[selected];
  const isModel=Boolean(EQUIPMENT_MODELS[previewEquipment?.id]);
  return fitViewport(<section id="services" className="echo-section echo-service-vinyl setup-showcase" aria-labelledby="service-vinyl-title">
    <header className="service-vinyl-heading setup-showcase-heading">
      <div><p id="service-vinyl-title" className="echo-eyebrow">03 / {tr('THE SETUP','التجهيزات')}</p></div>
    </header>
    <div className="setup-showcase-shell has-equipment-wheel">
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
        {!previewEquipment&&<img key={selected} className="setup-stage-scene" src={scenes[selected]} alt="" loading="lazy"/>}
        <header className="setup-stage-meta"><span>{tr('SELECTED EXPERIENCE','التجربة المختارة')}</span><span className="setup-stage-status"><i/>{tr('ECHO / EVENT PRODUCTION','إيكو / إنتاج الفعاليات')}</span></header>
        {isModel?<div className="setup-stage-model setup-experience-art has-equipment-preview"><EquipmentModelPreview key={previewEquipment.id} equipmentId={previewEquipment.id} name={previewEquipment.name} ar={ar}/></div>:<>
          {previewEquipment&&<div className="setup-stage-product">{previewEquipment.imageUrl?<img src={previewEquipment.imageUrl} alt={previewEquipment.name}/>:<span>{previewEquipment.name}</span>}</div>}
          <div className="setup-stage-caption" key={previewEquipment?.id||selected}>
            <span className="setup-stage-kicker">{previewEquipment?tr('IN YOUR SETUP','ضمن تجهيزاتك'):tr('CRAFTED FOR YOUR OCCASION','مصمّمة لمناسبتك')}</span>
            <h3>{previewEquipment?.name||title}</h3>
            <p>{previewEquipment?(previewEquipment.brandModel||title):description}</p>
          </div>
        </>}
        <EquipmentAvailability item={previewEquipment} ar={ar}/>
        {previewEquipment&&<footer className="setup-stage-footer">
          <button type="button" className="setup-stage-return" onClick={()=>setPreviewEquipment(null)}>{tr('Service overview','نظرة على الخدمة')}</button>
        </footer>}
      </div>
      <div className="setup-equipment-rail">
      <header className="setup-browser-heading"><span id="setup-equipment-title">{tr('ECHO / EQUIPMENT','إيكو / المعدات')}</span></header>
      <aside className="setup-equipment-column" aria-labelledby="setup-equipment-title">
        <div className="setup-vertical-wheel" role="region" tabIndex={0} aria-roledescription="carousel" aria-label={tr('Equipment wheel','عجلة المعدات')} onKeyDown={event=>{if(['ArrowUp','ArrowDown','Home','End'].includes(event.key)){event.preventDefault();if(event.key==='Home')setPreviewEquipment(suggested[0]||null);else if(event.key==='End')setPreviewEquipment(suggested.at(-1)||null);else stepEquipment(event.key==='ArrowDown'?1:-1);}}} onTouchStart={event=>{touchStart.current=event.touches[0].clientY;}} onTouchEnd={event=>{if(touchStart.current===null)return;const delta=event.changedTouches[0].clientY-touchStart.current;touchStart.current=null;if(Math.abs(delta)>40)stepEquipment(delta<0?1:-1);}}>
          {suggested.map((item,index)=>{const Icon=icons[selected],model=EQUIPMENT_MODELS[item.id],thumbnail=model?.profile||item.imageUrl;const offset=(index-activeEquipmentIndex+suggested.length+Math.floor(suggested.length/2))%suggested.length-Math.floor(suggested.length/2);const visible=Math.abs(offset)<=1;return <button key={item.id} type="button" className={`setup-vertical-wheel-item${offset===0?' is-current':''}`} style={{'--equipment-offset':offset,'--equipment-depth':Math.abs(offset),zIndex:suggested.length-Math.abs(offset)}} hidden={!visible} tabIndex={visible?0:-1} aria-label={`${tr('Preview','معاينة')} ${item.name}`} aria-pressed={previewEquipment?.id===item.id} onClick={()=>setPreviewEquipment(item)}><span className="setup-vertical-wheel-art">{model?<EquipmentWheelModel equipmentId={item.id} name={item.name}/>:thumbnail?<img src={thumbnail} alt="" loading="lazy"/>:<Icon size={44} strokeWidth={1}/>}</span><strong>{item.name}</strong></button>;})}
          {!suggested.length&&<p className="setup-equipment-empty" role="status">{failed?tr('Equipment is temporarily unavailable.','المعدات غير متاحة حالياً.'):tr('Loading equipment…','جارٍ تحميل المعدات…')}</p>}
        </div>
      </aside>
      </div>
    </div>
  </section>);
}
