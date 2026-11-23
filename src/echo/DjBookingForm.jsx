import BookingStep from './BookingStep';
import {FieldCode} from './BookingPhases';
import {useState} from 'react';
import {ArrowDown,ArrowUp,Check,Plus,Search,Trash2,X} from 'lucide-react';
import {SONG_PHASES,optionLabel} from '../lib/djOptions';
import {useWorkVocabulary} from '../lib/workVocabulary';
import FavouriteSongsEditor from './FavouriteSongsEditor';
import YouTubeSongSearch from './YouTubeSongSearch';
import {isYouTubeLink} from '../lib/favouriteSongs.mjs';
import TagInput from './TagInput';
import {favouriteSongEntries} from '../lib/favouriteSongs.mjs';
import {dialectsOf,languagesOf,makeMain,withDialect,withLanguage} from '../lib/languagePairs.mjs';
import './djBookingForm.css';

const MUSIC_PREFERENCE_ATOMS={1:'music.languagePairs',2:'music.genres',3:'music.suggestedSongs',4:'music.favouriteSongs',5:'music.favouriteArtists'};

// Replaces the DJ Khalil's Work content with the inputs of the DJ service section of the Booking summary.
export default function DjBookingForm({ar=false,ctx,djAdded,onClose,backLabel}){
 const tr=(en,arabic)=>ar?arabic:en;
 const music=ctx?.order?.music||{};
 const canEdit=Boolean(ctx?.draftEditable);
 const note=!ctx?.cloudReady?tr('Loading your saved draft…','جارٍ تحميل مسودتك…'):!canEdit?tr('This draft changed elsewhere. Reload it from the Booking summary.','تغيّرت المسودة في مكان آخر. أعد تحميلها من ملخص الحجز.'):'';
 const set=(path,value)=>ctx.setField(path,value);

 // These choices come from the admin's Work Elements lists: languages, dialects and genres.
 const vocab=useWorkVocabulary(),lists=vocab.data;
 // Suggest the admin's Event moments, while allowing clients to name their own.
 const momentNames=lists?.moments||[];
 const genres=music.genres||[],pairs=music.languagePairs||[],chosenLanguages=languagesOf(pairs);
 const toggle=(list,id)=>list.includes(id)?list.filter(item=>item!==id):[...list,id];
 // Older drafts kept these as one text box; show them as a list.
 const asList=value=>Array.isArray(value)?value:String(value||'').split(/[\n,;]+/).map(item=>item.trim()).filter(Boolean);
 // Artists chosen from the grid show as selected cards; only artists the visitor types in get a pill.
 const [languageQuery,setLanguageQuery]=useState(''),[genreQuery,setGenreQuery]=useState('');
 const languageRows=(lists?.languages||[]).filter(row=>!languageQuery.trim()||row.name.toLowerCase().includes(languageQuery.trim().toLowerCase()));
 const dialectRowsFor=language=>{const row=(lists?.languages||[]).find(item=>item.name===language);return row?(lists?.dialects||[]).filter(dialect=>dialect.languageIds.includes(row.id)):[];};
 const setPairs=next=>set('music.languagePairs',next);
 const loadNote=vocab.loading?<p className="djf-empty" role="status">{tr('Loading the lists…','جارٍ تحميل القوائم…')}</p>:vocab.error?<p className="djf-empty" role="alert">{vocab.error} <button type="button" className="djf-retry" onClick={vocab.retry}>{tr('Try again','حاول مرة أخرى')}</button></p>:null;
 // One card per genre, with what the Work Elements genre card holds: the name and its description. Several can be chosen.
 const genreGrid=()=>{
  const cards=lists?.genreCards||[];
  if(!cards.length)return <p className="djf-empty">{tr('No genres have been listed yet.','لم تُضف أنواع بعد.')}</p>;
  const needle=genreQuery.trim().toLowerCase(),shown=needle?cards.filter(card=>[card.name,card.description].some(text=>String(text||'').toLowerCase().includes(needle))):cards;
  return <><label className="djf-search djf-genre-search"><Search size={14} aria-hidden="true"/><input type="search" value={genreQuery} placeholder={tr('Search music genres','ابحث عن نوع موسيقي')} aria-label={tr('Search music genres','ابحث عن نوع موسيقي')} onChange={event=>setGenreQuery(event.target.value)}/></label>
  {!shown.length&&<p className="djf-empty" role="status">{tr('No genres match.','لا توجد أنواع مطابقة.')}</p>}
  <div className="djf-genre-grid" role="group" aria-label={tr('Music genres','الأنواع الموسيقية')}>{shown.map(card=>{const on=genres.includes(card.name);return <button type="button" key={card.id||card.name} className="djf-genre-card" aria-pressed={on} onClick={()=>set('music.genres',toggle(genres,card.name))}>
   <span className="djf-genre-head"><strong>{card.name}</strong><span className="djf-genre-check" aria-hidden="true">{on&&<Check size={14}/>}</span></span>
   {card.description&&<span className="djf-genre-desc">{card.description}</span>}
  </button>;})}</div></>;
 };
 const chipList=(items,selected,onToggle,empty)=>items.length?<div className="djf-chips">{items.map(name=><button type="button" key={name} aria-pressed={selected.includes(name)} onClick={()=>onToggle(name)}>{selected.includes(name)&&<Check size={13} aria-hidden="true"/>}{name}</button>)}</div>:<p className="djf-empty">{empty}</p>;
 // Suggested songs: local rows keep half-typed entries; only rows with a song are saved, in order.
 const [rows,setRows]=useState(()=>(music.suggestedSongs||[]).map((item,index)=>({key:`s${index}`,legacy:!item.artist,...item})));
 const [nextKey,setNextKey]=useState(1000);
 const artistOptions=[...(lists?.artists||[]),...rows.map(row=>row.artist||'').filter(Boolean)];
 const validLink=link=>/^https:\/\/\S+$/i.test(String(link||'').trim());
 const commit=next=>{setRows(next);set('music.suggestedSongs',next.filter(row=>!(row.mode==='manual'&&!row.done)&&row.song.trim()&&(row.artist?.trim()||row.legacy)).map(({phase,song,artist,link})=>({phase,song:song.trim(),...(artist?.trim()?{artist:artist.trim()}:{}),...(validLink(link)?{link:link.trim()}:{})})));};
 // A song found on YouTube needs nothing else: its name, artist and link come from the video.
 const addFound=entry=>{if(rows.length>=30)return;setNextKey(value=>value+1);commit([...rows,{key:`s${nextKey}`,phase:'',...entry}]);};
 const patchRow=(key,patch)=>commit(rows.map(row=>row.key===key?{...row,...patch}:row));
 const addRow=mode=>{setNextKey(value=>value+1);setRows(current=>[...current,{key:`s${nextKey}`,phase:'',song:'',artist:'',mode}]);};
 // Several songs can share one moment: a follower row repeats the moment above it (same non-empty moment, or added with "another song").
 const follows=index=>index>0&&(rows[index].follows||(rows[index].phase.trim()!==''&&rows[index].phase.trim().toLowerCase()===rows[index-1].phase.trim().toLowerCase()));
 const runEnd=index=>{let end=index;while(end+1<rows.length&&follows(end+1))end+=1;return end;};
 const setMoment=(index,phase)=>commit(rows.map((row,at)=>at>=index&&at<=runEnd(index)?{...row,phase}:row));
 const addAfter=(index,mode)=>{setNextKey(value=>value+1);const end=runEnd(index);setRows(current=>{const next=[...current];next.splice(end+1,0,{key:`s${nextKey}`,phase:rows[index].phase,song:'',artist:'',mode,follows:true});return next;});};
 const OTHER='__other';
 const momentSelect=row=>momentNames.includes(row.phase)?row.phase:(row.phase||row.customMoment)?OTHER:'';
 const pickMoment=(s,value)=>commit(rows.map((row,at)=>at>=s&&at<=runEnd(s)?{...row,phase:value===OTHER?(momentNames.includes(row.phase)?'':row.phase):value,customMoment:value===OTHER}:row));
 // A moment can be used by one card only; its songs all go inside that card.
 const norm=value=>String(value||'').trim().toLowerCase();
 const usedElsewhere=(s,value)=>norm(value)!==''&&rows.some((row,at)=>!follows(at)&&at!==s&&norm(row.phase)===norm(value));
 const moveGroup=(s,step)=>{const groups=[];rows.forEach((_,at)=>{if(follows(at))groups[groups.length-1].push(rows[at]);else groups.push([rows[at]]);});const g=groups.findIndex(list=>list[0]===rows[s]),to=g+step;if(g<0||to<0||to>=groups.length)return;[groups[g],groups[to]]=[groups[to],groups[g]];commit(groups.flat());};
 const removeDj=()=>{ctx.removeService('dj');onClose();};
 // The sections are collected here, then shown as a left column (the list) and a main component (the open section).
 const cards=[];
 const section=(number,title,hint,children,action=null)=>{cards.push({number,title,hint,children,action});return null;};
 return <div className="djf" dir={ar?'rtl':'ltr'}>
  {note&&<p className="djf-note" role="status" data-loading-draft={!ctx?.cloudReady?'':undefined}>{note}</p>}
  <div className="djf-body"><fieldset className="djf-fields" disabled={!canEdit}>
   <div hidden className="djf-collect">
   <div className="djf-col">
    {section(1,tr('Language & dialect','اللغة واللهجة'),tr('Tell us which languages your guests love to hear. Choose one or more; the first is your main language and gets the most airtime. Then pick a dialect for each language where there is one, so the vocals, wording and mood feel like home to your crowd.','أخبرنا بأي لغات يحب ضيوفك أن يسمعوا. اختر لغة أو أكثر؛ الأولى هي لغتك الرئيسية وتحظى بأكبر وقت. ثم اختر لهجة لكل لغة إن وُجدت، لتبدو الأغاني والكلمات والأجواء قريبة من جمهورك.'),loadNote||<>
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
    {section(2,tr('Music genres','الأنواع الموسيقية'),tr('What should the dance floor sound like? Pick every style you would enjoy, from classics to the latest hits. Your choices guide the mix, the energy curve of the night and the tracks we reach for first. You can choose several.','كيف تريد أن تبدو حلبة الرقص؟ اختر كل الأنماط التي تستمتع بها، من الكلاسيكيات إلى أحدث الأغاني. اختياراتك ترشد المزج ومنحنى طاقة السهرة والأغاني التي نبدأ بها. يمكنك اختيار أكثر من نمط.'),loadNote||genreGrid())}
   </div>
   <div className="djf-col">
    {section(3,tr('Songs for event moments','أغانٍ للحظات الفعالية'),tr('Every event has key moments: the entrance, the first dance, dinner, the cake, the last song. Add a moment, then add the songs you want for it, from YouTube or by hand with the song name and artist. One moment can hold several songs, and each moment is used once.','لكل فعالية لحظات أساسية: الدخول، الرقصة الأولى، العشاء، الكعكة، الأغنية الأخيرة. أضف لحظة ثم أضف الأغاني التي تريدها لها، من يوتيوب أو يدوياً باسم الأغنية والفنان. يمكن للحظة الواحدة أن تضم عدة أغاني، وتُستخدم كل لحظة مرة واحدة.'),<>
     {rows.length>0&&<ol className="djf-songs">{rows.map((first,s)=>{if(follows(s))return null;const end=runEnd(s),group=rows.slice(0,s+1).filter((_,at)=>!follows(at)).length,members=rows.slice(s,end+1);
      return <li key={first.key} className="djf-moment">
      <div className="djf-moment-head"><span className="djf-num" aria-hidden="true">{group}</span><span className="djf-moment-pick"><select className="djf-input" aria-label={tr('Moment','اللحظة')} value={momentSelect(first)} onChange={event=>pickMoment(s,event.target.value)}><option value="">{tr('Choose a moment','اختر لحظة')}</option>{momentNames.map(name=><option key={name} value={name} disabled={usedElsewhere(s,name)}>{name}{usedElsewhere(s,name)?tr(' (already added)',' (مضافة بالفعل)'):''}</option>)}<option value={OTHER}>{tr('Other (write my own)','أخرى (أكتب لحظتي)')}</option></select>{momentSelect(first)===OTHER&&<><input className="djf-input" type="text" maxLength={80} autoFocus={!first.phase} value={first.phase} placeholder={tr('Your moment','لحظتك')} aria-label={tr('Your own moment','لحظتك الخاصة')} aria-invalid={usedElsewhere(s,first.phase)} onChange={event=>setMoment(s,event.target.value)} onBlur={()=>{if(usedElsewhere(s,first.phase))setMoment(s,'');}}/>{usedElsewhere(s,first.phase)&&<small className="djf-unsaved" role="alert">{tr('This moment is already added. Add the song to that moment instead.','هذه اللحظة مضافة بالفعل. أضف الأغنية إلى تلك اللحظة.')}</small>}</>}</span>
       <span className="djf-row-actions"><button type="button" aria-label={tr('Move up','تحريك للأعلى')} disabled={s===0} onClick={()=>moveGroup(s,-1)}><ArrowUp size={14} aria-hidden="true"/></button><button type="button" aria-label={tr('Move down','تحريك للأسفل')} disabled={end===rows.length-1} onClick={()=>moveGroup(s,1)}><ArrowDown size={14} aria-hidden="true"/></button><button type="button" aria-label={tr('Remove moment','إزالة اللحظة')} onClick={()=>commit(rows.filter((_,at)=>at<s||at>end))}><Trash2 size={14} aria-hidden="true"/></button></span></div>
      <ol className="djf-moment-songs">{members.map(row=><li key={row.key} className="djf-moment-song">
       {row.mode==='choose'?<div className="djf-choose"><span>{tr('Add a song to this moment','أضف أغنية إلى هذه اللحظة')}</span><button type="button" className="djf-add" onClick={()=>patchRow(row.key,{mode:'search'})}>{tr('Search YouTube','بحث يوتيوب')}</button><button type="button" className="djf-add" onClick={()=>patchRow(row.key,{mode:'manual'})}>{tr('Add manually','إضافة يدوية')}</button></div>:row.mode==='search'&&(!row.song||row.editing)?<><YouTubeSongSearch ar={ar} token={ctx?.token} signedIn={Boolean(ctx?.signedIn)} disabled={!canEdit} initial={row.yt} onState={yt=>setRows(current=>current.map(r=>r.key===row.key?{...r,yt}:r))} onPick={entry=>patchRow(row.key,{...entry,editing:false})}/>{row.editing&&<button type="button" className="djf-song-edit" onClick={()=>patchRow(row.key,{editing:false})}>{tr('Cancel','إلغاء')}</button>}</>:row.song&&row.artist&&!(row.mode==='manual'&&!row.done)&&(isYouTubeLink(row.link)||row.done)?<div className="djf-song-found"><strong>{row.song}</strong><small>{row.artist}</small>{validLink(row.link)&&row.link&&<a href={row.link} target="_blank" rel="noopener noreferrer">{isYouTubeLink(row.link)?'YouTube':tr('Link','رابط')}</a>}<button type="button" className="djf-song-edit" onClick={()=>patchRow(row.key,isYouTubeLink(row.link)&&row.mode!=='manual'?{mode:'search',editing:true}:{mode:'manual',done:false})}>{tr('Edit','تعديل')}</button></div>:<>
       <input className="djf-input" type="text" maxLength={200} required value={row.song} placeholder={tr('Song name','اسم الأغنية')} aria-label={tr('Song name','اسم الأغنية')} onChange={event=>patchRow(row.key,{song:event.target.value})}/>
       <input className="djf-input" type="text" maxLength={80} value={row.artist||''} placeholder={tr('Artist name','اسم الفنان')} aria-label={tr('Artist','الفنان')} onChange={event=>patchRow(row.key,{artist:event.target.value})}/>
       <input className="djf-input djf-link-input" type="url" inputMode="url" maxLength={2048} value={row.link||''} placeholder={tr('Link (optional) https://…','رابط (اختياري) https://…')} aria-label={tr('Link to the song','رابط الأغنية')} aria-invalid={Boolean(row.link)&&!validLink(row.link)} onChange={event=>patchRow(row.key,{link:event.target.value})}/>{row.mode==='manual'&&<button type="button" className="djf-add djf-song-submit" disabled={!row.song.trim()||!row.artist?.trim()||(Boolean(row.link)&&!validLink(row.link))} onClick={()=>patchRow(row.key,{done:true})}><Plus size={14} aria-hidden="true"/>{tr('Add song','إضافة الأغنية')}</button>}{row.mode==='manual'&&(row.song.trim()||row.artist?.trim())&&<small className="djf-unsaved" role="status">{tr('Not added yet: click Add song to save it to your booking.','لم تُضف بعد: اضغط إضافة الأغنية لحفظها في حجزك.')}</small>}</>}
       {members.length>1&&<button type="button" className="djf-song-x" aria-label={tr('Remove song','إزالة الأغنية')} onClick={()=>commit(rows.filter(item=>item.key!==row.key))}><Trash2 size={13} aria-hidden="true"/></button>}
      </li>)}</ol>
      {members.some(row=>row.song&&row.artist&&!(row.mode==='manual'&&!row.done))&&<div className="djf-more-songs"><button type="button" className="djf-add" disabled={rows.length>=30} onClick={()=>addAfter(s,'search')}><Plus size={14} aria-hidden="true"/>{tr('Another song · YouTube','أغنية أخرى · يوتيوب')}</button><button type="button" className="djf-add" disabled={rows.length>=30} onClick={()=>addAfter(s,'manual')}><Plus size={14} aria-hidden="true"/>{tr('Another song · manual','أغنية أخرى · يدوياً')}</button></div>}
     </li>;})}</ol>}
    </>,<div className="djf-song-adders"><button type="button" className="djf-add" disabled={rows.length>=30} onClick={()=>addRow('choose')}><Plus size={15} aria-hidden="true"/>{tr('Add moment','إضافة لحظة')}</button></div>)}
    {section(4,tr('Favourite songs','الأغاني المفضلة'),tr('The songs you simply cannot do without, whatever the moment. Search YouTube and pick them, or add them by hand with the song name and artist. We will build the set around them and make sure they are played.','الأغاني التي لا غنى عنها مهما كانت اللحظة. ابحث عنها في يوتيوب واختَرها، أو أضفها يدوياً باسم الأغنية والفنان. سنبني الأمسية حولها ونحرص على تشغيلها.'),<FavouriteSongsEditor ar={ar} token={ctx?.token} signedIn={Boolean(ctx?.signedIn)} disabled={!canEdit} value={music.favouriteSongs} onChange={next=>set('music.favouriteSongs',next)}/>)}
    {section(5,tr('Favourite artists','الفنانون المفضلون'),tr('Name the artists whose sound you want to hear more of. Type each name and press Enter. They help us understand your taste, so we can play your favourites and similar voices you may not have thought of.','اذكر الفنانين الذين تريد سماع المزيد من أسلوبهم. اكتب كل اسم واضغط Enter. تساعدنا أسماؤهم على فهم ذوقك، لنقدم مفضلاتك وأصواتاً مشابهة قد لا تكون فكرت بها.'),<>
     <TagInput ar={ar} disabled={!canEdit} label={tr('Favourite artists','الفنانون المفضلون')} placeholder={tr('Type an artist and press Enter…','اكتب اسم فنان واضغط Enter…')} values={asList(music.favouriteArtists)} onChange={next=>set('music.favouriteArtists',next)}/>
         </>)}
   </div>
  </div>
   {(()=>{
    const counts={1:chosenLanguages.length,2:genres.length,3:rows.length,4:favouriteSongEntries(music.favouriteSongs).length,5:asList(music.favouriteArtists).length};
    // Every section is its own card, one under the other (no tabs): language & dialect, genres, event moments, favourite songs, favourite artists.
    return <div className="djf-cards">
     {cards.map(card=><BookingStep key={card.number} number={9+card.number} className="djf-step" title={card.title} copy={card.hint||''} cardTitle={<><FieldCode k={MUSIC_PREFERENCE_ATOMS[card.number]}/>{card.title}</>}><div id={`djf-section-${card.number}`} className="djf-card-body">{card.action&&<div className="djf-card-action">{card.action}</div>}{card.children}</div></BookingStep>)}
    </div>;
   })()}
  </fieldset></div>
 </div>;
}
