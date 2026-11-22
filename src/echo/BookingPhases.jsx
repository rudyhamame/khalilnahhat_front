import {useEffect,useState} from 'react';
import {useTreeService,useTreeSteps} from '../lib/tree';
import {fieldCode} from '../lib/eventPageModel';
import './bookingPhases.css';

// The five steps of the Booking page. Music Preferences is not a step of its own: it is a sub-step (03.02) of DJ Khalil Service, shown only while that service is chosen.
const ALL_PHASES=[['personal','Personal info','المعلومات الشخصية','Tell us who we are planning with and how to reach you, so your quote request goes to the right person.','أخبرنا مع من نخطط وكيف نصل إليك، ليصل طلب عرض السعر إلى الشخص المناسب.'],['event','Event info','معلومات الفعالية','Your occasion, date, guests and venue shape everything that follows: the sound, the lighting and the timing of the night.','مناسبتك وموعدك وضيوفك ومكانك تحدد كل ما يلي: الصوت والإضاءة وتوقيت السهرة.'],['dj','DJ Khalil Service','خدمة دي جي خليل','Add DJ Khalil to your event, then share the music you love: languages, genres, special moments and favourite songs.','أضف دي جي خليل إلى فعاليتك، ثم شاركنا الموسيقى التي تحبها: اللغات والأنواع واللحظات الخاصة وأغانيك المفضلة.'],['rental','Rental equipments for other services','معدات التأجير للخدمات الأخرى','We do not provide these services ourselves, but we rent you the equipment for them: speakers, lighting and more.','لا نقدم هذه الخدمات بأنفسنا، لكننا نؤجر لك المعدات اللازمة لها: مكبرات الصوت والإضاءة وغيرها.'],['additional','Additional info','معلومات إضافية','Inspiration, documents, a voucher and any last notes. Submitting requests a quote; it does not reserve your date.','أفكار ومستندات وقسيمة وأي ملاحظات أخيرة. الإرسال يطلب عرض سعر ولا يحجز موعدك.']];
// Steps exist only while their service is in the catalogue; step 3 carries the name the admin gave the DJ service (id dj).
const usePhases=(ar=false)=>{const dj=useTreeService('dj',ar),steps=useTreeSteps();return ALL_PHASES.filter(row=>(row[0]!=='dj'||steps.dj)&&(row[0]!=='rental'||steps.rental)).map(row=>row[0]==='dj'&&dj.name?[row[0],dj.name,dj.name,row[3].replace('DJ Khalil',dj.name),row[4].replace('دي جي خليل',dj.name)]:row);};
// Longer headings for the page; the step bar keeps the short names above.
const HEADINGS={personal:['Personal info: who we are planning with','المعلومات الشخصية: مع من نخطط'],event:['Event info: your occasion, date, guests and venue','معلومات الفعالية: المناسبة والموعد والضيوف والمكان'],dj:['DJ Khalil Service: live music for your night','خدمة دي جي خليل: موسيقى حية لسهرتك'],rental:['Rental equipments for the services we do not provide','معدات التأجير للخدمات التي لا نقدمها'],additional:['Additional info: inspiration, documents and notes','معلومات إضافية: أفكار ومستندات وملاحظات']};

export function PhaseHeading({id,ar=false}){
 const phases=usePhases(ar),dj=useTreeService('dj',ar),index=phases.findIndex(([key])=>key===id);
 if(index<0)return null;
 const [,en,arabic,subEn,subAr]=phases[index],n=index+1;
 return <div className="booking-phase" id={`booking-phase-${n}`} data-phase={id} dir={ar?'rtl':'ltr'}><span>{ar?`الخطوة ${n} من ${phases.length}`:`STEP ${n} OF ${phases.length}`}</span><h2>{id==='dj'&&dj.name?`${dj.name}: ${ar?'موسيقى حية لسهرتك':'live music for your night'}`:HEADINGS[id]?.[ar?1:0]||(ar?arabic:en)}</h2>{subEn&&<p className="booking-phase-sub">{ar?subAr:subEn}</p>}</div>;
}

export function PhaseBar({ar=false}){
 const phases=usePhases(ar),count=phases.length;
 const [state,setState]=useState({active:1,show:false});
 // Like the footer: only while scrolling down.
 const [down,setDown]=useState(true);
 useEffect(()=>{let last=window.scrollY;const onScroll=()=>{const y=window.scrollY,delta=y-last;if(Math.abs(delta)<6)return;setDown(delta>0);last=y;};window.addEventListener('scroll',onScroll,{passive:true});return()=>window.removeEventListener('scroll',onScroll);},[]);
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
 return <nav className={`phase-bar${state.show&&down?' is-shown':''}`} aria-label={ar?'خطوات الحجز':'Booking steps'} dir={ar?'rtl':'ltr'}>
  {phases.map(([key,en,arabic],index)=><button key={key} type="button" className={state.active===index+1?'is-active':''} aria-current={state.active===index+1?'step':undefined} onClick={()=>go(index+1)}><b>{index+1}</b><span>{ar?arabic:en}</span></button>)}
 </nav>;
}

// The STEP.SEC.ATOM number in front of a form label (pass a field `k`, or a ready-made `code` for a whole section).
export function FieldCode({k,code}){return <i className="ysf-order" aria-hidden="true">{code||fieldCode(k)}</i>;}
