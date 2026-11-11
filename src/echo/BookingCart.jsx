import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ClipboardList,X,Trash2,Sparkles,ArrowRight,Check} from 'lucide-react';
import {useEventOrder} from './eventOrderContext';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import {bookingServiceId,equipmentBelongsToService} from '../lib/rentalCatalog';
import {bookingNextStep} from '../lib/bookingNextStep';
import {missingOrderFields} from '../lib/eventOrderCore.mjs';
import {scrollToAppSection,scrollToBookingField} from '../lib/bookingViewport';
import {blinkBookingField} from '../lib/blinkBookingField';
import EquipmentQuantityPicker from './EquipmentQuantityPicker';
import EquipmentAvailability from './EquipmentAvailability';
import {displayImageUrl} from '../lib/displayImage';
import {dialectRecord} from '../lib/dialects';
import {SONG_PHASES,optionLabel} from '../lib/djOptions';
import {dialectsOf,languagesOf} from '../lib/languagePairs.mjs';
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
 const goTo=section=>{close();requestAnimationFrame(()=>requestAnimationFrame(()=>{const bookingField={personal:'customer.fullName',review:'additional.specialRequests'}[section];if(bookingField){scrollToBookingField(bookingField,{source:'navigation'});return;}scrollToAppSection(section,{source:'navigation',face:section==='availability'?'calendar':undefined});}));};
 const continueWith=method=>{
  close();
  // Ask Echo scrolls to the Echo AI chapter. Wait two frames so the panel has closed (an open dialog blocks navigation).
  if(method==='ai'){requestAnimationFrame(()=>requestAnimationFrame(()=>scrollToAppSection('assistant',{source:'navigation'})));return;}
  // Continue manually: go to the chapter of the next missing detail and blink its input; when nothing is missing, review the booking.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   const path=next?.path;
   if(!path){ctx?.reviewDraft();return;}
   const onEventFace=path.startsWith('event.venue.')||['event.type','event.date','event.startTime','event.endTime','event.guestCount','event.title'].includes(path);
   if(onEventFace)scrollToAppSection('availability',{source:'navigation',face:'calendar'});else scrollToBookingField(path,{source:'navigation'});
   blinkBookingField(path);
  }));
 };
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
 const status=['pending','saving'].includes(ctx?.saveState)?tr('Saving your draft…','جارٍ حفظ المسودة…'):['account-failed','failed'].includes(ctx?.saveState)?tr('Changes are kept here. Retry saving.','التغييرات محفوظة هنا. أعد محاولة الحفظ.'):['conflict','delete-conflict'].includes(ctx?.saveState)?tr('This draft changed elsewhere. Reload before editing.','تغيّرت المسودة في مكان آخر. أعد تحميلها قبل التعديل.'):ctx?.cloudReady?'':tr('Loading your saved draft…','جارٍ تحميل مسودتك…');
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
     const asList=value=>Array.isArray(value)?value:String(value||'').split(/[\n,;]+/).map(item=>item.trim()).filter(Boolean);
     const customer=order?.customer||{};
     const personalRows=[[tr('Full name','الاسم الكامل'),customer.fullName],[tr('Email','البريد الإلكتروني'),customer.email],[tr('Phone','الهاتف'),customer.phone],[tr('Preferred contact','طريقة التواصل المفضلة'),customer.contactMethod?customer.contactMethod.charAt(0).toLocaleUpperCase()+customer.contactMethod.slice(1):''],[tr('Company','الشركة'),customer.company]];
     const extra=order?.additional||{},refs=order?.references||{};
     const reviewRows=[[tr('Inspiration photos','صور مُلهمة'),refs.images||[]],[tr('Event documents','مستندات الفعالية'),refs.documents||[]],[tr('Special requests','طلبات خاصة'),extra.specialRequests],[tr('Additional notes','ملاحظات إضافية'),extra.notes],[tr('Voucher code','رمز القسيمة'),extra.voucherCode]];
     const eventRows=[
      [tr('Event type','نوع الفعالية'),typeLabel],...(event.type==='other'?[[tr('Event title','عنوان الفعالية'),event.title]]:[]),[tr('Date','التاريخ'),dateLabel],[tr('Time','الوقت'),timeLabel],[tr('Guests','الضيوف'),event.guestCount],
      [tr('Venue name','اسم المكان'),venue.name],[tr('Street address','عنوان الشارع'),venue.address],[tr('City','المدينة'),venue.city],[tr('Postal code','الرمز البريدي'),venue.postalCode],[tr('Unit / extra info','الوحدة / معلومات إضافية'),typeof venue.addressDetails==='string'?venue.addressDetails:''],[tr('Indoor / outdoor','داخلي / خارجي'),SETTINGS[venue.setting]?.[ar?1:0]],
     ];
     // Languages come in pairs: language + dialect. The first language chosen is the main one; the rest are "other languages".
     const dialectName=record=>ar?(record.display_name_ar||record.display_name):record.display_name;
     const records=(music.dialects||[]).map(id=>({id,record:dialectRecord(id)}));
     const languageOf=record=>String(record?.language||'').toLowerCase();
     const pairs=(music.styles||[]).map(id=>{
      const label=id==='other'&&music.otherLanguage?music.otherLanguage:(LANGUAGES[id]?.[ar?1:0]||id);
      const matching=records.filter(({record})=>record&&languageOf(record)===(LANGUAGES[id]?.[0]||'').toLowerCase()&&id!=='other').map(({record})=>dialectName(record));
      return {language:label,dialect:matching.join(', ')};
     });
     for(const {id,record} of records)if(!record||!(music.styles||[]).some(styleId=>(LANGUAGES[styleId]?.[0]||'').toLowerCase()===languageOf(record)))pairs.push({language:record?(record.language?(ar?(record.language_ar||record.language):record.language):dialectName(record)):id,dialect:record&&record.language?dialectName(record):''});
     if(music.otherLanguage&&!(music.styles||[]).includes('other'))pairs.push({language:music.otherLanguage,dialect:''});
     const chosen=languagesOf(music.languagePairs||[]).map(language=>({language,dialect:dialectsOf(music.languagePairs,language).join(', ')}));
     const effectivePairs=chosen.length?chosen:pairs;
     const pairText=({language,dialect})=>dialect?`${language} — ${dialect}`:language;
     const songs=(Array.isArray(music.suggestedSongs)?music.suggestedSongs:[]).map(entry=>typeof entry==='string'?{phase:'',song:entry}:{phase:entry?.phase||'',song:[entry?.song||entry?.title,entry?.artist].filter(Boolean).join(' — ')}).filter(entry=>entry.song);
     const songList=songs.length?<ol className="bs-songs">{songs.map((entry,index)=><li key={index}>{entry.phase&&<b>{optionLabel(SONG_PHASES,entry.phase,ar)}</b>}<span>{entry.song}</span></li>)}</ol>:'';
     const djRows=[[tr('Service','الخدمة'),djOn?serviceName('dj'):''],[tr('Musical Influences','التأثيرات الموسيقية'),(music.influences?.length?music.influences:(music.styles||[])).map(id=>id==='other'&&music.otherLanguage?music.otherLanguage:(LANGUAGES[id]?.[ar?1:0]||id))],[tr('Music Genres','الأنواع الموسيقية'),[].concat(music.genres||[]).filter(Boolean)],[tr('Main language','اللغة الرئيسية'),effectivePairs[0]?pairText(effectivePairs[0]):''],[tr('Other languages','لغات أخرى'),effectivePairs.slice(1).map(pairText).join('\n')],[tr('Songs for event moments','أغانٍ للحظات الفعالية'),songList],[tr('Favourite songs','الأغاني المفضلة'),asList(music.favouriteSongs)],[tr('Favourite artists','الفنانون المفضلون'),asList(music.favouriteArtists)],...(music.otherPreferences?[[tr('Other music notes','ملاحظات موسيقية أخرى'),music.otherPreferences]]:[])];
     const cell=value=>Array.isArray(value)?(value.length?<ul className="bs-tags">{value.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul>:<span className="bs-empty">{tr('Not set yet','لم يُحدد بعد')}</span>):value===undefined||value===null||value===''?<span className="bs-empty">{tr('Not set yet','لم يُحدد بعد')}</span>:value;
     const assigned=new Set();
     const groups=rentalServices.map(id=>{const row=serviceRow(id);const mine=hydrated.filter(item=>!assigned.has(item.id)&&row&&equipmentBelongsToService(item,row,equipment));mine.forEach(item=>assigned.add(item.id));return {id,row,items:mine};});
     const unassigned=hydrated.filter(item=>!assigned.has(item.id));
     const equipmentList=list=><ul className="booking-cart-equipment">{list.map(item=><li key={item.id}>{item.imageUrl&&<img src={displayImageUrl(item.imageUrl)} alt=""/>}<div className="booking-cart-item"><strong>{ar?(item.nameAr||item.name):item.name}</strong><EquipmentAvailability item={item} ar={ar} draft={item.quantity}/><fieldset disabled={!editable}><EquipmentQuantityPicker item={item} quantity={item.quantity} onChange={changeQuantity} ar={ar}/></fieldset></div><button type="button" className="booking-cart-icon" disabled={!editable} aria-label={`${tr('Remove','إزالة')} ${item.name}`} onClick={()=>changeQuantity(item,0)}><Trash2 size={16}/></button></li>)}</ul>;
     let n=0;
     const head=(title,extra,section)=><h3><span className="bs-num" aria-hidden="true">{++n}</span><span className="bs-title">{title}</span><button type="button" className="bs-go" onClick={()=>goTo(section)} aria-label={`${tr('Go to','الانتقال إلى')} ${title}`}>{tr('Go to','انتقال')}<ArrowRight size={14} aria-hidden="true"/></button>{extra}</h3>;
     return <>
      <section className="bs-section" aria-label={tr('Personal info','المعلومات الشخصية')}>{head(tr('Personal info','المعلومات الشخصية'),null,'personal')}
       <dl className="bs-rows">{personalRows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{cell(value)}</dd></div>)}</dl></section>
      <section className="bs-section" aria-label={tr('Event info','معلومات الفعالية')}>{head(tr('Event info','معلومات الفعالية'),null,'availability')}
       <dl className="bs-rows">{eventRows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{cell(value)}</dd></div>)}</dl></section>
      <section className="bs-section" aria-label={tr('DJ service','خدمة الدي جي')}>{head(tr('DJ service','خدمة الدي جي'),djOn&&<button type="button" className="booking-cart-icon" disabled={!editable} aria-label={`${tr('Remove service','إزالة الخدمة')} ${serviceName('dj')}`} onClick={()=>applyCartEdit(()=>ctx.removeService('dj'))}><Trash2 size={16}/></button>,'work')}
       <dl className="bs-rows">{djRows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{cell(value)}</dd></div>)}</dl></section>
      <section className="bs-section" aria-label={tr('Rental services and equipment','خدمات ومعدات التأجير')}>{head(tr('Rental services & equipment','خدمات ومعدات التأجير'),null,'setup')}
       {!rentalOn&&<dl className="bs-rows"><div><dt>{tr('Services','الخدمات')}</dt><dd>{cell('')}</dd></div><div><dt>{tr('Equipment','المعدات')}</dt><dd>{cell('')}</dd></div></dl>}
       {groups.map(({id,items:mine})=><div className="bs-sub" key={id}>
        <h4><Check size={15} aria-hidden="true"/><span>{serviceName(id)}</span><button type="button" className="booking-cart-icon" disabled={!editable} aria-label={`${tr('Remove service','إزالة الخدمة')} ${serviceName(id)}`} onClick={()=>applyCartEdit(()=>ctx.removeService(id))}><Trash2 size={15}/></button></h4>
        {mine.length?equipmentList(mine):<p className="bs-sub-empty">{tr('No equipment selected for this service yet.','لم تُختر معدات لهذه الخدمة بعد.')}</p>}
       </div>)}
       {unassigned.length>0&&<div className="bs-sub"><h4><span>{tr('Other equipment','معدات أخرى')}</span></h4>{equipmentList(unassigned)}</div>}
      </section>
      <section className="bs-section" aria-label={tr('Review & submit','المراجعة والإرسال')}>{head(tr('Review & submit','المراجعة والإرسال'),null,'review')}
       <dl className="bs-rows">{reviewRows.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{cell(value)}</dd></div>)}</dl></section>
     </>;
    })()}
    <div className="booking-cart-next"><span>{missing?tr('NEXT BOOKING DETAIL','تفصيل الحجز التالي'):tr('REVIEW YOUR BOOKING','راجع حجزك')}</span><p>{next?.text}</p></div>
    <p className="booking-cart-note">{tr('These are draft selections. Prices and event-date availability are confirmed in your quote.','هذه اختيارات للمسودة. تُؤكد الأسعار والتوفر لتاريخ الفعالية في عرض السعر.')}</p>
   </div>
   <footer>{(ctx?.saveState==='load-failed'||status)&&<p role="status">{ctx?.saveState==='load-failed'?tr('Could not load your saved draft. Retry before editing.','تعذر تحميل المسودة. أعد المحاولة قبل التعديل.'):status}</p>}{ctx?.saveState==='load-failed'&&<button type="button" onClick={ctx.retrySync}>{tr('Retry loading draft','إعادة تحميل المسودة')}</button>}{['account-failed','failed'].includes(ctx?.saveState)&&<button type="button" onClick={()=>ctx.save()}>{tr('Retry save','إعادة الحفظ')}</button>}{['conflict','delete-conflict'].includes(ctx?.saveState)&&<button type="button" onClick={ctx.retrySync}>{tr('Reload draft','إعادة تحميل المسودة')}</button>}<div><button type="button" onClick={()=>continueWith('ai')}><Sparkles size={16}/>{tr('Ask Echo','اسأل إيكو')}</button><button type="button" className="booking-cart-continue" onClick={()=>continueWith('manual')}>{tr('Continue manually','المتابعة يدوياً')}<ArrowRight size={16}/></button></div></footer>
  </dialog>,document.body)}
 </>;
}
