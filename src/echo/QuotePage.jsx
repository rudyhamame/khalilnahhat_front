import OrderSignIn from './OrderSignIn';
import { useEffect, useState } from 'react';
import { clearCart, setCartItem, useCart } from './cart';
import { buildQuoteItems } from './quoteItems';
import {apiRequest} from '../lib/api';
import { useEventOrder } from './eventOrderContext';
import { contract, getPath, validValue, missingOrderFields, validateEventOrder, orderToLegacy } from '../lib/eventOrderCore.mjs';

const labels={dj:'DJ services',sound:'Sound system',lighting:'Lighting',led:'LED wall',fx:'Special effects',rental:'Equipment rental',corporate:'Corporate production',wedding_entrance:'Custom wedding entrance',ai_customization:'AI-assisted customization',gta:'Inside GTA',outside_gta:'Outside GTA'};
const optionLabel=value=>labels[value]||value.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());

function OrderField({field,ar,user}){
  const ctx=useEventOrder(),value=getPath(ctx.order,field.key);
  const format=v=>Array.isArray(v)?v.join('\n'):v===null||v===undefined?'':String(v);
  const [raw,setRaw]=useState(()=>format(value));
  useEffect(()=>setRaw(format(value)),[value]);
  const label=ar?field.ar:field.label;
  if(field.type==='multi')return <div className="order-field-wide"><p>{label}{field.required?' *':''}</p><div className="order-multi">{field.options.map(option=><label key={option}><input type="checkbox" checked={(value||[]).includes(option)} onChange={event=>ctx.setField(field.key,event.target.checked?[...(value||[]),option]:(value||[]).filter(item=>item!==option))}/>{optionLabel(option)}</label>)}</div></div>;
  const id='order-'+field.key.replaceAll('.','-');
  const onChange=event=>{
    const text=event.target.value;setRaw(text);
    const val=text===''?(['links','multi'].includes(field.type)?[]:null):field.type==='number'?Number(text):field.type==='boolean'?text==='true':field.type==='links'?text.split(/\n/).map(line=>line.trim()).filter(Boolean):text;
    const valid=validValue(field,val);event.target.setCustomValidity(valid?'':(ar?'يرجى إدخال قيمة صحيحة':'Please enter a valid value. Use one HTTPS link per line for references.'));
    if(valid)ctx.setField(field.key,val);
  };
  return <label className={['textarea','links'].includes(field.type)?'order-field-wide':''} htmlFor={id}>{label}{field.required?' *':''}
    {field.options||field.type==='boolean'?<select id={id} value={raw} required={field.required} onChange={onChange}><option value="">{ar?'لم يُحدد بعد':'Choose / not provided yet'}</option>{(field.type==='boolean'?['true','false']:field.options).map(option=><option key={option} value={option}>{field.type==='boolean'?(option==='true'?(ar?'نعم':'Yes'):(ar?'لا':'No')):optionLabel(option)}</option>)}</select>:['textarea','links'].includes(field.type)?<textarea id={id} rows="3" required={field.required} value={raw} maxLength={field.type==='links'?12000:3000} onChange={onChange}/>:<input id={id} type={field.type||'text'} value={raw} required={field.required} readOnly={!!user&&['customer.fullName','customer.email'].includes(field.key)} min={field.type==='number'?0:field.type==='date'?new Date().toLocaleDateString('en-CA',{timeZone:'America/Toronto'}):undefined} max={field.max} step={field.type==='number'?1:undefined} maxLength={field.maxLength||320} onChange={onChange}/>}
  </label>;
}

