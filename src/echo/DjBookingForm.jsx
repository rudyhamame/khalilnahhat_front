import {useState} from 'react';
import {ArrowLeft,ArrowDown,ArrowUp,Check,Plus,Trash2,X} from 'lucide-react';
import {dialects,dialectRecord} from '../lib/dialects';
import {MUSIC_GENRES,MUSIC_LANGUAGES,SONG_PHASES} from '../lib/djOptions';
import './djBookingForm.css';

// Replaces the DJ Khalil's Work content with the inputs of the DJ service section of the Booking summary.
export default function DjBookingForm({ar=false,ctx,djAdded,onClose}){
 const tr=(en,arabic)=>ar?arabic:en;
 const music=ctx?.order?.music||{};
 const canEdit=Boolean(ctx?.signedIn&&ctx?.cloudReady&&!['conflict','delete-conflict'].includes(ctx?.saveState));
 const note=!ctx?.signedIn?tr('Sign in to fill in your DJ service details.','سجّل الدخول لإدخال تفاصيل خدمة الدي جي.'):!ctx?.cloudReady?tr('Loading your saved draft…','جارٍ تحميل مسودتك…'):!canEdit?tr('This draft changed elsewhere. Reload it from the Booking summary.','تغيّرت المسودة في مكان آخر. أعد تحميلها من ملخص الحجز.'):'';
 const set=(path,value)=>ctx.setField(path,value);
 const styles=music.styles||[],chosenDialects=music.dialects||[],genres=music.genres||[];
 const toggle=(list,id)=>list.includes(id)?list.filter(item=>item!==id):[...list,id];
 const languageOf=id=>MUSIC_LANGUAGES.find(row=>row[0]===id);
 const toggleLanguage=id=>{
  const next=toggle(styles,id);set('music.styles',next);
  if(!next.includes(id)){ // dropping a language drops its dialects
   const language=languageOf(id)?.[3];
   if(language)set('music.dialects',chosenDialects.filter(dialect=>dialectRecord(dialect)?.language!==language));
   if(id==='other')set('music.otherLanguage',null);
  }
 };
 const dialectsFor=language=>dialects.filter(item=>item.language===language);
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
   {djAdded&&<span className="djf-badge"><Check size={14} aria-hidden="true"/>{tr('Added to your booking','أُضيفت إلى حجزك')}</span>}
  </header>
  {note&&<p className="djf-note" role="status">{note}</p>}
  <fieldset className="djf-body" disabled={!canEdit}>
   <div className="djf-col">
    {section(1,tr('Musical influences','التأثيرات الموسيقية'),tr('Pick every language your music is in. The first one you pick is your main language.','اختر كل لغة تريدها في موسيقاك. أول لغة تختارها هي اللغة الرئيسية.'),<>
     <div className="djf-chips">{MUSIC_LANGUAGES.map(([id,en,arabic])=><button type="button" key={id} aria-pressed={styles.includes(id)} onClick={()=>toggleLanguage(id)}>{styles.includes(id)&&<Check size={13} aria-hidden="true"/>}{ar?arabic:en}</button>)}</div>
     {styles.includes('other')&&<input className="djf-input" type="text" maxLength={80} value={music.otherLanguage??''} placeholder={tr('Which other language?','أي لغة أخرى؟')} aria-label={tr('Other language','لغة أخرى')} onChange={event=>set('music.otherLanguage',event.target.value||null)}/>}
    </>)}
    {section(2,tr('Language & dialect','اللغة واللهجة'),tr('Each language comes with its dialect.','لكل لغة لهجتها.'),
     styles.filter(id=>languageOf(id)?.[3]).length?<div className="djf-pairs">{styles.filter(id=>languageOf(id)?.[3]).map(id=>{
      const language=languageOf(id)[3],mine=chosenDialects.filter(dialect=>dialectRecord(dialect)?.language===language),options=dialectsFor(language).filter(item=>!chosenDialects.includes(item.id)),families=[...new Set(options.map(item=>(ar?item.dialect_family_ar:item.dialect_family)||''))];
      return <div className="djf-pair" key={id}>
       <strong>{ar?languageOf(id)[2]:languageOf(id)[1]}</strong>
       <div className="djf-pair-dialects">{mine.map(dialect=>{const record=dialectRecord(dialect);return <span className="djf-tag" key={dialect}>{record?(ar?record.display_name_ar||record.display_name:record.display_name):dialect}<button type="button" aria-label={tr('Remove dialect','إزالة اللهجة')} onClick={()=>set('music.dialects',chosenDialects.filter(item=>item!==dialect))}><X size={12} aria-hidden="true"/></button></span>;})}
        {options.length>0&&<select className="djf-input" aria-label={`${tr('Add a dialect for','أضف لهجة لـ')} ${ar?languageOf(id)[2]:languageOf(id)[1]}`} value="" onChange={event=>{if(event.target.value)set('music.dialects',[...chosenDialects,event.target.value]);}}><option value="">{tr('Add a dialect…','أضف لهجة…')}</option>{families.map(family=><optgroup key={family} label={family}>{options.filter(item=>((ar?item.dialect_family_ar:item.dialect_family)||'')===family).map(item=><option key={item.id} value={item.id}>{ar?item.display_name_ar||item.display_name:item.display_name}</option>)}</optgroup>)}</select>}
       </div>
      </div>;})}</div>:<p className="djf-empty">{tr('Choose Arabic, Kurdish or Armenian above to pick a dialect.','اختر العربية أو الكردية أو الأرمنية أعلاه لاختيار لهجة.')}</p>)}
    {section(3,tr('Music genres','الأنواع الموسيقية'),tr('What should the dance floor sound like?','كيف تريد أن تبدو حلبة الرقص؟'),<div className="djf-chips">{MUSIC_GENRES.map(([id,en,arabic])=><button type="button" key={id} aria-pressed={genres.includes(id)} onClick={()=>set('music.genres',toggle(genres,id))}>{genres.includes(id)&&<Check size={13} aria-hidden="true"/>}{ar?arabic:en}</button>)}</div>)}
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
  <footer className="djf-foot">
   {djAdded&&<button type="button" className="djf-remove" disabled={!canEdit} onClick={removeDj}>{tr('Remove DJ service','إزالة خدمة الدي جي')}</button>}
   <button type="button" className="djf-done" onClick={onClose}><Check size={16} aria-hidden="true"/>{tr('Done','تم')}</button>
  </footer>
 </div>;
}
