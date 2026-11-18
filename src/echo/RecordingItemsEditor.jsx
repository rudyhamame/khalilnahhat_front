import {useContext,useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Plus,Trash2,Pencil,Copy,Layers3,X,Check} from 'lucide-react';
import {ReferenceField} from './OntologyFields';
import {CreateReferenceContext} from './CreateReferenceContext';
import {blankItemLyrics,blankRecordingItem,copyRecordingToAtom,lyricDialectIds,lyricLanguageIds,toLyricLanguages} from '../lib/recordingItems';
import RecordingAtomElements from './RecordingAtomElements';
import MultipleReferences from './MultipleReferences';
import {useDomSlot} from './useDomSlot';
import {atomRange} from '../lib/recordingAtoms';
import {trimClock} from '../lib/audioTrim';
import './recordingItems.css';
import './recordingAtomModal.css';

export function AtomReleaseYear({item,onChange,inline=false}){
 return <label className={inline?'recording-atom-release-year':undefined}>Atom release year<input aria-label="Atom release year" type="number" inputMode="numeric" min="1000" max="2100" step="1" value={item.releaseYear??''} onChange={event=>onChange({releaseYear:event.target.value===''?null:Number(event.target.value)})}/></label>;
}

function AtomAudioRange({item,duration,onChange}){
 const range=item.audioRange||atomRange(item);
 const update=(field,value)=>{
  const next={startSec:range?.startSec??null,endSec:range?.endSec??null,[field]:value===''?null:Number(value)};
  onChange({...item,audioRange:next.startSec==null&&next.endSec==null?undefined:next,...(item.lyrics?{lyrics:{...item.lyrics,...next,}}:{})});
 };
 return <div className="recording-item-identity recording-atom-audio-range"><label>Atom start · seconds<input type="number" min="0" max={duration||86400} step="0.01" value={range?.startSec??item.lyrics?.startSec??''} onChange={event=>update('startSec',event.target.value)}/></label><label>Atom end · seconds<input type="number" min="0.01" max={duration||86400} step="0.01" value={range?.endSec??item.lyrics?.endSec??''} onChange={event=>update('endSec',event.target.value)}/></label></div>;
}

export function MusicianCredits({label,value,onChange,vocabulary}){
 const createReference=useContext(CreateReferenceContext);
 const pairId=credit=>JSON.stringify([credit.artistId,credit.instrumentId||null]);
 const entries=new Map();
 const addEntry=credit=>{
  const person=vocabulary.find(row=>row.id===credit.artistId),instrument=vocabulary.find(row=>row.id===credit.instrumentId);
  const name=[person?.name||credit.artistId,instrument?.name||(credit.instrumentId?'Unknown instrument':'Instrument not specified')].join(' · ');
  entries.set(pairId(credit),{id:pairId(credit),name,credit});
 };
 for(const person of vocabulary.filter(row=>!row.archived&&row.kind==='musician'))addEntry({artistId:person.id,instrumentId:person.instrumentId||null});
 // Keep existing pairs and their details even if the catalog dependency has changed.
 for(const credit of value)addEntry(credit);
 const rows=[...entries.values()].sort((a,b)=>a.name.localeCompare(b.name));
 return <div className="recording-musician-select"><MultipleReferences label={label} rows={rows} value={value.map(pairId)} onChange={ids=>onChange(ids.map(id=>entries.get(id).credit))} onCreate={createReference&&value.length<100?name=>createReference('musician',(artistId,person)=>{
  const credit={artistId,instrumentId:person?.instrumentId||null};
  if(!value.some(row=>pairId(row)===pairId(credit)))onChange([...value,credit]);
 },name):undefined}/></div>;
}

