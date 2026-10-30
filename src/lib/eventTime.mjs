// Time helpers for the EVENT TIME column. Slots are minutes from the start of the first day (0-2820); stored values are "HH:MM".
const pad=n=>String(n).padStart(2,'0');
export const hhmm=minutes=>`${pad(Math.floor(minutes/60)%24)}:${pad(minutes%60)}`;
export const toMinutes=value=>/^([01]\d|2[0-3]):[0-5]\d$/.test(value||'')?Number(value.slice(0,2))*60+Number(value.slice(3)):null;
// First click sets the start, the second the end (the next day is fine), anything else starts over.
export function pickSlot({start,end},slot){
  if(start===null||end!==null||(slot<=start&&slot<1440))return {start:slot<1440?slot:null,end:null};
  return {start,end:slot};
}
