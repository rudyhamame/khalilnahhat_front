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
export default function BookingDraftReview({order,snapshot=false,tabbed=false}){
 const tr=en=>en,{catalog,equipment,loading}=useTree(),rentals=numberedRentalCatalog(catalog,equipment),[active,setActive]=useState(0);
 const sections=BOOKING_GOALS.map(goal=>snapshot?submittedSectionLines(order,goal):sectionLines(order,goal,false,rentals,loading));
 return <>
  {tabbed&&<div className="bdr-tabs" role="group" aria-label="Booking steps">
   <button type="button" className="bdr-arrow" onClick={()=>setActive(at=>(at-1+BOOKING_GOALS.length)%BOOKING_GOALS.length)} aria-label="Previous step" title="Previous step"><ChevronLeft size={18} aria-hidden="true"/></button>
   {(()=>{const goal=BOOKING_GOALS[active],left=sections[active].progress.missing.length;return <div className="bdr-tab" role="tab" aria-selected="true" aria-controls={`bdr-panel-${active}`} id={`bdr-tab-${active}`}><i aria-hidden="true">{String(active+1).padStart(2,'0')}</i><span>{goal.title}</span>{left>0&&<b aria-label={`${left} to complete`}>{left}</b>}</div>;})()}
   <button type="button" className="bdr-arrow" onClick={()=>setActive(at=>(at+1)%BOOKING_GOALS.length)} aria-label="Next step" title="Next step"><ChevronRight size={18} aria-hidden="true"/></button>
  </div>}
  <div className="bdr">{BOOKING_GOALS.map((goal,index)=>{
   if(tabbed&&index!==active)return null;
   const {progress,lines}=sections[index];
   return <section className="bdr-section" key={goal.id} aria-label={goal.title} {...(tabbed?{role:'tabpanel',id:`bdr-panel-${index}`,'aria-labelledby':`bdr-tab-${index}`}:{})}>
    <header><h3><i className="bdr-no" aria-hidden="true">{String(index+1).padStart(2,'0')}</i>{goal.title}</h3><span>{snapshot?'Submitted details':progress.missing.length?`${progress.missing.length} to complete`:'Ready to review'}</span></header>
    <div className="bdr-atoms"><AtomGroups lines={lines} progress={progress} tr={tr}/></div>
   </section>;})}</div>
 </>;
}
