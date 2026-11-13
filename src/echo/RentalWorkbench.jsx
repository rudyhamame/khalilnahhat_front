import DjWorkFeature from './DjWorkFeature';
import {serviceIcon} from '../lib/serviceIcons';
import {displayImageUrl} from '../lib/displayImage';
import {useEffect,useId,useMemo,useRef,useState} from 'react';
import {Box, Boxes, ChevronDown, Layers, ArrowUpRight, ArrowLeft, Minus, Plus, Trash2} from 'lucide-react';
import GeneratedModelViewer from '../components/GeneratedModelViewer';
import EquipmentSetViewer from './EquipmentSetViewer';
import {isEquipmentSet} from '../components/equipmentSets';
import EquipmentAvailability from './EquipmentAvailability';
import EquipmentQuantityPicker, {RemoveFromBookingButton} from './EquipmentQuantityPicker';
import './rentalWorkbench.css';
import './rentalEquipment.css';
import './rentalServices.css';
import './rentalServiceTabs.css';

function EquipmentThumbnail({item}){
  const sources=[displayImageUrl(item.imageUrl)].filter(Boolean);
  const [attempt,setAttempt]=useState(0);
  return <span className="rental-equipment-thumbnail" aria-hidden="true">{sources[attempt]?<img src={sources[attempt]} alt="" loading="lazy" onError={()=>setAttempt(value=>value+1)}/>:<Box size={20} strokeWidth={1.2}/>}</span>;
}