export function ItemCredits({label,kind,value,onChange,vocabulary}){
 const createReference=useContext(CreateReferenceContext);
 const entries=new Map(vocabulary.filter(row=>!row.archived&&row.kind===kind).map(row=>[row.id,{id:row.id,name:row.name}]));
 for(const credit of value)if(!entries.has(credit.artistId))entries.set(credit.artistId,{id:credit.artistId,name:vocabulary.find(row=>row.id===credit.artistId)?.name||credit.artistId});
 const rows=[...entries.values()].sort((a,b)=>a.name.localeCompare(b.name));
 return <MultipleReferences label={label} rows={rows} value={value.map(credit=>credit.artistId)} onChange={ids=>onChange(ids.map(artistId=>value.find(credit=>credit.artistId===artistId)||{artistId}))} onCreate={createReference&&value.length<100?name=>createReference(kind,artistId=>{
  if(!value.some(credit=>credit.artistId===artistId))onChange([...value,{artistId}]);
 },name):undefined}/>;
}

function LyricsDetailsSection({children,className=''}){
 return <section className={`recording-vocal-details ${className}`} aria-label="Lyrics details"><header><h3>Lyrics details</h3><p>Language, dialect and the vocalists on this recording.</p></header>{children}</section>;
}

export function LyricsLanguageFields({lyrics,vocabulary,onChange}){
 const languageIds=lyricLanguageIds(lyrics);
 const dialectIds=lyricDialectIds(lyrics);
 const dialects=vocabulary.filter(row=>row.kind!=='dialect'||languageIds.length&&(!row.parentId||languageIds.includes(row.parentId)));
 const changeLanguages=ids=>{
  const kept=dialectIds.filter(id=>{const row=vocabulary.find(row=>row.id===id);return ids.length&&row&&(!row.parentId||ids.includes(row.parentId));});
  onChange({...lyrics,languages:toLyricLanguages(ids,kept,vocabulary)});
 };
 return <div className="recording-atom-elements"><ReferenceField multiple label="Languages" kind="language" vocabulary={vocabulary} value={languageIds} onChange={changeLanguages}/><ReferenceField multiple label="Dialects" kind="dialect" vocabulary={dialects} value={dialectIds} allowCreate={languageIds.length>0} onChange={ids=>onChange({...lyrics,languages:toLyricLanguages(languageIds,ids,vocabulary)})}/></div>;
}


function LyricCredits({lyrics,vocabulary,onChange}){
 return <div className="recording-lyrics-credit-fields"><ItemCredits kind="artist" label="Vocalist credits" value={lyrics.vocalistCredits} vocabulary={vocabulary} onChange={vocalistCredits=>onChange({...lyrics,vocalistCredits})}/></div>;
}

