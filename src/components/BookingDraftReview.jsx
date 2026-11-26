import {useState} from 'react';
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
export default function BookingDraftReview({order,snapshot=false,ar=false,edit=null}){
 const [editing,setEditing]=useState(null);
 const tr=(en,arabic)=>ar?arabic:en,{catalog,equipment,loading}=useTree(),rentals=numberedRentalCatalog(catalog,equipment);
 // Dashboard wording comes from the Booking Tree: the step titles and the two service atom names.
 const goalTitle=goal=>ar?goal.ar:goal.title;
 const sections=BOOKING_GOALS.map(goal=>{const result=snapshot?submittedSectionLines(order,goal,ar,rentals,loading):sectionLines(order,goal,ar,rentals,loading);return {...result,lines:result.lines.map(line=>bookingTreeViewerName(line.key,ar)?{...line,label:bookingTreeViewerName(line.key,ar)}:line)};});
 return (
  <div className="bdr" dir={ar?"rtl":"ltr"}>{BOOKING_GOALS.map((goal,index)=>{
   const {progress,lines}=sections[index];
   return <section className="bdr-section" key={goal.id} aria-label={goalTitle(goal)}>
    <header><h3><i className="bdr-no" aria-hidden="true">{String(index+1).padStart(2,'0')}</i>{goalTitle(goal)}</h3><span>{snapshot?tr('Submitted details','المعلومات المرسلة'):progress.missing.length?tr(`${progress.missing.length} to complete`,`${progress.missing.length} متبقي`):tr('Ready to review','جاهز للمراجعة')}</span></header>
    <div className="bdr-atoms"><AtomGroups lines={lines} progress={progress} tr={tr} table review={edit?{onEdit:setEditing}:undefined}/></div>
   </section>;})}{editing&&<AtomEditor key={editing.key} line={editing} order={order} ar={ar} onSave={edit.onSave} onClose={()=>setEditing(null)}/>}</div>
 );
}
