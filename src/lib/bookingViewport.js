// Booking answers share the event order; this only moves the page to their visual context.
export function scrollToBookingField(path){
 const section=['event.date','event.startTime','event.endTime'].includes(path)?'availability':path?.startsWith('music.')?'home-music-archive':path==='services'||path?.startsWith('event.')||path?.startsWith('additional.')?'services':null;
 if(!section)return;
 window.dispatchEvent(new CustomEvent('echo:booking-field-focus',{detail:{path}}));
 document.getElementById(section)?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});
}