// Equipment details and booking controls live in the equipment pane.
function ItemInfo({item,quantity,onQuantity,ar}){
  const tr=(en,arabic)=>ar?arabic:en;
  const rows=[[tr('What it does','ماذا يفعل'),item.functionSummary],[tr('Description','الوصف'),item.description]].filter(([,text])=>text);
  return <div className="rental-item-info">{rows.length>0&&<div className="rental-item-copy">{rows.map(([label,text])=><p key={label}><b>{label}</b><span>{text}</span></p>)}</div>}<div className="rental-booking"><EquipmentQuantityPicker badge={<span className="rental-stock-actions"><EquipmentAvailability item={item} ar={ar} draft={quantity}/><RemoveFromBookingButton item={item} quantity={quantity} onChange={onQuantity} ar={ar}/></span>} quantityLabel={ar?'الكمية':'Quantity'} item={item} quantity={quantity} onChange={onQuantity} ar={ar}/></div></div>;
}
// Hyperlink opposite the Equipment heading: opens a list of what is already in the booking draft.
// The "Selected" pill in the main header and its popover: every piece of equipment chosen so far, with its photo, a quantity stepper and a remove button.
export function SelectedSoFar({cart,onQuantity,ar,items=[]}){
  const [open,setOpen]=useState(false),root=useRef(null),tr=(en,arabic)=>ar?arabic:en;
  const rows=Object.values(cart||{}).filter(row=>row?.quantity>0),count=rows.reduce((sum,row)=>sum+row.quantity,0);
  useEffect(()=>{
    if(!open)return undefined;
    const outside=event=>{if(!root.current?.contains(event.target))setOpen(false);};
    const key=event=>{if(event.key==='Escape')setOpen(false);};
    document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);
    return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
  },[open]);
  useEffect(()=>{if(!rows.length)setOpen(false);},[rows.length]);
  if(!rows.length)return null;
  const find=row=>items.find(item=>item.id===row.id)||{};
  const step=(row,delta)=>{const next=row.quantity+delta;onQuantity(row,next<(row.minQuantity||1)&&delta<0?0:next);};
  return <div className="sel" ref={root}>
    <button type="button" className="sel-pill" aria-expanded={open} aria-haspopup="true" onClick={()=>setOpen(value=>!value)}>
      <Boxes size={15} aria-hidden="true"/><span>{tr('Selected','المحدد')}</span><b>{count}</b><ChevronDown size={14} aria-hidden="true" className="sel-chevron"/>
    </button>
    {open&&<div className="sel-panel" role="dialog" aria-label={tr('Selected equipment','المعدات المحددة')}>
      <header><strong>{tr('Your selection','اختيارك')}</strong><span>{count} {tr(count===1?'unit':'units',count===1?'وحدة':'وحدات')}</span></header>
      <ul>{rows.map(row=>{const item=find(row),name=ar?(item.nameAr||row.nameAr||row.name):row.name;return <li key={row.id}>
        <span className="sel-thumb" aria-hidden="true">{item.imageUrl?<img src={displayImageUrl(item.imageUrl)} alt="" loading="lazy"/>:<Box size={16}/>}</span>
        <span className="sel-name"><strong>{name}</strong>{item.brandModel&&<small>{item.brandModel}</small>}</span>
        <span className="sel-step" role="group" aria-label={`${tr('Quantity of','كمية')} ${name}`}>
          <button type="button" aria-label={`${tr('Fewer','أقل')} ${name}`} onClick={()=>step(row,-1)}><Minus size={13} aria-hidden="true"/></button>
          <b aria-live="polite">{row.quantity}</b>
          <button type="button" aria-label={`${tr('More','أكثر')} ${name}`} onClick={()=>step(row,1)}><Plus size={13} aria-hidden="true"/></button>
        </span>
        <button type="button" className="sel-remove" aria-label={`${tr('Remove','إزالة')} ${name}`} onClick={()=>onQuantity(row,0)}><Trash2 size={14} aria-hidden="true"/></button>
      </li>;})}</ul>
      <footer><button type="button" onClick={()=>rows.forEach(row=>onQuantity(row,0))}>{tr('Clear selection','مسح الاختيار')}</button></footer>
    </div>}
  </div>;
}
export default function RentalWorkbench({selection,services,service,items,selectedItem:item,onService,onEquipment,cart,onQuantity,ar,failed}){
 const tr=(en,arabic)=>ar?arabic:en, name=row=>tr(row.name,row.nameAr||row.name);
  const [detail,setDetail]=useState(null);
  const equipmentPane=useRef(null),restoreFocus=useRef(false),backButton=useRef(null);
  const showDetails=Boolean(item&&detail?.itemId===item.id&&detail?.serviceId===service?.id);
  useEffect(()=>{setDetail(null);},[service?.id]);
  useEffect(()=>{
    if(showDetails)backButton.current?.focus();
    else if(restoreFocus.current){equipmentPane.current?.querySelector('.rental-equipment-list>button[aria-pressed="true"]')?.focus();restoreFocus.current=false;}
  },[showDetails]);
  const openEquipment=row=>{onEquipment(row);setDetail({itemId:row.id,serviceId:service?.id});};
  const src=item?.modelUrl,parts=useMemo(()=>item?.modelParts?.map((part,index)=>({key:String(index),label:[part.name,part.nameAr||part.name],src:part.src,height:part.y||0,at:[part.x,part.z,part.rotation*Math.PI/180]})),[item?.modelParts]);
  const individualItems=items.filter(row=>!isEquipmentSet(row)),setItems=items.filter(isEquipmentSet);
  const activeSection=isEquipmentSet(item)?'sets':'individual';
  const visibleItems=activeSection==='sets'?setItems:individualItems;
  const serviceNumber=services.findIndex(row=>row.id===service?.id)+1;
  const serviceArt=displayImageUrl(service?.imageUrl);
  const tabsId=useId();
  const chooseService=row=>{setDetail(null);onService(row);};
  const chooseSets=()=>{if(!setItems.length)return;setDetail(null);onEquipment(setItems[0]);};
  const serviceKeyDown=event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const bar=event.currentTarget.closest('[role=tablist]'),tabs=[...bar.querySelectorAll('[role=tab]:not(:disabled)')],index=tabs.indexOf(event.currentTarget);
    const direction=(event.key==='ArrowRight'?1:-1)*(ar?-1:1);
    const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(index+direction+tabs.length)%tabs.length;
    const tab=tabs[next];tab.focus({preventScroll:true});tab.click();
    const rail=tab.closest('.rental-service-list');if(!rail)return;
    const bounds=tab.getBoundingClientRect(),railBounds=rail.getBoundingClientRect();
    rail.scrollBy({left:bounds.left-railBounds.left-(rail.clientWidth-bounds.width)/2,behavior:'smooth'});
  };
  const equipmentTag=row=>`${serviceNumber}.${items.findIndex(entry=>entry.id===row.id)+1}`;
  const quantity=item?(cart[item.id]?.quantity||0):0;
  return <>
    <div className="rental-with-feature" style={serviceArt?{'--service-art':`url("${serviceArt}")`}:undefined}>
      <aside className="rental-services" aria-label={tr('Services','الخدمات')}>
        {selection}
        <label className="rental-service-select-label" htmlFor={`${tabsId}-service-select`}>{tr('Select a service','اختر خدمة')}</label>
        <select id={`${tabsId}-service-select`} className="rental-service-select" aria-label={tr('Services','الخدمات')} value={activeSection==='sets'?'sets':service?.id||''} onChange={event=>{const value=event.target.value;if(value==='sets')chooseSets();else{const selectedService=services.find(row=>row.id===value);if(selectedService)chooseService(selectedService);}}}>
          {services.map((row,index)=><option key={row.id} value={row.id}>{index+1}. {name(row)}</option>)}
          {setItems.length>0&&<option value="sets">{tr('Sets','مجموعات')} · {setItems.length}</option>}
        </select>
        <div className="rental-service-bar" role="tablist" aria-label={tr('Services','الخدمات')} aria-orientation="horizontal"><div className="rental-service-list">{services.map((row,index)=>{const Icon=serviceIcon(row);return <button type="button" key={row.id} id={`${tabsId}-service-${index}`} role="tab" className={row.selectionField?"rental-service-decision":undefined} aria-selected={row.id===service?.id&&activeSection!=='sets'} aria-controls={`${tabsId}-panel`} tabIndex={row.id===service?.id&&activeSection!=='sets'?0:-1} onKeyDown={serviceKeyDown} onClick={()=>chooseService(row)}><Icon size={18} strokeWidth={1.4}/><span>{name(row)}</span><small className="rental-number-tag" aria-label={`${tr('Service','الخدمة')} ${index+1}`}>{index+1}</small></button>;})}</div><button type="button" id={`${tabsId}-sets`} className="rental-sets-tab" role="tab" aria-selected={activeSection==='sets'} aria-controls={`${tabsId}-panel`} disabled={!setItems.length} tabIndex={activeSection==='sets'?0:-1} onKeyDown={serviceKeyDown} onClick={chooseSets}><Layers size={18} strokeWidth={1.4}/><span>{tr('Sets','مجموعات')}</span><small className="rental-number-tag">{setItems.length}</small></button></div>

      </aside>
    <DjWorkFeature ar={ar}/>
    <div className="rental-workspace">

      <div className="rental-service-panel" id={`${tabsId}-panel`} role={services.length?'tabpanel':'region'} aria-labelledby={activeSection==='sets'?`${tabsId}-sets`:services.length?`${tabsId}-service-${Math.max(0,serviceNumber-1)}`:undefined} aria-label={services.length?undefined:tr('Service equipment','معدات الخدمة')} tabIndex={0} data-view={showDetails?'detail':'list'}>
      {showDetails&&<div className="rental-center">
        <div className="rental-model-stage">
          {item&&(parts?.length?<EquipmentSetViewer key={item.id} parts={parts} name={name(item)} ar={ar} showControls={false}/>:src?<GeneratedModelViewer key={item.id} src={src} name={name(item)} ar={ar} showControls={false} showInteractionHint={false} fitToBounds/>:<p className="rental-no-model" role="status"><Box size={34} strokeWidth={1.2} aria-hidden="true"/>{tr('No 3D object available','لا يتوفر مجسم ثلاثي الأبعاد')}</p>)}
        </div>
      </div>}
      <aside ref={equipmentPane} className="rental-equipment" aria-label={tr('Equipment','المعدات')}>
        {showDetails?<>
          <div className="rental-equipment-detail-heading"><button ref={backButton} type="button" className="rental-equipment-back" aria-label={tr('Back to equipment list','العودة إلى قائمة المعدات')} onClick={()=>{restoreFocus.current=true;setDetail(null);}}><ArrowLeft size={20}/></button><div className="rental-equipment-detail-title"><span className="rental-label">{item.brandModel}</span><h3>{equipmentTag(item)} · {name(item)}</h3></div></div>
          <div className="rental-equipment-detail" key={item.id}>
            <ItemInfo item={item} quantity={quantity} onQuantity={onQuantity} ar={ar}/>
          </div>
        </>:<>
        <div className="rental-equipment-scroll">

        <div id="rental-equipment-panel" role="region" aria-label={activeSection==='sets'?tr('Sets','مجموعات'):name(service||{name:tr("Service items","عناصر الخدمة")})} className="rental-equipment-list">{visibleItems.map(row=><button type="button" key={row.id} aria-pressed={row.id===item?.id} onClick={()=>openEquipment(row)}><span className="rental-equipment-number" aria-label={`${tr('Equipment','المعدة')} ${equipmentTag(row)}`}>{equipmentTag(row)}</span><EquipmentThumbnail key={`${row.id}:${row.imageUrl||''}`} item={row}/><span className="rental-equipment-card-copy"><span>{name(row)}</span>{row.brandModel&&<small>{row.brandModel}</small>}{cart[row.id]?.quantity>0&&<em className="rental-equipment-in-draft">{tr('Selected','المحدد')} · {cart[row.id].quantity}</em>}</span><ArrowUpRight size={14} aria-hidden="true"/></button>)}</div>
        {!items.length&&<p className="rental-empty" role="status">{failed?tr('Please try again shortly.','يرجى المحاولة لاحقاً.'):tr('The collection is being prepared.','جارٍ إعداد المجموعة.')}</p>}

        </div>
        </>}
      </aside>
      </div>
    </div>

    </div>
  </>;
}
