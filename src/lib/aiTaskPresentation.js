import {aiFields,validValue,decodePatchValue} from './eventOrderCore.mjs';

const labels={
 'music.djRequested':['DJ service','خدمة الدي جي'],'music.mcRequested':['MC service','تقديم الحفل'],'rental.requested':['Rentals','التأجير'],
 'event.type':['Event','الفعالية'],'event.date':['Date','التاريخ'],'event.startTime':['Start time','وقت البدء'],'event.endTime':['End time','وقت الانتهاء'],'event.guestCount':['Guests','الضيوف'],
 'customer.fullName':['Name','الاسم'],'customer.email':['Email','البريد الإلكتروني'],'customer.phone':['Phone','الهاتف'],'customer.contactMethod':['Contact method','طريقة التواصل'],'customer.company':['Company','الشركة'],
 'event.venue.name':['Venue','المكان'],'event.venue.address':['Address','العنوان'],'event.venue.city':['City','المدينة'],'event.venue.postalCode':['Postal code','الرمز البريدي'],'event.venue.country':['Country','الدولة'],'event.venue.area':['Venue area','منطقة المكان'],'event.venue.setting':['Setting','الموقع'],
 'event.setup.requirements':['Setup notes','ملاحظات التجهيز'],'services':['Services','الخدمات'],'equipment':['Equipment','المعدات'],'music.styles':['Music','الموسيقى'],'music.djMc':['DJ / MC','دي جي / مقدم الحفل'],'additional.notes':['Notes','ملاحظات'],
};
const values={wedding:['Wedding','زفاف'],engagement:['Engagement','خطوبة'],birthday:['Birthday','عيد ميلاد'],corporate:['Corporate','فعالية شركة'],party:['Party','حفلة'],graduation:['Graduation','تخرج'],other:['Other','أخرى'],dj:['DJ','دي جي'],sound:['Sound','صوت'],lighting:['Lighting','إضاءة'],led:['LED walls','شاشات LED'],fx:['Special effects','مؤثرات خاصة'],rental:['Equipment rental','تأجير معدات'],gta:['GTA','تورونتو الكبرى'],indoor:['Indoor','داخلي'],outdoor:['Outdoor','خارجي'],mixed:['Mixed','مختلطة'],arabic:['Arabic','عربية'],english:['English','إنجليزية'],whatsapp:['WhatsApp','واتساب']};
const humanize=value=>{const text=String(value).replace(/([a-z])([A-Z])/g,'$1 $2').replace(/[_-]/g,' ');return text.charAt(0).toUpperCase()+text.slice(1);};
const timePaths=['event.startTime','event.endTime'];
function displayTime(value,ar=false){
 const match=typeof value==='string'&&value.match(/^([01]\d|2[0-3]):([0-5]\d)$/);
 if(!match)return String(value);
 const hour=Number(match[1]);
 return `${hour%12||12}:${match[2]} ${ar?(hour<12?'ص':'م'):(hour<12?'AM':'PM')}`;
}
function displayNoteTime(text,ar){
 for(const path of timePaths){
  const definition=aiFields.find(field=>field.key===path);
  for(const field of [...labels[path],definition?.label,definition?.ar].filter(Boolean)){
   const prefix=field+': ';
   if(!text.startsWith(prefix))continue;
   return prefix+text.slice(prefix.length).replace(/^([01]\d|2[0-3]):([0-5]\d)(?=\s|$)/,value=>displayTime(value,ar));
  }
 }
 return text;
}
export function formatAiDraftTask({path,value},{ar=false,equipment=[]}={}){
 const index=ar?1:0,definition=aiFields.find(field=>field.key===path);
 const field=labels[path]?.[index]||humanize(path.split('.').at(-1));
 const itemText=item=>{
  if(timePaths.includes(path))return displayTime(item,ar);
  if(item&&typeof item==='object')return `${equipment.find(row=>row.id===item.id)?.name||item.id} × ${item.quantity}`;
  if(typeof item==='boolean')return item?(ar?'نعم':'Yes'):(ar?'لا':'No');
  if(definition?.options?.includes(item))return values[item]?.[index]||humanize(item);
  return String(item);
 };
 const shown=value===null||value===''||Array.isArray(value)&&!value.length?(ar?'تم المسح':'Cleared'):Array.isArray(value)?value.map(itemText).join(ar?'، ':', '):itemText(value);
 const valueText=shown.slice(0,Math.max(0,298-field.length));
 return {path,value:structuredClone(value),field,valueText,label:`${field}: ${valueText}`};
}
// Older saved rows used form questions as labels. Present those in the same
// concise format without rewriting their reviews or changing the draft.
export function presentAiTask(task,ar=false){
 if(timePaths.includes(task.path)){
  const formatted=formatAiDraftTask({path:task.path,value:task.value??task.valueText},{ar});
  return {field:formatted.field,value:formatted.valueText,label:formatted.label};
 }
 if(task.field&&typeof task.valueText==='string')return {field:task.field,value:task.valueText,label:task.label};
 for(const definition of aiFields){
  for(const oldLabel of [definition.label,definition.ar,...(labels[definition.key]||[])]){
   const prefix=oldLabel&&`${oldLabel}: `;
   if(prefix&&task.label.startsWith(prefix)){
    const value=task.label.slice(prefix.length),formatted=formatAiDraftTask({path:definition.key,value},{ar});
    return {field:formatted.field,value:formatted.valueText,label:formatted.label};
   }
  }
 }
 const split=task.label.indexOf(': ');
 return split<0?{field:'',value:task.label,label:task.label}:{field:task.label.slice(0,split),value:task.label.slice(split+2),label:task.label};
}


