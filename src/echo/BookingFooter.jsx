import {useEffect,useState} from 'react';
import {useTree,useTreeSteps} from '../lib/tree';
import {stepMounted} from '../lib/treeCore';
import {ChevronUp,X} from 'lucide-react';
import {useEventOrder} from './eventOrderContext';
import {bookingProgress} from './BookingCart';
import {PUBLIC_PAGE_PATHS} from '../lib/publicPages';
import {effectiveMissing} from '../lib/bookingNextStep';
import {fields,fieldName,getPath,isAnswered} from '../lib/eventOrderCore.mjs';
import {ATOM_KEYS,fieldCode} from '../lib/eventPageModel';
import {manualBookingFieldHref} from '../lib/bookingAtomReview';
import SmartCartIcon from './SmartCartIcon';
import './bookingFooter.css';

const NAMES={'music.languagePairs':['Language & dialect','اللغة واللهجة'],'music.genres':['Music genres','الأنواع الموسيقية'],'music.suggestedSongs':['Songs for event moments','أغانٍ للحظات الفعالية'],'music.favouriteSongs':['Favourite songs','الأغاني المفضلة'],'music.favouriteArtists':['Favourite artists','الفنانون المفضلون'],'services':['Rental services','خدمات التأجير'],'equipment':['Rental equipment','معدات التأجير'],'references.photos':['Inspiration photos','صور ملهمة'],'references.images':['Inspiration photo links','روابط صور ملهمة'],'additional.notes':['Additional notes','ملاحظات إضافية'],'additional.voucherCode':['Voucher','القسيمة']};
// The five steps. Required atoms come from the contract; every other atom of the step is optional.
const STEPS=[['Personal','الشخصية'],['Event','الفعالية'],['DJ','دي جي'],['Rental','التأجير'],['Extras','إضافات']];
// Not typed in by the client (map data) or not on this page (conditional title, room setup).
const SKIP=new Set(['event.venue.latitude','event.venue.longitude','event.venue.source','event.venue.sourceId','event.venue.sourceAttribution','event.title','event.setup.requirements','services']);
const stepOfKey=key=>parseInt(String(fieldCode(key)||'').slice(0,2),10);
// Required atoms per step: the contract's required fields, the DJ decision (step 3) and .
const REQUIRED_KEYS=n=>[...new Set([...fields.filter(field=>field.required&&parseInt(String(fieldCode(field.key)||'').slice(0,2),10)===n).map(field=>field.key).filter(key=>!['rental.requested','services'].includes(key)),...(n===3?['music.djRequested']:[]),...(n===4?['rental.requested']:[])])];
const REQUIRED_ALL=new Set([1,2,3,4,5].flatMap(REQUIRED_KEYS));
// Every piece of rental equipment is its own data atom (the Rental step counts the chosen items against all items); everything else is a plain answered check.
const answered=(order,key)=>key==='equipment'?order?.equipment?.length>0:isAnswered(getPath(order,key));
// Same-page links scroll; others (account fields) navigate.
const blink=el=>{el.classList.remove('is-blinking');void el.offsetWidth;el.classList.add('is-blinking');setTimeout(()=>el.classList.remove('is-blinking'),2400);};
const go=event=>{const link=event.currentTarget,href=link.getAttribute('href'),hash=href.split('#')[1],target=document.querySelector(`[data-booking-field="${link.dataset.field}"]`)||(hash&&document.getElementById(hash));if(!target||href.startsWith('/dashboard'))return;event.preventDefault();let done=false;const run=()=>{if(done)return;done=true;blink(target);};target.scrollIntoView({behavior:'smooth',block:'center'});window.addEventListener('scrollend',run,{once:true});setTimeout(run,900);};

