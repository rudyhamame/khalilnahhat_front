import {useContext,useEffect,useRef,useState} from 'react';
import {Plus,Trash2,Sparkles,Pencil,ChevronLeft,ChevronRight} from 'lucide-react';
import {ReferenceField} from './OntologyFields';
import {CreateReferenceContext} from './CreateReferenceContext';
import TimedLyricsEditor from './TimedLyricsEditor';
import {blankItemLyrics,blankRecordingItem,transcriptForItem} from '../lib/recordingItems';
import RecordingAtomElements from './RecordingAtomElements';
import MultipleReferences from './MultipleReferences';
import {atomRange} from '../lib/recordingAtoms';
import {trimClock} from '../lib/audioTrim';
import './recordingItems.css';

export function AtomReleaseDate({item,onChange,inline=false}){
 return <label className={inline?'recording-atom-release-year':undefined}>Atom release date<input aria-label="Atom release date" type="date" min="1000-01-01" max="2100-12-31" value={item.releaseDate||''} onChange={event=>{const releaseDate=event.target.value;onChange({releaseDate,releaseYear:releaseDate?Number(releaseDate.slice(0,4)):null});}}/>{!item.releaseDate&&item.releaseYear!=null&&<small>Stored year: {item.releaseYear}</small>}</label>;
}

function AtomAudioRange({item,duration,onChange}){
 const range=item.audioRange||atomRange(item);
 const update=(field,value)=>{
  const next={startSec:range?.startSec??null,endSec:range?.endSec??null,[field]:value===''?null:Number(value)};
  onChange({...item,audioRange:next.startSec==null&&next.endSec==null?undefined:next,...(item.lyrics?{lyrics:{...item.lyrics,...next,timedLyrics:null}}:{})});
 };
 return <div className="recording-item-identity recording-atom-audio-range"><label>Atom start · seconds<input type="number" min="0" max={duration||86400} step="0.01" value={range?.startSec??item.lyrics?.startSec??''} onChange={event=>update('startSec',event.target.value)}/></label><label>Atom end · seconds<input type="number" min="0.01" max={duration||86400} step="0.01" value={range?.endSec??item.lyrics?.endSec??''} onChange={event=>update('endSec',event.target.value)}/></label></div>;
}

function MusicianCredits({label,value,onChange,vocabulary}){
 const createReference=useContext(CreateReferenceContext);
 const pairId=credit=>JSON.stringify([credit.artistId,credit.instrumentId||null]);
 const entries=new Map();
 const addEntry=credit=>{
  const person=vocabulary.find(row=>row.id===credit.artistId),instrument=vocabulary.find(row=>row.id===credit.instrumentId);
  const name=[person?.name||credit.artistId,instrument?.name||(credit.instrumentId?'Unknown instrument':'Instrument not specified')].join(' · ');
  entries.set(pairId(credit),{id:pairId(credit),name,credit});
 };
 for(const person of vocabulary.filter(row=>!row.archived&&row.kind==='musician'))addEntry({artistId:person.id,instrumentId:person.instrumentId||null,detail:''});
 // Keep existing pairs and their details even if the catalog dependency has changed.
 for(const credit of value)addEntry(credit);
 const rows=[...entries.values()].sort((a,b)=>a.name.localeCompare(b.name));
 return <div className="recording-musician-select"><MultipleReferences label={label} rows={rows} value={value.map(pairId)} onChange={ids=>onChange(ids.map(id=>entries.get(id).credit))} onCreate={createReference&&value.length<100?name=>createReference('musician',(artistId,person)=>{
  const credit={artistId,instrumentId:person?.instrumentId||null,detail:''};
  if(!value.some(row=>pairId(row)===pairId(credit)))onChange([...value,credit]);
 },name):undefined}/></div>;
}

function ItemCredits({label,kind,value,onChange,vocabulary}){
 const createReference=useContext(CreateReferenceContext);
 const entries=new Map(vocabulary.filter(row=>!row.archived&&(row.kind===kind||(kind==='lyricist'&&row.kind==='artist'))).map(row=>[row.id,{id:row.id,name:row.name}]));
 for(const credit of value)if(!entries.has(credit.artistId))entries.set(credit.artistId,{id:credit.artistId,name:vocabulary.find(row=>row.id===credit.artistId)?.name||credit.artistId});
 const rows=[...entries.values()].sort((a,b)=>a.name.localeCompare(b.name));
 return <MultipleReferences label={label} rows={rows} value={value.map(credit=>credit.artistId)} onChange={ids=>onChange(ids.map(artistId=>value.find(credit=>credit.artistId===artistId)||{artistId,detail:''}))} onCreate={createReference&&value.length<100?name=>createReference(kind,artistId=>{
  if(!value.some(credit=>credit.artistId===artistId))onChange([...value,{artistId,detail:''}]);
 },name):undefined}/>;
}

