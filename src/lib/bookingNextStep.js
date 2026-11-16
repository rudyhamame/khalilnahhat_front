import {missingOrderFields} from './eventOrderCore.mjs';
import {fieldQuestion} from './fieldQuestion.js';

const priority=['event.type','event.date','event.startTime','event.endTime','event.guestCount','event.venue.name','event.venue.address','event.venue.city','event.venue.postalCode','event.venue.setting','music.djRequested','music.mcRequested','rental.requested','services'];
const questions={
 'event.type':['What kind of event are you planning?','ما نوع الفعالية التي تخطط لها؟'],
 'event.date':['What date is your event?','ما تاريخ الفعالية؟'],
 'event.startTime':['What time should the event start?','في أي وقت تبدأ الفعالية؟'],
 'event.endTime':['What time should the event end?','في أي وقت تنتهي الفعالية؟'],
 'event.guestCount':['About how many guests are you expecting?','كم عدد الضيوف المتوقع تقريباً؟'],
 'music.djRequested':['Would you like to add DJ Khalil service to your booking?','هل تريد إضافة خدمة دي جي خليل إلى حجزك؟'],
 'music.mcRequested':['Would you like MC hosting and announcements?','هل تريد خدمة تقديم الحفل والإعلانات؟'],
 'rental.requested':['Would you like to add rental services or equipment?','هل تريد إضافة خدمات تأجير أو معدات؟'],
 services:['Which rental services or equipment would you like — sound, lighting, LED walls, or special effects?','ما خدمات التأجير أو المعدات التي تريدها — صوت أو إضاءة أو شاشات أو مؤثرات؟'],
 'event.venue.setting':['Will the event be indoors, outdoors, or both?','هل الفعالية داخلية أم خارجية أم كلاهما؟'],
 'event.venue.name':['What is the venue name?','ما اسم مكان الفعالية؟'],
 'event.venue.address':['What is the venue address?','ما عنوان مكان الفعالية؟'],
 'event.venue.city':['Which city is the venue in?','في أي مدينة يقع مكان الفعالية؟'],
 'event.venue.postalCode':['What is the venue’s postal code?','ما الرمز البريدي لمكان الفعالية؟'],
};

// The ONE answer to "what is still missing from this draft?". The next question, each goal's progress and the review all read it.
export function effectiveMissing(order={}){
 const missing=missingOrderFields(order);
 const decisions=[['music.djRequested',order.music?.djRequested??(order.services?.includes('dj')?true:null)]];
 for(const [key,value] of decisions)if(typeof value!=='boolean')missing.push({key});
 // Rental services & equipment: with DJ Khalil selected nothing is needed here; otherwise at least one rental service or item must be added.
 const rest=missing.filter(field=>!['services','rental.requested'].includes(field.key));
 const dj=order.music?.djRequested===true||order.services?.includes('dj');
 const rental=order.equipment?.length>0||order.services?.some(id=>!['dj','mc'].includes(id));
 if(!dj&&!rental)rest.push({key:'services'});
 return rest;
}

// Only ask for values still missing after the draft has actually been updated.
export function bookingNextStep(order={},ar=false){
 const missing=effectiveMissing(order);

 const field=priority.map(path=>missing.find(field=>field.key===path)).find(Boolean)||missing[0];
 if(!field)return {path:null,text:ar?'تفاصيل الطلب الأساسية مكتملة. الخطوة التالية: الطلبات الخاصة (اختياري) — أضف ملاحظات أو مراجع أو روابط موسيقى أو رمز قسيمة، ثم راجع الطلب وأرسله.':'Your required details are complete. Next: Special requests (optional) — add notes, inspiration, music links or a voucher code, then review and send your request.'};
 return {path:field.key,text:questions[field.key]?.[ar?1:0]||fieldQuestion(field,ar)};
}
