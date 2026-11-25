import {FieldCode} from './BookingPhases';
import BookingStep from './BookingStep';
import DjWorkFeature from './DjWorkFeature';
import {displayImageUrl} from '../lib/displayImage';
import {createPortal} from 'react-dom';
import {useEffect,useRef,useState} from 'react';
import {ArrowUp,ArrowUpRight,Box,ChevronLeft,ChevronRight,Play,X} from 'lucide-react';
import {isYouTubeLink} from '../lib/favouriteSongs.mjs';
import GeneratedModelViewer from '../components/GeneratedModelViewer';
import EquipmentAvailability from './EquipmentAvailability';
import EquipmentQuantityPicker, {RemoveFromBookingButton} from './EquipmentQuantityPicker';
import './rentalWorkbench.css';
import './rentalEquipment.css';
import './rentalServices.css';
import './rentalEquipmentDetails.css';
import './rentalDesktopReadability.css';
import './rentalsPage.css';

function EquipmentThumbnail({item}){
  const sources=[displayImageUrl(item.imageUrl)].filter(Boolean);
  const [attempt,setAttempt]=useState(0);
  return <span className="rental-equipment-thumbnail" aria-hidden="true">{sources[attempt]?<img src={sources[attempt]} alt="" loading="lazy" onError={()=>setAttempt(value=>value+1)}/>:<Box size={20} strokeWidth={1.2}/>}</span>;
}

