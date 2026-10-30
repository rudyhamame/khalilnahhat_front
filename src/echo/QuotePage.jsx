import OrderSignIn from './OrderSignIn';
import DialectPicker from './DialectPicker';
import AddressAutocomplete from './AddressAutocomplete';
import TimeSelect from './TimeSelect';
import EventTimeColumn from './EventTimeColumn';
import { useEffect, useId, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { createPortal } from 'react-dom';
import { clearCart, setCartItem, useCart } from './cart';
import { buildQuoteItems } from './quoteItems';
import {apiRequest} from '../lib/api';
import { useEventOrder } from './eventOrderContext';
import { contract, getPath, validValue, missingOrderFields, validateEventOrder, orderToLegacy } from '../lib/eventOrderCore.mjs';

const labels={dj:'DJ services',sound:'Sound system',lighting:'Lighting',led:'LED wall',fx:'Special effects',rental:'Equipment rental',corporate:'Corporate production',wedding_entrance:'Custom wedding entrance',ai_customization:'AI-assisted customization',gta:'Inside GTA',outside_gta:'Outside GTA'};
const labelsAr={arabic:'العربية',english:'الإنجليزية',kurdish:'الكردية',armenian:'الأرمنية',other:'أخرى',mixed:'مزيج'};
const optionLabel=(value,ar)=>(ar&&labelsAr[value])||(value==='mixed'?'Mix':labels[value])||value.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());

function OrderField({field,ar,user}){
  const ctx=useEventOrder(),value=getPath(ctx.order,field.key);
  const format=v=>Array.isArray(v)?v.join('\n'):v===null||v===undefined?'':String(v);
  const [raw,setRaw]=useState(()=>format(value));
  useEffect(()=>setRaw(format(value)),[value]);
  const label=ar?field.ar:field.label;
  // Start and end time are one EVENT TIME column, drawn where the start time sits.
  if(field.key==='event.endTime')return null;
  if(field.key==='event.startTime')return <div className="order-field-wide"><EventTimeColumn ar={ar} start={getPath(ctx.order,'event.startTime')||''} end={getPath(ctx.order,'event.endTime')||''} onChange={(startTime,endTime)=>{ctx.setField('event.startTime',startTime||null);ctx.setField('event.endTime',endTime||null);}}/></div>;
  if(field.key==='event.venue.address')return <AddressAutocomplete id="order-event-venue-address" seed={getPath(ctx.order,'event.venue.name')||''} label={label} required={field.required} ar={ar} value={value||''} readOnly={false}
    onType={text=>ctx.setField(field.key,text)}
    onPick={pick=>{ctx.setField('event.venue.address',pick.address);if(pick.city)ctx.setField('event.venue.city',pick.city);if(pick.postalCode)ctx.setField('event.venue.postalCode',pick.postalCode);ctx.setField('event.venue.country',pick.country||'Canada');ctx.setField('event.venue.addressDetails',pick.details||null);ctx.setField('event.venue.area',pick.area);}}/>;
  if(field.picker==='dialects')return <DialectPicker id={'order-'+field.key.replaceAll('.','-')} label={label} ar={ar} value={value||[]} onChange={ids=>ctx.setField(field.key,ids)}/>;
  if(field.type==='multi')return <div className="order-field-wide"><p>{label}{field.required?' *':''}</p><div className="order-multi">{field.options.map(option=><label key={option}><input type="checkbox" checked={(value||[]).includes(option)} onChange={event=>ctx.setField(field.key,event.target.checked?[...(value||[]),option]:(value||[]).filter(item=>item!==option))}/>{optionLabel(option,ar)}</label>)}</div></div>;
  const id='order-'+field.key.replaceAll('.','-');
  const onChange=event=>{
    const text=event.target.value;setRaw(text);
    const val=text===''?(['links','multi'].includes(field.type)?[]:null):field.type==='number'?Number(text):field.type==='boolean'?text==='true':field.type==='links'?text.split(/\n/).map(line=>line.trim()).filter(Boolean):text;
    const valid=validValue(field,val);event.target.setCustomValidity(valid?'':(ar?'يرجى إدخال قيمة صحيحة':'Please enter a valid value. Use one HTTPS link per line for references.'));
    if(valid)ctx.setField(field.key,val);
  };
  return <label className={['textarea','links'].includes(field.type)?'order-field-wide':''} htmlFor={id}>{label}{field.required?' *':''}
    {field.type==='time'?<TimeSelect id={id} label={label} ar={ar} required={field.required} value={raw} variant={field.key==='event.endTime'?'end':'start'} startValue={getPath(ctx.order,'event.startTime')} onChange={time=>{setRaw(time);ctx.setField(field.key,time);}}/>:field.options||field.type==='boolean'?<select id={id} autoComplete="off" value={raw} required={field.required} onChange={onChange}><option value="">{ar?'لم يُحدد بعد':'Choose / not provided yet'}</option>{(field.type==='boolean'?['true','false']:field.options).map(option=><option key={option} value={option}>{field.type==='boolean'?(option==='true'?(ar?'نعم':'Yes'):(ar?'لا':'No')):optionLabel(option,ar)}</option>)}</select>:['textarea','links'].includes(field.type)?<textarea id={id} autoComplete="off" rows="3" required={field.required} value={raw} maxLength={field.type==='links'?12000:3000} onChange={onChange}/>:<input id={id} autoComplete="off" type={field.type||'text'} value={raw} required={field.required} readOnly={!!user&&['customer.fullName','customer.email'].includes(field.key)} min={field.type==='number'?0:field.type==='date'?new Date().toLocaleDateString('en-CA',{timeZone:'America/Toronto'}):undefined} max={field.max} step={field.type==='number'?1:undefined} maxLength={field.maxLength||320} onChange={onChange}/>}
  </label>;
}

