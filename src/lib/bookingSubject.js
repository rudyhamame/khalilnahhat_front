import {APP_VIEWPORT_TARGETS,bookingFieldSection} from './bookingViewport';

export function fieldSubject(path){
 if(path?.startsWith('event.venue.'))return {section:'availability',face:'venue'};
 if(path?.startsWith('event.setup.'))return {section:'simulation'};
 const section=bookingFieldSection(path);
 return section?{section,...(section==='availability'?{face:'calendar'}:{})}:null;
}
export function currentBookingSubject(){
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
