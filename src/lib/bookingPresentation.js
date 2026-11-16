import {aiFields,getPath,isAnswered,optionName} from './eventOrderCore.mjs';
import {eventTypeLabel} from './eventTypeLabel.js';
import {formatCanadianPhone} from './canadianPhone.js';
import {SONG_PHASES,optionLabel} from './djOptions.js';
import {toMinutes} from './eventTime.mjs';

// Human-readable values for live atoms, submitted snapshots and conversation
// recaps. This never changes stored IDs, dates, times or the submitted order.
export function bookingFieldValue(order,key,ar=false,value=getPath(order,key)){
 const tr=(en,arabic)=>ar?arabic:en,field=aiFields.find(item=>item.key===key);
 if(!isAnswered(value))return tr('Not set yet','لم يُحدّد بعد');
 if(typeof value==='boolean')return value?tr('Yes','نعم'):tr('No','لا');
 if(key==='event.type')return eventTypeLabel(value,ar);
 if(key==='customer.phone')return formatCanadianPhone(value)||String(value);
 if(field?.optionNames&&!Array.isArray(value))return optionName(key,value,ar);
 if(field?.type==='date'&&/^\d{4}-\d{2}-\d{2}$/.test(value)){
  const date=new Date(`${value}T12:00:00Z`);
  if(Number.isFinite(date.getTime()))return new Intl.DateTimeFormat(ar?'ar-CA':'en-CA',{dateStyle:'long',timeZone:'America/Toronto'}).format(date);
 }
 if(field?.type==='time'&&toMinutes(value)!==null){
  const minute=toMinutes(value),h=Math.floor(minute/60),clock=`${h%12||12}:${String(minute%60).padStart(2,'0')} ${h<12?tr('AM','ص'):tr('PM','م')}`;
  const start=toMinutes(order.event?.startTime),overnight=key==='event.endTime'&&start!==null&&minute<start;
  return `${clock} (${tr('Toronto','تورونتو')}${overnight?tr(', next day','، اليوم التالي'):''})`;
 }
 if(Array.isArray(value))return value.map(item=>{
  if(item==null)return '';
  if(typeof item!=='object')return key==='services'?({dj:tr('DJ Khalil','دي جي خليل'),mc:tr('MC hosting','تقديم الحفل'),sound:tr('Sound','الصوت'),lighting:tr('Lighting','الإضاءة'),led:tr('LED walls','شاشات LED'),fx:tr('Special effects','المؤثرات الخاصة'),rental:tr('Equipment rental','تأجير المعدات'),corporate:tr('Corporate production','إنتاج فعاليات الشركات')}[item]||String(item)):String(item);
  if(item.song)return `${item.phase?`${optionLabel(SONG_PHASES,item.phase,ar)}: `:''}${[item.song,item.artist].filter(Boolean).join(' — ')}${item.link?` (${item.link})`:''}`;
  if(item.language)return item.dialect?`${item.language} (${item.dialect})`:item.language;
  const name=item.name||item.id||item.url||'';
  return `${name}${item.quantity!=null?` × ${item.quantity}`:''}${item.comment?` — ${item.comment}`:''}`;
 }).filter(Boolean).join(', ');
 return String(value);
}
