import {bookingSteps,bookingStepForField,firstIncompleteStep,bookingIssueStep} from '../lib/bookingFlow.mjs';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import {bookingServiceId} from '../lib/rentalCatalog';
import {scrollToAppSection} from '../lib/bookingViewport';
import EquipmentQuantityPicker from './EquipmentQuantityPicker';
import EquipmentAvailability from './EquipmentAvailability';
import DjBookingChoice from './DjBookingChoice';
import './bookingFlow.css';
import './echoSelect.css';
import {venueArea} from '../lib/addressSearch';
import {venueSelectionChanges} from '../lib/bookingFlow.mjs';
import OrderSignIn from './OrderSignIn';
import DialectPicker from './DialectPicker';
import AddressAutocomplete from './AddressAutocomplete';
import TimeSelect from './TimeSelect';
import EventTimeColumn from './EventTimeColumn';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { clearCart, useCart } from './cart';
import { buildQuoteItems } from './quoteItems';
import {apiRequest} from '../lib/api';
import { useEventOrder } from './eventOrderContext';
import { contract, aiFields, isAnswered, getPath, validValue, missingOrderFields, validateEventOrder, orderToLegacy } from '../lib/eventOrderCore.mjs';
import { getBookingSubmissionIdentity, bookingSubmissionReceipt, loadBookingSubmissionIdentity, storeBookingSubmissionIdentity } from './bookingSubmission';

const labels={dj:'DJ services',sound:'Sound system',lighting:'Lighting',led:'LED wall',fx:'Special effects',rental:'Equipment rental',corporate:'Corporate production',wedding_entrance:'Custom wedding entrance',ai_customization:'AI-assisted customization',gta:'Inside GTA',outside_gta:'Outside GTA'};
const labelsAr={arabic:'العربية',english:'الإنجليزية',kurdish:'الكردية',armenian:'الأرمنية',other:'أخرى',mixed:'مزيج'};
const optionLabel=(value,ar)=>(ar&&labelsAr[value])||(value==='mixed'?'Mix':labels[value])||value.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());

function OrderField({field,ar,user,optionNames={}}){
  const ctx=useEventOrder(),value=getPath(ctx.order,field.key);
  const format=v=>Array.isArray(v)?v.join('\n'):v===null||v===undefined?'':String(v);
  const [raw,setRaw]=useState(()=>format(value));
  useEffect(()=>setRaw(format(value)),[value]);
  const label=ar?(field.ar||field.label):field.label;
  // Start and end time are one EVENT TIME column, drawn where the start time sits.
  if(field.key==='event.endTime')return null;
  if(field.key==='event.startTime')return <div className="order-field-wide"><EventTimeColumn ar={ar} start={getPath(ctx.order,'event.startTime')||''} end={getPath(ctx.order,'event.endTime')||''} onChange={(startTime,endTime)=>{ctx.setField('event.startTime',startTime||null);ctx.setField('event.endTime',endTime||null);}}/></div>;
  if(field.key==='event.venue.address')return <AddressAutocomplete id="order-event-venue-address" seed={getPath(ctx.order,'event.venue.name')||''} label={label} required={field.required} ar={ar} value={value||''} readOnly={false}
    onType={text=>{ctx.setField(field.key,text);for(const key of ['latitude','longitude','source','sourceId','sourceAttribution','addressDetails'])ctx.setField('event.venue.'+key,null);}}
    onPick={pick=>venueSelectionChanges(pick,venueArea(pick)).forEach(({path,value})=>ctx.setField(path,value))}/>;
  if(field.picker==='dialects')return <DialectPicker id={'order-'+field.key.replaceAll('.','-')} label={label} ar={ar} value={value||[]} onChange={ids=>ctx.setField(field.key,ids)}/>;
  if(field.type==='multi')return <div className="order-field-wide"><p>{label}{field.required?' *':''}</p><div className="order-multi">{field.options.map(option=><label key={option}><input type="checkbox" checked={(value||[]).includes(option)} onChange={event=>ctx.setField(field.key,event.target.checked?[...(value||[]),option]:(value||[]).filter(item=>item!==option))}/>{optionNames[option]||optionLabel(option,ar)}</label>)}</div></div>;
  const id='order-'+field.key.replaceAll('.','-');
  const onChange=event=>{
    const text=event.target.value;setRaw(text);
    const val=text===''?(['links','multi'].includes(field.type)?[]:null):field.type==='number'?Number(text):field.type==='boolean'?text==='true':field.type==='links'?text.split(/\n/).map(line=>line.trim()).filter(Boolean):text;
    const valid=validValue(field,val);event.target.setCustomValidity(valid?'':(ar?'يرجى إدخال قيمة صحيحة':'Please enter a valid value. Use one HTTPS link per line for references.'));
    if(valid)ctx.setField(field.key,val);
  };
  return <label className={['textarea','links'].includes(field.type)?'order-field-wide':''} htmlFor={id}>{label}{field.required?' *':''}
    {field.type==='time'?<TimeSelect id={id} label={label} ar={ar} required={field.required} value={raw} variant={field.key==='event.endTime'?'end':'start'} startValue={getPath(ctx.order,'event.startTime')} onChange={time=>{setRaw(time);ctx.setField(field.key,time);}}/>:field.options||field.type==='boolean'?<select id={id} autoComplete="off" value={raw} required={field.required} onChange={onChange}><option value="">{ar?'لم يُحدد بعد':'Choose / not provided yet'}</option>{(field.type==='boolean'?['true','false']:field.options).map(option=><option key={option} value={option}>{field.type==='boolean'?(option==='true'?(ar?'نعم':'Yes'):(ar?'لا':'No')):optionNames[option]||optionLabel(option,ar)}</option>)}</select>:['textarea','links'].includes(field.type)?<textarea id={id} autoComplete="off" rows="3" required={field.required} value={raw} maxLength={field.type==='links'?12000:3000} onChange={onChange}/>:<input id={id} autoComplete="off" type={field.type||'text'} value={raw} required={field.required} readOnly={!!user&&['customer.fullName','customer.email'].includes(field.key)} min={field.type==='number'?(field.key==='event.guestCount'?1:0):field.type==='date'?new Date().toLocaleDateString('en-CA',{timeZone:'America/Toronto'}):undefined} max={field.max} step={field.type==='number'?1:undefined} maxLength={field.maxLength||320} onChange={onChange}/>}
  </label>;
}