function RecordingItem({item,index,duration,vocabulary,onChange,recording,audioUrl=''}){
 const l=item.lyrics||blankItemLyrics();
 return <article className="recording-item" aria-label={`Recording item ${index+1}`}><fieldset><section className="recording-atom-block"><header><h4>Atom details</h4><p>Name, release year and the segment of the recording this atom covers.</p></header>{recording&&<div className="recording-copy-details"><button type="button" onClick={()=>onChange(copyRecordingToAtom(item,recording))}><Copy size={15} aria-hidden="true"/>Same as recording</button><p>Copy the name and full duration. Enter the atom release year separately.</p></div>}<div className="recording-item-identity"><label><span>Atom name<span className="req-star" aria-hidden="true"> *</span></span><input required aria-required="true" maxLength={240} value={item.name} onChange={e=>onChange({...item,name:e.target.value})}/></label><AtomReleaseYear item={item} onChange={patch=>onChange({...item,...patch})}/></div>
 <AtomAudioRange item={item} duration={duration} onChange={onChange}/></section>
 <RecordingAtomElements audioUrl={audioUrl} range={atomRange(item)} value={item.sound} vocabulary={vocabulary} onChange={sound=>onChange({...item,sound})}><MusicianCredits label="Musicians" value={item.sound?.musicianCredits||[]} vocabulary={vocabulary} onChange={musicianCredits=>onChange({...item,sound:{...item.sound,musicianCredits}})}/></RecordingAtomElements>
 {l&&<LyricsDetailsSection className="recording-item-lyrics"><LyricsLanguageFields lyrics={l} vocabulary={vocabulary} onChange={lyrics=>onChange({...item,lyrics})}/>
 <LyricCredits lyrics={l} vocabulary={vocabulary} onChange={lyrics=>onChange({...item,lyrics})}/>
 </LyricsDetailsSection>}
 </fieldset></article>;
}
// The atom's saved fields, in the order of the recording JSON: releaseYear, audioRange, sound{musicianCredits,bpm,key,rhythmIds,genreIds}, lyrics{languages[{languageId,dialectIds}],vocalistCredits}.
export function atomFacts(item,vocabulary=[]){
 const nm=id=>vocabulary.find(row=>row.id===id)?.name||id,list=ids=>(ids||[]).map(nm).join(', ');
 const people=rows=>(rows||[]).map(credit=>[nm(credit.artistId),credit.instrumentId?nm(credit.instrumentId):''].filter(Boolean).join(' · ')).join(', ');
 const range=atomRange(item),sound=item.sound||{},lyrics=item.lyrics;
 return [
  ['Release year',item.releaseYear??''],
  ['Audio range',range?`${trimClock(range.startSec)} – ${trimClock(range.endSec)}`:''],
  ['Musicians',people(sound.musicianCredits)],
  ['BPM',sound.bpm??''],
  ['Key',sound.key||''],
  ['Rhythms',list(sound.rhythmIds)],
  ['Genres',list(sound.genreIds)],
  ['Languages',(lyrics?.languages||[]).map(row=>`${nm(row.languageId)}${row.dialectIds?.length?` (${list(row.dialectIds)})`:''}`).join(', ')],
  ['Vocalists',people(lyrics?.vocalistCredits)],
 ];
}

