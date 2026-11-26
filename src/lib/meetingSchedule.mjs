export const MEETING_TIMEZONE='America/Toronto';
const formatter=new Intl.DateTimeFormat('en-CA',{timeZone:MEETING_TIMEZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const parts=date=>Object.fromEntries(formatter.formatToParts(date).filter(part=>part.type!=='literal').map(part=>[part.type,part.value]));
// Start with the next Toronto minute so a newly opened form never defaults to a past instant.
export function meetingTimeDefaults(now=Date.now()){
 const p=parts(new Date(Math.floor(Number(now)/60000)*60000+60000)),hour=Number(p.hour);
 return {date:`${p.year}-${p.month}-${p.day}`,hour:String(hour%12||12),minute:p.minute,period:hour>=12?'PM':'AM'};
}
// Interpret the form's wall clock in Toronto, regardless of the administrator's device timezone.
export function meetingStartIso(date,time){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(time))throw new Error('Choose a valid date and time.');
 const target=Date.parse(`${date}T${time}:00Z`);if(!Number.isFinite(target))throw new Error('Choose a valid date and time.');
 let guess=target;
 for(let i=0;i<4;i++){const p=parts(new Date(guess)),wall=Date.UTC(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute));guess+=target-wall;}
 const p=parts(new Date(guess));
 if(`${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`!==`${date}T${time}`)throw new Error('This time does not exist in Toronto because the clocks change. Choose another time.');
 return new Date(guess).toISOString();
}
export const shiftMeetingDate=(date,days)=>new Date(Date.parse(`${date}T12:00:00Z`)+days*86400000).toISOString().slice(0,10);
export const meetingIsPast=(meeting,now=Date.now())=>Date.parse(meeting.start)+Number(meeting.durationMin||30)*60000<now;
export function meetingSummary(items,now=Date.now()){
 return {booked:items.filter(item=>item.status==='booked'&&!meetingIsPast(item,now)).length,open:items.filter(item=>item.status==='open'&&Date.parse(item.start)>now).length,browser:items.filter(item=>item.status==='booked'&&item.mode==='online'&&!meetingIsPast(item,now)).length};
}
export function filterMeetings(items,{filter='all',query='',now=Date.now()}={}){
 const text=query.trim().toLowerCase();
 return items.filter(item=>(filter==='all'||filter==='booked'&&item.status==='booked'&&!meetingIsPast(item,now)||filter==='open'&&item.status==='open'&&Date.parse(item.start)>now)&&(!text||[item.bookedByName,item.bookedByEmail,item.topic,item.mode,item.start,item.contactPhone].join(' ').toLowerCase().includes(text))).toSorted((a,b)=>Date.parse(a.start)-Date.parse(b.start));
}
