import {bookingText} from '../lib/bookingUiText';

export default function BookingPageHeader({ar=false,value='details',onChange,idPrefix='booking',hasBooking=true,hasQuote=true}){
 const tr=text=>bookingText(text,ar);
 const move=event=>{
  const buttons=Array.from(event.currentTarget.querySelectorAll('[role="tab"]:not(:disabled)'));
  const index=buttons.indexOf(event.target);if(index<0)return;
  const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:event.key==='ArrowRight'?(index+(ar?-1:1)+buttons.length)%buttons.length:event.key==='ArrowLeft'?(index+(ar?1:-1)+buttons.length)%buttons.length:null;
  if(next===null)return;event.preventDefault();buttons[next].focus();buttons[next].click();
 };
 return <header className="booking-page-heading"><div className="booking-page-tabs" role="tablist" aria-label={tr('Booking details')} onKeyDown={move}>
  {[['details',tr('Booking details'),hasBooking],['quote',tr('Quote'),hasQuote],['files',tr('Shared files'),hasBooking]].map(([id,label,enabled])=><button key={id} type="button" role="tab" id={`${idPrefix}-${id}-tab`} aria-selected={value===id} aria-controls={enabled?`${idPrefix}-${id}-panel`:undefined} tabIndex={value===id?0:-1} disabled={!enabled} onClick={()=>onChange?.(id)}>{label}</button>)}
 </div></header>;
}
