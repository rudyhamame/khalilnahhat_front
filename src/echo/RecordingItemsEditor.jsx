import {useContext,useEffect,useState} from 'react';
import {createPortal} from 'react-dom';
import {Plus,Trash2,Pencil,Copy} from 'lucide-react';
import {ReferenceField} from './OntologyFields';
import {CreateReferenceContext} from './CreateReferenceContext';
import {blankItemLyrics,blankRecordingItem} from '../lib/recordingItems';
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
 for(const person of vocabulary.filter(row=>!row.archived&&row.kind==='musician'))addEntry({artistId:person.id,instrumentId:person.instrumentId||null,detail:''});
 // Keep existing pairs and their details even if the catalog dependency has changed.
 for(const credit of value)addEntry(credit);
 const rows=[...entries.values()].sort((a,b)=>a.name.localeCompare(b.name));
 return <div className="recording-musician-select"><MultipleReferences label={label} rows={rows} value={value.map(pairId)} onChange={ids=>onChange(ids.map(id=>entries.get(id).credit))} onCreate={createReference&&value.length<100?name=>createReference('musician',(artistId,person)=>{
  const credit={artistId,instrumentId:person?.instrumentId||null,detail:''};
  if(!value.some(row=>pairId(row)===pairId(credit)))onChange([...value,credit]);
 },name):undefined}/></div>;
}

export function ItemCredits({label,kind,value,onChange,vocabulary}){
 const createReference=useContext(CreateReferenceContext);
 const entries=new Map(vocabulary.filter(row=>!row.archived&&row.kind===kind).map(row=>[row.id,{id:row.id,name:row.name}]));
 for(const credit of value)if(!entries.has(credit.artistId))entries.set(credit.artistId,{id:credit.artistId,name:vocabulary.find(row=>row.id===credit.artistId)?.name||credit.artistId});
 const rows=[...entries.values()].sort((a,b)=>a.name.localeCompare(b.name));
 return <MultipleReferences label={label} rows={rows} value={value.map(credit=>credit.artistId)} onChange={ids=>onChange(ids.map(artistId=>value.find(credit=>credit.artistId===artistId)||{artistId,detail:''}))} onCreate={createReference&&value.length<100?name=>createReference(kind,artistId=>{
  if(!value.some(credit=>credit.artistId===artistId))onChange([...value,{artistId,detail:''}]);
 },name):undefined}/>;
}

function LyricsDetailsSection({children,className=''}){
 return <section className={`recording-vocal-details ${className}`} aria-label="Vocal details"><header><h3>Vocal details</h3><p>Language, dialect and the vocalists on this recording.</p></header>{children}</section>;
}

export function LyricsLanguageFields({lyrics,vocabulary,onChange}){
 const languageIds=lyrics.languageIds??(lyrics.languageId?[lyrics.languageId]:[]);
 const dialectIds=lyrics.dialectIds??(lyrics.dialectId?[lyrics.dialectId]:[]);
 const dialects=vocabulary.filter(row=>row.kind!=='dialect'||languageIds.length&&(!row.parentId||languageIds.includes(row.parentId)));
 const changeLanguages=ids=>{
  const kept=dialectIds.filter(id=>{const row=vocabulary.find(row=>row.id===id);return ids.length&&row&&(!row.parentId||ids.includes(row.parentId));});
  onChange({...lyrics,languageIds:ids,languageId:ids[0]||null,dialectIds:kept,dialectId:kept[0]||null});
 };
 return <div className="recording-atom-elements"><ReferenceField multiple label="Languages" kind="language" vocabulary={vocabulary} value={languageIds} onChange={changeLanguages}/><ReferenceField multiple label="Dialects" kind="dialect" vocabulary={dialects} value={dialectIds} allowCreate={languageIds.length>0} onChange={ids=>onChange({...lyrics,dialectIds:ids,dialectId:ids[0]||null})}/></div>;
}


function LyricCredits({lyrics,vocabulary,onChange}){
 return <div className="recording-lyrics-credit-fields"><ItemCredits kind="artist" label="Vocalist credits" value={lyrics.vocalistCredits} vocabulary={vocabulary} onChange={vocalistCredits=>onChange({...lyrics,vocalistCredits})}/></div>;
}

