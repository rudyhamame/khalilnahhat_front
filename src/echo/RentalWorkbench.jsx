import DjWorkFeature from './DjWorkFeature';
import {serviceIcon} from '../lib/serviceIcons';
import {displayImageUrl} from '../lib/displayImage';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {ArrowDown,ArrowUp,ArrowUpRight,Box,X} from 'lucide-react';
import GeneratedModelViewer from '../components/GeneratedModelViewer';
import EquipmentSetViewer from './EquipmentSetViewer';
import {isEquipmentSet} from '../components/equipmentSets';
import EquipmentAvailability from './EquipmentAvailability';
import EquipmentQuantityPicker, {RemoveFromBookingButton} from './EquipmentQuantityPicker';
import './rentalWorkbench.css';
import './rentalEquipment.css';
import './rentalServices.css';
import './rentalServiceTabs.css';
import './rentalEquipmentDetails.css';
import './rentalDesktopReadability.css';
import './rentalsPage.css';

function EquipmentThumbnail({item}){
  const sources=[displayImageUrl(item.imageUrl)].filter(Boolean);
  const [attempt,setAttempt]=useState(0);
  return <span className="rental-equipment-thumbnail" aria-hidden="true">{sources[attempt]?<img src={sources[attempt]} alt="" loading="lazy" onError={()=>setAttempt(value=>value+1)}/>:<Box size={20} strokeWidth={1.2}/>}</span>;
}

