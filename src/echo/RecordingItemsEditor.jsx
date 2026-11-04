import {useContext,useEffect,useRef,useState} from 'react';
import {Plus,Trash2,Sparkles,Pencil} from 'lucide-react';
import {ReferenceField} from './OntologyFields';
import {CreateReferenceContext} from './CreateReferenceContext';
import TimedLyricsEditor from './TimedLyricsEditor';
import {blankItemLyrics,blankRecordingItem,transcriptForItem} from '../lib/recordingItems';
import CreditReferencePicker from './CreditReferencePicker';
import './recordingItems.css';

function MusicianCredits({label,value,onChange,vocabulary}){
 const createReference=useContext(CreateReferenceContext);
 const [draft,setDraft]=useState({artistId:'',instrumentId:''}),[editingIndex,setEditingIndex]=useState(null);
 const people=vocabulary.filter(row=>!row.archived&&['artist','musician'].includes(row.kind)).sort((a,b)=>a.name.localeCompare(b.name));
 const instruments=vocabulary.filter(row=>!row.archived&&row.kind==='instrument').sort((a,b)=>a.name.localeCompare(b.name));
 const personName=id=>people.find(row=>row.id===id)?.name||'Unknown person';
 const instrumentName=id=>instruments.find(row=>row.id===id)?.name||'Instrument not specified';
 const duplicate=value.some((credit,index)=>index!==editingIndex&&credit.artistId===draft.artistId&&credit.instrumentId===draft.instrumentId);
 const reset=()=>{setDraft({artistId:'',instrumentId:''});setEditingIndex(null);};
 const commit=()=>{
  if(!draft.artistId||!draft.instrumentId||duplicate)return;
  const credit={...(editingIndex===null?{detail:''}:value[editingIndex]),...draft};
  onChange(editingIndex===null?[...value,credit]:value.map((row,index)=>index===editingIndex?credit:row));reset();
 };
 const remove=index=>{onChange(value.filter((_,i)=>i!==index));if(editingIndex===index)reset();else if(editingIndex!==null&&editingIndex>index)setEditingIndex(editingIndex-1);};
 return <fieldset className="recording-item-credits recording-musician-credits"><legend>{label}</legend>
  <p className="musician-pair-help">Each entry links one musician to one instrument.</p>
  {value.length?<ul className="musician-pair-list" aria-label="Musician and instrument entries">{value.map((credit,index)=><li key={index} className={editingIndex===index?'is-editing':''}>
   <span className="musician-pair-avatar" aria-hidden="true">{personName(credit.artistId).slice(0,1).toUpperCase()}</span>
   <div className="musician-pair-identity"><strong>{personName(credit.artistId)}</strong><span>{instrumentName(credit.instrumentId)}</span></div>
   <button type="button" title="Edit musician and instrument" aria-label={`Edit musician credit ${index+1}`} onClick={()=>{setDraft({artistId:credit.artistId,instrumentId:credit.instrumentId||''});setEditingIndex(index);}}><Pencil size={14}/></button>
   <button type="button" title="Remove musician and instrument" aria-label={`Remove musician credit ${index+1}`} onClick={()=>remove(index)}><Trash2 size={14}/></button>
  </li>)}</ul>:<p className="recording-credits-empty">No musicians added yet.</p>}
  <div className="musician-pair-composer" role="group" aria-label={editingIndex===null?'Add musician and instrument':'Edit musician and instrument'}>
   <div className="musician-pair-fields">
    <CreditReferencePicker label="Person" value={draft.artistId} rows={people} onChange={artistId=>setDraft(current=>({...current,artistId,instrumentId:people.find(row=>row.id===artistId)?.instrumentId||current.instrumentId}))} createLabel="Add new person" onCreate={createReference?name=>createReference('musician',artistId=>setDraft(current=>({...current,artistId})),name):undefined}/>
    <CreditReferencePicker label="Instrument" value={draft.instrumentId} rows={instruments} onChange={instrumentId=>setDraft(current=>({...current,instrumentId}))} createLabel="Add new instrument" onCreate={createReference?name=>createReference('instrument',instrumentId=>setDraft(current=>({...current,instrumentId})),name):undefined}/>
   </div>
   <div className="musician-pair-footer"><span>{duplicate?'This musician and instrument are already added.':draft.artistId&&draft.instrumentId?`${personName(draft.artistId)} · ${instrumentName(draft.instrumentId)}`:'Choose a musician and their instrument.'}</span><div>{editingIndex!==null&&<button type="button" onClick={reset}>Cancel</button>}<button className="musician-pair-submit" type="button" disabled={!draft.artistId||!draft.instrumentId||duplicate||(editingIndex===null&&value.length>=100)} onClick={commit}><Plus size={14}/>{editingIndex===null?'Add musician':'Update musician'}</button></div></div>
  </div>
 </fieldset>;
}

