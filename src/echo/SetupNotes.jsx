import {bookingAtom,bookingAtomInputProps,requiredMark} from '../lib/bookingAtoms.mjs';
import {FieldCode} from './BookingPhases';
import {useEffect,useId,useLayoutEffect,useRef} from 'react';
import {useEventOrder} from './eventOrderContext';
import {fieldName} from '../lib/eventOrderCore.mjs';
import './setupNotes.css';

const PATH='event.setup.requirements';
const MAX_LENGTH=bookingAtomInputProps(PATH).maxLength;
export default function SetupNotes({ar=false}){
 const ctx=useEventOrder(),id=useId(),section=useRef(null),tr=(en,arabic)=>ar?arabic:en;
 const value=ctx?.order?.event?.setup?.requirements||'';
 const area=useRef(null);
 useLayoutEffect(()=>{const el=area.current;if(el){el.style.height='auto';el.style.height=`${el.scrollHeight+2}px`;}},[value]);// grows with its text up to the CSS max-height, then scrolls inside
 useEffect(()=>{if(window.location.hash==='#setup-notes')section.current?.scrollIntoView({block:'start'});},[]);
 return <section ref={section} id="setup-notes" className="echo-section setup-notes" dir={ar?'rtl':'ltr'} aria-labelledby={`${id}-title`}>
  <div className="setup-notes-copy"><h2 id={`${id}-title`}>{fieldName(PATH,ar)}</h2><p id={`${id}-hint`}>{tr('Anything we should know about the space or setup? Tell us about access, power, staging or other setup requirements.','هل هناك ما يجب أن نعرفه عن المكان أو التجهيز؟ أخبرنا عن الوصول أو الكهرباء أو المنصة أو أي متطلبات أخرى.')}</p></div>
  <div className="setup-notes-card"><label htmlFor={`${id}-input`}>{fieldName(PATH,ar)}{requiredMark(PATH)} {!bookingAtom(PATH).required&&<span>{tr('(optional)','(اختياري)')}</span>}<FieldCode k={PATH}/></label>
   <textarea ref={area} id={`${id}-input`} {...bookingAtomInputProps(PATH,ctx?.order)} data-field={PATH} rows={5} dir="auto" aria-describedby={`${id}-hint ${id}-help`} disabled={!ctx?.draftEditable} value={value} placeholder={tr('For example: loading entrance at the rear, limited power outlets, stage access…','مثلاً: مدخل التحميل في الخلف، مقابس كهرباء محدودة، الوصول إلى المنصة…')} onChange={event=>ctx?.setField(PATH,event.target.value||null)}/>
   <div className="setup-notes-meta"><small id={`${id}-help`}>{tr('Included in your booking review.','تُدرج هذه الملاحظات في مراجعة حجزك.')}</small><small>{value.length}/{MAX_LENGTH}</small></div>
  </div>
 </section>;
}