// App-container footer of the Booking page: the booking status and the way into the Echo AI Smart Cart.
// It appears once the first data atom of step 2 (the event type, 02.01.01) is filled.
export default function BookingFooter({ar=false}){
  const ctx=useEventOrder(),tr=(en,arabic)=>ar?arabic:en,{equipment:catalogEquipment}=useTree(),avail=useTreeSteps();
  // Closed for this browser session; the floating cart icon comes back with it.
  const [closed,setClosed]=useState(()=>{try{return sessionStorage.getItem('echo-booking-footer')==='closed';}catch{return false;}});
  const close=()=>{setClosed(true);try{sessionStorage.setItem('echo-booking-footer','closed');}catch{/* private mode: closes for this view only */}};
  // Visible while scrolling down, hidden while scrolling up.
  const [shown,setShown]=useState(true);
  useEffect(()=>{let last=window.scrollY;const onScroll=()=>{const y=window.scrollY,delta=y-last;if(Math.abs(delta)<6)return;setShown(delta>0);last=y;};window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll);},[]);
  const open=()=>{setClosed(false);try{sessionStorage.removeItem('echo-booking-footer');}catch{/* ignore */}};
  if(!ctx?.order?.event?.type)return null;
  if(closed)return <button type="button" className={`booking-footer-tab${shown?'':' is-hidden'}`} dir={ar?'rtl':'ltr'} onClick={open} aria-label={tr('Open booking status','فتح حالة الحجز')}><ChevronUp size={16} aria-hidden="true"/>{tr('Booking status','حالة الحجز')}</button>;
  const label=(key)=>{const code=fieldCode(key),name=NAMES[key]?NAMES[key][ar?1:0]:fieldName(key,ar)||key;return `${code?code+' ':''}${name}`;};
  // Page order = the STEP.SEC.ATOM code, so the link always starts from the earliest atom still missing.
  const byPage=(a,b)=>(fieldCode(a)||'99').localeCompare(fieldCode(b)||'99');
  const required=effectiveMissing(ctx.order).map(field=>field.key).filter(key=>key!=='services').sort(byPage)[0],optional=ATOM_KEYS.filter(key=>!SKIP.has(key)&&!REQUIRED_ALL.has(key)&&stepMounted(stepOfKey(key),avail)).sort(byPage).find(key=>!answered(ctx.order,key));
  const link=key=>key?<a href={manualBookingFieldHref(key)} data-field={key} onClick={go}>{label(key)}</a>:<span className="booking-footer-done">{tr('All done','اكتمل')}</span>;
  const missingKeys=effectiveMissing(ctx.order).map(field=>field.key).filter(key=>key!=='services'),stepOf=key=>parseInt(String(fieldCode(key)||'').slice(0,2),10);
  const steps=STEPS.map(([en,arabic],index)=>{const n=index+1,optionalKeys=ATOM_KEYS.filter(key=>stepOfKey(key)===n&&!SKIP.has(key)&&!REQUIRED_ALL.has(key)),left=missingKeys.filter(key=>stepOf(key)===n).length,reqTotal=Math.max(REQUIRED_KEYS(n).length,left),reqDone=reqTotal-left,chosen=ctx.order.equipment?.length||0,rest=optionalKeys.filter(key=>key!=='equipment'),optDone=rest.filter(key=>answered(ctx.order,key)).length+(n===4?chosen:0),optTotal=n===4?Math.max(catalogEquipment.length,chosen):rest.length,all=reqTotal+optTotal,percent=all?Math.round((reqDone+optDone)/all*100):0;
   return {n,name:ar?arabic:en,left,reqDone,reqTotal,optDone,optTotal,percent,state:left>0?'todo':reqTotal>0||optDone>0?'done':'optional'};});
  const visible=steps.filter(step=>(step.n!==3||avail.dj)&&(step.n!==4||avail.rental)).map((step,at)=>({...step,pos:at+1})); // steps that exist in the catalogue, numbered as the page numbers them
  const goStep=n=>document.getElementById(`booking-phase-${n}`)?.scrollIntoView({behavior:'smooth',block:'start'});
  const {count,total}=bookingProgress(ctx.order),percent=Math.min(100,Math.round(count/total*100));
  return <><div className="booking-footer-spacer" aria-hidden="true"/><footer className={`booking-footer${shown?'':' is-hidden'}`} dir={ar?'rtl':'ltr'} aria-label={tr('Booking status','حالة الحجز')}>
    <button type="button" className="booking-footer-close" onClick={close} aria-label={tr('Close booking status','إغلاق حالة الحجز')} title={tr('Close','إغلاق')}><X size={16} aria-hidden="true"/></button>
    <ol className="booking-footer-steps" aria-label={tr('Step progress','تقدم الخطوات')}>{visible.map(step=><li key={step.n}><button type="button" className={`is-${step.state}`} onClick={()=>goStep(step.pos)} aria-label={`${tr('Step','الخطوة')} ${step.pos} ${step.name}: ${tr('required','مطلوب')} ${step.reqDone}/${step.reqTotal}, ${tr('optional','اختياري')} ${step.optDone}/${step.optTotal}`}><span className="step-line"><b>{step.pos}</b><em>{step.name}</em><i aria-hidden="true">{step.state==='done'&&step.percent===100?'✓':`${step.percent}%`}</i></span><u className="step-bar" aria-hidden="true"><s style={{width:`${step.percent}%`}}/></u><small className="step-counts">{step.reqTotal>0&&<span>{tr('Required','مطلوب')} {step.reqDone}/{step.reqTotal}</span>}{step.optTotal>0&&<span>{tr('Optional','اختياري')} {step.optDone}/{step.optTotal}</span>}</small></button></li>)}</ol>
    <div className="booking-footer-status" role="status">
      <span>{tr('Booking status','حالة الحجز')}</span>
      <strong>{count}/{total} {tr('details','تفصيل')}</strong>
      <i className="booking-footer-bar" aria-hidden="true"><b style={{width:`${percent}%`}}/></i>
    </div>
    <dl className="booking-footer-next"><div><dt>{tr('Next required:','المطلوب التالي:')}</dt><dd>{link(required)}</dd></div><div><dt>{tr('Next optional:','الاختياري التالي:')}</dt><dd>{link(optional)}</dd></div></dl>
    <a className="booking-footer-button" href={PUBLIC_PAGE_PATHS.assistant}><SmartCartIcon size={18} strokeWidth={1.8} aria-hidden="true"/>{tr('Open Echo Smart Cart','افتح عربة إيكو الذكية')}</a>
  </footer></>;
}
