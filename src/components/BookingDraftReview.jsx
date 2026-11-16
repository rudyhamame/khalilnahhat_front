import {BOOKING_GOALS} from '../lib/bookingGoals';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import {numberedRentalCatalog} from '../lib/numberedRentalCatalog';
import {AtomGroups,sectionLines} from '../echo/bookingReview';
import './bookingDraftReview.css';

// The client dashboard's Booking draft shows exactly what the Booking review in Echo Smart Cart shows:
// the same sections, the same data atoms, grouped Entered / Needs attention / Optional, with each service's equipment in a table.
export default function BookingDraftReview({order}){
 const tr=en=>en,{catalog,equipment,loading}=useRentalCatalog(),rentals=numberedRentalCatalog(catalog,equipment);
 return <div className="bdr">{BOOKING_GOALS.map(goal=>{
  const {progress,lines}=sectionLines(order,goal,false,rentals,loading);
  return <section className="bdr-section" key={goal.id} aria-label={goal.title}>
   <header><h3>{goal.title}</h3><span>{progress.missing.length?`${progress.missing.length} to complete`:'Ready to review'}</span></header>
   <div className="bdr-atoms"><AtomGroups lines={lines} progress={progress} tr={tr}/></div>
  </section>;})}</div>;
}
