// After Continue manually takes the visitor to the next missing detail, blink that input so it is obvious what to fill in.
const FALLBACK={'event.startTime':'event.date','event.endTime':'event.date'};
export function blinkBookingField(path,{retries=15}={}){
 const find=key=>document.querySelector(`[data-booking-field="${key}"]`);
 const attempt=left=>{
  const target=find(path)||find(FALLBACK[path]);
  if(!target||!target.getClientRects().length){if(left>0)setTimeout(()=>attempt(left-1),200);return;}
  // Let the chapter scroll settle first.
  setTimeout(()=>{
   target.classList.remove('echo-field-blink');void target.offsetWidth;target.classList.add('echo-field-blink');
   if(target.matches('input,select,textarea'))target.focus({preventScroll:true});
   setTimeout(()=>target.classList.remove('echo-field-blink'),3300);
  },700);
 };
 attempt(retries);
}
