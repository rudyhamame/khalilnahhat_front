import {useState} from 'react';
import {ArrowLeft,ArrowDown,ArrowUp,Check,Plus,Search,Trash2} from 'lucide-react';
import {SONG_PHASES} from '../lib/djOptions';
import {useWorkVocabulary} from '../lib/workVocabulary';
import {dialectsOf,languagesOf,withDialect,withLanguage} from '../lib/languagePairs.mjs';
import './djBookingForm.css';

// Replaces the DJ Khalil's Work content with the inputs of the DJ service section of the Booking summary.
export default function DjBookingForm({ar=false,ctx,djAdded,onClose}){
 const tr=(en,arabic)=>ar?arabic:en;
 const music=ctx?.order?.music||{};
 const canEdit=Boolean(ctx?.draftEditable);
 const note=!ctx?.cloudReady?tr('Loading your saved draft…','جارٍ تحميل مسودتك…'):!canEdit?tr('This draft changed elsewhere. Reload it from the Booking summary.','تغيّرت المسودة في مكان آخر. أعد تحميلها من ملخص الحجز.'):'';
 const set=(path,value)=>ctx.setField(path,value);

 // Everything below comes from the admin's Work Elements lists: influences, languages (each with its own dialects) and genres.
 const vocab=useWorkVocabulary(),lists=vocab.data;
 const influences=music.influences||[],genres=music.genres||[],pairs=music.languagePairs||[],chosenLanguages=languagesOf(pairs);
 const toggle=(list,id)=>list.includes(id)?list.filter(item=>item!==id):[...list,id];
 const [languageQuery,setLanguageQuery]=useState('');
 const languageRows=(lists?.languages||[]).filter(row=>!languageQuery.trim()||row.name.toLowerCase().includes(languageQuery.trim().toLowerCase()));
 const dialectRowsFor=language=>{const row=(lists?.languages||[]).find(item=>item.name===language);return row?(lists?.dialects||[]).filter(dialect=>dialect.languageIds.includes(row.id)):[];};
 const setPairs=next=>set('music.languagePairs',next);
 const loadNote=vocab.loading?<p className="djf-empty" role="status">{tr('Loading the lists…','جارٍ تحميل القوائم…')}</p>:vocab.error?<p className="djf-empty" role="alert">{vocab.error} <button type="button" className="djf-retry" onClick={vocab.retry}>{tr('Try again','حاول مرة أخرى')}</button></p>:null;
 const chipList=(items,selected,onToggle,empty)=>items.length?<div className="djf-chips">{items.map(name=><button type="button" key={name} aria-pressed={selected.includes(name)} onClick={()=>onToggle(name)}>{selected.includes(name)&&<Check size={13} aria-hidden="true"/>}{name}</button>)}</div>:<p className="djf-empty">{empty}</p>;
 // Suggested songs: local rows keep half-typed entries; only rows with a song are saved, in order.
 const [rows,setRows]=useState(()=>(music.suggestedSongs||[]).map((item,index)=>({key:`s${index}`,...item})));
 const [nextKey,setNextKey]=useState(1000);
 const commit=next=>{setRows(next);set('music.suggestedSongs',next.filter(row=>row.song.trim()).map(({phase,song})=>({phase,song:song.trim()})));};
 const patchRow=(key,patch)=>commit(rows.map(row=>row.key===key?{...row,...patch}:row));
 const move=(index,step)=>{const to=index+step;if(to<0||to>=rows.length)return;const next=[...rows];[next[index],next[to]]=[next[to],next[index]];commit(next);};
 const addRow=()=>{setNextKey(value=>value+1);setRows(current=>[...current,{key:`s${nextKey}`,phase:'',song:''}]);};
 const removeDj=()=>{ctx.removeService('dj');onClose();};
 const section=(number,title,hint,children,wide=false)=><section className={`djf-card${wide?' is-wide':''}`}><h3><span className="djf-num" aria-hidden="true">{number}</span>{title}</h3>{hint&&<p className="djf-hint">{hint}</p>}{children}</section>;
 return <div className="djf" dir={ar?'rtl':'ltr'}>
  <header className="djf-head">
   <button type="button" className="djf-back" onClick={onClose}><ArrowLeft size={16} aria-hidden="true"/>{tr('Back to DJ Khalil’s work','العودة إلى أعمال دي جي خليل')}</button>
   <div className="djf-title"><p className="djf-kicker">{tr('DJ SERVICE','خدمة الدي جي')}</p><h2>{tr('Tell us about your music','حدّثنا عن موسيقاك')}</h2><p>{tr('These choices fill the DJ service section of your Booking summary.','تملأ هذه الاختيارات قسم خدمة الدي جي في ملخص الحجز.')}</p></div>
   {djAdded&&<div className="djf-status"><span className="djf-badge"><Check size={14} aria-hidden="true"/>{tr('Added to your booking','أُضيفت إلى حجزك')}</span><button type="button" className="djf-remove" disabled={!canEdit} onClick={removeDj}>{tr('Remove','إزالة')}</button></div>}
  </header>
  {note&&<p className="djf-note" role="status">{note}</p>}
  <fieldset className="djf-body" disabled={!canEdit}>
   <div className="djf-col">
    {section(1,tr('Musical influences','التأثيرات الموسيقية'),tr('Pick the sounds that shape your taste.','اختر الأصوات التي تشكّل ذوقك.'),loadNote||chipList(lists?.influences||[],influences,name=>set('music.influences',toggle(influences,name)),tr('No influences have been listed yet.','لم تُضف تأثيرات بعد.')))}
    {section(2,tr('Language & dialect','اللغة واللهجة'),tr('Choose your languages first; the first one is your main language. Then pick a dialect for each, where there is one.','اختر لغاتك أولاً، والأولى هي الرئيسية. ثم اختر لهجة لكل لغة إن وُجدت.'),loadNote||<>
     {(lists?.languages||[]).length>24&&<label className="djf-search"><Search size={14} aria-hidden="true"/><input type="search" value={languageQuery} placeholder={tr('Find a language','ابحث عن لغة')} aria-label={tr('Find a language','ابحث عن لغة')} onChange={event=>setLanguageQuery(event.target.value)}/></label>}
     <div className="djf-scroll">{chipList(languageRows.map(row=>row.name),chosenLanguages,name=>setPairs(withLanguage(pairs,name,!chosenLanguages.includes(name))),tr('No languages match.','لا توجد لغات مطابقة.'))}</div>
     {chosenLanguages.length>0&&<div className="djf-pairs">{chosenLanguages.map((language,index)=>{const rows=dialectRowsFor(language),picked=dialectsOf(pairs,language);return <div className="djf-pair" key={language}>
      <strong>{language}{index===0&&<small>{tr('Main','رئيسية')}</small>}</strong>
      <div className="djf-pair-dialects">{rows.length?<div className="djf-chips">{rows.map(row=><button type="button" key={row.id} aria-pressed={picked.includes(row.name)} onClick={()=>setPairs(withDialect(pairs,language,row.name))}>{picked.includes(row.name)&&<Check size={13} aria-hidden="true"/>}{row.name}</button>)}</div>:<span className="djf-empty">{tr('No dialects for this language.','لا توجد لهجات لهذه اللغة.')}</span>}</div>
     </div>;})}</div>}
    </>)}
    {section(3,tr('Music genres','الأنواع الموسيقية'),tr('What should the dance floor sound like?','كيف تريد أن تبدو حلبة الرقص؟'),loadNote||chipList(lists?.genres||[],genres,name=>set('music.genres',toggle(genres,name)),tr('No genres have been listed yet.','لم تُضف أنواع بعد.')))}
   </div>
   <div className="djf-col">
    {section(4,tr('Suggested songs','الأغاني المقترحة'),tr('Add songs in the order you want them, each with its moment.','أضف الأغاني بالترتيب الذي تريده، لكل أغنية لحظتها.'),<>
     {rows.length>0&&<ol className="djf-songs">{rows.map((row,index)=><li key={row.key}>
      <span className="djf-num" aria-hidden="true">{index+1}</span>
      <select className="djf-input" value={row.phase} aria-label={tr('Moment','اللحظة')} onChange={event=>patchRow(row.key,{phase:event.target.value})}><option value="">{tr('Moment…','اللحظة…')}</option>{SONG_PHASES.map(([id,en,arabic])=><option key={id} value={id}>{ar?arabic:en}</option>)}</select>
      <input className="djf-input" type="text" maxLength={200} value={row.song} placeholder={tr('Song — Artist','الأغنية — الفنان')} aria-label={tr('Song','الأغنية')} onChange={event=>patchRow(row.key,{song:event.target.value})}/>
      <span className="djf-row-actions"><button type="button" aria-label={tr('Move up','تحريك للأعلى')} disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={14} aria-hidden="true"/></button><button type="button" aria-label={tr('Move down','تحريك للأسفل')} disabled={index===rows.length-1} onClick={()=>move(index,1)}><ArrowDown size={14} aria-hidden="true"/></button><button type="button" aria-label={tr('Remove song','إزالة الأغنية')} onClick={()=>commit(rows.filter(item=>item.key!==row.key))}><Trash2 size={14} aria-hidden="true"/></button></span>
     </li>)}</ol>}
     <button type="button" className="djf-add" disabled={rows.length>=30} onClick={addRow}><Plus size={15} aria-hidden="true"/>{tr('Add a song','أضف أغنية')}</button>
    </>,true)}
    {section(5,tr('Favourite songs','الأغاني المفضلة'),tr('Songs you love (optional). One per line works well.','أغانٍ تحبها (اختياري). يفضّل أغنية في كل سطر.'),<textarea className="djf-input" rows={3} maxLength={1500} value={music.favouriteSongs??''} placeholder={tr('Songs you love…','أغانٍ تحبها…')} aria-label={tr('Favourite songs','الأغاني المفضلة')} onChange={event=>set('music.favouriteSongs',event.target.value||null)}/>)}
    {section(6,tr('Favourite artists','الفنانون المفضلون'),tr('Artists you love (optional).','فنانون تحبهم (اختياري).'),<textarea className="djf-input" rows={3} maxLength={1500} value={music.favouriteArtists??''} placeholder={tr('Artists you love…','فنانون تحبهم…')} aria-label={tr('Favourite artists','الفنانون المفضلون')} onChange={event=>set('music.favouriteArtists',event.target.value||null)}/>)}
   </div>
  </fieldset>
 </div>;
}
