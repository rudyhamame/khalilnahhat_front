import {bookingText} from '../lib/bookingUiText';
export default function BookingRequestList({requests,selectedId,onSelect,ar=false,countLabel,detailId='admin-booking-detail'}){
 const tr=text=>bookingText(text,ar);
 return <aside className="admin-booking-list" aria-label={tr('Booking requests')}>
  <header><h2>{tr('Booking requests')}</h2><span className="admin-services-count">{countLabel||(ar?`${requests.length} طلب`:`${requests.length} REQUEST${requests.length===1?'':'S'}`)}</span></header>
  <nav aria-label={tr('Choose a booking request')}>{requests.map(request=><button key={request.id} type="button" className="admin-booking-list-item admin-booking-list-code" aria-current={selectedId===request.id?'true':undefined} aria-controls={detailId} onClick={()=>onSelect(request.id)}>{request.requestNumber||request.id}</button>)}{!requests.length&&<p className="admin-booking-list-empty">{tr('No booking requests yet.')}</p>}</nav>
 </aside>;
}