export default function QuotePage({lang,user,isSessionReady,onCreateServiceRequest,guided=false,submitSlot=null}){
  const ctx=useEventOrder(),cart=useCart(),ar=lang.lang==='ar';
  const [state,setState]=useState({busy:false,error:'',done:null});
  const [tab,setTab]=useState('customer'),tabId=useId();
  const {catalog,equipment,loading:catalogLoading,failed:catalogFailed}=useRentalCatalog();
  const sections=bookingSteps(ctx.order),tabs=sections.map(section=>({...section,label:ar?section.ar:section.title}));
  const activeEvents=catalog.filter(row=>row.kind==='event'&&row.isActive!==false&&row.bookingType);
  const serviceRows=[...new Map(catalog.filter(row=>row.kind==='service'&&row.isActive!==false&&row.id!=='dj').map(row=>[bookingServiceId(row),row])).values()];
  const eventNames=Object.fromEntries(activeEvents.map(row=>[row.bookingType,ar?(row.nameAr||row.name):row.name]));
  const serviceNames=Object.fromEntries(serviceRows.map(row=>[bookingServiceId(row),ar?(row.nameAr||row.name):row.name]));
  const fieldOptions=field=>field.key==='event.type'?{...field,options:[...new Set([...activeEvents.map(row=>row.bookingType),...(ctx.order.event.type?[ctx.order.event.type]:[])])]}:field.key==='services'?{...field,options:[...new Set([...serviceRows.map(bookingServiceId),...ctx.order.services.filter(id=>id!=='dj')])]}:field;

  const voucherInput=ctx.order.additional.voucherCode||'',setVoucherInput=value=>ctx.setField('additional.voucherCode',value||null);
  const [voucher,setVoucher]=useState(null),[voucherState,setVoucherState]=useState({busy:false,error:''}),[voucherRetry,setVoucherRetry]=useState(0);
  const voucherOptOut=useRef(false);
  const applyVoucher=()=>setVoucherRetry(value=>value+1);
  useEffect(()=>{
    let alive=true;setVoucher(null);
    const code=voucherInput.trim();
    if(!code||!ctx.token){setVoucherState({busy:false,error:''});return;}
    setVoucherState({busy:true,error:''});
    const timer=setTimeout(()=>apiRequest('/vouchers/validate',{method:'POST',token:ctx.token,body:{code}}).then(result=>{if(alive){setVoucher(result.voucher);setVoucherState({busy:false,error:''});}}).catch(error=>{if(alive)setVoucherState({busy:false,error:error.message||tr('This voucher is not valid.','هذه القسيمة غير صالحة.')});}),300);
    return()=>{alive=false;clearTimeout(timer);};
  },[voucherInput,ctx.token,voucherRetry]);
  useEffect(()=>{
    if(!ctx.token||!ctx.cloudReady||voucherInput||voucherOptOut.current)return;
    let alive=true;
    apiRequest('/vouchers/announcement').then(({voucher:offer})=>{if(alive&&offer&&!voucherOptOut.current)setVoucherInput(offer.code);}).catch(()=>{});
    return()=>{alive=false;};
  },[ctx.token,ctx.cloudReady,voucherInput]);
  const voucherLabel=value=>value.kind==='percent'?`${value.percent}%`:`$${(value.amountCents/100).toFixed(2)}`;
  const wheelDir=useRef(1);
  const submissionIdentity=useRef(null);
  const submissionStorageKey=`echo-booking-submission:v1:${user?.id||user?._id||user?.username||'guest'}:${ctx.draftId}`;
  const submitting=useRef(false);
  const stepTab=step=>{const index=tabs.findIndex(item=>item.id===tab),target=step==='first'?0:step==='last'?tabs.length-1:(index+step+tabs.length)%tabs.length;wheelDir.current=typeof step==='number'?step:target>index?1:-1;selectTab(tabs[target].id,{navigate:true});};
  const selectTab=(id,{navigate=false}={})=>{setTab(id);const step=sections.find(step=>step.id===id);if(navigate&&step?.viewport){if(step.face)window.dispatchEvent(new CustomEvent('echo:availability-face',{detail:step.face}));scrollToAppSection(step.viewport,{source:'draft-tab'});}requestAnimationFrame(()=>document.querySelector('.echo-guided-booking .egb-body')?.scrollTo({top:0,behavior:'smooth'}));};
  useEffect(()=>{
    if(!guided)return;
    const focus=event=>{if(event.detail?.path)selectTab(bookingStepForField(event.detail.path));};
    window.addEventListener('echo:booking-field-focus',focus);return()=>window.removeEventListener('echo:booking-field-focus',focus);
  },[guided]);
  useEffect(()=>{
    if(!guided)return;
    const review=()=>selectTab(firstIncompleteStep(ctx.order));
    window.addEventListener('echo:booking-review',review);
    return()=>window.removeEventListener('echo:booking-review',review);
  },[guided,ctx.order]);

  useEffect(()=>{
    if(!guided||typeof IntersectionObserver==='undefined')return;
    const targets=[['availability','event'],['khalil-work-archive','music'],['services','equipment']];
    const observer=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){const step=targets.find(([id])=>entry.target.id===id)?.[1];if(step)setTab(step==='event'&&document.querySelector('.avail-flip.is-flipped')?'venue':step);}}, {rootMargin:'-20% 0px -55% 0px',threshold:0});
    for(const [id] of targets){const node=document.getElementById(id);if(node)observer.observe(node);}
    const face=event=>setTab(event.detail==='venue'?'venue':'event');
    window.addEventListener('echo:availability-face-changed',face);
    return()=>{observer.disconnect();window.removeEventListener('echo:availability-face-changed',face);};
  },[guided]);

  const tr=(en,arabic)=>ar?arabic:en;
  const formId=useId(),missingCount=missingOrderFields(ctx.order).length;
  // The still-missing count is the button's subtitle; in the guided panel the button lives in the header and submits this form from there.
  const submitButton=<button className="echo-btn egb-submit" type="submit" form={formId} disabled={state.busy||!isSessionReady}><span>{state.busy?tr('Submitting…','جارٍ الإرسال…'):tr('Submit quote request','أرسل طلب عرض السعر')}</span><small>{missingCount} {tr('required details still need your answer.','تفاصيل مطلوبة تنتظر إجابتك.')}</small></button>;
  const submit=async event=>{
    event.preventDefault();if(!user||!isSessionReady||submitting.current)return;
    const invalid=event.currentTarget.querySelector(':invalid');
    if(invalid){const section=invalid.closest('[data-draft-section]');if(guided&&section)selectTab(section.dataset.draftSection);requestAnimationFrame(()=>{invalid.focus();invalid.reportValidity();});setState({busy:false,error:tr('Please complete or correct the highlighted field.','يرجى إكمال أو تصحيح الحقل المحدد.'),done:null});return;}
    const issues=validateEventOrder(ctx.order,{submission:true});
    if(issues.length&&guided)selectTab(bookingIssueStep(ctx.order,issues));
    if(issues.length)return setState({busy:false,error:tr('Complete or correct: ','أكمل أو صحح: ')+issues.map(path=>contract.sections.flatMap(section=>section.fields).find(field=>field.key===path)?.[ar?'ar':'label']||path).join(', '),done:null});
    submitting.current=true;setState({busy:true,error:'',done:null});
    try{
      const order=ctx.order;
      if(voucherInput.trim()&&(voucherState.busy||!voucher||voucher.code!==voucherInput.trim().toUpperCase()))throw new Error(tr('Wait for voucher validation or remove the invalid code.','انتظر التحقق من القسيمة أو أزل الرمز غير الصالح.'));
      const payload={order,event:orderToLegacy(order),items:buildQuoteItems(cart,order.services,lang.t.q.svcs,order.event.name||order.event.type),...(voucher?{voucherCode:voucher.code}:{})};
      submissionIdentity.current=getBookingSubmissionIdentity(payload,submissionIdentity.current||loadBookingSubmissionIdentity(submissionStorageKey));
      storeBookingSubmissionIdentity(submissionStorageKey,submissionIdentity.current);
      await ctx.save();
      let supported=false;
      try{const version=await apiRequest('/service-requests/order-contract');supported=version.canonicalOrder===true&&version.schemaVersion===contract.version&&version.idempotentSubmission===true;}catch{/* Never send a canonical order to an old server that would silently discard it. */}
      if(!supported)throw new Error(tr('The booking server needs the event-order update before this request can be submitted. Nothing was submitted.','يحتاج خادم الحجز إلى تحديث طلبات الفعاليات الجديدة قبل الإرسال. لم يُرسل شيء.'));
      const result=await onCreateServiceRequest({...payload,clientSubmissionId:submissionIdentity.current.id});
      const receipt=bookingSubmissionReceipt(result);
      if(!receipt)throw new Error(tr('The server did not return a booking reference. Check Client Workspace before retrying. Your form is still here.','لم يُرجع الخادم رقم الطلب. تحقق من مساحة العميل قبل المحاولة مجدداً. بقي النموذج هنا.'));
      storeBookingSubmissionIdentity(submissionStorageKey,null);
      setState({busy:false,error:'',done:receipt});clearCart();ctx.finish();
    }catch(error){setState({busy:false,error:error.message||tr('Could not submit your request.','تعذر إرسال الطلب.'),done:null});}
    finally{submitting.current=false;}
  };
  if(!user)return <OrderSignIn ar={ar}/>;
  if(!isSessionReady)return <p role="status">{tr('Checking your sign-in…','جارٍ التحقق من تسجيل الدخول…')}</p>;
  if(state.done)return <section className={guided?"egb-draft-received":"echo-section"}><h2>{tr('Quote request received','تم استلام طلب عرض السعر')}</h2><p>{state.done}</p><p>{tr('Your date is not reserved. Our team will review the details and prepare your quotation.','لم يُحجز الموعد. سيراجع فريقنا التفاصيل ويعد عرض السعر.')}</p><a className="echo-btn" href="/dashboard/services">{tr('Open Client Workspace','افتح مساحة العميل')}</a></section>;
  return <section className={guided?"egb-draft-form":"echo-section"}><p>{tr('One event brief, whether you plan manually or with AI. Review every detail before submitting. * Required for your quotation.','ملف موحد لفعاليتك سواء خططت يدوياً أو مع الذكاء الاصطناعي. راجع التفاصيل قبل الإرسال. * مطلوب لعرض السعر.')}</p>
    <div className="echo-draft-bar"><button className="echo-link" type="button" disabled={state.busy} onClick={ctx.save}>{tr('Save progress','حفظ التقدم')}</button></div>
    {['account-failed','conflict'].includes(ctx.saveState)&&<p role="alert">{ctx.saveState==='conflict'?tr('This draft changed in another tab. Reload this page before editing again.','تغيرت المسودة في تبويب آخر. أعد تحميل الصفحة قبل التعديل.'):tr('The draft could not be saved or deleted. Your details are kept; please retry.','تعذر حفظ المسودة أو حذفها. بقيت تفاصيلك محفوظة؛ أعد المحاولة.')}</p>}
    <form className="echo-form" noValidate={guided} aria-busy={state.busy} id={formId} autoComplete="off" onSubmit={submit} onInvalidCapture={event=>{if(!guided)return;event.preventDefault();const invalid=event.currentTarget.querySelector(':invalid'),section=invalid?.closest('[data-draft-section]');if(section){section.hidden=false;setTab(section.dataset.draftSection);requestAnimationFrame(()=>invalid.focus());}setState(current=>({...current,error:tr('Please complete or correct the highlighted field.','يرجى إكمال أو تصحيح الحقل المحدد.')}));}}>
      {guided&&<div className="egb-wheel">
        <button type="button" className="egb-wheel-step" aria-label={tr('Previous section','القسم السابق')} onClick={()=>stepTab(-1)}><ChevronLeft size={18}/></button>
        <div className="egb-rounded-tabs" role="tablist" aria-label={tr('Booking details','تفاصيل الحجز')} onKeyDown={event=>{
          const step=event.key==='ArrowRight'?(ar?-1:1):event.key==='ArrowLeft'?(ar?1:-1):event.key==='Home'?'first':event.key==='End'?'last':0;
          if(!step)return;event.preventDefault();stepTab(step);requestAnimationFrame(()=>document.querySelector('.egb-rounded-tabs [role=tab]')?.focus());
        }}>{tabs.filter(item=>item.id===tab).map(item=><button key={item.id} type="button" role="tab" id={`${tabId}-tab-${item.id}`} aria-controls={`${tabId}-panel-${item.id}`} aria-selected="true" className="egb-wheel-tab" data-dir={wheelDir.current}><span>{item.label.replace(' (optional)','').replace(' (اختياري)','')}</span><small>{tabs.findIndex(row=>row.id===tab)+1} / {tabs.length}</small></button>)}</div>
        <button type="button" className="egb-wheel-step" aria-label={tr('Next section','القسم التالي')} onClick={()=>stepTab(1)}><ChevronRight size={18}/></button>
      </div>}
      {sections.map(section=><fieldset key={section.id} disabled={state.busy} data-draft-section={section.id} hidden={guided&&tab!==section.id} role={guided?'tabpanel':undefined} id={guided?`${tabId}-panel-${section.id}`:undefined} aria-label={ar?section.ar:section.title}>
       {!guided&&<legend>{ar?section.ar:section.title}</legend>}
       {section.viewport&&<button type="button" className="echo-link" onClick={()=>selectTab(section.id,{navigate:true})}>{tr('Go to ','اذهب إلى ')}{({event:tr('Event','الفعالية'),venue:tr('Venue','المكان'),music:tr('DJ','الدي جي'),equipment:tr('Equipment','المعدات')})[section.id]|| (ar?section.ar:section.title)}</button>}
       {section.id==='music'&&<DjBookingChoice ar={ar}/>}
       {section.fields.filter(field=>!field.hidden&&field.key!=='event.endTime').map(field=><div className="draft-field" data-field={field.key} key={field.key}><OrderField field={fieldOptions(field)} ar={ar} user={user} optionNames={field.key==='event.type'?eventNames:field.key==='services'?serviceNames:{}}/></div>)}
       {section.id==='references'&&aiFields.filter(field=>field.key.startsWith('planning.')&&isAnswered(getPath(ctx.order,field.key))).map(field=><div className="draft-field" data-field={field.key} key={field.key}><OrderField field={{...field,label:field.label.replace(/([A-Z])/g,' $1').replace(/^./,letter=>letter.toUpperCase())}} ar={ar} user={user}/></div>)}
       {section.fields.some(field=>field.hidden&&field.key!=='additional.voucherCode'&&isAnswered(getPath(ctx.order,field.key)))&&<details className="draft-saved-details"><summary>{tr('Saved draft details','تفاصيل المسودة المحفوظة')}</summary><dl>{section.fields.filter(field=>field.hidden&&field.key!=='additional.voucherCode'&&isAnswered(getPath(ctx.order,field.key))).map(field=><div key={field.key} data-field={field.key}><dt>{ar?field.ar:field.label}</dt><dd>{typeof getPath(ctx.order,field.key)==='object'?JSON.stringify(getPath(ctx.order,field.key)):String(getPath(ctx.order,field.key))}</dd></div>)}</dl></details>}
       {section.id==='equipment'&&<div className="draft-equipment-selection" data-field="equipment"><p className="draft-equipment-note">{tr('Services required by selected equipment stay selected. Remove those items first to remove the service.','الخدمات المطلوبة للمعدات المختارة تبقى محددة. أزل المعدات أولاً لإزالة الخدمة.')}</p>
        {(catalogLoading||catalogFailed)&&<p role="status">{catalogFailed?tr('Could not refresh the catalog. Your selected items are kept.','تعذر تحديث الكتالوج. بقيت اختياراتك محفوظة.'):tr('Loading services and equipment…','جارٍ تحميل الخدمات والمعدات…')}</p>}
        {['sets','individual'].map(group=>{const chosen=Object.values(cart).map(item=>({...item,...(equipment.find(row=>row.id===item.id)||(!catalogLoading&&!catalogFailed?{availabilityStatus:'unavailable',availableQuantity:0}:{})),quantity:item.quantity})).filter(item=>Boolean(item.isSet||item.setItems?.length||item.modelParts?.length)===(group==='sets'));return chosen.length>0&&<div key={group}><h3>{group==='sets'?tr('Complete sets','المجموعات الكاملة'):tr('Individual equipment','معدات منفردة')}</h3>{chosen.map(item=><article className="draft-equipment-row" key={item.id}><strong>{ar?(item.nameAr||item.name):item.name}</strong><EquipmentAvailability item={item} ar={ar} draft={item.quantity}/><EquipmentQuantityPicker item={item} quantity={item.quantity} onChange={ctx.setEquipment} ar={ar}/><button type="button" className="echo-link" onClick={()=>ctx.setEquipment(item,0)}>{tr('Remove','إزالة')}</button></article>)}</div>;})}
        {!Object.values(cart).length&&<p>{tr('No equipment selected. Choose individual equipment or a complete set in the rental explorer.','لم تُحدد معدات. اختر معدات منفردة أو مجموعة كاملة من مستكشف الإيجار.')}</p>}
       </div>}
      </fieldset>)}
      {(!guided||tab==='references')&&<div className="quote-voucher">
        <label htmlFor={`${tabId}-voucher`}>{tr('Voucher code','رمز القسيمة')}</label>
        <div><input id={`${tabId}-voucher`} type="text" maxLength={24} autoComplete="off" value={voucherInput} disabled={state.busy||Boolean(voucher)||voucherState.busy} placeholder={tr('Have a voucher?','لديك قسيمة؟')} onChange={event=>{voucherOptOut.current=true;setVoucherInput(event.target.value.toUpperCase());setVoucherState({busy:false,error:''});}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();applyVoucher();}}}/>
        {voucher?<button type="button" disabled={state.busy} onClick={()=>{voucherOptOut.current=true;setVoucher(null);setVoucherInput('');}}>{tr('Remove','إزالة')}</button>:<button type="button" disabled={state.busy||!voucherInput.trim()||voucherState.busy} onClick={applyVoucher}>{voucherState.busy?tr('Checking…','جارٍ التحقق…'):tr('Apply','تطبيق')}</button>}</div>
        {voucher&&<p className="quote-voucher-ok" role="status">{tr(`Voucher ${voucher.code} applied: ${voucherLabel(voucher)} off. It is recorded with your request and applied to your quote.`,`تم تطبيق القسيمة ${voucher.code}: خصم ${voucherLabel(voucher)}. تُسجَّل مع طلبك وتُطبَّق على عرض السعر.`)}</p>}
        {voucherState.error&&<p className="echo-error" role="alert">{voucherState.error}</p>}
      </div>}
      <div className="quote-submit-bar">
      {state.error&&<p role="alert" className="echo-error order-validation">{state.error}</p>}
      {guided&&submitSlot?createPortal(submitButton,submitSlot):submitButton}
      </div>
    </form>
  </section>;
}
