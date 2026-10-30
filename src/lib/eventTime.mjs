// Time helpers for the EVENT TIME column. Slots are minutes from the start of the first day (0-2820); stored values are "HH:MM".
const pad=n=>String(n).padStart(2,'0');
export const hhmm=minutes=>`${pad(Math.floor(minutes/60)%24)}:${pad(minutes%60)}`;
export const toMinutes=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value||'')?Number(value.slice(0,2))*60+Number(value.slice(3)):null;
// The list is a 24-hour loop of slots (0-1410). First click sets the start, the second the end (an end earlier on the clock than the start
// falls after midnight, as 1440+slot), clicking the start again clears, anything else starts over.
export function pickSlot({start,end},slot){
  if(start===null||end!==null)return {start:slot,end:null};
  if(slot===start)return {start:null,end:null};
  return {start,end:slot>start?slot:slot+1440};
}
// Is this slot strictly between the start and the end of the (possibly wrapping) range?
export const slotInside=(slot,start,end)=>start!==null&&end!==null&&(end<=1440?slot>start&&slot<end:slot>start||slot<end-1440);
