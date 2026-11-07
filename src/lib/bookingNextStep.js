import {missingOrderFields} from './eventOrderCore.mjs';

const priority=['event.type','event.date','event.startTime','event.endTime','event.guestCount','event.venue.name','event.venue.address','event.venue.city','event.venue.postalCode','event.venue.area','event.venue.setting','music.djRequested','music.mcRequested','rental.requested','services'];
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
 'event.venue.area':['Is the venue inside the Greater Toronto Area (GTA)?','هل المكان داخل تورونتو الكبرى؟'],
 'event.venue.setting':['Will the event be indoors, outdoors, or both?','هل الفعالية داخلية أم خارجية أم كلاهما؟'],
 'event.venue.name':['What is the venue name?','ما اسم مكان الفعالية؟'],
 'event.venue.address':['What is the venue address?','ما عنوان مكان الفعالية؟'],
 'event.venue.city':['Which city is the venue in?','في أي مدينة يقع مكان الفعالية؟'],
 'event.venue.postalCode':['What is the venue’s postal code?','ما الرمز البريدي لمكان الفعالية؟'],
};

// Only ask for values still missing after the draft has actually been updated.
export function bookingNextStep(order={},ar=false){
 const missing=missingOrderFields(order);
 const decisions=[['music.djRequested',order.music?.djRequested??(order.services?.includes('dj')?true:null)],['music.mcRequested',order.music?.mcRequested??(order.music?.djMc?true:null)],['rental.requested',order.rental?.requested??(order.equipment?.length||order.services?.some(id=>!['dj','mc'].includes(id))?true:null)]];
 for(const [key,value] of decisions)if(typeof value!=='boolean')missing.push({key});
 // A DJ selection must not hide the separate rentals question.
 if(order.rental?.requested===true&&!order.equipment?.length&&!order.services?.some(id=>!['dj','mc'].includes(id))&&!missing.some(field=>field.key==='services'))missing.push({key:'services'});

 const field=priority.map(path=>missing.find(field=>field.key===path)).find(Boolean)||missing[0];
 if(!field)return {path:null,text:ar?'تفاصيل الطلب الأساسية مكتملة. يمكنك الآن مراجعة طلب الحجز قبل إرساله.':'Your required details are complete. You can now review your booking request before submitting it.'};
 return {path:field.key,text:questions[field.key]?.[ar?1:0]||(ar?`ما القيمة التي تريد استخدامها لحقل «${field.ar||field.label}»؟`:`What should I use for “${field.label}”?`)};
}
