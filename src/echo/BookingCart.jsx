import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ShoppingCart,X,Trash2,Sparkles,ArrowRight,Check} from 'lucide-react';
import {useEventOrder} from './eventOrderContext';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import {bookingServiceId,equipmentBelongsToService} from '../lib/rentalCatalog';
import {bookingNextStep} from '../lib/bookingNextStep';
import {missingOrderFields} from '../lib/eventOrderCore.mjs';
import {scrollToAppSection} from '../lib/bookingViewport';
import EquipmentQuantityPicker from './EquipmentQuantityPicker';
import EquipmentAvailability from './EquipmentAvailability';
import {displayImageUrl} from '../lib/displayImage';
import './bookingCart.css';

export default function BookingCart({children,ar=false}){
 const ctx=useEventOrder(),{catalog,equipment,loading,failed}=useRentalCatalog();
 const [open,setOpen]=useState(false),[editError,setEditError]=useState(''),dialog=useRef(null),trigger=useRef(null);
 const tr=(en,arabic)=>ar?arabic:en;
 const order=ctx?.order,services=order?.services||[],items=order?.equipment||[];
 const count=services.length+items.length;
 const owner=ctx?.draftId;
 useEffect(()=>{setOpen(false);setEditError('');},[owner]);
 useEffect(()=>{
  const node=dialog.current;if(!node)return;
  if(open&&!node.open)node.showModal();else if(!open&&node.open)node.close();
 },[open]);
 useEffect(()=>{if(!count)setOpen(false);},[count]);
 const close=()=>setOpen(false);
 const continueWith=method=>{
  close();
  requestAnimationFrame(()=>{if(method==='ai')ctx?.openAssistant({source:'cart'});else ctx?.reviewDraft();});
 };
 const browse=()=>{close();requestAnimationFrame(()=>scrollToAppSection('setup',{source:'booking-cart'}));};
 const editable=ctx?.cloudReady&&!ctx?.clearing&&!loading&&!failed&&!['conflict','delete-conflict'].includes(ctx?.saveState);
 const applyCartEdit=edit=>{
  const result=edit();
  setEditError(result?.rejectedFields?.length?tr('This change could not be applied. Check availability or reload your draft.','تعذر تطبيق هذا التغيير. تحقق من التوفر أو أعد تحميل المسودة.'):'');
 };
 const changeQuantity=(item,quantity)=>applyCartEdit(()=>ctx.setEquipment(item,quantity));
 const serviceRow=id=>catalog.find(row=>row.kind==='service'&&bookingServiceId(row)===id);
 const serviceName=id=>{const row=serviceRow(id);return row?(ar?(row.nameAr||row.name):row.name):(ctx?.lang?.t?.q?.svcs?.[id]||id);};
 const hydrated=items.map(line=>({...line,...equipment.find(item=>item.id===line.id),quantity:line.quantity}));
 const next=order?bookingNextStep(order,ar):null;
 const missing=order?missingOrderFields(order).length:0;
 const status=['pending','saving'].includes(ctx?.saveState)?tr('Saving your draft…','جارٍ حفظ المسودة…'):['account-failed','failed'].includes(ctx?.saveState)?tr('Changes are kept here. Retry saving.','التغييرات محفوظة هنا. أعد محاولة الحفظ.'):['conflict','delete-conflict'].includes(ctx?.saveState)?tr('This draft changed elsewhere. Reload before editing.','تغيّرت المسودة في مكان آخر. أعد تحميلها قبل التعديل.'):ctx?.cloudReady?tr('Saved automatically with your event draft','تُحفظ تلقائياً مع مسودة الفعالية'):tr('Loading your saved draft…','جارٍ تحميل مسودتك…');
 return <>
  <div className={`home-booking-actions${count?' has-booking':''}`} role="group" aria-label={tr('Equipment and booking cart','المعدات وسلة الحجز')}>
   {children}
   {count>0&&<button ref={trigger} type="button" className="home-booking-cart-button" aria-label={`${tr('Booking cart','سلة الحجز')} · ${count}`} data-tooltip={tr('Booking cart','سلة الحجز')} aria-haspopup="dialog" aria-expanded={open} aria-controls="booking-cart-dialog" onClick={()=>setOpen(true)}><ShoppingCart size={20} strokeWidth={1.6} aria-hidden="true"/><span className="booking-cart-count" aria-hidden="true">{count}</span></button>}
  </div>
  {createPortal(<dialog ref={dialog} id="booking-cart-dialog" className="booking-cart-dialog" dir={ar?'rtl':'ltr'} aria-labelledby="booking-cart-title" onCancel={close} onClose={()=>{close();trigger.current?.focus({preventScroll:true});}} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();}}}>
   <header><div><span>{tr('YOUR EVENT DRAFT','مسودة فعاليتك')}</span><h2 id="booking-cart-title">{tr('Booking cart','سلة الحجز')}</h2><p>{tr('One booking, whether you choose here or ask Echo.','حجز واحد، سواء اخترت هنا أو استعنت بإيكو.')}</p></div><button type="button" className="booking-cart-icon" onClick={close} aria-label={tr('Close booking cart','إغلاق سلة الحجز')}><X size={20}/></button></header>
   <div className="booking-cart-body">
    {editError&&<p role="alert" className="booking-cart-note">{editError}</p>}
    <div className="booking-cart-event"><strong>{[ctx?.lang?.t?.q?.eventTypes?.[order?.event?.type],order?.event?.date].filter(Boolean).join(' · ')||tr('Your event','فعاليتك')}</strong><span>{order?.event?.venue?.name||tr('Venue not selected yet','لم يُحدد المكان بعد')}</span></div>
    {services.length>0&&<section><h3>{tr('Services','الخدمات')}<span>{services.length}</span></h3><ul className="booking-cart-services">{services.map(id=>{
     const row=serviceRow(id),linked=row&&hydrated.some(item=>equipmentBelongsToService(item,row,equipment));
     return <li key={id}><Check size={16} aria-hidden="true"/><div><strong>{serviceName(id)}</strong>{linked&&!row?.selectionField&&<small>{tr('Includes selected equipment below','يتضمن المعدات المحددة أدناه')}</small>}</div><button type="button" className="booking-cart-icon" disabled={!editable} aria-label={`${tr('Remove service','إزالة الخدمة')} ${serviceName(id)}`} onClick={()=>applyCartEdit(()=>ctx.removeService(id))}><Trash2 size={16}/></button></li>;
    })}</ul></section>}
    {hydrated.length>0&&<section><h3>{tr('Equipment','المعدات')}<span>{items.reduce((total,item)=>total+item.quantity,0)} {tr('units','وحدة')}</span></h3><ul className="booking-cart-equipment">{hydrated.map(item=><li key={item.id}>{item.imageUrl&&<img src={displayImageUrl(item.imageUrl)} alt=""/>}<div className="booking-cart-item"><strong>{ar?(item.nameAr||item.name):item.name}</strong><EquipmentAvailability item={item} ar={ar} draft={item.quantity}/><fieldset disabled={!editable}><EquipmentQuantityPicker item={item} quantity={item.quantity} onChange={changeQuantity} ar={ar}/></fieldset></div><button type="button" className="booking-cart-icon" disabled={!editable} aria-label={`${tr('Remove','إزالة')} ${item.name}`} onClick={()=>changeQuantity(item,0)}><Trash2 size={16}/></button></li>)}</ul></section>}
    <div className="booking-cart-next"><span>{missing?tr('NEXT BOOKING DETAIL','تفصيل الحجز التالي'):tr('REVIEW YOUR BOOKING','راجع حجزك')}</span><p>{next?.text}</p></div>
    <p className="booking-cart-note">{tr('These are draft selections. Prices and event-date availability are confirmed in your quote.','هذه اختيارات للمسودة. تُؤكد الأسعار والتوفر لتاريخ الفعالية في عرض السعر.')}</p>
   </div>
   <footer><p role="status">{ctx?.saveState==='load-failed'?tr('Could not load your saved draft. Retry before editing.','تعذر تحميل المسودة. أعد المحاولة قبل التعديل.'):status}</p>{ctx?.saveState==='load-failed'&&<button type="button" onClick={ctx.retrySync}>{tr('Retry loading draft','إعادة تحميل المسودة')}</button>}{['account-failed','failed'].includes(ctx?.saveState)&&<button type="button" onClick={()=>ctx.save()}>{tr('Retry save','إعادة الحفظ')}</button>}{['conflict','delete-conflict'].includes(ctx?.saveState)&&<button type="button" onClick={ctx.retrySync}>{tr('Reload draft','إعادة تحميل المسودة')}</button>}<div><button type="button" onClick={browse}>{tr('Add more equipment','إضافة معدات أخرى')}</button><button type="button" onClick={()=>continueWith('ai')}><Sparkles size={16}/>{tr('Ask Echo','اسأل إيكو')}</button><button type="button" className="booking-cart-continue" onClick={()=>continueWith('manual')}>{tr('Continue manually','المتابعة يدوياً')}<ArrowRight size={16}/></button></div></footer>
  </dialog>,document.body)}
 </>;
}
