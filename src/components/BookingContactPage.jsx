import CallChatPanel from '../echo/CallChatPanel';

export default function BookingContactPage({requests,bookingId,token,ar=false}){
 const request=requests.find(item=>item.id===bookingId);
 const tr=(en,arabic)=>ar?arabic:en;
 const back=request?`/dashboard/bookings?booking=${encodeURIComponent(request.id)}`:'/dashboard/bookings';
 return <section className="client-booking-contact-page" dir={ar?'rtl':'ltr'}>
  <header className="client-booking-contact-heading"><a href={back}>{tr('Back to booking','العودة إلى الحجز')}</a><h1>{tr('Chat & calls','الدردشة والمكالمات')}</h1>{request&&<code>{request.requestNumber||request.id}</code>}</header>
  {request?<CallChatPanel key={request.id} bookingId={request.id} token={token} ar={ar}/>:<p role="status">{tr('This booking is not available. Open your bookings to choose one.','هذا الحجز غير متاح. افتح حجوزاتك لاختيار حجز.')}</p>}
 </section>;
}
