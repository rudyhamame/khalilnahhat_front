import {useMemo,useState} from 'react';
import {AudioLines, Box, Disc3, Monitor, Sparkles, WandSparkles, Building2, ArrowUpRight} from 'lucide-react';
import GeneratedModelViewer from '../components/GeneratedModelViewer';
import EquipmentSetViewer from './EquipmentSetViewer';
import {isEquipmentSet} from '../components/equipmentSets';
import EquipmentAvailability from './EquipmentAvailability';
import EquipmentQuantityPicker, {AddToBookingButton} from './EquipmentQuantityPicker';
import './rentalWorkbench.css';

const serviceIcons={dj:Disc3,sound:AudioLines,lighting:Sparkles,led:Monitor,fx:WandSparkles,corporate:Building2};
function EquipmentThumbnail({item}){
  const sources=[item.imageUrl].filter(Boolean);
  const [attempt,setAttempt]=useState(0);
  return <span className="rental-equipment-thumbnail" aria-hidden="true">{sources[attempt]?<img src={sources[attempt]} alt="" loading="lazy" onError={()=>setAttempt(value=>value+1)}/>:<Box size={20} strokeWidth={1.2}/>}</span>;
}

// Availability, description and booking controls live inside the explorer; tapping the description expands it.
function ItemInfo({item,quantity,onQuantity,ar}){
  const [open,setOpen]=useState(false),tr=(en,arabic)=>ar?arabic:en;
  const rows=[[tr('What it does','ماذا يفعل'),item.functionSummary],[tr('Description','الوصف'),item.description]].filter(([,text])=>text);
  return <div className="rental-item-info">{rows.length>0&&<button type="button" className="rental-item-text" aria-expanded={open} onClick={()=>setOpen(value=>!value)}><div className={`rental-item-copy${open?' is-open':''}`}>{rows.map(([label,text])=><p key={label}><b>{label}</b><span>{text}</span></p>)}</div></button>}<div className="rental-booking"><EquipmentQuantityPicker badge={<EquipmentAvailability item={item} ar={ar} draft={quantity}/>} quantityLabel={ar?'الكمية':'Quantity'} item={item} quantity={quantity} onChange={onQuantity} ar={ar}/><AddToBookingButton item={item} quantity={quantity} onChange={onQuantity} ar={ar}/></div></div>;
}
// Hyperlink opposite the Equipment heading: opens a list of what is already in the booking draft.
function SelectedSoFar({cart,onQuantity,ar}){
  const [open,setOpen]=useState(false),tr=(en,arabic)=>ar?arabic:en;
  const rows=Object.values(cart||{}).filter(row=>row?.quantity>0),count=rows.reduce((sum,row)=>sum+row.quantity,0);
  if(!rows.length)return null;
  return <>
    <button type="button" className="rental-selected-link" aria-expanded={open} onClick={()=>setOpen(value=>!value)}>{tr('Selected','المحدد')} · {count}</button>
    {open&&<ul className="rental-selected-list" aria-label={tr('Selected equipment','المعدات المحددة')}>{rows.map(row=><li key={row.id}><span>{ar?row.nameAr||row.name:row.name}</span><b>×{row.quantity}</b><button type="button" aria-label={`${tr('Remove','إزالة')} ${row.name}`} onClick={()=>onQuantity(row,0)}>×</button></li>)}</ul>}
  </>;
}
export default function RentalWorkbench({services,service,items,selectedItem:item,onService,onEquipment,cart,onQuantity,ar,failed}){
  const tr=(en,arabic)=>ar?arabic:en, name=row=>tr(row.name,row.nameAr||row.name);
  const src=item?.modelUrl,parts=useMemo(()=>item?.modelParts?.map((part,index)=>({key:String(index),label:[part.name,part.nameAr||part.name],src:part.src,height:part.y||0,at:[part.x,part.z,part.rotation*Math.PI/180]})),[item?.modelParts]);
  const sections=[{id:'individual',label:tr('Individual','معدات فردية'),items:items.filter(row=>!isEquipmentSet(row))},{id:'sets',label:tr('Sets','مجموعات'),items:items.filter(isEquipmentSet)}];
  const activeSection=isEquipmentSet(item)?'sets':'individual';
  const visibleItems=sections.find(section=>section.id===activeSection).items;
  const quantity=item?(cart[item.id]?.quantity||0):0;
  return <div className="rental-workbench" dir={ar?'rtl':'ltr'}>
    <div className="rental-workspace">
      <aside className="rental-services" aria-label={tr('Services','الخدمات')}>
        <p className="rental-label">01 — {tr('SERVICES','الخدمات')}</p>
        
        <div className="rental-service-list">{services.map((row,index)=>{const Icon=serviceIcons[row.id]||Box;return <button type="button" key={row.id} aria-pressed={row.id===service?.id} onClick={()=>onService(row)}><Icon size={18} strokeWidth={1.4}/><span>{name(row)}</span><small>{String(index+1).padStart(2,'0')}</small></button>;})}</div>

      </aside>
      <div className="rental-center">
        <div className="rental-object-heading"><span className="rental-label">{tr('EQUIPMENT EXPLORER','استكشف المعدات')}</span></div>
        <div className="rental-model-stage">
          {item?(parts?.length?<EquipmentSetViewer key={item.id} parts={parts} name={name(item)} ar={ar}/>:src?<GeneratedModelViewer key={item.id} src={src} name={name(item)} ar={ar} showInteractionHint={false} fitToBounds/>:item.imageUrl?<img src={item.imageUrl} alt={name(item)}/>:<Box size={90} strokeWidth={.7}/>):<p role="status">{failed?tr('Equipment is temporarily unavailable.','المعدات غير متاحة حالياً.'):tr('No equipment added to this service yet.','لم تُضَف معدات لهذه الخدمة بعد.')}</p>}
        </div>
        <div className="rental-object-caption" aria-live="polite"><span className="rental-label">{item?.brandModel}</span><h3>{item?name(item):service?name(service):tr('Explore the collection','استكشف المجموعة')}</h3></div>
        {item&&<ItemInfo key={item.id} item={item} quantity={quantity} onQuantity={onQuantity} ar={ar}/>}
      </div>
      <aside className="rental-equipment" aria-label={tr('Equipment','المعدات')}>
        <div className="rental-equipment-heading"><p className="rental-label">02 — {tr('EQUIPMENT','المعدات')}</p><SelectedSoFar cart={cart} onQuantity={onQuantity} ar={ar}/></div>
        <div className="rental-equipment-sections" role="tablist" aria-label={tr('Equipment type','نوع المعدات')}>{sections.map(section=><button key={section.id} id={`rental-tab-${section.id}`} type="button" role="tab" aria-selected={section.id===activeSection} aria-controls="rental-equipment-panel" disabled={!section.items.length} onClick={()=>{if(section.items[0])onEquipment(section.items[0]);}} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const target=event.key==='Home'?'individual':event.key==='End'?'sets':activeSection==='sets'?'individual':'sets';const next=sections.find(section=>section.id===target&&section.items.length);if(next){event.currentTarget.parentElement.querySelector(`[id="rental-tab-${next.id}"]`)?.focus();onEquipment(next.items[0]);}}}} tabIndex={section.id===activeSection?0:-1}><span>{section.label}</span><b>{section.items.length}</b></button>)}</div>
        <div id="rental-equipment-panel" role="tabpanel" aria-labelledby={`rental-tab-${activeSection}`} className="rental-equipment-list">{visibleItems.map((row,index)=><button type="button" key={row.id} aria-pressed={row.id===item?.id} onClick={()=>onEquipment(row)}><small>{String(index+1).padStart(2,'0')}</small><EquipmentThumbnail key={`${row.id}:${row.imageUrl||''}`} item={row}/><span className="rental-equipment-card-copy"><span>{name(row)}</span>{row.brandModel&&<small>{row.brandModel}</small>}</span><ArrowUpRight size={14}/></button>)}</div>
        {!items.length&&<p className="rental-empty" role="status">{failed?tr('Please try again shortly.','يرجى المحاولة لاحقاً.'):tr('The collection is being prepared.','جارٍ إعداد المجموعة.')}</p>}

      </aside>
    </div>

  </div>;
}