export function resolveAiTaskChange(task){
 let definition=aiFields.find(field=>field.key===task.path),text=task.valueText;
 if(!definition){
  definition=aiFields.find(field=>[field.label,field.ar,...(labels[field.key]||[])].some(label=>label&&task.label.startsWith(label+': ')));
  if(definition)text=task.label.slice(task.label.indexOf(': ')+2);
 }
 if(!definition)return null;
 if(Object.hasOwn(task,'value'))return validValue(definition,task.value)?{path:definition.key,value:structuredClone(task.value)}:null;
 if(typeof text!=='string'||task.label.length>=300)return null;
 const normalized=text.trim().toLowerCase();let value=text;
 if(['cleared','تم المسح'].includes(normalized))value=['multi','links','equipment'].includes(definition.type)?[]:null;
 else if(definition.options){
  const option=definition.options.find(item=>[item,...(values[item]||[])].some(label=>label.toLowerCase()===normalized));
  if(option===undefined)return null;value=option;
 }else if(definition.type==='boolean'){
  if(['yes','true','نعم'].includes(normalized))value=true;
  else if(['no','false','لا'].includes(normalized))value=false;
  else return null;
 }else if(['number','coordinate','multi','links','equipment'].includes(definition.type))value=decodePatchValue(definition,text);
 return validValue(definition,value)?{path:definition.key,value}:null;
}
export function formatAiTaskNote(task,confirmed,clientName,ar=false){
 const label=presentAiTask(task,ar).label;
 return ar?`[TASK] ${label} — ${confirmed?'تم تأكيد المهمة بواسطة':'تم الإبلاغ عن خطأ بواسطة'} ${clientName}`:`[TASK] ${label} ${confirmed?'confirmed':'marked incorrect'} by ${clientName}`;
}
export function aiTaskNoteText(content,clientName,ar=false){
 if(typeof content!=='string')return null;
 if(content.startsWith('[TASK] '))return displayNoteTime(content.slice('[TASK] '.length),ar);
 if(!content.startsWith('My review of this AI action: ')&&!content.startsWith('تقييمي لإجراء المساعد: '))return null;
 try{const review=JSON.parse(content.slice(content.indexOf('{')));return typeof review.task==='string'&&typeof review.confirmed==='boolean'?formatAiTaskNote({label:review.task},review.confirmed,clientName,ar).slice('[TASK] '.length):null;}catch{return null;}
}

// A selected search result is one task containing its complete venue patch.
export function resolveAiTaskChanges(task){
 if(Array.isArray(task.venueFields)){
  const fields=task.venueFields;
  if(!fields.length||fields.length>20||new Set(fields.map(row=>row.path)).size!==fields.length)return [];
  if(fields.some(row=>!row.path?.startsWith('event.venue.')||!aiFields.some(field=>field.key===row.path&&validValue(field,row.value))))return [];
  return structuredClone(fields);
 }
 const change=resolveAiTaskChange(task);return change?[change]:[];
}
