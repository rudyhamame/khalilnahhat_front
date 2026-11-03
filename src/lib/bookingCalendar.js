export function torontoToday(now=new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(part=>[part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function validBookingDate(value,today=torontoToday()) {
  if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return false;
  const [year,month,day]=value.split('-').map(Number);
  return dateKey(new Date(year,month-1,day,12))===value&&value>=today;
}
export function calendarDays(year,month) {
  const first=new Date(year,month,1,12),count=new Date(year,month+1,0).getDate();
  const total=Math.ceil((first.getDay()+count)/7)*7;
  return Array.from({length:total},(_,index)=>new Date(year,month,index-first.getDay()+1,12));
}
// Keep partial time answers visible; only a known start can determine rollover.
export function draftTimeRange(startValue,endValue){
 const minutes=value=>/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value||'')?Number(value.slice(0,2))*60+Number(value.slice(3)):null;
 const start=minutes(startValue),end=minutes(endValue);
 return {start,end:end!==null&&start!==null&&end<=start?end+1440:end};
}
