import policy from './contracts/meet-echo.json' with {type:'json'};

export const MEET_ECHO=policy;
export const meetingModeLabel=(mode,ar=false)=>policy.methods[mode]?.[ar?1:0]||mode;
export const bookingOnlyMeeting=meeting=>policy.bookingOnlyModes.includes(meeting.mode);
export const meetingStart=meeting=>Date.parse(meeting.start);
export const meetingEnd=meeting=>meetingStart(meeting)+(Number(meeting.durationMin)||policy.defaultDurationMinutes)*60000;
export const meetingCloses=meeting=>meetingEnd(meeting)+(meeting.mode==='online'?policy.joinLateMinutes*60000:0);
export const meetingUpcoming=(meeting,now=Date.now())=>Number.isFinite(meetingCloses(meeting))&&now<=meetingCloses(meeting);
export function meetingRoomState(meeting,now=Date.now(),host=false){
 if(meeting.mode!=='online')return 'unavailable';
 if(!Number.isFinite(meetingStart(meeting)))return 'unavailable';
 if(!meetingUpcoming(meeting,now))return 'closed';
 return host||now>=meetingStart(meeting)-policy.joinEarlyMinutes*60000?'open':'early';
}
export const sortMeetings=items=>[...items].sort((a,b)=>meetingStart(a)-meetingStart(b));
export const availableMeetings=(items,now=Date.now())=>sortMeetings(items.filter(item=>(!item.status||item.status==='open')&&meetingStart(item)>now));
export function partitionMeetings(items,now=Date.now()){
 const sorted=sortMeetings(items);
 return {upcoming:sorted.filter(item=>meetingUpcoming(item,now)),past:sorted.filter(item=>!meetingUpcoming(item,now)).reverse()};
}
export const formatMeetingDate=(value,options,ar=false)=>new Intl.DateTimeFormat(ar?'ar-CA':'en-CA',{...options,timeZone:policy.timezone}).format(new Date(value));