function RecordingItem({item,index,multiple,duration,vocabulary,onChange}){
 const l=item.lyrics;
 return <article className="recording-item" aria-label={`Recording item ${index+1}`}><fieldset><section className="recording-atom-block"><header><h4>Atom details</h4><p>Name, release date and the segment of the recording this atom covers.</p></header><div className="recording-item-identity"><label><span>Atom name<span className="req-star" aria-hidden="true"> *</span></span><input required aria-required="true" maxLength={240} value={item.name} onChange={e=>onChange({...item,name:e.target.value})}/></label><label>Vocals<select aria-label="Does this atom have vocals?" value={item.hasLyrics?'yes':'no'} onChange={event=>{const on=event.target.value==='yes';onChange({...item,hasLyrics:on,lyrics:on?{...(item.lyrics||blankItemLyrics()),...(item.audioRange||{})}:item.lyrics});}}><option value="no">Instrumental</option><option value="yes">With vocals</option></select></label><AtomReleaseDate item={item} onChange={patch=>onChange({...item,...patch})}/></div>
 {multiple&&<AtomAudioRange item={item} duration={duration} onChange={onChange}/>}</section>
 <RecordingAtomElements value={item.sound} vocabulary={vocabulary} onChange={sound=>onChange({...item,sound})}><MusicianCredits label="Recording Musician credits" value={item.musicianCredits} vocabulary={vocabulary} onChange={musicianCredits=>onChange({...item,musicianCredits})}/></RecordingAtomElements>
 {item.hasLyrics&&l&&<LyricsDetailsSection className="recording-item-lyrics"><LyricsLanguageFields lyrics={l} vocabulary={vocabulary} onChange={lyrics=>onChange({...item,lyrics})}/>
 <LyricCredits lyrics={l} vocabulary={vocabulary} onChange={lyrics=>onChange({...item,lyrics})}/>
 </LyricsDetailsSection>}
 </fieldset></article>;
}
export default function RecordingItemsEditor({items,amount,onChange,withLyrics=false,...props}){
 const multiple=amount==='MULTIPLE';
 const [addSlot,setAddSlot]=useState(null);
 useEffect(()=>{setAddSlot(document.getElementById('recording-atom-add-slot'));},[]);
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
  const base={...blankRecordingItem(),hasLyrics:withLyrics,lyrics:withLyrics?blankItemLyrics():null},item=withRange(base,nextRange(30));
  onChange([...items,item]);setSelectedId(item.id);
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
 if(!multiple){
  const item=items[0];
  if(!item)return null;
  const update=patch=>onChange(items.map((row,index)=>index===0?{...row,...patch}:row));
  const lyrics=item.lyrics||blankItemLyrics();
  return <section className="recording-items-editor recording-individual-fields" aria-label="Individual recording details">
   {items.length>1&&<p role="alert">This recording contains several atoms. Choose Multiple to manage them before saving.</p>}
   <div className="recording-individual-credits"><RecordingAtomElements value={item.sound} vocabulary={props.vocabulary} onChange={sound=>update({sound})}><MusicianCredits label="Recording Musician credits" value={item.musicianCredits} vocabulary={props.vocabulary} onChange={musicianCredits=>update({musicianCredits})}/></RecordingAtomElements>{withLyrics&&<LyricsDetailsSection><LyricsLanguageFields lyrics={lyrics} vocabulary={props.vocabulary} onChange={lyrics=>update({lyrics})}/><LyricCredits lyrics={lyrics} vocabulary={props.vocabulary} onChange={lyrics=>update({lyrics})}/></LyricsDetailsSection>}
   </div>
  </section>;
 }
 const addButton=<button type="button" className="recording-atom-add" disabled={items.length>=100} onClick={add} aria-label="Add atom" title="Add atom"><Plus size={18} strokeWidth={2.25}/></button>;
 return <section className="recording-items-editor recording-atoms-bar" aria-label="Recording atoms">
  {addSlot?createPortal(addButton,addSlot):addButton}
  {items.length?<ul className="recording-atom-grid">{items.map((item,index)=>{const voc=props.vocabulary||[],nm=id=>voc.find(row=>row.id===id)?.name,list=ids=>(ids||[]).map(nm).filter(Boolean).join(', '),ppl=rows=>(rows||[]).map(c=>[nm(c.artistId)||c.artistId,c.instrumentId?nm(c.instrumentId):''].filter(Boolean).join(' · ')).join(', '),range=atomRange(item),l=item.lyrics,snd=item.sound||{};
   const meta=[['Duration',range?trimClock(range.endSec-range.startSec):''],['Release date',item.releaseDate||item.releaseYear],['Vocals',item.hasLyrics?'With vocals':'Instrumental'],['Musical keys',(snd.keys??(snd.key?[snd.key]:[])).join(', ')],['Rhythms',list(snd.rhythmIds??(snd.rhythmId?[snd.rhythmId]:[]))],['Genres',list(snd.genreIds)],['Influences',(snd.influences||[]).join(', ')],...(item.hasLyrics&&l?[['Languages',list(l.languageIds??(l.languageId?[l.languageId]:[]))],['Dialects',list(l.dialectIds??(l.dialectId?[l.dialectId]:[]))],['Vocalists',ppl(l.vocalistCredits)]]:[]),['Musicians',ppl(item.musicianCredits)]];
   return <li key={item.id} className={`recording-atom-card${item.id===selectedId?' is-selected':''}`}><header><button type="button" className="recording-atom-card-select" aria-current={item.id===selectedId?'true':undefined} onClick={()=>choose(index)} title="Select and seek to this atom"><span className="recording-atom-number">{index+1}</span><strong>{item.name||`Atom ${index+1}`}</strong></button><div className="recording-atom-row-actions"><button type="button" aria-label={`Duplicate atom ${index+1}`} title="Duplicate (same name and details)" disabled={items.length>=100} onClick={()=>duplicate(item)}><Copy size={15}/></button><button type="button" aria-label={`Edit atom ${index+1}`} title="Edit" onClick={()=>edit(item)}><Pencil size={15}/></button><button type="button" aria-label={`Delete atom ${index+1}`} title="Delete" disabled={!multiple&&items.length<=1} onClick={()=>remove(item.id)}><Trash2 size={15}/></button></div></header>{range?<div className="recording-atom-timing"><span className="recording-atom-segment-link">{trimClock(range.startSec)}<i aria-hidden="true">→</i>{trimClock(range.endSec)}</span></div>:<small className="recording-atom-untimed">No timed segment yet</small>}<dl>{meta.map(([label,value])=><div key={label}><dt>{label}</dt><dd className={value?undefined:'is-empty'}>{value||'Not specified'}</dd></div>)}</dl></li>;})}</ul>:<p className="recording-atom-empty">No atoms yet. Add one to mark a segment of the recording.</p>}
  {editingIndex>=0&&<div className="recording-atom-modal" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)setEditingId(null);}}><section role="dialog" aria-modal="true" aria-label={`Edit recording atom ${editingIndex+1}`}><header><h3>{items[editingIndex].name||`Recording atom ${editingIndex+1}`}</h3><button type="button" onClick={()=>setEditingId(null)}>Close</button></header><RecordingItem key={items[editingIndex].id} item={items[editingIndex]} index={editingIndex} multiple={multiple||items.length>1} {...props} onChange={updated=>onChange(items.map(row=>row.id===updated.id?updated:row))}/><footer className="recording-atom-modal-footer"><button type="button" onClick={()=>setEditingId(null)}>Cancel</button><button type="button" className="recording-atom-save" disabled={!items[editingIndex].name.trim()} onClick={()=>setEditingId(null)}>Save atom</button></footer></section></div>}
 </section>;
}

