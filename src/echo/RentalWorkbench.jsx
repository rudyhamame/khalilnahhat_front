import {serviceIcon} from '../lib/serviceIcons';
import {displayImageUrl} from '../lib/displayImage';
import {useEventOrder} from './eventOrderContext';
import {useEffect,useMemo,useRef,useState} from 'react';
import {AudioLines, Box, Disc3, Monitor, Sparkles, WandSparkles, Building2, ArrowUpRight, ArrowLeft} from 'lucide-react';
import GeneratedModelViewer from '../components/GeneratedModelViewer';
import EquipmentSetViewer from './EquipmentSetViewer';
import {isEquipmentSet} from '../components/equipmentSets';
import EquipmentAvailability from './EquipmentAvailability';
import EquipmentQuantityPicker, {RemoveFromBookingButton} from './EquipmentQuantityPicker';
import './rentalWorkbench.css';
import './rentalEquipment.css';
import './rentalServices.css';

function EquipmentThumbnail({item,onAspectRatio}){
  const sources=[displayImageUrl(item.imageUrl)].filter(Boolean);
  const [attempt,setAttempt]=useState(0);
  return <span className="rental-equipment-thumbnail" aria-hidden="true">{sources[attempt]?<img src={sources[attempt]} alt="" loading="lazy" onLoad={event=>{const image=event.currentTarget;if(image.naturalWidth&&image.naturalHeight)onAspectRatio?.(`${image.naturalWidth} / ${image.naturalHeight}`);}} onError={()=>setAttempt(value=>value+1)}/>:<Box size={20} strokeWidth={1.2}/>}</span>;
}

