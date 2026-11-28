import {useEffect,useState} from 'react';
import {useTree,useTreeSteps} from '../lib/tree';
import {ChevronUp,Trash2,X} from 'lucide-react';
import {useEventOrder} from './eventOrderContext';
import {confirmDeletion} from '../lib/confirmDeletion';
import {BOOKING_TREE_STEPS,requiredMark} from '../lib/bookingAtoms.mjs';
import {PUBLIC_PAGE_PATHS} from '../lib/publicPages';
import {hasBookingServices} from '../lib/bookingFlow.mjs';
import {treeAtomProgress} from '../lib/treeAtoms';
import {NAMES,nextRequiredKey,nextOptionalKey} from '../lib/footerAtoms';
import {fieldName} from '../lib/eventOrderCore.mjs';
import {fieldCode} from '../lib/eventPageModel';
import {manualBookingFieldHref} from '../lib/bookingAtomReview';
import SmartCartIcon from './SmartCartIcon';
import './bookingFooter.css';

// The five steps. Required atoms come from the contract; every other atom of the step is optional.
const STEPS=BOOKING_TREE_STEPS.map(step=>[step.short,step.shortAr]); // the step names come from the Booking Tree
// Not typed in by the client (map data) or not on this page (conditional title, room setup).
// Required atoms per step: the contract's required fields, the DJ decision (step 3) and .
// Every piece of rental equipment is its own data atom (the Rental step counts the chosen items against all items); everything else is a plain answered check.
// Same-page links scroll; others (account fields) navigate.
const blink=el=>{el.classList.remove('is-blinking');void el.offsetWidth;el.classList.add('is-blinking');setTimeout(()=>el.classList.remove('is-blinking'),2400);};
const go=event=>{const link=event.currentTarget,href=link.getAttribute('href'),hash=href.split('#')[1],target=document.querySelector(`[data-booking-field="${link.dataset.field}"]`)||(hash&&document.getElementById(hash));if(!target||href.startsWith('/dashboard'))return;event.preventDefault();let done=false;const run=()=>{if(done)return;done=true;blink(target);};target.scrollIntoView({behavior:'smooth',block:'center'});window.addEventListener('scrollend',run,{once:true});setTimeout(run,900);};

