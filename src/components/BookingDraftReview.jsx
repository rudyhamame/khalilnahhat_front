import {useId,useState} from 'react';
import AtomEditor from './AtomEditor';
import {BOOKING_GOALS} from '../lib/bookingGoals';
import {bookingTreeViewerName} from '../lib/bookingAtoms.mjs';
import {useTree} from '../lib/tree';
import {numberedRentalCatalog} from '../lib/numberedRentalCatalog';
import {AtomGroups} from '../echo/bookingReview';
import {sectionLines,submittedSectionLines} from '../lib/bookingReviewModel';
import './bookingDraftReview.css';
import './clientBookingSections.css';

// The client dashboard's Booking draft shows exactly what the Booking review in Echo Smart Cart shows:
// the same sections, the same data atoms, grouped Entered / Needs attention / Optional, with each service's equipment in a table.
// edit={{onSave(path,value,acknowledgeReset)}} turns every atom's pencil into an in-place editor (edit, add, delete, reorder).
export default function BookingDraftReview({order,snapshot=false,ar=false,edit=null,stepped=false}){
 const [editing,setEditing]=useState(null);
 const [activeStep,setActiveStep]=useState(0);
 const stepId=useId();
 const tr=(en,arabic)=>ar?arabic:en,{catalog,equipment,loading}=useTree(),rentals=numberedRentalCatalog(catalog,equipment);
 // Dashboard wording comes from the Booking Tree: the step titles and the two service atom names.
 const goalTitle=goal=>ar?goal.ar:goal.title;
 const GOAL_HINT={contact:['Who we will contact about this booking.','من سنتواصل معه بخصوص هذا الحجز.'],event:['What, when and where the event happens.','ماذا ومتى وأين تقام المناسبة.'],music:['The DJ, MC and equipment you asked for.','الدي جي والمقدّم والمعدات المطلوبة.'],additional:['Notes, references and anything else we should know.','ملاحظات ومراجع وأي شيء آخر يجب أن نعرفه.']};
 const sections=BOOKING_GOALS.map(goal=>{const result=snapshot?submittedSectionLines(order,goal,ar,rentals,loading):sectionLines(order,goal,ar,rentals,loading);const title=order?.event?.type==='other'?order.event.title:'';return {...result,lines:result.lines.filter(line=>line.key!=='event.title').map(line=>bookingTreeViewerName(line.key,ar)?{...line,label:bookingTreeViewerName(line.key,ar)}:line).map(line=>line.key==='event.type'&&title?{...line,value:title}:line)};});
 const moveStep=event=>{
  const buttons=Array.from(event.currentTarget.querySelectorAll('[role="tab"]'));
  const index=buttons.indexOf(event.target);if(index<0)return;
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowRight'?(index+(ar?-1:1)+buttons.length)%buttons.length:event.key==='ArrowLeft'?(index+(ar?1:-1)+buttons.length)%buttons.length:null;
  if(next===null)return;event.preventDefault();setActiveStep(next);buttons[next].focus();
 };
 return (
  <div className={stepped?'bdr bdr-stepped':'bdr'} dir={ar?"rtl":"ltr"}>
   {stepped&&<div className="bdr-steps" role="tablist" aria-label={tr('Booking detail steps','خطوات تفاصيل الحجز')} onKeyDown={moveStep}>{BOOKING_GOALS.map((goal,index)=><button key={goal.id} type="button" role="tab" id={`${stepId}-${goal.id}-tab`} aria-controls={`${stepId}-${goal.id}-panel`} aria-selected={activeStep===index} tabIndex={activeStep===index?0:-1} onClick={()=>setActiveStep(index)}><span className="bdr-step-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span><span>{goalTitle(goal)}</span></button>)}</div>}
   {BOOKING_GOALS.map((goal,index)=>{
   const {progress,lines}=sections[index];
   return <section className="bdr-section" data-goal={goal.id} key={goal.id} aria-label={stepped?undefined:goalTitle(goal)} role={stepped?'tabpanel':undefined} id={stepped?`${stepId}-${goal.id}-panel`:undefined} aria-labelledby={stepped?`${stepId}-${goal.id}-tab`:undefined} tabIndex={stepped?0:undefined} hidden={stepped&&activeStep!==index}>
    <header><h3><i className="bdr-no" aria-hidden="true">{String(index+1).padStart(2,'0')}</i>{goalTitle(goal)}</h3>{GOAL_HINT[goal.id]&&<p className="bdr-hint">{tr(...GOAL_HINT[goal.id])}</p>}<span>{snapshot?tr('Submitted details','المعلومات المرسلة'):progress.missing.length?tr(`${progress.missing.length} to complete`,`${progress.missing.length} متبقي`):tr('Ready to review','جاهز للمراجعة')}</span></header>
    <div className="bdr-atoms"><AtomGroups lines={lines} progress={progress} tr={tr} table review={edit?{onEdit:setEditing}:undefined}/></div>
   </section>;})}
   {stepped&&<div className="bdr-step-navigation"><button type="button" disabled={activeStep===0} onClick={()=>{setActiveStep(activeStep-1);document.getElementById(`${stepId}-${BOOKING_GOALS[activeStep-1].id}-tab`)?.focus();}}>{tr('Back','السابق')}</button><span aria-live="polite">{tr(`Step ${activeStep+1} of ${BOOKING_GOALS.length}`,`الخطوة ${activeStep+1} من ${BOOKING_GOALS.length}`)}</span><button type="button" disabled={activeStep===BOOKING_GOALS.length-1} onClick={()=>{setActiveStep(activeStep+1);document.getElementById(`${stepId}-${BOOKING_GOALS[activeStep+1].id}-tab`)?.focus();}}>{tr('Next','التالي')}</button></div>}
   {editing&&<AtomEditor key={editing.key} line={editing} order={order} ar={ar} onSave={edit.onSave} onClose={()=>setEditing(null)}/>}</div>
 );
}