// Equipment details and booking controls live in the equipment pane.
function ItemInfo({item,quantity,onQuantity,ar}){
  const tr=(en,arabic)=>ar?arabic:en;
  const rows=[[tr('What it does','ماذا يفعل'),item.functionSummary],[tr('Description','الوصف'),item.description]].filter(([,text])=>text);
  return <div className="rental-item-info">{rows.length>0&&<div className="rental-item-copy">{rows.map(([label,text])=><p key={label}><b>{label}</b><span>{text}</span></p>)}</div>}<div className="rental-booking"><EquipmentQuantityPicker badge={<span className="rental-stock-actions"><EquipmentAvailability item={item} ar={ar} draft={quantity}/><RemoveFromBookingButton item={item} quantity={quantity} onChange={onQuantity} ar={ar}/></span>} quantityLabel={ar?'الكمية':'Quantity'} item={item} quantity={quantity} onChange={onQuantity} ar={ar}/></div></div>;
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
  const order=useEventOrder();
 const tr=(en,arabic)=>ar?arabic:en, name=row=>tr(row.name,row.nameAr||row.name);
  const [detail,setDetail]=useState(null);
  const [artworkRatios,setArtworkRatios]=useState({});
  const equipmentPane=useRef(null),restoreFocus=useRef(false),backButton=useRef(null);
  const showDetails=Boolean(item&&detail?.itemId===item.id&&detail?.serviceId===service?.id);
  useEffect(()=>{setDetail(null);},[service?.id]);
  useEffect(()=>{
    if(showDetails)backButton.current?.focus();
    else if(restoreFocus.current){equipmentPane.current?.querySelector('.rental-equipment-list>button[aria-pressed="true"]')?.focus();restoreFocus.current=false;}
  },[showDetails]);
  const openEquipment=row=>{onEquipment(row);setDetail({itemId:row.id,serviceId:service?.id});};
  const src=item?.modelUrl,parts=useMemo(()=>item?.modelParts?.map((part,index)=>({key:String(index),label:[part.name,part.nameAr||part.name],src:part.src,height:part.y||0,at:[part.x,part.z,part.rotation*Math.PI/180]})),[item?.modelParts]);
  const sections=[{id:'individual',label:tr('Individual','معدات فردية'),items:items.filter(row=>!isEquipmentSet(row))},{id:'sets',label:tr('Sets','مجموعات'),items:items.filter(isEquipmentSet)}];
  const activeSection=isEquipmentSet(item)?'sets':'individual';
  const showEquipmentTabs=!service?.selectionField;
  const visibleItems=showEquipmentTabs?sections.find(section=>section.id===activeSection).items:items;
  const serviceNumber=services.findIndex(row=>row.id===service?.id)+1;
  const equipmentTag=row=>`${serviceNumber}.${items.findIndex(entry=>entry.id===row.id)+1}`;
  const quantity=item?(cart[item.id]?.quantity||0):0;
  const selectionField=service?.selectionField;
  const serviceAdded=Boolean(selectionField&&order?.order.music?.[selectionField.split('.')[1]]);
  const serviceChoice=selectionField&&order?<button type="button" className="rental-service-choice" aria-pressed={serviceAdded} onClick={()=>order.setField(selectionField,!serviceAdded)}>{serviceAdded?tr('Remove MC Host from booking','إزالة مقدم الحفل من الحجز'):tr('Add MC Host to booking','إضافة مقدم الحفل إلى الحجز')}</button>:null;
  return <div className="rental-workbench" dir={ar?'rtl':'ltr'}>
    <div className="rental-workspace">
      <aside className="rental-services" aria-label={tr('Services','الخدمات')}>
        <p className="rental-label">01 — {tr('SERVICES','الخدمات')}</p>
        
        <p className="rental-number-hint">{tr('Tell Echo the service number and equipment number, or use its tag (for example, 2.3).','أخبر إيكو برقم الخدمة ورقم المعدة، أو استخدم رمزها (مثلاً 2.3).')}</p><div className="rental-service-list">{services.map((row,index)=>{const Icon=serviceIcon(row);return <button type="button" key={row.id} className={row.selectionField?"rental-service-decision":undefined} aria-pressed={row.id===service?.id} onClick={()=>{setDetail(null);onService(row);}}><Icon size={18} strokeWidth={1.4}/><span>{name(row)}</span><small className="rental-number-tag" aria-label={`${tr('Service','الخدمة')} ${index+1}`}>{index+1}</small></button>;})}</div>

      </aside>
      <div className="rental-center">
        <div className="rental-model-stage">
          {item&&(parts?.length?<EquipmentSetViewer key={item.id} parts={parts} name={name(item)} ar={ar} showControls={false}/>:src?<GeneratedModelViewer key={item.id} src={src} name={name(item)} ar={ar} showControls={false} showInteractionHint={false} fitToBounds/>:null)}
        </div>
      </div>
      <aside ref={equipmentPane} className="rental-equipment" aria-label={tr('Equipment','المعدات')}>
        {showDetails?<>
          <div className="rental-equipment-detail-heading"><button ref={backButton} type="button" className="rental-equipment-back" aria-label={tr('Back to equipment list','العودة إلى قائمة المعدات')} onClick={()=>{restoreFocus.current=true;setDetail(null);}}><ArrowLeft size={20}/></button><p className="rental-label">{tr('EQUIPMENT','المعدات')}</p></div>
          <div className="rental-equipment-detail" key={item.id}>
            <div className="rental-equipment-detail-title"><span className="rental-label">{item.brandModel}</span><h3>{equipmentTag(item)} · {name(item)}</h3></div>
            {!src&&!parts?.length&&<p className="rental-empty">{tr('No 3D model available for this equipment.','لا يتوفر مجسم ثلاثي الأبعاد لهذه المعدات.')}</p>}
            <ItemInfo item={item} quantity={quantity} onQuantity={onQuantity} ar={ar}/>
          </div>
        </>:<>
        <div className="rental-equipment-heading"><div className="rental-equipment-intro"><p className="rental-label">02 — {tr('EQUIPMENT','المعدات')}</p><h3>{name(service||{name:tr('Collection','المجموعة')})}</h3><span>{tr('Explore your event essentials','استكشف تجهيزات فعاليتك')}</span></div><SelectedSoFar cart={cart} onQuantity={onQuantity} ar={ar}/></div>
        {(service?.description||serviceChoice)&&<div className="rental-service-summary">{service?.description&&<p className="rental-service-description">{ar?(service.descriptionAr||service.description):service.description}</p>}{serviceChoice}</div>}
        {showEquipmentTabs&&<div className="rental-equipment-sections" role="tablist" aria-label={tr('Equipment type','نوع المعدات')}>{sections.map(section=><button key={section.id} id={`rental-tab-${section.id}`} type="button" role="tab" aria-selected={section.id===activeSection} aria-controls="rental-equipment-panel" disabled={!section.items.length} onClick={()=>{if(section.items[0])onEquipment(section.items[0]);}} onKeyDown={event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();const target=event.key==='Home'?'individual':event.key==='End'?'sets':activeSection==='sets'?'individual':'sets';const next=sections.find(section=>section.id===target&&section.items.length);if(next){event.currentTarget.parentElement.querySelector(`[id="rental-tab-${next.id}"]`)?.focus();onEquipment(next.items[0]);}}}} tabIndex={section.id===activeSection?0:-1}><span>{section.label}</span><b>{section.items.length}</b></button>)}</div>}
        <div id="rental-equipment-panel" role={showEquipmentTabs?"tabpanel":"region"} aria-labelledby={showEquipmentTabs?`rental-tab-${activeSection}`:undefined} aria-label={showEquipmentTabs?undefined:name(service||{name:tr("Service items","عناصر الخدمة")})} className="rental-equipment-list">{visibleItems.map(row=><button type="button" key={row.id} style={{'--equipment-art-ratio':artworkRatios[`${row.id}:${row.imageUrl||''}`]||'1 / 1'}} aria-pressed={row.id===item?.id} onClick={()=>openEquipment(row)}><span className="rental-equipment-number" aria-label={`${tr('Equipment','المعدة')} ${equipmentTag(row)}`}>{equipmentTag(row)}</span><EquipmentThumbnail key={`${row.id}:${row.imageUrl||''}`} item={row} onAspectRatio={ratio=>setArtworkRatios(current=>current[`${row.id}:${row.imageUrl||''}`]===ratio?current:{...current,[`${row.id}:${row.imageUrl||''}`]:ratio})}/><span className="rental-equipment-card-copy"><span>{name(row)}</span>{row.brandModel&&<small>{row.brandModel}</small>}{cart[row.id]?.quantity>0&&<em className="rental-equipment-in-draft">{tr('Selected','المحدد')} · {cart[row.id].quantity}</em>}</span><ArrowUpRight size={14} aria-hidden="true"/></button>)}</div>
        {!items.length&&<p className="rental-empty" role="status">{failed?tr('Please try again shortly.','يرجى المحاولة لاحقاً.'):tr('The collection is being prepared.','جارٍ إعداد المجموعة.')}</p>}

        </>}
      </aside>
    </div>

  </div>;
}