function LyricsDetailsSection({children,className=''}){
 const frame=useRef(0);
 useEffect(()=>()=>cancelAnimationFrame(frame.current),[]);
 const reveal=event=>{
  const section=event.currentTarget;
  const previous=event.type==='focus'?event.relatedTarget:document.activeElement;
  if(previous&&section.contains(previous))return;
  cancelAnimationFrame(frame.current);
  frame.current=requestAnimationFrame(()=>{
   let container=section.parentElement;
   while(container&&!/(auto|scroll)/.test(getComputedStyle(container).overflowY))container=container.parentElement;
   if(!container)return;
   const top=container.scrollTop+section.getBoundingClientRect().top-container.getBoundingClientRect().top-16;
   container.scrollTo({top:Math.max(0,top),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
  });
 };
 return <section className={`recording-lyrics-details ${className}`} aria-label="Lyrics details" onFocusCapture={reveal} onPointerDown={reveal}><h3>Lyrics details</h3>{children}</section>;
}

function LyricsLanguageFields({lyrics,vocabulary,onChange}){
 const languageIds=lyrics.languageIds??(lyrics.languageId?[lyrics.languageId]:[]);
 const dialectIds=lyrics.dialectIds??(lyrics.dialectId?[lyrics.dialectId]:[]);
 const dialects=vocabulary.filter(row=>row.kind!=='dialect'||languageIds.length&&(!row.parentId||languageIds.includes(row.parentId)));
 const changeLanguages=ids=>{
  const kept=dialectIds.filter(id=>{const row=vocabulary.find(row=>row.id===id);return ids.length&&row&&(!row.parentId||ids.includes(row.parentId));});
  onChange({...lyrics,languageIds:ids,languageId:ids[0]||null,dialectIds:kept,dialectId:kept[0]||null});
 };
 return <div className="recording-atom-elements"><ReferenceField multiple label="Languages" kind="language" vocabulary={vocabulary} value={languageIds} onChange={changeLanguages}/><ReferenceField multiple label="Dialects" kind="dialect" vocabulary={dialects} value={dialectIds} allowCreate={languageIds.length>0} onChange={ids=>onChange({...lyrics,dialectIds:ids,dialectId:ids[0]||null})}/></div>;
}

function LyricsConceptFields({lyrics,onChange}){
 return <div className="recording-lyrics-concepts"><label>Concept title <small>One word or short phrase</small><input maxLength={60} value={lyrics.concept||''} placeholder="e.g. Longing" onChange={event=>onChange({...lyrics,concept:event.target.value})}/></label><label>Concept paragraph<textarea rows={3} maxLength={900} value={lyrics.sentenceConcept||''} placeholder="Describe the central idea, themes, and mood of the lyrics…" onChange={event=>onChange({...lyrics,sentenceConcept:event.target.value})}/></label></div>;
}

function LyricCredits({lyrics,vocabulary,onChange}){
 return <div className="recording-lyrics-credit-fields"><ItemCredits kind="lyricist" label="Lyricist credits" value={lyrics.lyricistCredits} vocabulary={vocabulary} onChange={lyricistCredits=>onChange({...lyrics,lyricistCredits})}/><ItemCredits kind="artist" label="Vocalist credits" value={lyrics.vocalistCredits} vocabulary={vocabulary} onChange={vocalistCredits=>onChange({...lyrics,vocalistCredits})}/></div>;
}

function RecordingItem({item,index,multiple,audioUrl,duration,vocabulary,onChange,onRemove,onGenerateConcept,onTranscribe,onBusyChange}){
 const [busy,setBusy]=useState(''),[error,setError]=useState('');
 const latest=useRef({item,audioUrl});latest.current={item,audioUrl};
 const active=useRef(null);
 useEffect(()=>()=>{active.current?.abort();},[]);
 useEffect(()=>{if(active.current)active.current.abort();},[audioUrl,item.hasLyrics]);
 const l=item.lyrics;
 const changeLyrics=patch=>onChange({...item,lyrics:{...l,...patch}});
 const run=async(kind,operation)=>{
  if(active.current)return;
  const controller=new AbortController();active.current=controller;setBusy(kind);setError('');onBusyChange(1);
  try{await operation(controller.signal);}catch(e){if(!controller.signal.aborted)setError(e.message||'The AI request failed. Your entries were kept.');}
  finally{if(active.current===controller){active.current=null;setBusy('');}onBusyChange(-1);}
 };
 return <article className="recording-item" aria-label={`Recording item ${index+1}`}><header><h4>Item {index+1}</h4>{multiple&&<button type="button" disabled={Boolean(busy)} onClick={onRemove} aria-label={`Remove item ${index+1}`}><Trash2 size={17}/></button>}</header><fieldset disabled={Boolean(busy)}><div className="recording-item-identity"><label>Item name<input required maxLength={240} value={item.name} onChange={e=>onChange({...item,name:e.target.value})}/></label><AtomReleaseDate item={item} onChange={patch=>onChange({...item,...patch})}/></div>
 {multiple&&<AtomAudioRange item={item} duration={duration} onChange={onChange}/>}
 <RecordingAtomElements value={item.sound} vocabulary={vocabulary} onChange={sound=>onChange({...item,sound})}><MusicianCredits label="Recording Musician credits" value={item.musicianCredits} vocabulary={vocabulary} onChange={musicianCredits=>onChange({...item,musicianCredits})}/></RecordingAtomElements>
 {item.hasLyrics&&l&&<LyricsDetailsSection className="recording-item-lyrics"><LyricsLanguageFields lyrics={l} vocabulary={vocabulary} onChange={lyrics=>onChange({...item,lyrics})}/>
 <section className="recording-item-ai"><header><h5>Timed lyrics · AI</h5><button type="button" disabled={!audioUrl} onClick={()=>run('Transcribing…',async signal=>{
  const snapshot=latest.current;const range={startSec:snapshot.item.lyrics.startSec,endSec:snapshot.item.lyrics.endSec};
  if(multiple&&(range.startSec===null||range.endSec===null||range.endSec<=range.startSec))throw Error('Set the start and end seconds for this item before transcribing.');
  const language=vocabulary.find(row=>row.id===snapshot.item.lyrics.languageId)?.isoCode||'';
  const result=await onTranscribe({signal,language});
  if(signal.aborted||latest.current.audioUrl!==snapshot.audioUrl||!latest.current.item.hasLyrics)return;
  const timing=transcriptForItem(result,snapshot.audioUrl,range);
  const current=latest.current.item;
  onChange({...current,lyrics:{...current.lyrics,timedLyrics:timing,text:timing.lines.map(line=>line.text).join('\n')}});
 })}><Sparkles size={15}/>Generate timed lyrics</button></header>
 {multiple&&<p>The atom’s start and end above determine its region on the recording player and which timed lyrics belong to it.</p>}
 {!audioUrl&&<p>Attach recording audio to generate timed lyrics.</p>}
 {l.timedLyrics?<TimedLyricsEditor expanded value={l.timedLyrics} onChange={timing=>changeLyrics({timedLyrics:timing,text:timing?timing.lines.map(line=>line.text).join('\n'):l.text})}/>:<label>Lyrics text<textarea rows={4} maxLength={100000} value={l.text} onChange={e=>changeLyrics({text:e.target.value})}/></label>}</section>
 <section className="recording-item-ai"><header><h5>Lyrics concepts · AI</h5><button type="button" disabled={l.text.trim().length<20} onClick={()=>run('Generating concepts…',async signal=>{const snapshot=latest.current;const result=await onGenerateConcept(snapshot.item.lyrics.text,signal);if(!signal.aborted&&latest.current.item.hasLyrics){const current=latest.current.item;onChange({...current,lyrics:{...current.lyrics,concept:result.concept,sentenceConcept:result.summary}});}})}><Sparkles size={15}/>Generate concepts</button></header><LyricsConceptFields lyrics={l} onChange={lyrics=>onChange({...item,lyrics})}/></section>
 <LyricCredits lyrics={l} vocabulary={vocabulary} onChange={lyrics=>onChange({...item,lyrics})}/>
 </LyricsDetailsSection>}
 </fieldset>{busy&&<p role="status">{busy}</p>}{error&&<p role="alert">{error}</p>}</article>;
}
export default function RecordingItemsEditor({items,amount,onChange,withLyrics=false,...props}){
 const multiple=amount==='MULTIPLE';
 const [editingId,setEditingId]=useState(null);
 const [selectedId,setSelectedId]=useState(()=>items[0]?.id||null);
 const selectedIndex=Math.max(0,items.findIndex(item=>item.id===selectedId));
 const selected=items[selectedIndex];
 const choose=index=>{const item=items[index];if(item){setSelectedId(item.id);props.onSelect?.(item.id);}};
 const editingIndex=items.findIndex(item=>item.id===editingId);
 const edit=item=>{setSelectedId(item.id);setEditingId(item.id);};
 useEffect(()=>{if(props.focusedAtomId&&items.some(item=>item.id===props.focusedAtomId))setSelectedId(props.focusedAtomId);},[props.focusedAtomId,items]);
 const add=()=>{const item={...blankRecordingItem(),hasLyrics:withLyrics,lyrics:withLyrics?blankItemLyrics():null};onChange([...items,item]);edit(item);};
 const remove=id=>{
  const index=items.findIndex(item=>item.id===id);
  const remaining=items.filter(item=>item.id!==id);
  onChange(remaining);
  setSelectedId(remaining[Math.min(index,remaining.length-1)]?.id||null);
  if(editingId===id)setEditingId(null);
 };
 if(!multiple){
  const item=items[0];
  if(!item)return null;
  const update=patch=>onChange(items.map((row,index)=>index===0?{...row,...patch}:row));
  const lyrics=item.lyrics||blankItemLyrics();
  return <section className="recording-items-editor recording-individual-fields" aria-label="Individual recording details">
   {items.length>1&&<p role="alert">This recording contains several atoms. Choose Multiple to manage them before saving.</p>}
   <div className="recording-individual-credits"><RecordingAtomElements value={item.sound} vocabulary={props.vocabulary} onChange={sound=>update({sound})}><MusicianCredits label="Recording Musician credits" value={item.musicianCredits} vocabulary={props.vocabulary} onChange={musicianCredits=>update({musicianCredits})}/></RecordingAtomElements>{withLyrics&&<LyricsDetailsSection><LyricsConceptFields lyrics={lyrics} onChange={lyrics=>update({lyrics})}/><LyricsLanguageFields lyrics={lyrics} vocabulary={props.vocabulary} onChange={lyrics=>update({lyrics})}/><LyricCredits lyrics={lyrics} vocabulary={props.vocabulary} onChange={lyrics=>update({lyrics})}/></LyricsDetailsSection>}
   </div>
  </section>;
 }
 return <section className="recording-items-editor recording-atoms-aside" aria-label="Recording atoms">
  <header><div><h3>Recording atoms</h3><p>Each atom references a segment on the recording timeline.</p></div>
   <div className="recording-atoms-toolbar" role="toolbar" aria-label="Recording atoms controls">
    <button type="button" disabled={items.length>=100} onClick={add}><Plus size={16}/>Add atom</button>
    <button type="button" disabled={!selected} onClick={()=>edit(selected)}><Pencil size={16}/>Edit</button>
    <button type="button" disabled={!selected||(!multiple&&items.length<=1)} onClick={()=>remove(selected.id)}><Trash2 size={16}/>Delete</button>
   </div>
  </header>
  {!multiple&&items.length>1&&<p role="alert">This recording has several atoms. Choose Multiple or remove extra atoms before saving.</p>}
  <nav className="recording-atom-switcher" aria-label="Switch recording atom"><button type="button" aria-label="Previous atom" title="Previous atom" disabled={selectedIndex<=0||!items.length} onClick={()=>choose(selectedIndex-1)}><ChevronLeft size={19}/></button><span aria-live="polite">Atom <strong>{items.length?selectedIndex+1:0}</strong> of {items.length}</span><button type="button" aria-label="Next atom" title="Next atom" disabled={selectedIndex>=items.length-1} onClick={()=>choose(selectedIndex+1)}><ChevronRight size={19}/></button></nav>
  {selected?<article className="recording-atom-summary" key={selected.id}><header><span className="recording-atom-number">{selectedIndex+1}</span><h4>{selected.name||`Atom ${selectedIndex+1}`}</h4></header>{atomRange(selected)?<button type="button" className="recording-atom-segment-link" onClick={()=>props.onSelect?.(selected.id)} title="Seek to this atom on the recording timeline"><span>Timed segment</span><strong>{trimClock(atomRange(selected).startSec)} <span>→</span> {trimClock(atomRange(selected).endSec)}</strong></button>:<p className="recording-atom-range-empty">Set the start and end below to reference this atom on the waveform.</p>}<AtomAudioRange key={selected.id} item={selected} duration={props.duration} onChange={updated=>onChange(items.map(item=>item.id===updated.id?updated:item))}/><dl><div><dt>Release date</dt><dd>{selected.releaseDate||selected.releaseYear||'Not set'}</dd></div><div><dt>Lyrics</dt><dd>{selected.hasLyrics?'With lyrics':'No lyrics'}</dd></div><div><dt>Credits</dt><dd>{selected.musicianCredits.length+(selected.lyrics?.lyricistCredits?.length||0)+(selected.lyrics?.vocalistCredits?.length||0)}</dd></div></dl><button type="button" className="recording-atom-edit-details" onClick={()=>edit(selected)}><Pencil size={14}/>Edit atom details</button></article>:<p>Add an atom or use Detect atoms with AI on the recording timeline.</p>}

  {editingIndex>=0&&<div className="recording-atom-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setEditingId(null);}}><section role="dialog" aria-modal="true" aria-label={`Edit recording atom ${editingIndex+1}`}><header><h3>{items[editingIndex].name||`Recording atom ${editingIndex+1}`}</h3><button type="button" onClick={()=>setEditingId(null)}>Close</button></header><RecordingItem key={items[editingIndex].id} item={items[editingIndex]} index={editingIndex} multiple={multiple||items.length>1} {...props} onChange={updated=>onChange(items.map(row=>row.id===updated.id?updated:row))} onRemove={()=>remove(items[editingIndex].id)}/></section></div>}
 </section>;
}

export function SavedRecordingItems({items,vocabulary}){
 const people=rows=>rows.map(credit=>[vocabulary.find(row=>row.id===credit.artistId)?.name||credit.artistId,credit.instrumentId?vocabulary.find(row=>row.id===credit.instrumentId)?.name:''].filter(Boolean).join(' · ')).join(', ')||'Not specified';
 const name=id=>vocabulary.find(row=>row.id===id)?.name||'Not specified';
 return <section className="recording-items-editor" aria-label="Saved recording items">{items.map((item,index)=><article className="recording-item" key={item.id}><h4>{index+1}. {item.name}</h4><dl><dt>Release date</dt><dd>{item.releaseDate||item.releaseYear||'Not specified'}</dd>{item.sound&&<><dt>Musical keys</dt><dd>{(item.sound.keys??(item.sound.key?[item.sound.key]:[])).join(', ')||'Not specified'}</dd><dt>Rhythms</dt><dd>{(item.sound.rhythmIds??(item.sound.rhythmId?[item.sound.rhythmId]:[])).map(name).join(', ')||'Not specified'}</dd><dt>Genres</dt><dd>{item.sound.genreIds?.map(name).join(', ')||'Not specified'}</dd><dt>Musical influences</dt><dd>{item.sound.influences?.join(', ')||'Not specified'}</dd></>}<dt>With lyrics?</dt><dd>{item.hasLyrics?'Yes':'No'}</dd>{item.hasLyrics&&item.lyrics&&<><dt>Languages</dt><dd>{(item.lyrics.languageIds??(item.lyrics.languageId?[item.lyrics.languageId]:[])).map(name).join(', ')||'Not specified'}</dd><dt>Dialects</dt><dd>{(item.lyrics.dialectIds??(item.lyrics.dialectId?[item.lyrics.dialectId]:[])).map(name).join(', ')||'Not specified'}</dd><dt>Concept title</dt><dd>{item.lyrics.concept||'Not specified'}</dd><dt>Concept paragraph</dt><dd>{item.lyrics.sentenceConcept||'Not specified'}</dd><dt>Lyricists</dt><dd>{people(item.lyrics.lyricistCredits)}</dd><dt>Vocalists</dt><dd>{people(item.lyrics.vocalistCredits)}</dd></>}<dt>Musicians</dt><dd>{people(item.musicianCredits)}</dd></dl>{item.hasLyrics&&item.lyrics?.timedLyrics?.lines?.length?<ol>{item.lyrics.timedLyrics.lines.map((line,i)=><li key={i}>{line.start}–{line.end}s · {line.text}</li>)}</ol>:item.hasLyrics&&item.lyrics?.text?<p style={{whiteSpace:'pre-wrap'}}>{item.lyrics.text}</p>:null}</article>)}</section>;
}
