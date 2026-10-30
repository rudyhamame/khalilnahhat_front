import {useId,useState} from 'react';
import {ArrowLeft,ArrowRight,Check,MessageCircle,Phone,Pencil} from 'lucide-react';
import {fields,getPath,isAnswered,validValue} from '../lib/eventOrderCore.mjs';
import {useEventOrder} from './eventOrderContext';
import './guidedBooking.css';

const steps=[
 {title:['Your occasion','مناسبتك'],keys:['event.type']},
 {title:['Date & time','التاريخ والوقت'],keys:['event.date','event.startTime','event.endTime']},
 {title:['Guests & venue','الضيوف والمكان'],keys:['event.guestCount','event.venue.name','event.venue.city']},
 {title:['The space','المكان'],keys:['event.venue.area','event.venue.setting']},
 {title:['Your services','الخدمات'],keys:['services']},
 {title:['Music & extras','الموسيقى والإضافات'],keys:['music.styles','music.otherLanguage','additional.notes'],optional:true},
];
const options={
 wedding:['Wedding','زفاف'],engagement:['Engagement','خطوبة'],birthday:['Birthday','عيد ميلاد'],corporate:['Corporate event','فعالية شركة'],party:['Party','حفلة'],graduation:['Graduation','تخرج'],other:['Other','أخرى'],
 dj:['DJ & MC','دي جي وتقديم'],sound:['Sound system','نظام صوت'],lighting:['Lighting','إضاءة'],led:['LED screens','شاشات LED'],fx:['Special effects','مؤثرات خاصة'],rental:['Equipment rental','تأجير معدات'],
 gta:['Inside the GTA','داخل تورونتو الكبرى'],outside_gta:['Outside the GTA','خارج تورونتو الكبرى'],indoor:['Indoor','داخلي'],outdoor:['Outdoor','خارجي'],both:['Both','كلاهما'],
 arabic:['Arabic','العربية'],english:['English','الإنجليزية'],kurdish:['Kurdish','الكردية'],armenian:['Armenian','الأرمنية'],mixed:['A mix of languages','لغات متنوعة'],
};
const fieldByKey=key=>fields.find(field=>field.key===key);
const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'America/Toronto'});

function AnswerField({field,value,onChange,ar}){
 const id=useId(),label=ar?field.ar:field.label;
 if(field.options){
  const multi=field.type==='multi';
  return <fieldset className="egb-field"><legend>{label}</legend>{multi&&<small>{ar?'اختر كل ما يناسبك':'Choose all that apply'}</small>}
   <div className="egb-choices" role="group" aria-label={label}>{field.options.map(option=>{
    const selected=multi?(value||[]).includes(option):value===option;
    const text=field.key==='services'&&option==='corporate'?(ar?'إنتاج فعاليات الشركات':'Corporate production'):(options[option]?.[ar?1:0]||option);
    return <button type="button" key={option} aria-pressed={selected} className={selected?'is-selected':''} onClick={()=>onChange(multi?(selected?value.filter(item=>item!==option):[...(value||[]),option]):option)}><span className="egb-choice-check">{selected&&<Check size={13}/>}</span>{text}</button>;
   })}</div>
  </fieldset>;
 }
 return <div className="egb-field"><label htmlFor={id}>{label}</label>{field.type==='textarea'?<textarea id={id} rows={3} maxLength={field.maxLength||3000} value={value??''} onChange={event=>onChange(event.target.value)}/>:<input id={id} type={field.type||'text'} value={value??''} min={field.type==='date'?today():field.type==='number'?1:undefined} max={field.type==='number'?field.max:undefined} step={field.type==='number'?1:undefined} maxLength={field.maxLength||320} required={field.required} onChange={event=>onChange(field.type==='number'?(event.target.value===''?null:Number(event.target.value)):event.target.value)}/>}</div>;
}

