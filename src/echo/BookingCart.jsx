import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ClipboardList,X,Trash2,Sparkles,ArrowRight,Check} from 'lucide-react';
import {useEventOrder} from './eventOrderContext';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import {bookingServiceId,equipmentBelongsToService} from '../lib/rentalCatalog';
import {bookingNextStep} from '../lib/bookingNextStep';
import {missingOrderFields} from '../lib/eventOrderCore.mjs';
import {scrollToAppSection} from '../lib/bookingViewport';
import EquipmentQuantityPicker from './EquipmentQuantityPicker';
import EquipmentAvailability from './EquipmentAvailability';
import {displayImageUrl} from '../lib/displayImage';
import {dialectRecord} from '../lib/dialects';
import './bookingCart.css';

const LANGUAGES={arabic:['Arabic','العربية'],english:['English','الإنجليزية'],kurdish:['Kurdish','الكردية'],armenian:['Armenian','الأرمنية'],other:['Other','أخرى'],mixed:['Mixed','متنوعة']};
const SETTINGS={indoor:['Indoor','داخلي'],outdoor:['Outdoor','خارجي'],both:['Indoor and outdoor','داخلي وخارجي']};
const clock=(value,ar)=>{const match=/^(\d{1,2}):(\d{2})/.exec(String(value||''));if(!match)return '';const hour=Number(match[1])%24;return `${hour%12||12}:${match[2]} ${hour<12?(ar?'ص':'AM'):(ar?'م':'PM')}`;};
export default function BookingCart({ar=false}){
 const ctx=useEventOrder(),{catalog,equipment,loading,failed}=useRentalCatalog();
 const [open,setOpen]=useState(false),[editError,setEditError]=useState(''),dialog=useRef(null),trigger=useRef(null);
 const tr=(en,arabic)=>ar?arabic:en;
 const order=ctx?.order,services=order?.services||[],items=order?.equipment||[];
 // Anything entered counts: event type, date, times, guests, venue and the rest, as well as services and equipment.
 const filled=value=>value&&typeof value==='object'?Object.entries(value).reduce((total,[key,child])=>total+(key==='timezone'?0:filled(child)),0):(value===null||value===undefined||value===''||value===false?0:1);
 const count=services.length+items.length+filled(order?.event);
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
  {count>0&&createPortal(<div className="home-booking-cart" dir={ar?'rtl':'ltr'}><button ref={trigger} type="button" className="home-booking-cart-button" aria-label={`${tr('Booking summary','ملخص الحجز')} · ${count}`} data-tooltip={tr('Booking summary','ملخص الحجز')} aria-haspopup="dialog" aria-expanded={open} aria-controls="booking-cart-dialog" onClick={()=>setOpen(true)}><ClipboardList size={20} strokeWidth={1.6} aria-hidden="true"/><span className="booking-cart-count" aria-hidden="true">{count}</span></button></div>,document.body)}
  {createPortal(<dialog ref={dialog} id="booking-cart-dialog" className="booking-cart-dialog" dir={ar?'rtl':'ltr'} aria-labelledby="booking-cart-title" onCancel={close} onClose={()=>{close();trigger.current?.focus({preventScroll:true});}} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)close();}}}>
   <header><div><span>{tr('YOUR EVENT DRAFT','مسودة فعاليتك')}</span><h2 id="booking-cart-title">{tr('Booking summary','ملخص الحجز')}</h2><p>{tr('One booking, whether you choose here or ask Echo.','حجز واحد، سواء اخترت هنا أو استعنت بإيكو.')}</p></div><button type="button" className="booking-cart-icon" onClick={close} aria-label={tr('Close booking cart','إغلاق ملخص الحجز')}><X size={20}/></button></header>
   <div className="booking-cart-body">
    {editError&&<p role="alert" className="booking-cart-note">{editError}</p>}
    {(()=>{
     const event=order?.event||{},music=order?.music||{},venue=event.venue||{};
     const djOn=Boolean(music.djRequested||services.includes('dj'));
     const rentalServices=services.filter(id=>id!=='dj');
     const rentalOn=rentalServices.length>0||hydrated.length>0;
     const typeLabel=ctx?.lang?.t?.q?.eventTypes?.[event.type]||event.type;
     const dateLabel=event.date?new Date(event.date+'T12:00:00').toLocaleDateString(ar?'ar':'en-CA',{weekday:'long',year:'numeric',month:'long',day:'numeric'}):'';
     const timeLabel=event.startTime&&event.endTime?`${clock(event.startTime,ar)} – ${clock(event.endTime,ar)}`:clock(event.startTime||event.endTime,ar);
     const street=[venue.address,venue.city,venue.postalCode].filter(Boolean).join(', ');
     const eventRows=[
      [tr('Event type','نوع الفعالية'),typeLabel],[tr('Event title','عنوان الفعالية'),event.title],[tr('Date','التاريخ'),dateLabel],[tr('Time','الوقت'),timeLabel],[tr('Guests','الضيوف'),event.guestCount],
      [tr('Venue','المكان'),venue.name],[tr('Address','العنوان'),street],[tr('Unit / extra info','الوحدة / معلومات إضافية'),typeof venue.addressDetails==='string'?venue.addressDetails:''],[tr('Setting','البيئة'),SETTINGS[venue.setting]?.[ar?1:0]],
     ].filter(([,value])=>value!==undefined&&value!==null&&value!=='');
     const styles=(music.styles||[]).map(id=>LANGUAGES[id]?.[ar?1:0]||id).join(', ');
     const dialects=(music.dialects||[]).map(id=>{const record=dialectRecord(id);return record?(ar?record.display_name_ar||record.display_name:record.display_name):id;}).join(', ');
     const djRows=[[tr('Service','الخدمة'),serviceName('dj')],[tr('Music of interest','نوع الموسيقى'),styles],[tr('Dialects','اللهجات'),dialects],[tr('Other language','لغة أخرى'),music.otherLanguage],[tr('Favourite songs / artists','الأغاني / الفنانون المفضلون'),music.otherPreferences]].filter(([,value])=>value);
     let n=0;
     const head=(title,extra)=><h3><span className="bs-num" aria-hidden="true">{++n}</span>{title}{extra}</h3>;
     return <>
      <section className="bs-section" aria-label={tr('Event info','معلومات الفعالية')}>{head(tr('Event info','معلومات الفعالية'))}
       {eventRows.length?<dl className="bs-rows">{eventRows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>:<p className="booking-cart-note">{tr('Nothing entered yet.','لم يتم إدخال شيء بعد.')}</p>}</section>
      {djOn&&<section className="bs-section" aria-label={tr('DJ service','خدمة الدي جي')}>{head(tr('DJ service','خدمة الدي جي'),<button type="button" className="booking-cart-icon" disabled={!editable} aria-label={`${tr('Remove service','إزالة الخدمة')} ${serviceName('dj')}`} onClick={()=>applyCartEdit(()=>ctx.removeService('dj'))}><Trash2 size={16}/></button>)}
       <dl className="bs-rows">{djRows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
      {rentalOn&&<section className="bs-section" aria-label={tr('Rental services and equipment','خدمات ومعدات التأجير')}>{head(tr('Rental services & equipment','خدمات ومعدات التأجير'))}
       {rentalServices.length>0&&<ul className="booking-cart-services">{rentalServices.map(id=>{
        const row=serviceRow(id),linked=row&&hydrated.some(item=>equipmentBelongsToService(item,row,equipment));
        return <li key={id}><Check size={16} aria-hidden="true"/><div><strong>{serviceName(id)}</strong>{linked&&!row?.selectionField&&<small>{tr('Includes selected equipment below','يتضمن المعدات المحددة أدناه')}</small>}</div><button type="button" className="booking-cart-icon" disabled={!editable} aria-label={`${tr('Remove service','إزالة الخدمة')} ${serviceName(id)}`} onClick={()=>applyCartEdit(()=>ctx.removeService(id))}><Trash2 size={16}/></button></li>;
       })}</ul>}
       {hydrated.length>0&&<ul className="booking-cart-equipment">{hydrated.map(item=><li key={item.id}>{item.imageUrl&&<img src={displayImageUrl(item.imageUrl)} alt=""/>}<div className="booking-cart-item"><strong>{ar?(item.nameAr||item.name):item.name}</strong><EquipmentAvailability item={item} ar={ar} draft={item.quantity}/><fieldset disabled={!editable}><EquipmentQuantityPicker item={item} quantity={item.quantity} onChange={changeQuantity} ar={ar}/></fieldset></div><button type="button" className="booking-cart-icon" disabled={!editable} aria-label={`${tr('Remove','إزالة')} ${item.name}`} onClick={()=>changeQuantity(item,0)}><Trash2 size={16}/></button></li>)}</ul>}
      </section>}
     </>;
    })()}
    <div className="booking-cart-next"><span>{missing?tr('NEXT BOOKING DETAIL','تفصيل الحجز التالي'):tr('REVIEW YOUR BOOKING','راجع حجزك')}</span><p>{next?.text}</p></div>
    <p className="booking-cart-note">{tr('These are draft selections. Prices and event-date availability are confirmed in your quote.','هذه اختيارات للمسودة. تُؤكد الأسعار والتوفر لتاريخ الفعالية في عرض السعر.')}</p>
   </div>
   <footer><p role="status">{ctx?.saveState==='load-failed'?tr('Could not load your saved draft. Retry before editing.','تعذر تحميل المسودة. أعد المحاولة قبل التعديل.'):status}</p>{ctx?.saveState==='load-failed'&&<button type="button" onClick={ctx.retrySync}>{tr('Retry loading draft','إعادة تحميل المسودة')}</button>}{['account-failed','failed'].includes(ctx?.saveState)&&<button type="button" onClick={()=>ctx.save()}>{tr('Retry save','إعادة الحفظ')}</button>}{['conflict','delete-conflict'].includes(ctx?.saveState)&&<button type="button" onClick={ctx.retrySync}>{tr('Reload draft','إعادة تحميل المسودة')}</button>}<div><button type="button" onClick={browse}>{tr('Add more equipment','إضافة معدات أخرى')}</button><button type="button" onClick={()=>continueWith('ai')}><Sparkles size={16}/>{tr('Ask Echo','اسأل إيكو')}</button><button type="button" className="booking-cart-continue" onClick={()=>continueWith('manual')}>{tr('Continue manually','المتابعة يدوياً')}<ArrowRight size={16}/></button></div></footer>
  </dialog>,document.body)}
 </>;
}