function ItemCredits({label,value,onChange,vocabulary,musicians=false}){
 const createReference=useContext(CreateReferenceContext);
 const rows=vocabulary.filter(row=>!row.archived&&(musicians?['artist','musician'].includes(row.kind):(row.kind==='artist'||label.toLowerCase().startsWith('lyricist')&&row.kind==='lyricist'))).sort((a,b)=>a.name.localeCompare(b.name));
 const choosePerson=(index,artistId)=>onChange(value.map((row,i)=>i===index?{...row,artistId}:row));
 const singular=label.toLowerCase().replace(/ credits$/,' credit');
 if(musicians)return <MusicianCredits label={label} value={value} onChange={onChange} vocabulary={vocabulary}/>;
 return <fieldset className="recording-item-credits">
  <legend>{label}</legend>
  <div className="recording-credit-toolbar"><span>{value.length} {value.length===1?'person':'people'}</span><button type="button" aria-label={`Add ${singular}`} onClick={()=>onChange([...value,{artistId:'',detail:'',...(musicians?{instrumentId:null}:{})}])} disabled={value.length>=100}><Plus size={14}/>Add</button></div>
  {!value.length&&<p className="recording-credits-empty">No credits added.</p>}
  <div className="recording-credit-list">{value.map((credit,index)=><div className="recording-item-credit" key={index}>
   <span className="recording-credit-number" aria-hidden="true">{String(index+1).padStart(2,'0')}</span>
   <div className="recording-credit-person"><CreditReferencePicker label="Person" placeholder="Choose a person" value={credit.artistId} rows={rows} onChange={id=>choosePerson(index,id)} createLabel="Add new person" onCreate={createReference?name=>createReference(musicians?'musician':label.toLowerCase().startsWith('lyricist')?'lyricist':'artist',id=>choosePerson(index,id),name):undefined}/></div>
   <button className="recording-credit-remove" type="button" title="Remove credit" aria-label={`Remove ${label.toLowerCase()} ${index+1}`} onClick={()=>onChange(value.filter((_,i)=>i!==index))}><Trash2 size={15}/></button>
   <details className="recording-credit-detail" open={credit.detail?true:undefined}><summary>Credit detail <span>optional</span></summary><label><span>Credit detail</span><input aria-label="Credit detail" maxLength={240} value={credit.detail} placeholder={musicians?'e.g. Guitar, piano or arrangement':'e.g. Lead vocals or adaptation'} onChange={event=>onChange(value.map((row,i)=>i===index?{...row,detail:event.target.value}:row))}/></label></details>
  </div>)}</div>
 </fieldset>;
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
 return <article className="recording-item" aria-label={`Recording item ${index+1}`}><header><h4>Item {index+1}</h4>{multiple&&<button type="button" disabled={Boolean(busy)} onClick={onRemove} aria-label={`Remove item ${index+1}`}><Trash2 size={17}/></button>}</header><fieldset disabled={Boolean(busy)}><div className="recording-item-identity"><label>Item name<input required maxLength={240} value={item.name} onChange={e=>onChange({...item,name:e.target.value})}/></label><label>Release year<input type="number" min="1000" max="2100" value={item.releaseYear??''} onChange={e=>onChange({...item,releaseYear:e.target.value===''?null:Number(e.target.value)})}/></label></div>
 {item.hasLyrics&&l&&<div className="recording-item-lyrics"><div className="recording-item-identity"><ReferenceField label="Language" kind="language" vocabulary={vocabulary} value={l.languageId} onChange={id=>changeLyrics({languageId:id,dialectId:null})}/><ReferenceField label="Dialect" kind="dialect" parentId={l.languageId||'__choose_language__'} vocabulary={vocabulary} value={l.dialectId} onChange={id=>changeLyrics({dialectId:id})}/></div>
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
 {multiple&&<><p>Set this item’s range in the recording. AI processes the recording audio; only complete lines inside this range are added to this item.</p><div className="recording-item-identity"><label>Start · seconds<input type="number" min="0" max={duration||86400} step="0.01" value={l.startSec??''} onChange={e=>changeLyrics({startSec:e.target.value===''?null:Number(e.target.value),timedLyrics:null})}/></label><label>End · seconds<input type="number" min="0.01" max={duration||86400} step="0.01" value={l.endSec??''} onChange={e=>changeLyrics({endSec:e.target.value===''?null:Number(e.target.value),timedLyrics:null})}/></label></div></>}
 {!audioUrl&&<p>Attach recording audio to generate timed lyrics.</p>}
 {l.timedLyrics?<TimedLyricsEditor expanded value={l.timedLyrics} onChange={timing=>changeLyrics({timedLyrics:timing,text:timing?timing.lines.map(line=>line.text).join('\n'):l.text})}/>:<label>Lyrics text<textarea rows={4} maxLength={100000} value={l.text} onChange={e=>changeLyrics({text:e.target.value})}/></label>}</section>
 <section className="recording-item-ai"><header><h5>Lyrics concepts · AI</h5><button type="button" disabled={l.text.trim().length<20} onClick={()=>run('Generating concepts…',async signal=>{const snapshot=latest.current;const result=await onGenerateConcept(snapshot.item.lyrics.text,signal);if(!signal.aborted&&latest.current.item.hasLyrics){const current=latest.current.item;onChange({...current,lyrics:{...current.lyrics,concept:result.concept,sentenceConcept:result.summary}});}})}><Sparkles size={15}/>Generate concepts</button></header><label>One-word / phrasal concept<input maxLength={60} value={l.concept} onChange={e=>changeLyrics({concept:e.target.value})}/></label><label>Sentence concept<textarea rows={2} maxLength={900} value={l.sentenceConcept} onChange={e=>changeLyrics({sentenceConcept:e.target.value})}/></label></section>
 <ItemCredits label="Lyricist credit" value={l.lyricistCredits} vocabulary={vocabulary} onChange={rows=>changeLyrics({lyricistCredits:rows})}/><ItemCredits label="Vocalist credit" value={l.vocalistCredits} vocabulary={vocabulary} onChange={rows=>changeLyrics({vocalistCredits:rows})}/></div>}
 <ItemCredits label="Musician credit" musicians value={item.musicianCredits} vocabulary={vocabulary} onChange={rows=>onChange({...item,musicianCredits:rows})}/>
 </fieldset>{busy&&<p role="status">{busy}</p>}{error&&<p role="alert">{error}</p>}</article>;
}
export default function RecordingItemsEditor({items,amount,onChange,withLyrics=false,...props}){
 const multiple=amount==='MULTIPLE';
 const [editingId,setEditingId]=useState(null);
 const [selectedId,setSelectedId]=useState(()=>items[0]?.id||null);
 const selected=items.find(item=>item.id===selectedId);
 const editingIndex=items.findIndex(item=>item.id===editingId);
 const edit=item=>{setSelectedId(item.id);setEditingId(item.id);};
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
   <label className="recording-atom-release-year">Atom release year<input aria-label="Atom release year" type="number" min="1000" max="2100" value={item.releaseYear??''} onChange={event=>update({releaseYear:event.target.value===''?null:Number(event.target.value)})}/></label>
   <div className="recording-individual-credits">
    {withLyrics&&<><ItemCredits label="Lyricist credits" value={lyrics.lyricistCredits} vocabulary={props.vocabulary} onChange={rows=>update({lyrics:{...lyrics,lyricistCredits:rows}})}/><ItemCredits label="Vocalist credits" value={lyrics.vocalistCredits} vocabulary={props.vocabulary} onChange={rows=>update({lyrics:{...lyrics,vocalistCredits:rows}})}/></>}
    <ItemCredits label="Musician credits" musicians value={item.musicianCredits} vocabulary={props.vocabulary} onChange={rows=>update({musicianCredits:rows})}/>
   </div>
  </section>;
 }
 return <section className="recording-items-editor" aria-label="Recording atoms">
  <header><div><h3>Recording atoms</h3><p>Select an atom to edit or remove it.</p></div>
   <div className="recording-atoms-toolbar" role="toolbar" aria-label="Recording atoms controls">
    <button type="button" disabled={items.length>=100} onClick={add}><Plus size={16}/>Add atom</button>
    <button type="button" disabled={!selected} onClick={()=>edit(selected)}><Pencil size={16}/>Edit</button>
    <button type="button" disabled={!selected||(!multiple&&items.length<=1)} onClick={()=>remove(selected.id)}><Trash2 size={16}/>Delete</button>
   </div>
  </header>
  {!multiple&&items.length>1&&<p role="alert">This recording has several atoms. Choose Multiple or remove extra atoms before saving.</p>}
  <div className="recording-atoms-table-wrap"><table className="recording-atoms-table">
   <thead><tr><th>Atom</th><th>Release year</th><th>Lyrics</th><th>Credits</th></tr></thead>
   <tbody>{items.map(item=><tr key={item.id} tabIndex={0} aria-selected={item.id===selectedId} onClick={()=>setSelectedId(item.id)} onDoubleClick={()=>edit(item)} onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();setSelectedId(item.id);}}}>
    <td>{item.name||<span className="recording-atom-empty">Untitled atom</span>}</td><td>{item.releaseYear??'—'}</td><td>{item.hasLyrics?'Yes':'No'}</td><td>{item.musicianCredits.length+((item.lyrics?.lyricistCredits?.length||0)+(item.lyrics?.vocalistCredits?.length||0))}</td>
   </tr>)}</tbody>
  </table></div>
  {editingIndex>=0&&<div className="recording-atom-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setEditingId(null);}}><section role="dialog" aria-modal="true" aria-label={`Edit recording atom ${editingIndex+1}`}><header><h3>{items[editingIndex].name||`Recording atom ${editingIndex+1}`}</h3><button type="button" onClick={()=>setEditingId(null)}>Close</button></header><RecordingItem key={items[editingIndex].id} item={items[editingIndex]} index={editingIndex} multiple={multiple||items.length>1} {...props} onChange={updated=>onChange(items.map(row=>row.id===updated.id?updated:row))} onRemove={()=>remove(items[editingIndex].id)}/></section></div>}
 </section>;
}

