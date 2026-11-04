import {useEffect,useRef,useState} from 'react';
import {Plus,Trash2,Sparkles} from 'lucide-react';
import {ReferenceField} from './OntologyFields';
import TimedLyricsEditor from './TimedLyricsEditor';
import {blankItemLyrics,blankRecordingItem,transcriptForItem} from '../lib/recordingItems';
import './recordingItems.css';

function ItemCredits({label,value,onChange,vocabulary,musicians=false}){
 const rows=vocabulary.filter(row=>musicians?['artist','musician'].includes(row.kind):row.kind==='artist');
 return <fieldset className="recording-item-credits"><legend>{label}</legend>{value.map((credit,index)=><div className="recording-item-credit" key={index}><label>Person<select aria-label="Person" value={credit.artistId} onChange={e=>onChange(value.map((c,i)=>i===index?{...c,artistId:e.target.value}:c))}><option value="">Choose a person</option>{rows.map(row=><option key={row.id} value={row.id}>{row.name}</option>)}</select></label><label>Credit detail<input maxLength={240} value={credit.detail} onChange={e=>onChange(value.map((c,i)=>i===index?{...c,detail:e.target.value}:c))}/></label><button type="button" aria-label={`Remove ${label.toLowerCase()} ${index+1}`} onClick={()=>onChange(value.filter((_,i)=>i!==index))}><Trash2 size={16}/></button></div>)}<button type="button" onClick={()=>onChange([...value,{artistId:'',detail:''}])} disabled={value.length>=100}><Plus size={15}/>Add {label.toLowerCase()}</button></fieldset>;
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
 return <article className="recording-item" aria-label={`Recording item ${index+1}`}><header><h4>Item {index+1}</h4>{multiple&&<button type="button" disabled={Boolean(busy)} onClick={onRemove} aria-label={`Remove item ${index+1}`}><Trash2 size={17}/></button>}</header><fieldset disabled={Boolean(busy)}><div className="recording-item-identity"><label>Item name<input required maxLength={240} value={item.name} onChange={e=>onChange({...item,name:e.target.value})}/></label><label>Release year<input type="number" min="1000" max="2100" value={item.releaseYear??''} onChange={e=>onChange({...item,releaseYear:e.target.value===''?null:Number(e.target.value)})}/></label><label>With lyrics?<select aria-label="With lyrics?" value={item.hasLyrics?'yes':'no'} onChange={e=>onChange({...item,hasLyrics:e.target.value==='yes',lyrics:e.target.value==='yes'?blankItemLyrics():null})}><option value="no">No lyrics</option><option value="yes">With lyrics</option></select></label></div>
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
export default function RecordingItemsEditor({items,amount,onChange,...props}){
 const multiple=amount==='MULTIPLE';
 const [editingId,setEditingId]=useState(null);
 const editingIndex=items.findIndex(item=>item.id===editingId);
 const edit=item=>setEditingId(item.id);
 const add=()=>{const item=blankRecordingItem();onChange([...items,item]);edit(item);};
 return <section className="recording-items-editor" aria-label="Recording atoms"><header><div><h3>Recording atoms</h3><p>Review the atoms in this recording and edit their details.</p></div><button type="button" disabled={items.length>=100} onClick={add}><Plus size={16}/>Add atom</button></header>{!multiple&&items.length>1&&<p role="alert">This recording has several atoms. Choose Multiple or remove extra atoms before saving.</p>}<div className="recording-atoms-table-wrap"><table className="recording-atoms-table"><thead><tr><th>Atom</th><th>Release year</th><th>Lyrics</th><th>Credits</th><th></th></tr></thead><tbody>{items.map((item,index)=><tr key={item.id}><td>{item.name||<span className="recording-atom-empty">Untitled atom</span>}</td><td>{item.releaseYear??'—'}</td><td>{item.hasLyrics?'Yes':'No'}</td><td>{item.musicianCredits.length+((item.lyrics?.lyricistCredits?.length||0)+(item.lyrics?.vocalistCredits?.length||0))}</td><td className="recording-atom-actions"><button type="button" onClick={()=>edit(item)}>Edit</button>{(multiple||items.length>1)&&<button type="button" aria-label={`Remove atom ${index+1}`} onClick={()=>onChange(items.filter(row=>row.id!==item.id))}><Trash2 size={15}/></button>}</td></tr>)}</tbody></table></div>{editingIndex>=0&&<div className="recording-atom-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setEditingId(null);}}><section role="dialog" aria-modal="true" aria-label={`Edit recording atom ${editingIndex+1}`}><header><h3>{items[editingIndex].name||`Recording atom ${editingIndex+1}`}</h3><button type="button" onClick={()=>setEditingId(null)}>Close</button></header><RecordingItem key={items[editingIndex].id} item={items[editingIndex]} index={editingIndex} multiple={multiple||items.length>1} {...props} onChange={updated=>onChange(items.map(row=>row.id===updated.id?updated:row))} onRemove={()=>{onChange(items.filter(row=>row.id!==items[editingIndex].id));setEditingId(null);}}/></section></div>}</section>;
}

export function SavedRecordingItems({items,vocabulary}){
 const people=rows=>rows.map(credit=>vocabulary.find(row=>row.id===credit.artistId)?.name||credit.artistId).join(', ')||'Not specified';
 const name=id=>vocabulary.find(row=>row.id===id)?.name||'Not specified';
 return <section className="recording-items-editor" aria-label="Saved recording items">{items.map((item,index)=><article className="recording-item" key={item.id}><h4>{index+1}. {item.name}</h4><dl><dt>Release year</dt><dd>{item.releaseYear??'Not specified'}</dd><dt>With lyrics?</dt><dd>{item.hasLyrics?'Yes':'No'}</dd>{item.hasLyrics&&item.lyrics&&<><dt>Language</dt><dd>{name(item.lyrics.languageId)}</dd><dt>Dialect</dt><dd>{name(item.lyrics.dialectId)}</dd><dt>One-word / phrasal concept</dt><dd>{item.lyrics.concept||'Not specified'}</dd><dt>Sentence concept</dt><dd>{item.lyrics.sentenceConcept||'Not specified'}</dd><dt>Lyricists</dt><dd>{people(item.lyrics.lyricistCredits)}</dd><dt>Vocalists</dt><dd>{people(item.lyrics.vocalistCredits)}</dd></>}<dt>Musicians</dt><dd>{people(item.musicianCredits)}</dd></dl>{item.hasLyrics&&item.lyrics?.timedLyrics?.lines?.length?<ol>{item.lyrics.timedLyrics.lines.map((line,i)=><li key={i}>{line.start}–{line.end}s · {line.text}</li>)}</ol>:item.hasLyrics&&item.lyrics?.text?<p style={{whiteSpace:'pre-wrap'}}>{item.lyrics.text}</p>:null}</article>)}</section>;
}
