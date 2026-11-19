import RecordingLoadingHint from './RecordingLoadingHint';
import {useId,useState} from 'react';
import {Check,Wand2,X} from 'lucide-react';
import {decodeMono} from '../lib/decodeMono';
import {detectKey,detectKeySegments} from '../lib/keyDetection';
import {trimClock} from '../lib/audioTrim';
import './keyPicker.css';

const WHITE=['C','D','E','F','G','A','B'],BLACK=[['C#','C♯','D♭',1],['D#','D♯','E♭',2],['F#','F♯','G♭',4],['G#','G♯','A♭',5],['A#','A♯','B♭',6]];
const CAMELOT={major:{C:'8B',G:'9B',D:'10B',A:'11B',E:'12B',B:'1B','F#':'2B','C#':'3B','G#':'4B','D#':'5B','A#':'6B',F:'7B'},minor:{A:'8A',E:'9A',B:'10A','F#':'11A','C#':'12A','G#':'1A','D#':'2A','A#':'3A',F:'4A',C:'5A',G:'6A',D:'7A'}};
const KEY_OPTIONS=['major','minor'].flatMap(mode=>Object.entries(CAMELOT[mode]).map(([note,camelot])=>({key:`${note} ${mode}`,note,mode,camelot})));
const FLATS={Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'};
const norm=value=>{const [note,mode]=String(value||'').split(' ');return `${FLATS[note]||note} ${mode}`;};
// Pick musical keys on a one-octave keyboard: choose major or minor, tap the notes. DJ Camelot codes (8A, 9B…) are shown beside each note.
export default function KeyPicker({label:title='Musical keys',value=[],onChange,audioUrl='',range=null}){
 const [mode,setMode]=useState('major'),tabId=useId();
 const [manual,setManual]=useState([]),[dismissed,setDismissed]=useState([]);
 const chosen=new Set(value.map(norm)),[detecting,setDetecting]=useState(false),[found,setFound]=useState(null),[problem,setProblem]=useState('');
 // Detection offers candidates for review; accepting a result saves the atom's key.
 const detect=async()=>{
  if(!audioUrl||detecting)return;setDetecting(true);setProblem('');
  try{
   const {samples,sampleRate}=await decodeMono(audioUrl),span=range?{from:range.startSec,to:range.endSec}:{};
   // The whole recording is checked in windows, so a change of key is reported instead of hidden behind one answer.
   let result=detectKeySegments(samples,sampleRate,span),items=result.keys.map(item=>({key:item.key,note:item.note,mode:item.mode,camelot:item.camelot,share:item.share,ranges:item.segments}));
   if(!items.length){const single=detectKey(samples,sampleRate,span);if(!single.keys.length)throw Error('This part is too short to analyse.');items=[{...single.keys[0],share:1,ranges:[]}];result={multiple:false};}
   setFound({multiple:result.multiple,items});setMode(items[0].mode);setDismissed([]);
  }catch(error){setProblem(error.message||'The key could not be detected.');}
  finally{setDetecting(false);}
 };
 const accept=key=>{setMode(key.split(' ')[1]);onChange([key]);};
 const toggle=note=>{const key=`${note} ${mode}`;if(chosen.has(key))onChange([]);else{setDismissed(current=>current.filter(item=>item!==key));accept(key);}};
 const remove=key=>{onChange(value.filter(item=>norm(item)!==key));setManual(current=>current.filter(item=>item!==key));setDismissed(current=>[...new Set([...current,key])]);};
 const results=new Map();
 for(const item of found?.items||[])if(!dismissed.includes(norm(item.key)))results.set(norm(item.key),{...item,origin:'Detected'});
 for(const key of manual)if(!results.has(key))results.set(key,{...KEY_OPTIONS.find(item=>item.key===key),key,origin:'Added manually'});
 for(const key of value.map(norm))if(!results.has(key))results.set(key,{...KEY_OPTIONS.find(item=>item.key===key),key,origin:'Selected'});
 return <div className="key-picker"><RecordingLoadingHint message={detecting?'Detecting musical key from the audio…':''}/>{title&&<span className="key-picker-label">{title}</span>}
  <div className="key-picker-menu is-inline" role="group" aria-label="Choose musical keys">
   <header><div className="key-picker-mode" role="tablist" aria-label="Musical key mode">{['major','minor'].map(item=><button key={item} id={`${tabId}-${item}`} type="button" role="tab" aria-selected={mode===item} aria-controls={`${tabId}-keyboard`} tabIndex={mode===item?0:-1} onClick={()=>setMode(item)} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'major':event.key==='End'?'minor':item==='major'?'minor':'major';setMode(next);document.getElementById(`${tabId}-${next}`)?.focus();}}>{item==='major'?'Major':'Minor'}</button>)}</div></header>
   <div className="key-picker-board" id={`${tabId}-keyboard`} role="tabpanel" aria-labelledby={`${tabId}-${mode}`}>
    <div className="key-picker-whites">{WHITE.map(note=><button key={note} type="button" className="key-picker-key" aria-pressed={chosen.has(`${note} ${mode}`)} aria-label={`${note} ${mode}`} onClick={()=>toggle(note)}><b>{note}</b><small>{CAMELOT[mode][note]}</small></button>)}</div>
    {BLACK.map(([note,sharp,flat,gap])=><button key={note} type="button" className="key-picker-key is-black" style={{left:`${gap/7*100}%`}} aria-pressed={chosen.has(`${note} ${mode}`)} aria-label={`${sharp} or ${flat} ${mode}`} onClick={()=>toggle(note)}><b>{sharp}<i>{flat}</i></b><small>{CAMELOT[mode][note]}</small></button>)}
   </div>
   {audioUrl&&<div className="key-picker-detect"><button type="button" disabled={detecting} onClick={detect}><Wand2 size={14}/>{found?'Detect again':range?'Auto-detect from this atom':'Auto-detect from the audio'}</button>
    {problem&&<p role="alert">{problem}</p>}
    {found&&<p className="key-picker-result-summary">{found.items.every(item=>dismissed.includes(norm(item.key)))?'Detected results removed · Add a correction below':`${found.multiple?`${found.items.length} different keys detected`:'One key detected'} · Review below`}</p>}</div>}
   <label className="key-picker-add"><span>Add musical key</span><select aria-label="Add musical key" value="" onChange={event=>{const key=event.target.value;if(!key)return;setManual(current=>[...new Set([...current,key])]);setDismissed(current=>current.filter(item=>item!==key));setMode(key.split(' ')[1]);}}><option value="">Choose a key…</option>{['major','minor'].map(mode=><optgroup key={mode} label={mode==='major'?'Major':'Minor'}>{KEY_OPTIONS.filter(item=>item.mode===mode).map(item=><option key={item.key} value={item.key}>{item.key} · {item.camelot}</option>)}</optgroup>)}</select></label>
   {results.size>0&&<ul className="key-picker-results" aria-label="Musical key results">{[...results.values()].map(item=><li key={item.key} className={chosen.has(item.key)?'is-accepted':''}><div><b>{item.key}</b><small>{item.camelot} · {chosen.has(item.key)?'Accepted':item.origin}{item.share!=null&&found?.multiple?` · ${Math.round(item.share*100)}%`:''}{item.ranges?.length?` · ${item.ranges.map(part=>`${trimClock(part.from)}–${trimClock(part.to)}`).join(', ')}`:''}</small></div><div className="key-picker-result-actions"><button type="button" className="is-accept" aria-label={`Accept ${item.key}`} aria-pressed={chosen.has(item.key)} title="Accept key" onClick={()=>accept(item.key)}><Check size={13} aria-hidden="true"/></button><button type="button" className="is-remove" aria-label={`Remove ${item.key}`} title="Remove key" onClick={()=>remove(item.key)}><X size={13} aria-hidden="true"/></button></div></li>)}</ul>}
   <footer><span>{value.length?`${value.length} selected`:'Nothing selected'}</span><small>Camelot codes shown on each key</small>{value.length>0&&<button type="button" className="key-picker-clear" onClick={()=>onChange([])}>Clear</button>}</footer>
  </div>
 </div>;
}