export default function QuotePage({lang,user,isSessionReady,onCreateServiceRequest}){
  const ctx=useEventOrder(),cart=useCart(),ar=lang.lang==='ar';
  const [state,setState]=useState({busy:false,error:'',done:null});
  const tr=(en,arabic)=>ar?arabic:en;
  const submit=async event=>{
    event.preventDefault();if(!user||!isSessionReady)return;const issues=validateEventOrder(ctx.order,{submission:true});
    if(issues.length)return setState({busy:false,error:tr('Complete or correct: ','أكمل أو صحح: ')+issues.map(path=>contract.sections.flatMap(section=>section.fields).find(field=>field.key===path)?.[ar?'ar':'label']||path).join(', '),done:null});
    setState({busy:true,error:'',done:null});
    try{
      const order=ctx.order;
      ctx.save();
      let supported=false;
      try{const version=await apiRequest('/service-requests/order-contract');supported=version.canonicalOrder===true&&version.schemaVersion===contract.version;}catch{/* Never send a canonical order to an old server that would silently discard it. */}
      if(!supported)throw new Error(tr('The booking server needs the new event-order update before this request can be submitted. Your draft is saved; nothing was submitted.','يحتاج خادم الحجز إلى تحديث طلبات الفعاليات الجديدة قبل الإرسال. حُفظت المسودة ولم يُرسل شيء.'));
      const result=await onCreateServiceRequest({order,event:orderToLegacy(order),items:buildQuoteItems(cart,order.services,lang.t.q.svcs,order.event.name||order.event.type)});
      setState({busy:false,error:'',done:result.item?.requestNumber||'—'});clearCart();ctx.finish();
    }catch(error){setState({busy:false,error:error.message||tr('Could not submit your request.','تعذر إرسال الطلب.'),done:null});}
  };
  if(!user)return <OrderSignIn ar={ar}/>;
  if(!isSessionReady)return <p role="status">{tr('Checking your sign-in…','جارٍ التحقق من تسجيل الدخول…')}</p>;
  if(state.done)return <section className="echo-section"><h2>{tr('Quote request received','تم استلام طلب عرض السعر')}</h2><p>{state.done}</p><p>{tr('Your date is not reserved. Our team will review the details and prepare your quotation.','لم يُحجز الموعد. سيراجع فريقنا التفاصيل ويعد عرض السعر.')}</p><a className="echo-btn" href="/dashboard/services">{tr('Open Client Workspace','افتح مساحة العميل')}</a></section>;
  return <section className="echo-section"><p>{tr('One event brief, whether you plan manually or with AI. Review every detail before submitting. * Required for your quotation.','ملف موحد لفعاليتك سواء خططت يدوياً أو مع الذكاء الاصطناعي. راجع التفاصيل قبل الإرسال. * مطلوب لعرض السعر.')}</p>
    <div className="echo-draft-bar"><button className="echo-link" type="button" onClick={ctx.save}>{tr('Save progress','حفظ التقدم')}</button><button className="echo-link" type="button" disabled={ctx.clearing} onClick={()=>{if(window.confirm(tr('Delete this event draft from your account?','حذف مسودة الفعالية من حسابك؟')))ctx.clear();}}>{ctx.clearing?tr('Deleting…','جارٍ الحذف…'):tr('Delete draft','حذف المسودة')}</button></div>
    {['account-failed','conflict'].includes(ctx.saveState)&&<p role="alert">{ctx.saveState==='conflict'?tr('This draft changed in another tab. Reload this page before editing again.','تغيرت المسودة في تبويب آخر. أعد تحميل الصفحة قبل التعديل.'):tr('The draft could not be saved or deleted. Your details are kept; please retry.','تعذر حفظ المسودة أو حذفها. بقيت تفاصيلك محفوظة؛ أعد المحاولة.')}</p>}
    <form className="echo-form" onSubmit={submit}>
      {contract.sections.filter(section=>!section.gate||getPath(ctx.order,section.gate)===true).map(section=><fieldset key={section.id}><legend>{ar?section.ar:section.title}</legend>{section.fields.map(field=><OrderField field={field} ar={ar} user={user} key={field.key}/>)}</fieldset>)}
      <fieldset><legend>{tr('Equipment & quantities','المعدات والكميات')}</legend>{Object.values(cart).length?Object.values(cart).map(item=><div className="echo-line" key={item.id}><span>{item.name}</span><input type="number" aria-label={tr('Quantity for ','الكمية لـ ')+item.name} min={item.minQuantity||1} value={item.quantity} onChange={event=>setCartItem(item,Math.max(item.minQuantity||1,Math.floor(Number(event.target.value))||1))}/><button type="button" className="echo-link" onClick={()=>setCartItem(item,0)}>{tr('Remove','إزالة')}</button></div>):<p>{tr('No equipment selected. Specific equipment is optional unless required for your request.','لم تُحدد معدات. اختيار المعدات التفصيلية اختياري ما لم يتطلبه طلبك.')}</p>}<a href="/#services">{tr('Choose equipment in The Setup','اختر المعدات من قسم التجهيزات')}</a></fieldset>
      <p className="order-field-help">{tr('Reference links are saved as references, not downloaded or uploaded by this form. Archive customization and delivery deadlines require team approval. Final wedding planning remains separate after booking confirmation.','تُحفظ الروابط كمراجع ولا تُنزّل أو تُرفع الملفات بهذا النموذج. تخصيص المقاطع ومواعيد التسليم يخضعان للموافقة. التخطيط النهائي للزفاف منفصل بعد تأكيد الحجز.')}</p>
      <p className="order-field-help">{missingOrderFields(ctx.order).length} {tr('required details still need your answer.','تفاصيل مطلوبة تنتظر إجابتك.')}</p>
      {state.error&&<p role="alert" className="echo-error order-validation">{state.error}</p>}
      <button className="echo-btn" disabled={state.busy||!isSessionReady}>{state.busy?tr('Submitting…','جارٍ الإرسال…'):tr('Submit quote request','أرسل طلب عرض السعر')}</button>
    </form>
  </section>;
}
