import {Check,X} from 'lucide-react';
import {useState} from 'react';
import BookingStep from './BookingStep';
import {useTreeService} from '../lib/tree';
import {FieldCode} from './BookingPhases';
import {useEventOrder} from './eventOrderContext';

// MC hosting and announcements are a section of their own (03.02), separate from DJ Khalil's service (03.01).
export default function McRow({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,svc=useTreeService('mc',ar),order=useEventOrder(),value=order?.order?.music?.mcRequested,locked=!order?.draftEditable;
  const set=next=>order?.setField('music.mcRequested',next);
  const pairs=order?.order?.music?.mcLanguagePairs||[],[language,setLanguage]=useState(''),[dialect,setDialect]=useState('');
  const addPair=()=>{const name=language.trim();if(!name||locked)return;order?.setField('music.mcLanguagePairs',[...pairs.filter(row=>!(row.language===name&&row.dialect===dialect.trim())),{language:name,dialect:dialect.trim()}]);setLanguage('');setDialect('');};
  const removePair=index=>order?.setField('music.mcLanguagePairs',pairs.filter((_,at)=>at!==index));
  if(!svc.exists)return null; // the MC question exists only while an `mc` service is in the catalogue
  return <BookingStep number={61} side="right" className="dj-service-step mc-service-step" title={tr(`Would you like ${svc.name} at your event?`,`هل تريد ${svc.name} في فعاليتك؟`)} cardTitle={<>{tr(`Add ${svc.name}`,`إضافة ${svc.name}`)}</>} copy={tr('Note: the MC is a third-party host, not DJ Khalil. Tell us if you want a host to announce and guide your night.','ملاحظة: مقدّم الحفل طرف ثالث وليس دي جي خليل. أخبرنا إن كنت تريد مقدّماً يعلن ويدير سهرتك.')}>
  <aside className="event-type-column mc-choice">
    <span className="avail-kicker"><FieldCode k="music.mcRequested"/>{svc.name.toUpperCase()} *</span>
    {svc.description&&<p className="mc-choice-copy">{svc.description}</p>}
    <div role="group" aria-label={svc.name}>
      <button type="button" data-event-choice disabled={locked} aria-pressed={value===true} onClick={()=>set(true)}><Check size={17} aria-hidden="true"/><span>{tr(`Yes, add ${svc.name}`,`نعم، أضف ${svc.name}`)}</span></button>
      <button type="button" data-event-choice disabled={locked} aria-pressed={value===false} onClick={()=>set(false)}><X size={17} aria-hidden="true"/><span>{tr('No, not this time','لا، ليس هذه المرة')}</span></button>
    </div>
  </aside>
  {value===true&&<aside className="event-type-column mc-language">
    <span className="avail-kicker"><FieldCode k="music.mcLanguagePairs"/>{tr('MC LANGUAGE AND DIALECT','لغة ولهجة المقدّم')}</span>
    <div className="mc-language-add"><input value={language} disabled={locked} maxLength={80} placeholder={tr('Language (for example Arabic)','اللغة (مثل العربية)')} onChange={event=>setLanguage(event.target.value)}/><input value={dialect} disabled={locked} maxLength={80} placeholder={tr('Dialect (optional)','اللهجة (اختياري)')} onChange={event=>setDialect(event.target.value)}/><button type="button" disabled={locked||!language.trim()} onClick={addPair}>{tr('Add','إضافة')}</button></div>
    {pairs.length>0&&<ul className="mc-language-list">{pairs.map((row,index)=><li key={`${row.language}-${row.dialect}`}><span>{row.dialect?`${row.language} (${row.dialect})`:row.language}</span><button type="button" disabled={locked} aria-label={tr('Remove','إزالة')} onClick={()=>removePair(index)}><X size={14} aria-hidden="true"/></button></li>)}</ul>}
  </aside>}
  </BookingStep>;
}
