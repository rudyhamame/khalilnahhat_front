import {APP_VIEWPORT_TARGETS,bookingFieldSection} from './bookingViewport.js';

export function fieldSubject(path){
 if(path?.startsWith('event.venue.'))return {section:'availability',face:'venue'};
 if(path?.startsWith('event.setup.'))return {section:'simulation'};
 const section=bookingFieldSection(path);
 return section?{section,...(section==='availability'?{face:'calendar'}:{})}:null;
}
export function currentBookingSubject(){
 if(typeof document==='undefined')return null;
 const header=Math.max(0,document.querySelector('.echo-header')?.getBoundingClientRect().bottom||0),anchor=header+(innerHeight-header)*.35;
 const sections=['availability','work','setup'];let section=null;
 for(const key of sections){const rect=document.querySelector(APP_VIEWPORT_TARGETS[key])?.getBoundingClientRect();if(rect&&rect.top<=anchor&&rect.bottom>anchor)section=key;}
 if(section==='availability')return {section,face:document.querySelector('#availability .avail-flip.is-flipped')?'venue':'calendar'};
 if(section==='setup'&&document.querySelector('#services .setup-flip.is-flipped'))section='simulation';
 return section?{section}:null;
}
export const sameBookingSubject=(a,b)=>a?.section===b?.section&&(a?.section!=='availability'||(a.face||'calendar')===(b.face||'calendar'));
export function subjectName(target,ar=false){
 if(target?.section==='availability')return target.face==='venue'?(ar?'تفاصيل المكان':'venue details'):(ar?'تفاصيل الفعالية والموعد':'event details and dates');
 return ({setup:ar?'الخدمات والمعدات':'services and equipment',simulation:ar?'تجهيز المكان':'room setup',work:ar?'الدي جي والموسيقى':'DJ and music',booking:ar?'تفاصيل التواصل والحجز':'contact and booking details'})[target?.section]||(ar?'القسم التالي':'the next section');
}

// Interpret permission for the destination that Echo just offered, not a draft answer.
export function bookingTransitionIntent(text,target){
 const value=String(text||'').toLowerCase().replace(/[’']/g,'').replace(/[.!?؟،,\\]+/g,' ').replace(/\s+/g,' ').trim();
 if(/\b(?:dont|do not|not yet|not ready|stay|keep working|keep going)\b|(?:لا أريد|لا اريد|ليس بعد|خلينا هون|ابق|ابقى)/u.test(value))return 'stay';
 if(/^(?:yes(?: please)?|sure|okay|ok|continue|next|move on|go ahead|lets continue|نعم|أجل|اجل|تمام|تابع|نكمل|انتقل)$/u.test(value))return 'continue';
 const topic=target?.section==='availability'?(target.face==='venue'?/\b(?:venue|location|address)\b|(?:المكان|الموقع|العنوان)/u:/\b(?:event|date|dates|calendar|time|guests)\b|(?:الفعالية|الموعد|التاريخ|الضيوف)/u):({work:/\b(?:dj|music|khalil)\b|(?:دي جي|الموسيقى|خليل)/u,setup:/\b(?:rental|rentals|equipment|services|mc)\b|(?:المعدات|الخدمات|التأجير|تقديم الحفل)/u,simulation:/\b(?:room|layout|simulation|setup)\b|(?:الغرفة|التجهيز|المحاكاة)/u,booking:/\b(?:contact|booking|review)\b|(?:التواصل|الحجز|المراجعة)/u})[target?.section];
 const action=/\b(?:continue|proceed|move|go|switch|open|show|next|ready)\b|(?:ننتقل|انتقل|نروح|نكمل|أكمل|اكمل|تابع|افتح|أريد الانتقال|اريد الانتقال)/u;
 if(topic?.test(value)&&(action.test(value)||/\b(?:want|would like|please)\b|(?:أريد|اريد|بدي|لو سمحت)/u.test(value)))return 'continue';
 if(/^(?:yes|sure|okay|ok)\b/u.test(value)&&action.test(value)&&!/[0-9]/u.test(value))return 'continue';
 if(/^(?:no|لا)$/u.test(value))return 'stay';
 return null;
}
