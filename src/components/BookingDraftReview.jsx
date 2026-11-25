import {useState} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';
import {BOOKING_GOALS} from '../lib/bookingGoals';
import {useTree} from '../lib/tree';
import {numberedRentalCatalog} from '../lib/numberedRentalCatalog';
import {AtomGroups} from '../echo/bookingReview';
import {sectionLines,submittedSectionLines} from '../lib/bookingReviewModel';
import './bookingDraftReview.css';

// The client dashboard's Booking draft shows exactly what the Booking review in Echo Smart Cart shows:
// the same sections, the same data atoms, grouped Entered / Needs attention / Optional, with each service's equipment in a table.
export default function BookingDraftReview({order,snapshot=false,tabbed=false,ar=false}){
 const tr=(en,arabic)=>ar?arabic:en,{catalog,equipment,loading}=useTree(),rentals=numberedRentalCatalog(catalog,equipment),[active,setActive]=useState(0);
 // Dashboard wording only (the Booking page keeps its own): step 3 is "Echo Services" and its two service atoms use the service names.
 const GOAL_NAME={music:['Echo Services','خدمات إيكو']},ATOM_NAME={'music.djRequested':['DJ Khalil Nahhat','دي جي خليل نحات'],'music.mcRequested':['MC Hosting','تقديم الحفل']};
 const goalTitle=goal=>(GOAL_NAME[goal.id]||[goal.title,goal.ar])[ar?1:0];
 const sections=BOOKING_GOALS.map(goal=>{const result=snapshot?submittedSectionLines(order,goal,ar):sectionLines(order,goal,ar,rentals,loading);return {...result,lines:result.lines.map(line=>ATOM_NAME[line.key]?{...line,label:ATOM_NAME[line.key][ar?1:0]}:line)};});
 return <>
  {tabbed&&<div className="bdr-tabs" role="group" aria-label={tr("Booking steps","خطوات الحجز")} dir={ar?"rtl":"ltr"}>
   <button type="button" className="bdr-arrow" onClick={()=>setActive(at=>(at-1+BOOKING_GOALS.length)%BOOKING_GOALS.length)} aria-label={tr("Previous step","الخطوة السابقة")} title={tr("Previous step","الخطوة السابقة")}><ChevronLeft size={18} aria-hidden="true"/></button>
   {(()=>{const goal=BOOKING_GOALS[active],left=sections[active].progress.missing.length;return <div className="bdr-tab" role="tab" aria-selected="true" aria-controls={`bdr-panel-${active}`} id={`bdr-tab-${active}`}><i aria-hidden="true">{String(active+1).padStart(2,'0')}</i><span>{goalTitle(goal)}</span>{left>0&&<b aria-label={tr(`${left} to complete`,`${left} متبقي`)}>{left}</b>}</div>;})()}
   <button type="button" className="bdr-arrow" onClick={()=>setActive(at=>(at+1)%BOOKING_GOALS.length)} aria-label={tr("Next step","الخطوة التالية")} title={tr("Next step","الخطوة التالية")}><ChevronRight size={18} aria-hidden="true"/></button>
  </div>}
  <div className="bdr" dir={ar?"rtl":"ltr"}>{BOOKING_GOALS.map((goal,index)=>{
   if(tabbed&&index!==active)return null;
   const {progress,lines}=sections[index];
   return <section className="bdr-section" key={goal.id} aria-label={goalTitle(goal)} {...(tabbed?{role:'tabpanel',id:`bdr-panel-${index}`,'aria-labelledby':`bdr-tab-${index}`}:{})}>
    <header><h3><i className="bdr-no" aria-hidden="true">{String(index+1).padStart(2,'0')}</i>{goalTitle(goal)}</h3><span>{snapshot?tr('Submitted details','المعلومات المرسلة'):progress.missing.length?tr(`${progress.missing.length} to complete`,`${progress.missing.length} متبقي`):tr('Ready to review','جاهز للمراجعة')}</span></header>
    <div className="bdr-atoms"><AtomGroups lines={lines} progress={progress} tr={tr} table/></div>
   </section>;})}</div>
 </>;
}
