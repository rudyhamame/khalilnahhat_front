import {fieldCode} from './eventPageModel.js';
import {isAiEditableField} from './eventOrderCore.mjs';
export const atomReviewSignature=line=>JSON.stringify(Object.hasOwn(line,'reviewValue')?line.reviewValue??null:line.rawValue??line.value);
export const atomReviewState=(reviews,line)=>!line.empty&&reviews[line.key]?.value===atomReviewSignature(line)?reviews[line.key].state:null;
export function reviewBookingAtom(reviews,line,confirmed){
 if(line.empty)return reviews;
 return {...reviews,[line.key]:{value:atomReviewSignature(line),state:confirmed?'confirmed':'correction'}};
}
export const applicableReviewAtoms=lines=>lines.filter(line=>!line.empty&&!line.category);
// Pressing the pencil on a filled atom marks it 'editing': the pencil stays until its value changes (then it is a new value to review).
export function editBookingAtom(reviews,line){
 const next={...reviews};delete next[line.key];
 return line.empty?next:{...next,[line.key]:{value:atomReviewSignature(line),state:'editing'}};
}
export const unconfirmedReviewAtoms=(reviews,lines)=>applicableReviewAtoms(lines).filter(line=>atomReviewState(reviews,line)!=='confirmed');
export function currentAtomReviews(reviews,lines){
 const current=new Map(lines.map(line=>[line.key,line]));
 return Object.fromEntries(Object.entries(reviews).filter(([key])=>current.has(key)&&atomReviewState(reviews,current.get(key))));
}
// A guest has no account page: their personal details are filled in on the Booking page itself.
export function manualBookingFieldHref(path,signedIn=true){
 const field='?field='+encodeURIComponent(path);
 if(path.startsWith('customer.'))return signedIn?'/dashboard/profile':'/booking'+field+'#booking-phase-1';
 if(path.startsWith('event.venue.'))return '/booking'+field+'#booking-venue';
 if(path==='event.guestCount')return '/booking'+field+'#booking-guests';
 if(['event.type','event.title','event.date','event.startTime','event.endTime'].includes(path))return '/booking'+field+'#booking-date';
 if(path==='event.setup.requirements')return '/booking'+field+'#setup-notes';
 if(path==='additional.voucherCode')return '/booking'+field+'#voucher';
 if(path.startsWith('references.'))return '/booking'+field+'#references';
 if(path==='additional.notes')return '/booking'+field+'#additional-notes';
 if(path.startsWith('music.')&&path!=='music.mcRequested')return '/booking'+field+'#rentals-hero-title';
 if(path.startsWith('event.setup.')&&path!=='event.setup.requirements')return '/room'+field;
 return '/booking'+field+'#rental-equipment';
}
export function bookingAtomCorrectionReply(path,label,ar=false){
 const code=fieldCode(path);if(code)label=`${code} ${label}`;// the same index the Booking page and the review show
 const manualOnly=path!=='equipment'&&!isAiEditableField(path); // account-owned details (signed in), photos and files; a guest's own details can be changed in the conversation
 return {role:'assistant',content:ar
  ? manualOnly?`يمكنك استبدال «${label}» يدوياً باستخدام الرابط أدناه.`:`كيف تريد تعديل «${label}»؟`
  : manualOnly?`You can replace ${label} manually using the link below.`:`How would you like to edit ${label}?`,
  fieldPath:path,actions:[...(manualOnly?[]:[{label:ar?'عدّل مع إيكو AI':'Change with Echo AI',text:ar?`عدّل ${label} مع إيكو AI.`:`Change ${label} with Echo AI.`}]),{label:ar?'تعديل يدوياً':'Edit manually',goto:path}]};
}
// What the client's pencil click says in the conversation, before Echo answers with bookingAtomCorrectionReply.
export const bookingAtomEditRequest=(path,label,ar=false)=>({role:'user',content:ar?`أريد تعديل ${fieldCode(path)?fieldCode(path)+' ':''}${label}.`:`I want to edit ${fieldCode(path)?fieldCode(path)+' ':''}${label}.`});