export default function RecordingItemsEditor({items,onChange,withLyrics=false,...props}){
 const addSlot=useDomSlot('recording-atom-add-slot');
 const [editingId,setEditingId]=useState(null);
 const [selectedId,setSelectedId]=useState(()=>items[0]?.id||null);
 const choose=index=>{const item=items[index];if(item){setSelectedId(item.id);props.onSelect?.(item.id);}};
 const editingIndex=items.findIndex(item=>item.id===editingId);
 const edit=item=>{setSelectedId(item.id);setEditingId(item.id);};
 useEffect(()=>{if(props.focusedAtomId&&items.some(item=>item.id===props.focusedAtomId))setSelectedId(props.focusedAtomId);},[props.focusedAtomId,items]);
 // Next free span on the waveform: starts where the last atom ends.
 const nextRange=wanted=>{
  const total=Number(props.duration)||0,start=items.reduce((end,row)=>Math.max(end,atomRange(row)?.endSec??0),0),stop=Math.min(start+wanted,total||start+wanted);
  return stop-start>=.01&&(!total||start<total)?{startSec:+start.toFixed(2),endSec:+stop.toFixed(2)}:null;
 };
 const withRange=(item,range)=>range?{...item,audioRange:range,lyrics:item.lyrics?{...item.lyrics,...range}:item.lyrics}:{...item,audioRange:undefined};
 const add=()=>{
  const base={...blankRecordingItem(),lyrics:withLyrics?blankItemLyrics():null},item=withRange(base,nextRange(30));
  onChange([...items,item]);setSelectedId(item.id);setEditingId(item.id);
 };
 // Another part of the same song: same name and details, new id, placed after the last atom with the same length.
 const duplicate=source=>{
  const length=atomRange(source)?atomRange(source).endSec-atomRange(source).startSec:30,copy=structuredClone(source),item=withRange({...copy,id:blankRecordingItem().id},nextRange(length));
  onChange([...items,item]);setSelectedId(item.id);
 };
 const remove=id=>{
  const index=items.findIndex(item=>item.id===id);
  const remaining=items.filter(item=>item.id!==id);
  onChange(remaining);
  setSelectedId(remaining[Math.min(index,remaining.length-1)]?.id||null);
  if(editingId===id)setEditingId(null);
 };
 const addButton=<button type="button" className="recording-atom-add" disabled={items.length>=100} onClick={add} aria-label="Add atom" title="Add atom"><Plus size={18} strokeWidth={2.25}/></button>;
 return <section className="recording-items-editor recording-atoms-bar" aria-label="Recording atoms">
  {addSlot?createPortal(addButton,addSlot):addButton}
  {items.length?<ul className="recording-atom-grid">{items.map((item,index)=>{const voc=props.vocabulary||[],range=atomRange(item);
   const meta=atomFacts(item,voc);
   return <li key={item.id} className={`recording-atom-card${item.id===selectedId?' is-selected':''}`}><header><button type="button" className="recording-atom-card-select" aria-current={item.id===selectedId?'true':undefined} onClick={()=>choose(index)} title="Select and seek to this atom"><span className="recording-atom-number">{index+1}</span><strong>{item.name||`Atom ${index+1}`}</strong></button><div className="recording-atom-row-actions"><button type="button" aria-label={`Duplicate atom ${index+1}`} title="Duplicate (same name and details)" disabled={items.length>=100} onClick={()=>duplicate(item)}><Copy size={15}/></button><button type="button" aria-label={`Edit atom ${index+1}`} title="Edit" onClick={()=>edit(item)}><Pencil size={15}/></button><button type="button" aria-label={`Delete atom ${index+1}`} title="Delete" disabled={items.length<=1} onClick={()=>remove(item.id)}><Trash2 size={15}/></button></div></header>{range?<div className="recording-atom-timing"><span className="recording-atom-segment-link">{trimClock(range.startSec)}<i aria-hidden="true">→</i>{trimClock(range.endSec)}</span></div>:<small className="recording-atom-untimed">No timed segment yet</small>}<dl>{meta.map(([label,value])=><div key={label}><dt>{label}</dt><dd className={value?undefined:'is-empty'}>{value||'Not specified'}</dd></div>)}</dl></li>;})}</ul>:<p className="recording-atom-empty">No atoms yet. Add one to mark a segment of the recording.</p>}
  {editingIndex>=0&&<div className="recording-atom-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setEditingId(null);}}><section role="dialog" aria-modal="true" aria-label={`Edit recording atom ${editingIndex+1}`}><header className="atom-dialog-header"><span className="atom-dialog-icon" aria-hidden="true"><Layers3 size={21}/></span><div><span className="atom-dialog-eyebrow">Recording atom · {String(editingIndex+1).padStart(2,'0')}</span><h3>{items[editingIndex].name||'New atom'}</h3><p>Define the segment, sound and credits.</p></div><button type="button" className="atom-dialog-close" aria-label="Close atom editor" onClick={()=>setEditingId(null)}><X size={19}/></button></header><div className="recording-atom-modal-body"><RecordingItem key={items[editingIndex].id} audioUrl={props.audioUrl} item={items[editingIndex]} index={editingIndex} {...props} onChange={updated=>onChange(items.map(row=>row.id===updated.id?updated:row))}/></div><footer className="recording-atom-modal-footer"><span>Save the recording to keep your changes.</span><button type="button" onClick={()=>setEditingId(null)}>Cancel</button><button type="button" className="recording-atom-save" disabled={!items[editingIndex].name.trim()} onClick={()=>setEditingId(null)}><Check size={15} aria-hidden="true"/>Save atom</button></footer></section></div>}
 </section>;
}

export function SavedRecordingItems({items,vocabulary}){
 return <section className="recording-items-editor" aria-label="Saved recording atoms">{items.map((item,index)=><article className="recording-item" key={item.id}><h4>{index+1}. {item.name}</h4><dl>{atomFacts(item,vocabulary).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||'Not specified'}</dd></div>)}</dl></article>)}</section>;
}