export function SavedRecordingItems({items,vocabulary}){
 const people=rows=>rows.map(credit=>[vocabulary.find(row=>row.id===credit.artistId)?.name||credit.artistId,credit.instrumentId?vocabulary.find(row=>row.id===credit.instrumentId)?.name:''].filter(Boolean).join(' · ')).join(', ')||'Not specified';
 const name=id=>vocabulary.find(row=>row.id===id)?.name||'Not specified';
 return <section className="recording-items-editor" aria-label="Saved recording items">{items.map((item,index)=><article className="recording-item" key={item.id}><h4>{index+1}. {item.name}</h4><dl><dt>Release date</dt><dd>{item.releaseDate||item.releaseYear||'Not specified'}</dd>{item.sound&&<><dt>Musical keys</dt><dd>{(item.sound.keys??(item.sound.key?[item.sound.key]:[])).join(', ')||'Not specified'}</dd><dt>Rhythms</dt><dd>{(item.sound.rhythmIds??(item.sound.rhythmId?[item.sound.rhythmId]:[])).map(name).join(', ')||'Not specified'}</dd><dt>Genres</dt><dd>{item.sound.genreIds?.map(name).join(', ')||'Not specified'}</dd><dt>Musical influences</dt><dd>{item.sound.influences?.join(', ')||'Not specified'}</dd></>}<dt>With vocals?</dt><dd>{item.hasLyrics?'Yes':'No'}</dd>{item.hasLyrics&&item.lyrics&&<><dt>Languages</dt><dd>{(item.lyrics.languageIds??(item.lyrics.languageId?[item.lyrics.languageId]:[])).map(name).join(', ')||'Not specified'}</dd><dt>Dialects</dt><dd>{(item.lyrics.dialectIds??(item.lyrics.dialectId?[item.lyrics.dialectId]:[])).map(name).join(', ')||'Not specified'}</dd><dt>Vocalists</dt><dd>{people(item.lyrics.vocalistCredits)}</dd></>}<dt>Musicians</dt><dd>{people(item.musicianCredits)}</dd></dl></article>)}</section>;
}