// Equipment details and booking controls live in the equipment pane.
function ItemInfo({item,ar}){
  const tr=(en,arabic)=>ar?arabic:en;
  const rows=[[tr('What it does','ماذا يفعل'),item.functionSummary],[tr('Description','الوصف'),item.description]].filter(([,text])=>text);
  return <div className="rental-item-info">
    <div className="rental-detail-copy">{rows.length>0&&<dl>{rows.map(([label,text])=><div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}</dl>}</div>
  </div>;
}
function EquipmentBooking({item,quantity,onQuantity,ar}){
  const tr=(en,arabic)=>ar?arabic:en;
  return <footer className="rental-booking">
      <EquipmentQuantityPicker groupControls badge={<span className="rental-stock-actions"><EquipmentAvailability item={item} ar={ar} draft={quantity}/><RemoveFromBookingButton item={item} quantity={quantity} onChange={onQuantity} ar={ar}/></span>} quantityLabel={<span className="rental-quantity-label">{tr('Quantity','الكمية')}</span>} item={item} quantity={quantity} onChange={onQuantity} ar={ar}/>
      {quantity>0&&<p className="rental-quantity-note" role="status">{tr(`${quantity} selected for your booking`,`${quantity} محددة لحجزك`)}</p>}
    </footer>;
}
export default function RentalWorkbench({services,service,items,selectedItem:item,onService,onEquipment,cart,onQuantity,ar,failed}){
  const tr=(en,arabic)=>ar?arabic:en,name=row=>tr(row.name,row.nameAr||row.name);
  const [detail,setDetail]=useState(null),[djPreferencesOpen,setDjPreferencesOpen]=useState(false),[view,setView]=useState('services'),[mode,setMode]=useState('individuals'),vp=useRef(null),closeButton=useRef(null);
  const showDetails=Boolean(item&&detail?.itemId===item.id&&detail?.serviceId===service?.id);
  useEffect(()=>{setDetail(null);},[service?.id]);
  // The hero's "Add to booking" button (and any other DJ entry point) asks for the music preferences with this event.
  useEffect(()=>{const open=()=>setDjPreferencesOpen(true);window.addEventListener('echo:dj-form-open',open);return()=>window.removeEventListener('echo:dj-form-open',open);},[]);
  useEffect(()=>{if(!showDetails)return undefined;closeButton.current?.focus({preventScroll:true});const key=event=>{if(event.key==='Escape')setDetail(null);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[showDetails]);
  const openEquipment=row=>{onEquipment(row);setDetail({itemId:row.id,serviceId:service?.id});};
  const src=item?.modelUrl,parts=useMemo(()=>item?.modelParts?.map((part,index)=>({key:String(index),label:[part.name,part.nameAr||part.name],src:part.src,height:part.y||0,at:[part.x,part.z,part.rotation*Math.PI/180]})),[item?.modelParts]);
  const individualItems=items.filter(row=>!isEquipmentSet(row)),setItems=items.filter(isEquipmentSet);
  const activeSection=isEquipmentSet(item)?'sets':'individual';
  const visibleItems=activeSection==='sets'?setItems:individualItems;
  const serviceNumber=services.findIndex(row=>row.id===service?.id)+1;
  const tabsId=useId();
  const smooth=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth';
  // The equipment replaces the services in the same viewport (and back); keep that viewport in place when it swaps.
  useEffect(()=>{if(vp.current&&vp.current.getBoundingClientRect().top<0)vp.current.scrollIntoView({block:'start'});},[view]);
  const chooseService=row=>{setDetail(null);onService(row);setView('equipment');};
  const equipmentTag=row=>`${serviceNumber}.${items.findIndex(entry=>entry.id===row.id)+1}`;
  const quantity=item?(cart[item.id]?.quantity||0):0;
  const heading=activeSection==='sets'?tr('Packages','باكجات'):name(service||{name:tr('Service items','عناصر الخدمة'),nameAr:'عناصر الخدمة'});
  const modeTabs=(current)=><div className="rw-modes" role="tablist" aria-label={tr('Rental type','نوع الإيجار')}>{[['individuals',tr('Individuals','قطع افرادية'),false],['packages',tr('Packages','باكجات'),!setItems.length]].map(([id,label,off])=><button type="button" role="tab" key={id} aria-selected={current===id} className={current===id?'is-on':''} disabled={off} onClick={()=>{setDetail(null);setMode(id);setView('services');}}>{label}</button>)}</div>;
  if(djPreferencesOpen)return <div className="rental-with-feature is-dj-preferences rw-dj">
    <DjWorkFeature ar={ar} expanded onClose={()=>setDjPreferencesOpen(false)}/>
  </div>;
  return <div className="rw" dir={ar?'rtl':'ltr'} ref={vp}>
    {view==="services"?<section className="rw-vp rw-services" aria-label={tr('Services','الخدمات')}>
      <header className="rw-head rw-head-row"><div><span className="rw-kicker">{tr('Services & equipment','الخدمات والمعدات')}</span><h2>{tr('What does your event need?','ماذا تحتاج فعاليتك؟')}</h2><p>{tr('Choose a service to see its equipment. Pick what you like and it joins your booking.','اختر خدمة لترى معداتها. اختر ما يعجبك وسينضم إلى حجزك.')}</p></div>{modeTabs(mode)}</header>
      {mode==='packages'?<div id="rental-packages" className="rw-eq-grid" role="region" aria-label={tr('Packages','باكجات')}>
        {setItems.map((row,index)=>{const picked=cart[row.id]?.quantity||0;return <button type="button" key={row.id} className={`rw-card${row.id===item?.id&&showDetails?' is-open':''}${picked>0?' is-picked':''}`} aria-pressed={row.id===item?.id&&showDetails} onClick={()=>openEquipment(row)}>
          <span className="rw-card-img"><EquipmentThumbnail key={`${row.id}:${row.imageUrl||''}`} item={row}/></span>
          <span className="rw-card-tag">{`P.${index+1}`}</span>
          <span className="rw-card-copy"><strong>{name(row)}</strong>{row.brandModel&&<small>{row.brandModel}</small>}</span>
          {picked>0&&<em className="rw-card-picked">{tr('Selected','المحدد')} · {picked}</em>}
          <ArrowUpRight size={16} className="rw-card-go" aria-hidden="true"/>
        </button>;})}
      </div>:
      <div className="rw-service-grid" role="tablist" aria-label={tr('Services','الخدمات')}>
        {services.map((row,index)=>{const Icon=serviceIcon(row),on=row.id===service?.id&&activeSection!=='sets';return <button type="button" key={row.id} id={`${tabsId}-service-${index}`} role="tab" className={`rw-service${on?' is-on':''}${row.selectionField?' is-decision':''}`} aria-selected={on} aria-controls="rental-equipment" onClick={()=>chooseService(row)}>
          <span className="rw-service-num">{String(index+1).padStart(2,'0')}</span><span className="rw-service-icon"><Icon size={26} strokeWidth={1.3} aria-hidden="true"/></span><strong>{name(row)}</strong><ArrowDown size={18} className="rw-service-go" aria-hidden="true"/>
        </button>;})}
      </div>}
    </section>:<section id="rental-equipment" className="rw-vp rw-equipment" aria-label={tr('Equipment','المعدات')}>
      <header className="rw-eq-head">
        <button type="button" className="rw-back" onClick={()=>{setDetail(null);setView('services');}}><ArrowUp size={16} aria-hidden="true"/>{tr('All services','كل الخدمات')}</button>
        <div><span className="rw-kicker">{activeSection==='sets'?tr('Packages','باكجات'):`${tr('Service','الخدمة')} ${String(Math.max(1,serviceNumber)).padStart(2,'0')}`}</span><h2>{heading}</h2></div>
        {modeTabs(activeSection==='sets'?'packages':'individuals')}<span className="rw-count">{visibleItems.length} {tr(visibleItems.length===1?'item':'items','عنصر')}</span>
      </header>
      <div id="rental-equipment-panel" className="rw-eq-grid" role="region" aria-label={heading}>
        {visibleItems.map(row=>{const picked=cart[row.id]?.quantity||0;return <button type="button" key={row.id} className={`rw-card${row.id===item?.id&&showDetails?' is-open':''}${picked>0?' is-picked':''}`} aria-pressed={row.id===item?.id&&showDetails} onClick={()=>openEquipment(row)}>
          <span className="rw-card-img"><EquipmentThumbnail key={`${row.id}:${row.imageUrl||''}`} item={row}/></span>
          <span className="rw-card-tag" aria-label={`${tr('Equipment','المعدة')} ${equipmentTag(row)}`}>{equipmentTag(row)}</span>
          <span className="rw-card-copy"><strong>{name(row)}</strong>{row.brandModel&&<small>{row.brandModel}</small>}</span>
          {picked>0&&<em className="rw-card-picked">{tr('Selected','المحدد')} · {picked}</em>}
          <ArrowUpRight size={16} className="rw-card-go" aria-hidden="true"/>
        </button>;})}
        {!items.length&&<p className="rw-empty" role="status">{failed?tr('Please try again shortly.','يرجى المحاولة لاحقاً.'):tr('The collection is being prepared.','جارٍ إعداد المجموعة.')}</p>}
      </div>
    </section>}
    {showDetails&&<>
      <div className="rw-scrim" onClick={()=>setDetail(null)} aria-hidden="true"/>
      <aside className="rw-drawer" role="dialog" aria-modal="true" aria-label={name(item)} dir={ar?'rtl':'ltr'}>
        <header className="rw-drawer-head"><div><span className="rw-kicker">{tr('Equipment','المعدات')} <b>{equipmentTag(item)}</b></span><h3>{name(item)}</h3>{item.brandModel&&<p>{item.brandModel}</p>}</div><button type="button" ref={closeButton} className="rw-close" onClick={()=>setDetail(null)} aria-label={tr('Close details','إغلاق التفاصيل')}><X size={20} aria-hidden="true"/></button></header>
        <div className="rw-drawer-scroll">
        <div className="rw-drawer-stage">
          {parts?.length?<EquipmentSetViewer key={item.id} parts={parts} name={name(item)} ar={ar} showControls={false}/>:src?<GeneratedModelViewer key={item.id} src={src} name={name(item)} ar={ar} showControls={false} showInteractionHint={false} fitToBounds/>:<p className="rental-no-model" role="status"><Box size={34} strokeWidth={1.2} aria-hidden="true"/>{tr('No 3D object available','لا يتوفر مجسم ثلاثي الأبعاد')}</p>}
        </div>
        <div className="rw-drawer-body" key={item.id}><ItemInfo item={item} ar={ar}/></div>
        </div>
        <EquipmentBooking item={item} quantity={quantity} onQuantity={onQuantity} ar={ar}/>
      </aside>
    </>}
  </div>;
}