export function SavedRecordingItems({items,vocabulary}){
 const people=rows=>rows.map(credit=>[vocabulary.find(row=>row.id===credit.artistId)?.name||credit.artistId,credit.instrumentId?vocabulary.find(row=>row.id===credit.instrumentId)?.name:''].filter(Boolean).join(' · ')).join(', ')||'Not specified';
 const name=id=>vocabulary.find(row=>row.id===id)?.name||'Not specified';
 return <section className="recording-items-editor" aria-label="Saved recording items">{items.map((item,index)=><article className="recording-item" key={item.id}><h4>{index+1}. {item.name}</h4><dl><dt>Release year</dt><dd>{item.releaseYear??'Not specified'}</dd><dt>With lyrics?</dt><dd>{item.hasLyrics?'Yes':'No'}</dd>{item.hasLyrics&&item.lyrics&&<><dt>Language</dt><dd>{name(item.lyrics.languageId)}</dd><dt>Dialect</dt><dd>{name(item.lyrics.dialectId)}</dd><dt>One-word / phrasal concept</dt><dd>{item.lyrics.concept||'Not specified'}</dd><dt>Sentence concept</dt><dd>{item.lyrics.sentenceConcept||'Not specified'}</dd><dt>Lyricists</dt><dd>{people(item.lyrics.lyricistCredits)}</dd><dt>Vocalists</dt><dd>{people(item.lyrics.vocalistCredits)}</dd></>}<dt>Musicians</dt><dd>{people(item.musicianCredits)}</dd></dl>{item.hasLyrics&&item.lyrics?.timedLyrics?.lines?.length?<ol>{item.lyrics.timedLyrics.lines.map((line,i)=><li key={i}>{line.start}–{line.end}s · {line.text}</li>)}</ol>:item.hasLyrics&&item.lyrics?.text?<p style={{whiteSpace:'pre-wrap'}}>{item.lyrics.text}</p>:null}</article>)}</section>;
}
