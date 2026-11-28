import {bookingAtomInputProps,requiredMark} from '../lib/bookingAtoms.mjs';
import {Check,X} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown} from 'lucide-react';
import BookingStep from './BookingStep';
import {useWorkVocabulary} from '../lib/workVocabulary';
import {useTreeService} from '../lib/tree';
import {FieldCode} from './BookingPhases';
import {useEventOrder} from './eventOrderContext';

// MC hosting and announcements are a section of their own (03.02), separate from DJ Khalil's service (03.01).
export default function McRow({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,svc=useTreeService('mc',ar),order=useEventOrder(),value=order?.order?.music?.mcRequested,locked=!order?.draftEditable;
  const set=next=>order?.setField('music.mcRequested',next);
  const pairs=order?.order?.music?.mcLanguagePairs||[],lists=useWorkVocabulary().data;
  // One select from the admin's Work Elements lists: every language, then each of its dialects ("Arabic · Lebanese").
  const options=(lists?.languages||[]).flatMap(row=>[{key:row.name+'|',language:row.name,dialect:''},...(lists?.dialects||[]).filter(item=>item.languageIds.includes(row.id)).map(item=>({key:row.name+'|'+item.name,language:row.name,dialect:item.name}))]);
  const addPair=key=>{const pick=options.find(option=>option.key===key);if(!pick||locked||pairs.some(row=>row.language===pick.language&&row.dialect===pick.dialect))return;order?.setField('music.mcLanguagePairs',[...pairs,{language:pick.language,dialect:pick.dialect}]);};
  const [open,setOpen]=useState(false),[place,setPlace]=useState(null),menu=useRef(null),listRef=useRef(null);
  // The list is fixed to the page (portal), so no card or section can clip it.
  useEffect(()=>{if(!open)return undefined;const measure=()=>{const box=menu.current?.getBoundingClientRect();if(!box)return;const below=window.innerHeight-box.bottom-12,above=box.top-12,up=below<220&&above>below;setPlace({left:box.left,width:box.width,...(up?{bottom:window.innerHeight-box.top+6,maxHeight:Math.min(320,above)}:{top:box.bottom+6,maxHeight:Math.min(320,below)})});};measure();window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);return()=>{window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);};},[open]);
  useEffect(()=>{if(!open)return undefined;const away=event=>{if(!menu.current?.contains(event.target)&&!listRef.current?.contains(event.target))setOpen(false);},esc=event=>{if(event.key==='Escape')setOpen(false);};document.addEventListener('pointerdown',away);document.addEventListener('keydown',esc);return()=>{document.removeEventListener('pointerdown',away);document.removeEventListener('keydown',esc);};},[open]);
  const removePair=index=>order?.setField('music.mcLanguagePairs',pairs.filter((_,at)=>at!==index));
  if(!svc.exists)return null; // the MC question exists only while an `mc` service is in the catalogue
  return <>
  <img className="dj-service-hero mc-service-hero" src="/echo/mc-service-hero.webp" width="1254" height="1254" alt={tr('An MC in a suit speaking into a microphone, with sound waves around him','مقدّم حفلات بالبدلة يتحدث في الميكروفون وحوله موجات صوتية')} loading="lazy"/>
  <BookingStep number={61} side="left" className="dj-service-step mc-service-step" title={tr(`Would you like ${svc.name} at your event?`,`هل تريد ${svc.name} في فعاليتك؟`)} cardTitle={<>{tr(`Add ${svc.name}`,`إضافة ${svc.name}`)}</>} copy={tr(`A host who welcomes your guests, announces the key moments (entrances, speeches, the first dance, the cake) and keeps the night flowing between the music. Please note the MC is a third-party host, not DJ Khalil. Tell us if you want one, then choose the languages and dialects your host should speak.`,`مقدّم يرحّب بضيوفك ويعلن اللحظات المهمة (الدخول، الكلمات، الرقصة الأولى، الكيكة) ويحافظ على إيقاع السهرة بين الأغاني. يرجى العلم أن المقدّم طرف ثالث وليس دي جي خليل. أخبرنا إن كنت تريد مقدّماً، ثم اختر اللغات واللهجات التي سيتحدث بها.`)}>
  <aside className="event-type-column mc-choice">
    <span className="avail-kicker"><FieldCode k="music.mcRequested"/>{svc.name.toUpperCase()+requiredMark("music.mcRequested")}</span>
    {svc.description&&<p className="mc-choice-copy">{svc.description}</p>}
    <div {...bookingAtomInputProps('music.mcRequested',order?.order)} role="group" aria-label={svc.name}>
      <button type="button" data-event-choice disabled={locked} aria-pressed={value===true} onClick={()=>set(true)}><Check size={17} aria-hidden="true"/><span>{tr(`Yes, add ${svc.name}`,`نعم، أضف ${svc.name}`)}</span></button>
      <button type="button" data-event-choice disabled={locked} aria-pressed={value===false} onClick={()=>set(false)}><X size={17} aria-hidden="true"/><span>{tr('No, not this time','لا، ليس هذه المرة')}</span></button>
    </div>
  </aside>
  {value===true&&<aside className="event-type-column mc-language" data-booking-field="music.mcLanguagePairs">
    <span className="avail-kicker"><FieldCode k="music.mcLanguagePairs"/>{tr('MC LANGUAGE AND DIALECT','لغة ولهجة المقدّم')+requiredMark("music.mcLanguagePairs")}</span>
    <div className="mc-language-menu" ref={menu}>
      <button type="button" className="mc-language-trigger" aria-haspopup="listbox" aria-expanded={open} disabled={locked||!options.length} onClick={()=>setOpen(on=>!on)}><span>{options.length?tr('Choose a language and dialect','اختر لغة ولهجة'):tr('Loading the lists…','جارٍ تحميل القوائم…')}</span><ChevronDown size={16} aria-hidden="true"/></button>
      {open&&place&&createPortal(<ul ref={listRef} className="mc-language-options" style={place} dir={ar?'rtl':'ltr'} role="listbox" aria-label={tr('Language and dialect','اللغة واللهجة')}>{options.map(option=>{const taken=pairs.some(row=>row.language===option.language&&row.dialect===option.dialect);return <li key={option.key} role="option" aria-selected={taken} className={`${option.dialect?'is-dialect':'is-language'}${taken?' is-taken':''}`}><button type="button" disabled={taken} onClick={()=>{addPair(option.key);setOpen(false);}}>{option.dialect||option.language}</button></li>;})}</ul>,document.body)}
    </div>
    {pairs.length>0&&<ul className="mc-language-list">{pairs.map((row,index)=><li key={`${row.language}-${row.dialect}`}><span>{row.dialect?`${row.language} (${row.dialect})`:row.language}</span><button type="button" disabled={locked} aria-label={tr('Remove','إزالة')} onClick={()=>removePair(index)}><X size={14} aria-hidden="true"/></button></li>)}</ul>}
  </aside>}
  </BookingStep>
  </>;
}
