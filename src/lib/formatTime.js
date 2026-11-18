// ISO timestamps (2026-11-13T05:20:37.167Z) shown as the viewer's local date and time; plain dates as local dates.
const ISO=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?$/;
const DAY=/^\d{4}-\d{2}-\d{2}$/;
export function formatTime(value,locale){
 if(typeof value!=='string')return value??'';
 if(ISO.test(value)){const date=new Date(value);return Number.isNaN(date.getTime())?value:date.toLocaleString(locale,{dateStyle:'medium',timeStyle:'short'});}
 if(DAY.test(value)){const [year,month,day]=value.split('-').map(Number),date=new Date(year,month-1,day);return Number.isNaN(date.getTime())?value:date.toLocaleDateString(locale,{dateStyle:'medium'});}
 return value;
}
