import {missingOrderFields} from './eventOrderCore.mjs';

const priority=['event.type','event.date','event.startTime','event.endTime','event.guestCount','services'];
const questions={
 'event.type':['What kind of event are you planning?','ما نوع الفعالية التي تخطط لها؟'],
 'event.date':['What date is your event?','ما تاريخ الفعالية؟'],
 'event.startTime':['What time should the event start?','في أي وقت تبدأ الفعالية؟'],
 'event.endTime':['What time should the event end?','في أي وقت تنتهي الفعالية؟'],
 'event.guestCount':['About how many guests are you expecting?','كم عدد الضيوف المتوقع تقريباً؟'],
 services:['Which services do you need — DJ, sound, lighting, or equipment rental?','ما الخدمات التي تحتاجها — دي جي أو صوت أو إضاءة أو تأجير معدات؟'],
 'event.venue.name':['What is the venue name?','ما اسم مكان الفعالية؟'],
 'event.venue.address':['What is the venue address?','ما عنوان مكان الفعالية؟'],
 'event.venue.city':['Which city is the venue in?','في أي مدينة يقع مكان الفعالية؟'],
 'event.venue.postalCode':['What is the venue’s postal code?','ما الرمز البريدي لمكان الفعالية؟'],
};

// Only ask for values still missing after the draft has actually been updated.
export function bookingNextStep(order,ar=false){
 const missing=missingOrderFields(order);
 const field=priority.map(path=>missing.find(field=>field.key===path)).find(Boolean)||missing[0];
 if(!field)return {path:null,text:ar?'تفاصيل الطلب الأساسية مكتملة. يمكنك الآن مراجعة طلب الحجز قبل إرساله.':'Your required details are complete. You can now review your booking request before submitting it.'};
 return {path:field.key,text:questions[field.key]?.[ar?1:0]||(ar?`ما القيمة التي تريد استخدامها لحقل «${field.ar||field.label}»؟`:`What should I use for “${field.label}”?`)};
}
