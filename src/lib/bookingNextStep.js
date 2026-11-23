import {missingOrderFields,getPath} from './eventOrderCore.mjs';
import {fieldQuestion} from './fieldQuestion.js';
import {treeSteps} from './treeCore.js';

const priority=['event.type','event.title','event.date','event.startTime','event.endTime','event.guestCount','event.venue.name','event.venue.address','event.venue.city','event.venue.postalCode','event.venue.setting','music.djRequested','music.mcRequested','rental.requested','services'];
const questions={
 'event.type':['What kind of event are you planning?','ما نوع الفعالية التي تخطط لها؟'],
 'event.title':['What kind of event is it? Describe it in a few words.','ما نوع فعاليتك؟ صفها بكلمات قليلة.'],
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
 return missing;
}

// Only ask for values still missing after the draft has actually been updated.
// optionalDone: the client has answered or declined the optional extras (inspiration links, notes, voucher). Then, and only then, the booking is announced as ready to submit.
export function bookingNextStep(order={},ar=false,{optionalDone=false,firstKey=null}={}){
 const missing=effectiveMissing(order);

 const field=(firstKey&&missing.find(field=>field.key===firstKey))||priority.map(path=>missing.find(field=>field.key===path)).find(Boolean)||missing[0];
 const present=treeSteps();
 const optional=[['music.djRequested',present.dj],['music.mcRequested',present.mc!==false]].find(([key,exists])=>exists&&getPath(order,key)==null);
 if(!field&&optional)return {path:optional[0],optional:true,text:questions[optional[0]][ar?1:0]};
 if(!field)return optionalDone
  ?{path:null,ready:true,text:ar?'حجزك مكتمل وجاهز للإرسال. اضغط «إرسال الحجز» لإرساله إلى الفريق.':'Your booking is complete and ready to be submitted. Press Submit booking to send it to the team.'}
  :{path:null,text:ar?'تفاصيل الطلب الأساسية مكتملة. هل تريد إضافة صور ملهمة أو روابطها، أو ملاحظات إضافية، أو رمز قسيمة؟ أو أخبرني إن لم يكن هناك شيء آخر لإضافته.':'Your required details are complete. Would you like to add inspiration photo links, additional notes or a voucher code? Or tell me there is nothing more to add.'};
 return {path:field.key,text:questions[field.key]?.[ar?1:0]||fieldQuestion(field,ar)};
}