export default function QuotePage({lang,user,isSessionReady,onCreateServiceRequest,guided=false,submitSlot=null}){
  const ctx=useEventOrder(),cart=useCart(),ar=lang.lang==='ar';
  const [state,setState]=useState({busy:false,error:'',done:null});
  const [tab,setTab]=useState('event'),tabId=useId();
  const sections=contract.sections.filter(section=>!section.gate||getPath(ctx.order,section.gate)===true);
  const tabs=[...sections.map(section=>({id:section.id,label:ar?section.ar:section.title})),{id:'equipment',label:ar?'المعدات':'Equipment'}];
  const [voucherInput,setVoucherInput]=useState(''),[voucher,setVoucher]=useState(null),[voucherState,setVoucherState]=useState({busy:false,error:''});
  const applyVoucher=async()=>{
    const code=voucherInput.trim();if(!code||voucherState.busy)return;
    setVoucherState({busy:true,error:''});
    try{const result=await apiRequest('/vouchers/validate',{method:'POST',token:ctx.token,body:{code}});setVoucher(result.voucher);setVoucherInput(result.voucher.code);setVoucherState({busy:false,error:''});}
    catch(e){setVoucher(null);setVoucherState({busy:false,error:e.message||tr('This voucher is not valid.','هذه القسيمة غير صالحة.')});}
  };
  const voucherLabel=value=>value.kind==='percent'?`${value.percent}%`:`$${(value.amountCents/100).toFixed(2)}`;
  const wheelDir=useRef(1);
  const stepTab=step=>{const index=tabs.findIndex(item=>item.id===tab),target=step==='first'?0:step==='last'?tabs.length-1:(index+step+tabs.length)%tabs.length;wheelDir.current=typeof step==='number'?step:target>index?1:-1;selectTab(tabs[target].id);};
  const selectTab=id=>{setTab(id);requestAnimationFrame(()=>document.querySelector('.echo-guided-booking .egb-body')?.scrollTo({top:0,behavior:'smooth'}));};
  useEffect(()=>{
    if(!guided)return;
    const review=()=>{const missing=missingOrderFields(ctx.order);selectTab(sections.find(section=>section.fields.some(field=>missing.includes(field.key)))?.id||'equipment');};
    window.addEventListener('echo:booking-review',review);
    return()=>window.removeEventListener('echo:booking-review',review);
  },[guided,ctx.order]);

  const tr=(en,arabic)=>ar?arabic:en;
  const formId=useId(),missingCount=missingOrderFields(ctx.order).length;
  // The still-missing count is the button's subtitle; in the guided panel the button lives in the header and submits this form from there.
  const submitButton=<button className="echo-btn egb-submit" type="submit" form={formId} disabled={state.busy||!isSessionReady}><span>{state.busy?tr('Submitting…','جارٍ الإرسال…'):tr('Submit quote request','أرسل طلب عرض السعر')}</span><small>{missingCount} {tr('required details still need your answer.','تفاصيل مطلوبة تنتظر إجابتك.')}</small></button>;
  const submit=async event=>{
    event.preventDefault();if(!user||!isSessionReady)return;const issues=validateEventOrder(ctx.order,{submission:true});
    if(issues.length&&guided)selectTab(sections.find(section=>section.fields.some(field=>issues.includes(field.key)))?.id||'equipment');
    if(issues.length)return setState({busy:false,error:tr('Complete or correct: ','أكمل أو صحح: ')+issues.map(path=>contract.sections.flatMap(section=>section.fields).find(field=>field.key===path)?.[ar?'ar':'label']||path).join(', '),done:null});
    setState({busy:true,error:'',done:null});
    try{
      const order=ctx.order;
      ctx.save();
      let supported=false;
      try{const version=await apiRequest('/service-requests/order-contract');supported=version.canonicalOrder===true&&version.schemaVersion===contract.version;}catch{/* Never send a canonical order to an old server that would silently discard it. */}
      if(!supported)throw new Error(tr('The booking server needs the new event-order update before this request can be submitted. Your draft is saved; nothing was submitted.','يحتاج خادم الحجز إلى تحديث طلبات الفعاليات الجديدة قبل الإرسال. حُفظت المسودة ولم يُرسل شيء.'));
      const result=await onCreateServiceRequest({order,event:orderToLegacy(order),items:buildQuoteItems(cart,order.services,lang.t.q.svcs,order.event.name||order.event.type),...(voucher?{voucherCode:voucher.code}:{})});
      setState({busy:false,error:'',done:result.item?.requestNumber||'—'});clearCart();ctx.finish();
    }catch(error){setState({busy:false,error:error.message||tr('Could not submit your request.','تعذر إرسال الطلب.'),done:null});}
  };
  if(!user)return <OrderSignIn ar={ar}/>;
  if(!isSessionReady)return <p role="status">{tr('Checking your sign-in…','جارٍ التحقق من تسجيل الدخول…')}</p>;
  if(state.done)return <section className={guided?"egb-draft-received":"echo-section"}><h2>{tr('Quote request received','تم استلام طلب عرض السعر')}</h2><p>{state.done}</p><p>{tr('Your date is not reserved. Our team will review the details and prepare your quotation.','لم يُحجز الموعد. سيراجع فريقنا التفاصيل ويعد عرض السعر.')}</p><a className="echo-btn" href="/dashboard/services">{tr('Open Client Workspace','افتح مساحة العميل')}</a></section>;
  return <section className={guided?"egb-draft-form":"echo-section"}><p>{tr('One event brief, whether you plan manually or with AI. Review every detail before submitting. * Required for your quotation.','ملف موحد لفعاليتك سواء خططت يدوياً أو مع الذكاء الاصطناعي. راجع التفاصيل قبل الإرسال. * مطلوب لعرض السعر.')}</p>
    <div className="echo-draft-bar"><button className="echo-link" type="button" onClick={ctx.save}>{tr('Save progress','حفظ التقدم')}</button></div>
    {['account-failed','conflict'].includes(ctx.saveState)&&<p role="alert">{ctx.saveState==='conflict'?tr('This draft changed in another tab. Reload this page before editing again.','تغيرت المسودة في تبويب آخر. أعد تحميل الصفحة قبل التعديل.'):tr('The draft could not be saved or deleted. Your details are kept; please retry.','تعذر حفظ المسودة أو حذفها. بقيت تفاصيلك محفوظة؛ أعد المحاولة.')}</p>}
    <form className="echo-form" id={formId} autoComplete="off" onSubmit={submit} onInvalidCapture={event=>{if(!guided)return;event.preventDefault();const invalid=event.currentTarget.querySelector(':invalid'),section=invalid?.closest('[data-draft-section]');if(section){section.hidden=false;setTab(section.dataset.draftSection);requestAnimationFrame(()=>invalid.focus());}setState(current=>({...current,error:tr('Please complete or correct the highlighted field.','يرجى إكمال أو تصحيح الحقل المحدد.')}));}}>
      {guided&&<div className="egb-wheel">
        <button type="button" className="egb-wheel-step" aria-label={tr('Previous section','القسم السابق')} onClick={()=>stepTab(-1)}><ChevronLeft size={18}/></button>
        <div className="egb-rounded-tabs" role="tablist" aria-label={tr('Booking details','تفاصيل الحجز')} onKeyDown={event=>{
          const step=event.key==='ArrowRight'?(ar?-1:1):event.key==='ArrowLeft'?(ar?1:-1):event.key==='Home'?'first':event.key==='End'?'last':0;
          if(!step)return;event.preventDefault();stepTab(step);requestAnimationFrame(()=>document.querySelector('.egb-rounded-tabs [role=tab]')?.focus());
        }}>{tabs.filter(item=>item.id===tab).map(item=><button key={item.id} type="button" role="tab" id={`${tabId}-tab-${item.id}`} aria-controls={`${tabId}-panel-${item.id}`} aria-selected="true" className="egb-wheel-tab" data-dir={wheelDir.current}><span>{item.label.replace(' (optional)','').replace(' (اختياري)','')}</span><small>{tabs.findIndex(row=>row.id===tab)+1} / {tabs.length}</small></button>)}</div>
        <button type="button" className="egb-wheel-step" aria-label={tr('Next section','القسم التالي')} onClick={()=>stepTab(1)}><ChevronRight size={18}/></button>
      </div>}
      {sections.map(section=><fieldset key={section.id} data-draft-section={section.id} hidden={guided&&tab!==section.id} role={guided?'tabpanel':undefined} id={guided?`${tabId}-panel-${section.id}`:undefined} aria-labelledby={guided?`${tabId}-tab-${section.id}`:undefined}>{!guided&&<legend>{ar?section.ar:section.title}</legend>}{section.fields.map(field=><OrderField field={field} ar={ar} user={user} key={field.key}/>)}</fieldset>)}
      <fieldset data-draft-section="equipment" hidden={guided&&tab!=='equipment'} role={guided?'tabpanel':undefined} id={guided?`${tabId}-panel-equipment`:undefined} aria-labelledby={guided?`${tabId}-tab-equipment`:undefined}>{!guided&&<legend>{tr('Equipment & quantities','المعدات والكميات')}</legend>}{Object.values(cart).length?Object.values(cart).map(item=><div className="echo-line" key={item.id}><span>{item.name}</span><input type="number" aria-label={tr('Quantity for ','الكمية لـ ')+item.name} min={item.minQuantity||1} value={item.quantity} onChange={event=>setCartItem(item,Math.max(item.minQuantity||1,Math.floor(Number(event.target.value))||1))}/><button type="button" className="echo-link" onClick={()=>setCartItem(item,0)}>{tr('Remove','إزالة')}</button></div>):<p>{tr('No equipment selected. Specific equipment is optional unless required for your request.','لم تُحدد معدات. اختيار المعدات التفصيلية اختياري ما لم يتطلبه طلبك.')}</p>}<a href="/#services">{tr('Choose equipment in The Setup','اختر المعدات من قسم التجهيزات')}</a></fieldset>
      <div className="quote-voucher">
        <label htmlFor={`${tabId}-voucher`}>{tr('Voucher code','رمز القسيمة')}</label>
        <div><input id={`${tabId}-voucher`} type="text" maxLength={24} autoComplete="off" value={voucherInput} disabled={Boolean(voucher)||voucherState.busy} placeholder={tr('Have a voucher?','لديك قسيمة؟')} onChange={event=>{setVoucherInput(event.target.value.toUpperCase());setVoucherState({busy:false,error:''});}} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();applyVoucher();}}}/>
        {voucher?<button type="button" onClick={()=>{setVoucher(null);setVoucherInput('');}}>{tr('Remove','إزالة')}</button>:<button type="button" disabled={!voucherInput.trim()||voucherState.busy} onClick={applyVoucher}>{voucherState.busy?tr('Checking…','جارٍ التحقق…'):tr('Apply','تطبيق')}</button>}</div>
        {voucher&&<p className="quote-voucher-ok" role="status">{tr(`Voucher ${voucher.code} applied: ${voucherLabel(voucher)} off. It is recorded with your request and applied to your quote.`,`تم تطبيق القسيمة ${voucher.code}: خصم ${voucherLabel(voucher)}. تُسجَّل مع طلبك وتُطبَّق على عرض السعر.`)}</p>}
        {voucherState.error&&<p className="echo-error" role="alert">{voucherState.error}</p>}
      </div>
      <div className="quote-submit-bar">
      {state.error&&<p role="alert" className="echo-error order-validation">{state.error}</p>}
      {guided&&submitSlot?createPortal(submitButton,submitSlot):submitButton}
      </div>
    </form>
  </section>;
}
