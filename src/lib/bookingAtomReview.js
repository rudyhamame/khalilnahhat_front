export const atomReviewSignature=line=>JSON.stringify(Object.hasOwn(line,'reviewValue')?line.reviewValue??null:line.rawValue??line.value);
export const atomReviewState=(reviews,line)=>!(line.empty&&line.required)&&reviews[line.key]?.value===atomReviewSignature(line)?reviews[line.key].state:null;
export function reviewBookingAtom(reviews,line,confirmed){
 if(line.empty&&(line.required||!confirmed))return reviews;
 return {...reviews,[line.key]:{value:atomReviewSignature(line),state:confirmed?'confirmed':'correction'}};
}
export const applicableReviewAtoms=lines=>lines.filter(line=>!line.empty||!line.key.startsWith('service:')&&!line.key.startsWith('equipment:'));
export const unconfirmedReviewAtoms=(reviews,lines)=>applicableReviewAtoms(lines).filter(line=>atomReviewState(reviews,line)!=='confirmed');
export function currentAtomReviews(reviews,lines){
 const current=new Map(lines.map(line=>[line.key,line]));
 return Object.fromEntries(Object.entries(reviews).filter(([key])=>current.has(key)&&atomReviewState(reviews,current.get(key))));
}
export function manualBookingFieldHref(path){
 const field='?field='+encodeURIComponent(path);
 if(path.startsWith('customer.'))return '/dashboard/profile';
 if(path.startsWith('event.venue.'))return '/booking'+field+'#booking-venue';
 if(path==='event.guestCount')return '/booking'+field+'#booking-guests';
 if(['event.type','event.title','event.date','event.startTime','event.endTime'].includes(path))return '/booking'+field+'#booking-date';
 if(path.startsWith('references.')||path==='additional.voucherCode')return '/rentals'+field+'#references';
 if(path==='additional.notes')return '/rentals'+field+'#additional-notes';
 if(path.startsWith('music.')&&!['music.mcRequested','music.djMc'].includes(path))return '/rentals'+field+'#rentals-hero-title';
 if(path.startsWith('event.setup.')&&path!=='event.setup.requirements')return '/room'+field;
 return '/rentals'+field+'#rental-equipment';
}
export function bookingAtomCorrectionReply(path,label,ar=false){
 const manualOnly=path.startsWith('customer.')||['references.photos','references.files'].includes(path);
 return {role:'assistant',content:ar
  ? manualOnly?`يمكنك استبدال «${label}» يدوياً باستخدام الرابط أدناه.`:`ما القيمة البديلة التي تريدها لـ«${label}»؟ أخبرني بها هنا أو استخدم الرابط للتعديل يدوياً.`
  : manualOnly?`You can replace ${label} manually using the link below.`:`What would you like to use instead for ${label}? Tell me here, or use the link to edit it manually.`,
  fieldPath:path,actions:[{label:ar?'تعديل يدوياً':'Edit manually',goto:path}]};
}
