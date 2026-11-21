import {useEffect,useState} from 'react';
import {fieldCode} from '../lib/eventPageModel';
import './bookingPhases.css';

// The Booking page has three steps. PhaseHeading opens each one; PhaseBar follows the client down the page and jumps between them.
const PHASES=[['Personal info','المعلومات الشخصية'],['Event info','معلومات الفعالية'],['DJ Khalil Service','خدمة دي جي خليل'],['Rental equipments for other services','معدات التأجير للخدمات الأخرى'],['Additional info','معلومات إضافية']];

export function PhaseHeading({n,ar=false}){
 const [en,arabic]=PHASES[n-1];
 return <div className="booking-phase" id={`booking-phase-${n}`} dir={ar?'rtl':'ltr'}><span>{ar?`الخطوة ${n} من ${PHASES.length}`:`STEP ${n} OF ${PHASES.length}`}</span><h2>{ar?arabic:en}</h2></div>;
}

export function PhaseBar({ar=false}){
 const [state,setState]=useState({active:1,show:false});
 useEffect(()=>{
  let frame=0;
  const update=()=>{
   frame=0;
   const tops=PHASES.map((_,i)=>i+1).map(n=>document.getElementById(`booking-phase-${n}`)?.getBoundingClientRect().top);
   if(tops[0]===undefined)return;
   let active=1;tops.forEach((top,index)=>{if(top!==undefined&&top<=window.innerHeight*.45)active=index+1;});
   setState(current=>current.active===active&&current.show===(tops[0]<window.innerHeight*.6)?current:{active,show:tops[0]<window.innerHeight*.6});
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);const timer=setInterval(schedule,1000);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);clearInterval(timer);};
 },[]);
 // The page's own textured backdrop keeps its texture and changes colour with the step in view.
 useEffect(()=>{const root=document.querySelector('.echo');root?.setAttribute('data-booking-phase',String(state.active));return()=>root?.removeAttribute('data-booking-phase');},[state.active]);
 const go=n=>document.getElementById(`booking-phase-${n}`)?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 return <nav className={`phase-bar${state.show?' is-shown':''}`} aria-label={ar?'خطوات الحجز':'Booking steps'} dir={ar?'rtl':'ltr'}>
  {PHASES.map(([en,arabic],index)=><button key={en} type="button" className={state.active===index+1?'is-active':''} aria-current={state.active===index+1?'step':undefined} onClick={()=>go(index+1)}><b>{index+1}</b><span>{ar?arabic:en}</span></button>)}
 </nav>;
}

// The STEP.SEC.ATOM number in front of a form label (pass a field `k`, or a ready-made `code` for a whole section).
export function FieldCode({k,code}){return <i className="ysf-order" aria-hidden="true">{code||fieldCode(k)}</i>;}