function StepForm({index,order,onContinue,onBack,onSkip,ar}){
 const step=steps[index],tr=(en,arabic)=>ar?arabic:en;
 const [values,setValues]=useState(()=>Object.fromEntries(step.keys.map(key=>[key,getPath(order,key)])));
 const [error,setError]=useState('');
 const visibleKeys=step.keys.filter(key=>key!=='music.otherLanguage'||values['music.styles']?.includes('other'));
 const submit=event=>{
  event.preventDefault();
  for(const key of visibleKeys){const field=fieldByKey(key),value=values[key];if((field.required&&(!isAnswered(value)||(typeof value==='string'&&!value.trim())))||!validValue(field,value)){setError(tr('Please complete each required answer.','يرجى إكمال الإجابات المطلوبة.'));return;}}
  if(index===1&&(values['event.date']<today()||values['event.startTime']===values['event.endTime'])){setError(tr('Choose an upcoming date and different start and end times.','اختر تاريخاً قادماً ووقتي بداية ونهاية مختلفين.'));return;}
  if(index===2&&values['event.guestCount']<1){setError(tr('Enter at least one guest.','أدخل ضيفاً واحداً على الأقل.'));return;}
  const answers=Object.fromEntries(Object.entries(values).map(([key,value])=>[key,typeof value==='string'?value.trim():value]));if(index===5&&!values['music.styles']?.includes('other'))answers['music.otherLanguage']=null;
  onContinue(answers);
 };
 return <form className="egb-question" onSubmit={submit}>
  <div className="egb-question-title"><span>{step.optional?tr('Optional details','تفاصيل اختيارية'):tr('Let’s get the details right','لنحدد التفاصيل')}</span><h3>{step.title[ar?1:0]}</h3></div>
  <div className="egb-fields">{visibleKeys.map(key=><AnswerField key={key} field={fieldByKey(key)} value={values[key]} ar={ar} onChange={value=>{setError('');setValues(current=>({...current,[key]:value}));}}/>)}</div>
  {index===1&&<p className="egb-hint">{tr('Toronto time. An end time after midnight is fine.','بتوقيت تورونتو. يمكن أن تنتهي الفعالية بعد منتصف الليل.')}</p>}
  {error&&<p className="egb-error" role="alert">{error}</p>}
  <footer className="egb-actions"><button type="button" disabled={index===0} onClick={onBack}><ArrowLeft size={15}/>{tr('Back','السابق')}</button><div>{step.optional&&<button type="button" onClick={onSkip}>{tr('Skip','تخطي')}</button>}<button type="submit" className="egb-primary">{tr('Continue','متابعة')}<ArrowRight size={15}/></button></div></footer>
 </form>;
}

