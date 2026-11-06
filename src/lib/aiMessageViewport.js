import {aiFields} from './eventOrderCore.mjs';
import {APP_VIEWPORT_TARGETS,bookingFieldSection} from './bookingViewport.js';

const labels={availability:['Open event details','فتح تفاصيل الفعالية'],setup:['Open equipment','فتح المعدات'],simulation:['Open room setup','فتح تجهيز المكان'],work:['Open DJ & music','فتح الدي جي والموسيقى'],music:['Open music library','فتح مكتبة الموسيقى'],booking:['Open booking details','فتح تفاصيل الحجز'],live:['Open live stream','فتح البث المباشر'],about:['About DJ Khalil','عن دي جي خليل']};
export function aiMessageViewport(message,ar=false){
 if(message.role!=='assistant'||typeof message.content!=='string'||!/[?؟]|\b(?:tell me|please (?:provide|choose|select|share)|what|which|how many)\b|(?:أخبرني|اختر|كم |ما هو|ما هي)/iu.test(message.content))return null;
 const fieldPath=aiFields.some(field=>field.key===message.fieldPath)?message.fieldPath:null;
 let section=fieldPath?bookingFieldSection(fieldPath):Object.hasOwn(labels,message.section)?message.section:null,face=message.face;
 if(fieldPath?.startsWith('event.venue.')){section='availability';face='venue';}
 else if(fieldPath?.startsWith('event.setup.'))section='simulation';
 else if(section==='availability'&&face!=='venue')face='calendar';
 if(!section){
  // Older messages and voice transcripts may lack navigation metadata. Look
  // at the last question so a recap does not override what Echo is asking.
  const questions=message.content.match(/[^?؟]*[?؟]/gu),topic=(questions?.at(-1)||message.content.split('\n').at(-1)).toLowerCase();
  if(/venue|address|postal|city|مكان|عنوان|المدينة|الرمز البريدي/u.test(topic)){section='availability';face='venue';}
  else if(/\bmc\b|hosting|announcements|تقديم الحفل/u.test(topic))section='setup';
  else if(/equipment|lighting|speakers?|sound system|rental|services|معدات|إضاءة|سماعات|خدمات/u.test(topic))section='setup';
  else if(/music|songs?|dj|موسيق|أغاني|دي جي/u.test(topic))section='work';
  else if(/room|layout|dimensions|غرفة|أبعاد|مساحة/u.test(topic))section='simulation';
  else if(/email|phone|your name|contact|notes|references|planning|بريد|هاتف|اسمك|ملاحظات|مراجع/u.test(topic))section='booking';
  else if(/event|date|time|start|end|guests?|فعالية|تاريخ|وقت|بدء|انتهاء|ضيوف/u.test(topic)){section='availability';face='calendar';}
 }
 if(!labels[section])return null;
 const selector=APP_VIEWPORT_TARGETS[section];
 return {section,face,fieldPath,label:section==='availability'&&face==='venue'?(ar?'فتح تفاصيل المكان':'Open venue details'):labels[section][ar?1:0],href:section==='booking'?'/#event-order':`/${selector.startsWith('#')?selector:''}`};
}
