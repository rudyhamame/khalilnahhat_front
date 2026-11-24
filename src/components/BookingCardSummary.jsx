import {bookingLocale,bookingMoney} from '../lib/bookingUiText';
import './bookingCardSummary.css';

export default function BookingCardSummary({request,ar=false,admin=false}){
 const event=request.order?.event||{},legacy=request.event||{},venue=event.venue||{};
 const tr=(en,arabic)=>ar?arabic:en;
 const eventType=event.type||legacy.eventType||'';
 const type=eventType==='other'?(event.title||tr('Other event','مناسبة أخرى')):eventType.replaceAll('_',' ').replace(/^./,letter=>letter.toUpperCase());
 const rawDate=event.date||legacy.eventDate,date=rawDate&&new Date(`${rawDate}T12:00:00`);
 const dateText=date&&!Number.isNaN(date.getTime())?date.toLocaleDateString(bookingLocale(ar),{year:'numeric',month:'short',day:'numeric'}):rawDate;
 const start=event.startTime||legacy.startTime,end=event.endTime||legacy.endTime;
 const times=[start,end].filter(Boolean).join(' – '),overnight=start&&end&&end<start;
 const timezone=event.timezone||legacy.timezone||'America/Toronto';
 const location=[venue.name||legacy.venueName,venue.city||legacy.city].filter(Boolean).filter((value,index,list)=>list.indexOf(value)===index).join(', ')||venue.address||legacy.venueAddress;
 const guests=event.guestCount||legacy.guests;
 const showQuote=(admin||request.journey?.showsPrices)&&request.total!=null&&Number.isFinite(Number(request.total));
 const fact=(label,value,wide=false)=><span className={`booking-card-fact${wide?' is-wide':''}`}><span className="booking-card-caption">{label}</span><span className="booking-card-value">{value||tr('To be confirmed','سيتم التأكيد')}</span></span>;
 return <span className="booking-card-facts">
  {fact(tr('Event','المناسبة'),type)}
  {fact(tr('Date','التاريخ'),dateText)}
  {fact(tr('Time','الوقت'),<>{times||tr('To be confirmed','سيتم التأكيد')}{overnight&&` ${tr('(next day)','(اليوم التالي)')}`}<small className="booking-card-timezone">{timezone}</small></>,true)}
  {fact(tr('Venue','المكان'),location,true)}
  {Number(guests)>0&&fact(tr('Guests','الضيوف'),guests)}
  {!!request.items?.length&&fact(tr('Requested services & equipment','الخدمات والمعدات المطلوبة'),<span className="booking-card-services">{request.items.map((line,index)=><span key={`${line.serviceId||line.name}:${index}`}>{line.quantity||1} × {line.name}</span>)}</span>,true)}
  {request.availability?.status==='unavailable'&&request.availability.reason&&fact(tr('Availability note','ملاحظة التوافر'),request.availability.reason,true)}
  {showQuote&&fact(admin&&!request.journey?.showsPrices?tr('Draft quote','مسودة العرض'):tr('Quote total','إجمالي العرض'),bookingMoney(Number(request.total),ar),true)}
 </span>;
}