// App-container footer of the Booking page: the booking status and the way into the Echo AI Smart Cart.
// It is always shown, even before any data atom is set.
export default function BookingFooter({ar=false}){
  const ctx=useEventOrder(),tr=(en,arabic)=>ar?arabic:en,treeData=useTree(),avail=useTreeSteps();
  // Closed for this browser session; the floating cart icon comes back with it.
  const [closed,setClosed]=useState(()=>{try{return sessionStorage.getItem('echo-booking-footer')==='closed';}catch{return false;}});
  const close=()=>{setClosed(true);try{sessionStorage.setItem('echo-booking-footer','closed');}catch{/* private mode: closes for this view only */}};
  // Visible while scrolling down, hidden while scrolling up.
  // It also stays hidden in the first viewport: it appears once step 1 has scrolled into view (no step 1 on the page = no wait).
  const [shown,setShown]=useState(false),[emptyFailed,setEmptyFailed]=useState(false);
  useEffect(()=>{let last=window.scrollY,up=false;const reached=()=>{const top=document.getElementById('booking-phase-1')?.getBoundingClientRect().top;return top===undefined||top<window.innerHeight*.6;};const apply=()=>setShown(reached()&&!up);apply();const onScroll=()=>{const y=window.scrollY,delta=y-last;if(Math.abs(delta)>=6){up=delta<0;last=y;}apply();};window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll);},[]);
  const open=()=>{setClosed(false);try{sessionStorage.removeItem('echo-booking-footer');}catch{/* ignore */}};
  if(!ctx?.order)return null;
  if(closed)return <button type="button" className={`booking-footer-tab${shown?'':' is-hidden'}`} dir={ar?'rtl':'ltr'} onClick={open} aria-label={tr('Open booking status','فتح حالة الحجز')}><ChevronUp size={16} aria-hidden="true"/>{tr('Booking status','حالة الحجز')}</button>;
  const label=(key)=>{const code=fieldCode(key),name=NAMES[key]?NAMES[key][ar?1:0]:fieldName(key,ar)||key;return `${code?code+' ':''}${name}${requiredMark(key)}`;};
  const atoms=treeAtomProgress(ctx.order,treeData),required=nextRequiredKey(ctx.order),optional=nextOptionalKey(ctx.order);
  const link=key=>key?<a href={manualBookingFieldHref(key,ctx.signedIn)} data-field={key} onClick={go}>{label(key)}</a>:<span className="booking-footer-done">{tr('All done','اكتمل')}</span>;
  // Source of truth: the Data atoms tree (admin dashboard), with its required/optional rules. Every count below comes from it.
  const steps=STEPS.map(([en,arabic],index)=>{const n=index+1,mine=atoms.filter(atom=>atom.step===n),req=mine.filter(atom=>atom.required),opt=mine.filter(atom=>!atom.required),
  left=req.filter(atom=>!atom.done).length,reqTotal=req.length,reqDone=reqTotal-left,optDone=opt.filter(atom=>atom.done).length,optTotal=opt.length,
  all=reqTotal+optTotal,percent=all?Math.round((reqDone+optDone)/all*100):0;
   return {n,name:ar?arabic:en,left,reqDone,reqTotal,optDone,optTotal,percent,state:left>0?'todo':reqTotal>0||optDone>0?'done':'optional'};});
  const visible=steps.filter(step=>step.n!==3||hasBookingServices(avail)).map((step,at)=>({...step,pos:at+1})); // steps that exist in the catalogue, numbered as the page numbers them
  const goStep=n=>{const el=document.getElementById(`booking-phase-${n}`);if(el)el.scrollIntoView({behavior:'smooth',block:'start'});else window.location.assign(`/booking#booking-phase-${n}`);}; // off the steps tab: open it at that step
  // Every data atom of the booking contract counts: total = the contract's atoms.
  // Every piece of catalogue equipment is its own atom, replacing the single `equipment` entry.
  const total=atoms.length,count=atoms.filter(atom=>atom.done).length,percent=total?Math.min(100,Math.round(count/total*100)):0;
  // Empties the whole draft (details, equipment, conversation), then reloads the page so every form starts blank.
  const emptyDraft=async()=>{
    setEmptyFailed(false);
    if(!await confirmDeletion(tr('Empty this booking draft? Every detail, equipment choice and the conversation will be removed.','إفراغ مسودة الحجز؟ ستُزال كل التفاصيل والمعدات والمحادثة.'),{title:tr('Empty booking draft?','إفراغ مسودة الحجز؟'),confirmLabel:tr('Empty draft','إفراغ المسودة'),irreversible:false}))return;
    const cleared=await ctx.clear(true);
    if(cleared)window.location.reload();else setEmptyFailed(true);
  };
  return <><div className="booking-footer-spacer" aria-hidden="true"/><footer className={`booking-footer${shown?'':' is-hidden'}`} dir={ar?'rtl':'ltr'} aria-label={tr('Booking status','حالة الحجز')}>
    <button type="button" className="booking-footer-close" onClick={close} aria-label={tr('Close booking status','إغلاق حالة الحجز')} title={tr('Close','إغلاق')}><X size={16} aria-hidden="true"/></button>
    <div className="booking-footer-main">
    <ol className="booking-footer-steps" aria-label={tr('Step progress','تقدم الخطوات')}>{visible.map(step=><li key={step.n}><button type="button" className={`is-${step.state}`} onClick={()=>goStep(step.pos)} aria-label={`${tr('Step','الخطوة')} ${step.pos} ${step.name}: ${tr('required','مطلوب')} ${step.reqDone}/${step.reqTotal}, ${tr('optional','اختياري')} ${step.optDone}/${step.optTotal}`}><span className="step-line"><b>{step.pos}</b><small className="step-total" title={`${tr('Required','مطلوب')} ${step.reqDone}/${step.reqTotal} · ${tr('Optional','اختياري')} ${step.optDone}/${step.optTotal}`}>{step.reqTotal>0&&<span className="is-required"><b>{step.reqDone}</b>/{step.reqTotal}*</span>}{step.optTotal>0&&<span className="is-optional"><b>{step.optDone}</b>/{step.optTotal}</span>}</small><em>{step.name}</em><i aria-hidden="true">{step.state==='done'&&step.percent===100?'✓':`${step.percent}%`}</i></span><u className="step-bar" aria-hidden="true"><s style={{width:`${step.percent}%`}}/></u><small className="step-counts">{step.reqTotal>0&&<span>{tr('Required','مطلوب')} {step.reqDone}/{step.reqTotal}</span>}{step.optTotal>0&&<span>{tr('Optional','اختياري')} {step.optDone}/{step.optTotal}</span>}</small></button></li>)}</ol>
    <div className="booking-footer-status" role="status">
      <span>{tr('Booking status','حالة الحجز')}</span>
      <strong>{count}/{total} {tr('details','تفصيل')}</strong>
      <i className="booking-footer-bar" aria-hidden="true"><b style={{width:`${percent}%`}}/></i>
    </div>
    <dl className="booking-footer-next"><div><dt>{tr('Next required:','المطلوب التالي:')}</dt><dd>{link(required)}</dd></div><div><dt>{tr('Next optional:','الاختياري التالي:')}</dt><dd>{link(optional)}</dd></div></dl>
    </div>
    <div className="booking-footer-actions">
      <button type="button" className="booking-footer-delete" disabled={ctx.clearing} onClick={emptyDraft}><Trash2 size={16} strokeWidth={1.8} aria-hidden="true"/>{tr('Empty Booking Draft','إفراغ مسودة الحجز')}</button>
      {emptyFailed&&<small className="booking-footer-error" role="alert">{tr('The draft could not be emptied. Check your connection and try again.','تعذر إفراغ المسودة. تحقق من الاتصال وحاول مجدداً.')}</small>}
      <a className="booking-footer-button" href={PUBLIC_PAGE_PATHS.assistant}><SmartCartIcon size={18} strokeWidth={1.8} aria-hidden="true"/>{tr('Open Echo Smart Cart','افتح عربة إيكو الذكية')}</a>
    </div>
  </footer></>;
}