function GuidedSteps({ar,onReview,onAsk,onVoice}){
 const ctx=useEventOrder(),tr=(en,arabic)=>ar?arabic:en;
 const [index,setIndex]=useState(()=>{const missing=steps.findIndex(step=>!step.optional&&step.keys.some(key=>fieldByKey(key).required&&!isAnswered(getPath(ctx.order,key))));return missing<0?steps.length:missing;});
 const [editing,setEditing]=useState(false);
 const summary=index===steps.length;
 const editStep=i=>{setEditing(true);setIndex(i);};
 const saveAnswers=answers=>{ctx.begin('ai');for(const [key,value] of Object.entries(answers))ctx.setField(key,value);setIndex(value=>editing?steps.length:Math.min(value+1,steps.length));setEditing(false);};
 const describe=(key,value)=>{if(!isAnswered(value))return tr('Not added','لم يُضف');const display=item=>key==='services'&&item==='corporate'?tr('Corporate production','إنتاج فعاليات الشركات'):options[item]?.[ar?1:0]||String(item);return Array.isArray(value)?value.map(display).join(' · '):display(value);};
 return <section className="echo-guided-booking" aria-label={tr('Guided event booking','حجز الفعالية الموجّه')} dir={ar?'rtl':undefined}>
  <header className="egb-header"><div><span>ECHO AI</span><h2>{tr('Plan your event','خطط لفعاليتك')}</h2></div><button type="button" onClick={onVoice}><Phone size={14}/>{tr('Voice','صوت')}</button></header>
  <nav className="egb-progress" aria-label={tr('Booking progress','مراحل الحجز')}>{[...steps,{title:['Review','المراجعة']}].map((step,i)=><button type="button" key={i} aria-current={i===index?'step':undefined} disabled={i>index} onClick={()=>summary?editStep(i):setIndex(i)} title={step.title[ar?1:0]}><span>{i<index?<Check size={11}/>:i+1}</span><small>{step.title[ar?1:0]}</small></button>)}</nav>
  <div className="egb-body" key={index}>
   {summary?<div className="egb-summary"><span className="egb-eyebrow">{tr('Your event draft','مسودة فعاليتك')}</span><h3>{tr('Everything in one place.','كل التفاصيل في مكان واحد.')}</h3><p>{tr('Review your answers, then add your contact details before submitting.','راجع إجاباتك ثم أضف معلومات التواصل قبل إرسال الطلب.')}</p>
    {steps.map((step,i)=><section key={i}><header><h4>{step.title[ar?1:0]}</h4><button type="button" onClick={()=>editStep(i)} aria-label={`${tr('Edit','تعديل')} ${step.title[ar?1:0]}`}><Pencil size={12}/>{tr('Edit','تعديل')}</button></header><dl>{step.keys.filter(key=>key!=='music.otherLanguage'||ctx.order.music.styles.includes('other')).map(key=><div key={key}><dt>{ar?fieldByKey(key).ar:fieldByKey(key).label}</dt><dd>{describe(key,getPath(ctx.order,key))}</dd></div>)}</dl></section>)}
    <section className="egb-equipment"><header><h4>{tr('Equipment','المعدات')}</h4><button type="button" onClick={()=>document.getElementById('services')?.scrollIntoView({behavior:'smooth',block:'start'})}>{tr('Choose equipment','اختر المعدات')}<ArrowRight size={13}/></button></header>{ctx.order.equipment.length?<ul>{ctx.order.equipment.map(item=><li key={item.id}>{item.name} <span>× {item.quantity}</span></li>)}</ul>:<p>{tr('Choose equipment and quantities in The Setup section if needed.','اختر المعدات والكميات من قسم التجهيز إن لزم.')}</p>}</section>
    <footer className="egb-actions"><button type="button" onClick={()=>setIndex(steps.length-1)}><ArrowLeft size={15}/>{tr('Back','السابق')}</button><button type="button" className="egb-primary" onClick={onReview}>{tr('Review booking request','مراجعة طلب الحجز')}<ArrowRight size={15}/></button></footer>
   </div>:<StepForm index={index} order={ctx.order} ar={ar} onContinue={saveAnswers} onBack={()=>{setIndex(value=>editing?steps.length:Math.max(0,value-1));setEditing(false);}} onSkip={()=>{setIndex(value=>editing?steps.length:value+1);setEditing(false);}}/>}
  </div>
  <footer className="egb-bottom"><span>{tr('Your choices update your draft. Nothing is booked yet.','تُحفظ اختياراتك في المسودة. لم يتم الحجز بعد.')}</span><button type="button" onClick={onAsk}><MessageCircle size={13}/>{tr('Ask Echo a question','اسأل إيكو سؤالاً')}</button></footer>
 </section>;
}

export default function GuidedBookingFlow(props){
 const ctx=useEventOrder();
 if(!ctx.cloudReady||ctx.clearing)return <div className="echo-guided-booking egb-loading" role="status"><p>{props.ar?'جارٍ تحميل مسودة الفعالية…':'Loading your event draft…'}</p>{ctx.saveState==='load-failed'&&<button type="button" onClick={ctx.retrySync}>{props.ar?'إعادة المحاولة':'Retry loading draft'}</button>}</div>;
 return <GuidedSteps {...props}/>;
}