function scrollServiceWheel(event,direction,ar){
  const node=event.currentTarget.closest('.rw-service-section-step')?.querySelector('.rw-equipment-wheel');if(!node)return;
  const first=node.firstElementChild,gap=parseFloat(getComputedStyle(node).columnGap)||0,distance=(first?.getBoundingClientRect().width||node.clientWidth*.8)+gap;
  node.scrollBy({left:direction*distance*(ar?-1:1),behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
}

function EquipmentWheel({ar,label,selectedItemId,children}){
  const viewport=useRef(null);
  useEffect(()=>{if(!selectedItemId)return;const frame=requestAnimationFrame(()=>{const target=Array.from(viewport.current?.querySelectorAll('[data-equipment-id]')||[]).find(node=>node.dataset.equipmentId===selectedItemId);target?.scrollIntoView({block:'nearest',inline:'center',behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});});return()=>cancelAnimationFrame(frame);},[selectedItemId]);
  return <div ref={viewport} className="rw-equipment-wheel" role="region" aria-label={label} tabIndex={0} dir={ar?'rtl':'ltr'}>{children}</div>;
}

// Equipment details and booking controls live in the equipment pane.
function ItemInfo({item,ar}){
  const tr=(en,arabic)=>ar?arabic:en;
  const rows=[[tr('What it does','ماذا يفعل'),item.functionSummary],[tr('Description','الوصف'),item.description]].filter(([,text])=>text);
  return <div className="rental-item-info">
    <div className="rental-detail-copy">{rows.length>0&&<dl>{rows.map(([label,text])=><div key={label}><dt>{label}</dt><dd>{text}</dd></div>)}</dl>}</div>
    {isYouTubeLink(item.youtubeUrl)&&<a className="rental-youtube-link" href={item.youtubeUrl} target="_blank" rel="noopener noreferrer"><Play size={16} aria-hidden="true"/><span><strong>{tr('See it in action','شاهده أثناء العمل')}</strong><small>{tr('Watch the video on YouTube','شاهد الفيديو على يوتيوب')}</small></span><ArrowUpRight size={16} aria-hidden="true"/></a>}
  </div>;
}
function EquipmentBooking({item,quantity,onQuantity,ar}){
  const tr=(en,arabic)=>ar?arabic:en;
  return <footer className="rental-booking">
      <EquipmentQuantityPicker groupControls badge={<span className="rental-stock-actions"><EquipmentAvailability item={item} ar={ar} draft={quantity}/>{quantity>0&&<span className="rental-quantity-note" role="status">{tr(`${quantity} selected`,`${quantity} محددة`)}</span>}<RemoveFromBookingButton item={item} quantity={quantity} onChange={onQuantity} ar={ar}/></span>} quantityLabel={<span className="rental-quantity-label">{tr('Quantity','الكمية')}</span>} item={item} quantity={quantity} onChange={onQuantity} ar={ar}/>
    </footer>;
}
export default function RentalWorkbench({services,sections,service,items,selectedItem:item,onService,onEquipment,cart,onQuantity,ar,failed}){
  const tr=(en,arabic)=>ar?arabic:en,name=row=>tr(row.name,row.nameAr||row.name);
  const [detail,setDetail]=useState(null),[djPreferencesOpen,setDjPreferencesOpen]=useState(false),[view,setView]=useState('services'),vp=useRef(null),closeButton=useRef(null);
  const showDetails=Boolean(item&&detail?.itemId===item.id&&detail?.serviceId===service?.id);
  useEffect(()=>{if(detail&&detail.serviceId!==service?.id)setDetail(null);},[service?.id,detail?.serviceId]);
  // The hero's "Add to booking" button (and any other DJ entry point) asks for the music preferences with this event.
  useEffect(()=>{const open=()=>setDjPreferencesOpen(true);window.addEventListener('echo:dj-form-open',open);return()=>window.removeEventListener('echo:dj-form-open',open);},[]);
  useEffect(()=>{if(!showDetails)return undefined;closeButton.current?.focus({preventScroll:true});const key=event=>{if(event.key==='Escape')setDetail(null);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[showDetails]);
  const src=item?.modelUrl;
  const serviceNumber=services.findIndex(row=>row.id===service?.id)+1;
  // The equipment replaces the services in the same viewport (and back); keep that viewport in place when it swaps.
  useEffect(()=>{if(vp.current&&vp.current.getBoundingClientRect().top<0)vp.current.scrollIntoView({block:'start'});},[view]);
  const equipmentTag=(row,serviceId=service?.id)=>{
    const serviceSections=sections||[];
    let sectionIndex=serviceSections.findIndex(section=>section.service.id===serviceId&&section.items.some(entry=>entry.id===row.id));
    if(sectionIndex<0)sectionIndex=serviceSections.findIndex(section=>section.items.some(entry=>entry.id===row.id));
    const section=serviceSections[sectionIndex],itemIndex=section?.items.findIndex(entry=>entry.id===row.id)??-1;
    return `03.${String(Math.max(0,sectionIndex)+4).padStart(2,'0')}.${String(Math.max(0,itemIndex)+1).padStart(2,'0')}`;
  };
  const quantity=item?(cart[item.id]?.quantity||0):0;
  const heading=name(service||{name:tr('Category items','عناصر الفئة'),nameAr:'عناصر الخدمة'});
  const openEquipment=(row,forService=service)=>{if(!forService)return;onService(forService);onEquipment(row);setDetail({itemId:row.id,serviceId:forService.id});};
  if(djPreferencesOpen)return <div className="rental-with-feature is-dj-preferences rw-dj">
    <DjWorkFeature ar={ar} expanded onClose={()=>setDjPreferencesOpen(false)}/>
  </div>;
  return <div className="rw" dir={ar?'rtl':'ltr'} ref={vp}>
    {view==="services"?<div className="rw-service-sections" aria-label={tr('Equipment categories','فئات المعدات')}>
      {(sections||[]).map(({service:serviceRow,items:serviceItems},index)=><BookingStep key={serviceRow.id} number={20+index} side={index%2?'left':'right'} className="rw-service-section-step booking-services" title={name(serviceRow)} copy={serviceRow.description||tr('Choose individual equipment for this category.','اختر المعدات الفردية لهذه الفئة.')} cardTitle={<>{name(serviceRow)}<span className="rw-wheel-nav"><button type="button" className="rw-wheel-arrow" aria-label={ar?'المعدات السابقة':'Previous equipment'} onClick={event=>scrollServiceWheel(event,-1,ar)}>{ar?<ChevronRight size={17} aria-hidden="true"/>:<ChevronLeft size={17} aria-hidden="true"/>}</button><span className="rw-service-section-head">{serviceItems.length} {tr(serviceItems.length===1?'item':'items','عنصر')}</span><button type="button" className="rw-wheel-arrow" aria-label={ar?'المعدات التالية':'Next equipment'} onClick={event=>scrollServiceWheel(event,1,ar)}>{ar?<ChevronLeft size={17} aria-hidden="true"/>:<ChevronRight size={17} aria-hidden="true"/>}</button></span></>}>
        <div className="rw-service-section-content">
        {serviceItems.length?<EquipmentWheel ar={ar} label={`${name(serviceRow)} ${tr('equipment choices','خيارات المعدات')}`} selectedItemId={serviceItems.find(row=>serviceRow.id===service?.id&&row.id===item?.id&&cart[row.id]?.quantity>0)?.id||serviceItems.find(row=>cart[row.id]?.quantity>0)?.id}>{serviceItems.map(row=>{const picked=cart[row.id]?.quantity||0,on=row.id===item?.id&&serviceRow.id===service?.id&&showDetails;return <button type="button" key={row.id} data-equipment-id={row.id} className={`rw-card${on?' is-open':''}${picked>0?' is-picked':''}`} aria-pressed={on} onClick={()=>openEquipment(row,serviceRow)}>
          <span className="rw-card-img"><EquipmentThumbnail key={`${row.id}:${row.imageUrl||''}`} item={row}/></span><span className="rw-card-tag" aria-label={`${tr('Equipment','المعدة')} ${equipmentTag(row,serviceRow.id)}`}>{equipmentTag(row,serviceRow.id)}</span><span className="rw-card-copy"><strong>{name(row)}</strong>{row.brandModel&&<small>{row.brandModel}</small>}</span>{picked>0&&<em className="rw-card-picked">{tr('Selected','المحدد')} · {picked}</em>}<ArrowUpRight size={16} className="rw-card-go" aria-hidden="true"/>
        </button>;})}</EquipmentWheel>:<p className="rw-empty">{tr('No individual equipment is listed for this category yet.','لا توجد معدات فردية مدرجة لهذه الفئة حالياً.')}</p>}
        </div>
      </BookingStep>)}{!sections?.length&&<p className="rw-empty" role="status">{failed?tr('Please try again shortly.','يرجى المحاولة لاحقاً.'):tr('The equipment list is being prepared.','جارٍ إعداد قائمة المعدات.')}</p>}
    </div>:<section id="rental-equipment" className="rw-vp rw-equipment" aria-label={tr('Equipment','المعدات')}>
      <header className="rw-eq-head">
        <button type="button" className="rw-back" onClick={()=>{setDetail(null);setView('services');}}><ArrowUp size={16} aria-hidden="true"/>{tr('All categories','كل الفئات')}</button>
        <div><span className="rw-kicker">{tr('Category','الفئة')} {String(Math.max(1,serviceNumber)).padStart(2,'0')}</span><h2>{heading}</h2></div>
        <span className="rw-count">{items.length} {tr(items.length===1?'item':'items','عنصر')}</span>
      </header>
      <div id="rental-equipment-panel" className="rw-eq-grid" role="region" aria-label={heading}>
        {items.map(row=>{const picked=cart[row.id]?.quantity||0;return <button type="button" key={row.id} className={`rw-card${row.id===item?.id&&showDetails?' is-open':''}${picked>0?' is-picked':''}`} aria-pressed={row.id===item?.id&&showDetails} onClick={()=>openEquipment(row)}>
          <span className="rw-card-img"><EquipmentThumbnail key={`${row.id}:${row.imageUrl||''}`} item={row}/></span>
          <span className="rw-card-tag" aria-label={`${tr('Equipment','المعدة')} ${equipmentTag(row)}`}>{equipmentTag(row)}</span>
          <span className="rw-card-copy"><strong>{name(row)}</strong>{row.brandModel&&<small>{row.brandModel}</small>}</span>
          {picked>0&&<em className="rw-card-picked">{tr('Selected','المحدد')} · {picked}</em>}
          <ArrowUpRight size={16} className="rw-card-go" aria-hidden="true"/>
        </button>;})}
        {!items.length&&<p className="rw-empty" role="status">{failed?tr('Please try again shortly.','يرجى المحاولة لاحقاً.'):tr('The collection is being prepared.','جارٍ إعداد المجموعة.')}</p>}
      </div>
    </section>}
    {showDetails&&createPortal(<>
      <div className="rw-scrim" onClick={()=>setDetail(null)} aria-hidden="true"/>
      <aside className="rw-drawer" role="dialog" aria-modal="true" aria-label={name(item)} dir={ar?'rtl':'ltr'}>
        <header className="rw-drawer-head"><div><span className="rw-kicker">{tr('Equipment','المعدات')} <b>{equipmentTag(item)}</b></span><h3>{name(item)}</h3>{item.brandModel&&<p>{item.brandModel}</p>}</div><button type="button" ref={closeButton} className="rw-close" onClick={()=>setDetail(null)} aria-label={tr('Close details','إغلاق التفاصيل')}><X size={20} aria-hidden="true"/></button></header>
        <div className="rw-drawer-scroll">
        <div className="rw-drawer-stage">
          {src?<GeneratedModelViewer key={item.id} src={src} name={name(item)} ar={ar} showControls={false} showInteractionHint={false} fitToBounds/>:<p className="rental-no-model" role="status"><Box size={34} strokeWidth={1.2} aria-hidden="true"/>{tr('No 3D object available','لا يتوفر مجسم ثلاثي الأبعاد')}</p>}
        </div>
        <div className="rw-drawer-body" key={item.id}><ItemInfo item={item} ar={ar}/></div>
        </div>
        <EquipmentBooking item={item} quantity={quantity} onQuantity={onQuantity} ar={ar}/>
      </aside>
    </>,document.body)}
  </div>;
}
