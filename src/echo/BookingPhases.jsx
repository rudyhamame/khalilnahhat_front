import {useEffect,useState} from 'react';
import {fieldCode} from '../lib/eventPageModel';
import './bookingPhases.css';

// The five steps of the Booking page. Music Preferences is not a step of its own: it is a sub-step (03.02) of DJ Khalil Service, shown only while that service is chosen.
const ALL_PHASES=[['personal','Personal info','المعلومات الشخصية'],['event','Event info','معلومات الفعالية'],['dj','DJ Khalil Service','خدمة دي جي خليل'],['rental','Rental equipments for other services','معدات التأجير للخدمات الأخرى'],['additional','Additional info','معلومات إضافية']];
const usePhases=()=>ALL_PHASES;

export function PhaseHeading({id,ar=false}){
 const phases=usePhases(),index=phases.findIndex(([key])=>key===id);
 if(index<0)return null;
 const [,en,arabic]=phases[index],n=index+1;
 return <div className="booking-phase" id={`booking-phase-${n}`} data-phase={id} dir={ar?'rtl':'ltr'}><span>{ar?`الخطوة ${n} من ${phases.length}`:`STEP ${n} OF ${phases.length}`}</span><h2>{ar?arabic:en}</h2></div>;
}

export function PhaseBar({ar=false}){
 const phases=usePhases(),count=phases.length;
 const [state,setState]=useState({active:1,show:false});
 useEffect(()=>{
  let frame=0;
  const update=()=>{
   frame=0;
   const tops=Array.from({length:count},(_,i)=>document.getElementById(`booking-phase-${i+1}`)?.getBoundingClientRect().top);
   if(tops[0]===undefined)return;
   let active=1;tops.forEach((top,index)=>{if(top!==undefined&&top<=window.innerHeight*.45)active=index+1;});
   setState(current=>current.active===active&&current.show===(tops[0]<window.innerHeight*.6)?current:{active,show:tops[0]<window.innerHeight*.6});
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  update();window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);const timer=setInterval(schedule,1000);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);clearInterval(timer);};
 },[count]);
 // The page's own textured backdrop keeps its texture and changes colour with the step in view.
 useEffect(()=>{const root=document.querySelector('.echo');root?.setAttribute('data-booking-phase',String(phases[state.active-1]?.[0]||'personal'));return()=>root?.removeAttribute('data-booking-phase');},[state.active,count]);// eslint-disable-line react-hooks/exhaustive-deps
 const go=n=>document.getElementById(`booking-phase-${n}`)?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});
 return <nav className={`phase-bar${state.show?' is-shown':''}`} aria-label={ar?'خطوات الحجز':'Booking steps'} dir={ar?'rtl':'ltr'}>
  {phases.map(([key,en,arabic],index)=><button key={key} type="button" className={state.active===index+1?'is-active':''} aria-current={state.active===index+1?'step':undefined} onClick={()=>go(index+1)}><b>{index+1}</b><span>{ar?arabic:en}</span></button>)}
 </nav>;
}

// The STEP.SEC.ATOM number in front of a form label (pass a field `k`, or a ready-made `code` for a whole section).
export function FieldCode({k,code}){return <i className="ysf-order" aria-hidden="true">{code||fieldCode(k)}</i>;}
