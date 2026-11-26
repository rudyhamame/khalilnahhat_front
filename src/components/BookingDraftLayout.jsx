import BookingStatusPipeline from './BookingStatusPipeline';
import './adminBookingRequests.css';
import './bookingDraft.css';

export default function BookingDraftLayout({ar=false,children}){
 return <div className="bd-pipeline-layout"><aside className="bd-pipeline"><BookingStatusPipeline draft audience="client" ar={ar}/></aside><div className="bd-content">{children}</div></div>;
}
