import {useState} from 'react';
import {ArrowLeft,ArrowDown,ArrowUp,Check,Plus,Search,Trash2,X} from 'lucide-react';
import {SONG_PHASES,optionLabel} from '../lib/djOptions';
import {useWorkVocabulary} from '../lib/workVocabulary';
import TagInput from './TagInput';
import {dialectsOf,languagesOf,makeMain,withDialect,withLanguage} from '../lib/languagePairs.mjs';
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
 // The moments come from the admin's Work Elements (Event moments); the fixed list is only a fallback while it loads or when empty.
 const momentNames=lists?.moments?.length?lists.moments:SONG_PHASES.map(([,en])=>en);
 const influences=music.influences||[],genres=music.genres||[],pairs=music.languagePairs||[],chosenLanguages=languagesOf(pairs);
 const toggle=(list,id)=>list.includes(id)?list.filter(item=>item!==id):[...list,id];
 // Older drafts kept these as one text box; show them as a list.
 const asList=value=>Array.isArray(value)?value:String(value||'').split(/[\n,;]+/).map(item=>item.trim()).filter(Boolean);
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
 // The sections are collected here, then shown as a left column (the list) and a main component (the open section).
 const cards=[];
 const section=(number,title,hint,children)=>{cards.push({number,title,hint,children});return null;};
 const [openCard,setOpenCard]=useState(1);
 return <div className="djf" dir={ar?'rtl':'ltr'}>
  <header className="djf-head">
   <button type="button" className="djf-back" onClick={onClose}><ArrowLeft size={16} aria-hidden="true"/>{tr('Back to DJ Khalil’s work','العودة إلى أعمال دي جي خليل')}</button>
   <div className="djf-title"><p className="djf-kicker">{tr('DJ SERVICE','خدمة الدي جي')}</p><h2>{tr('Tell us about your music','حدّثنا عن موسيقاك')}</h2><p>{tr('These choices fill the DJ service section of your Booking summary.','تملأ هذه الاختيارات قسم خدمة الدي جي في ملخص الحجز.')}</p></div>
   {djAdded&&<div className="djf-status"><span className="djf-badge"><Check size={14} aria-hidden="true"/>{tr('Added to your booking','أُضيفت إلى حجزك')}</span><button type="button" className="djf-remove" disabled={!canEdit} onClick={removeDj}>{tr('Remove','إزالة')}</button></div>}
  </header>
  {note&&<p className="djf-note" role="status">{note}</p>}
  <div className="djf-body"><fieldset className="djf-fields" disabled={!canEdit}>
   <div hidden className="djf-collect">
   <div className="djf-col">
    {section(1,tr('Musical influences','التأثيرات الموسيقية'),tr('Pick the sounds that shape your taste.','اختر الأصوات التي تشكّل ذوقك.'),loadNote||chipList(lists?.influences||[],influences,name=>set('music.influences',toggle(influences,name)),tr('No influences have been listed yet.','لم تُضف تأثيرات بعد.')))}
    {section(2,tr('Language & dialect','اللغة واللهجة'),tr('Choose your languages first; the first one is your main language. Then pick a dialect for each, where there is one.','اختر لغاتك أولاً، والأولى هي الرئيسية. ثم اختر لهجة لكل لغة إن وُجدت.'),loadNote||<>
     {(lists?.languages||[]).length>24&&<label className="djf-search"><Search size={14} aria-hidden="true"/><input type="search" value={languageQuery} placeholder={tr('Find a language','ابحث عن لغة')} aria-label={tr('Find a language','ابحث عن لغة')} onChange={event=>setLanguageQuery(event.target.value)}/></label>}
     <div className="djf-scroll">{chipList(languageRows.map(row=>row.name),chosenLanguages,name=>setPairs(withLanguage(pairs,name,!chosenLanguages.includes(name))),tr('No languages match.','لا توجد لغات مطابقة.'))}</div>
     <div className="djf-langs" aria-live="polite">
      <h4 className="djf-subtitle">{tr('Your languages','لغاتك')}<span>{chosenLanguages.length}</span></h4>
      {chosenLanguages.length===0?<p className="djf-empty">{tr('Pick a language above to start.','اختر لغة من الأعلى للبدء.')}</p>:<ol className="djf-lang-list">{chosenLanguages.map((language,index)=>{const rows=dialectRowsFor(language),picked=dialectsOf(pairs,language);return <li className={`djf-lang${index===0?' is-main':''}`} key={language}>
       <header>
        <strong>{language}</strong>
        {index===0?<span className="djf-main-badge">{tr('Main language','اللغة الرئيسية')}</span>:<button type="button" className="djf-link" onClick={()=>setPairs(makeMain(pairs,language))}>{tr('Make main','اجعلها الرئيسية')}</button>}
        <button type="button" className="djf-lang-x" aria-label={`${tr('Remove','إزالة')} ${language}`} onClick={()=>setPairs(withLanguage(pairs,language,false))}><X size={14} aria-hidden="true"/></button>
       </header>
       {rows.length>0?<div className="djf-dialects"><p>{tr('Dialects','اللهجات')}<small>{picked.length?tr(`${picked.length} chosen`,`${picked.length} مختارة`):tr('pick any that fit','اختر ما يناسبك')}</small></p><div className="djf-chips is-small">{rows.map(row=><button type="button" key={row.id} aria-pressed={picked.includes(row.name)} onClick={()=>setPairs(withDialect(pairs,language,row.name))}>{picked.includes(row.name)&&<Check size={12} aria-hidden="true"/>}{row.name}</button>)}</div></div>:<p className="djf-no-dialects">{tr('No dialects listed for this language.','لا توجد لهجات لهذه اللغة.')}</p>}
      </li>;})}</ol>}
     </div>
    </>)}
    {section(3,tr('Music genres','الأنواع الموسيقية'),tr('What should the dance floor sound like?','كيف تريد أن تبدو حلبة الرقص؟'),loadNote||chipList(lists?.genres||[],genres,name=>set('music.genres',toggle(genres,name)),tr('No genres have been listed yet.','لم تُضف أنواع بعد.')))}
   </div>
   <div className="djf-col">
    {section(4,tr('Songs for event moments','أغانٍ للحظات الفعالية'),tr('Add songs in the order you want them, each with its moment.','أضف الأغاني بالترتيب الذي تريده، لكل أغنية لحظتها.'),<>
     {rows.length>0&&<ol className="djf-songs">{rows.map((row,index)=><li key={row.key}>
      <span className="djf-num" aria-hidden="true">{index+1}</span>
      <select className="djf-input" value={row.phase} aria-label={tr('Moment','اللحظة')} onChange={event=>patchRow(row.key,{phase:event.target.value})}><option value="">{tr('Moment…','اللحظة…')}</option>{momentNames.map(name=><option key={name} value={name}>{name}</option>)}{row.phase&&!momentNames.includes(row.phase)&&<option value={row.phase}>{optionLabel(SONG_PHASES,row.phase,ar)}</option>}</select>
      <input className="djf-input" type="text" maxLength={200} value={row.song} placeholder={tr('Song — Artist','الأغنية — الفنان')} aria-label={tr('Song','الأغنية')} onChange={event=>patchRow(row.key,{song:event.target.value})}/>
      <span className="djf-row-actions"><button type="button" aria-label={tr('Move up','تحريك للأعلى')} disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={14} aria-hidden="true"/></button><button type="button" aria-label={tr('Move down','تحريك للأسفل')} disabled={index===rows.length-1} onClick={()=>move(index,1)}><ArrowDown size={14} aria-hidden="true"/></button><button type="button" aria-label={tr('Remove song','إزالة الأغنية')} onClick={()=>commit(rows.filter(item=>item.key!==row.key))}><Trash2 size={14} aria-hidden="true"/></button></span>
     </li>)}</ol>}
     <button type="button" className="djf-add" disabled={rows.length>=30} onClick={addRow}><Plus size={15} aria-hidden="true"/>{tr('Add a song','أضف أغنية')}</button>
    </>,true)}
    {section(5,tr('Favourite songs','الأغاني المفضلة'),tr('Add the songs you love, one at a time.','أضف الأغاني التي تحبها واحدة تلو الأخرى.'),<TagInput ar={ar} disabled={!canEdit} label={tr('Favourite songs','الأغاني المفضلة')} placeholder={tr('Type a song and press Enter…','اكتب اسم أغنية واضغط Enter…')} values={asList(music.favouriteSongs)} suggestions={lists?.songs||[]} onChange={next=>set('music.favouriteSongs',next)}/>)}
    {section(6,tr('Favourite artists','الفنانون المفضلون'),tr('Add the artists you love, one at a time.','أضف الفنانين الذين تحبهم واحداً تلو الآخر.'),<TagInput ar={ar} disabled={!canEdit} label={tr('Favourite artists','الفنانون المفضلون')} placeholder={tr('Type an artist and press Enter…','اكتب اسم فنان واضغط Enter…')} values={asList(music.favouriteArtists)} suggestions={lists?.artists||[]} onChange={next=>set('music.favouriteArtists',next)}/>)}
   </div>
  </div>
   {(()=>{
    const counts={1:influences.length,2:chosenLanguages.length,3:genres.length,4:rows.length,5:asList(music.favouriteSongs).length,6:asList(music.favouriteArtists).length};
    const active=cards.find(card=>card.number===openCard)||cards[0];
    return <>
     <nav className="djf-nav" aria-label={tr('DJ service sections','أقسام خدمة الدي جي')}>
      {cards.map(card=><button type="button" key={card.number} className={card.number===active?.number?'is-open':''} aria-current={card.number===active?.number?'true':undefined} onClick={()=>setOpenCard(card.number)}>
       <span className="djf-num" aria-hidden="true">{card.number}</span><span className="djf-nav-title">{card.title}</span>{counts[card.number]>0&&<b className="djf-nav-count">{counts[card.number]}</b>}
      </button>)}
     </nav>
     {active&&<section className="djf-card djf-main-card" aria-labelledby="djf-main-title"><h3 id="djf-main-title"><span className="djf-num" aria-hidden="true">{active.number}</span><span className="djf-card-title">{active.title}</span>{active.hint&&<small className="djf-hint-inline">{active.hint}</small>}</h3>{active.children}</section>}
    </>;
   })()}
  </fieldset></div>
 </div>;
}
