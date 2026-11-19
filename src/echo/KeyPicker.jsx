import RecordingLoadingHint from './RecordingLoadingHint';
import {useId,useState} from 'react';
import {Wand2} from 'lucide-react';
import {decodeMono} from '../lib/decodeMono';
import {detectKey,detectKeySegments} from '../lib/keyDetection';
import {trimClock} from '../lib/audioTrim';
import './keyPicker.css';

const WHITE=['C','D','E','F','G','A','B'],BLACK=[['C#','C♯','D♭',1],['D#','D♯','E♭',2],['F#','F♯','G♭',4],['G#','G♯','A♭',5],['A#','A♯','B♭',6]];
const CAMELOT={major:{C:'8B',G:'9B',D:'10B',A:'11B',E:'12B',B:'1B','F#':'2B','C#':'3B','G#':'4B','D#':'5B','A#':'6B',F:'7B'},minor:{A:'8A',E:'9A',B:'10A','F#':'11A','C#':'12A','G#':'1A','D#':'2A','A#':'3A',F:'4A',C:'5A',G:'6A',D:'7A'}};
const FLATS={Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'};
const norm=value=>{const [note,mode]=String(value||'').split(' ');return `${FLATS[note]||note} ${mode}`;};
// Pick musical keys on a one-octave keyboard: choose major or minor, tap the notes. DJ Camelot codes (8A, 9B…) are shown beside each note.
export default function KeyPicker({label:title='Musical keys',value=[],onChange,audioUrl='',range=null}){
 const [mode,setMode]=useState('major'),tabId=useId();
 const chosen=new Set(value.map(norm)),[detecting,setDetecting]=useState(false),[found,setFound]=useState(null),[problem,setProblem]=useState('');
 // Auto-detect: listen to the recording (or just this atom) and pick the most likely key; the runners-up stay as suggestions.
 const detect=async()=>{
  if(!audioUrl||detecting)return;setDetecting(true);setProblem('');
  try{
   const {samples,sampleRate}=await decodeMono(audioUrl),span=range?{from:range.startSec,to:range.endSec}:{};
   // The whole recording is checked in windows, so a change of key is reported instead of hidden behind one answer.
   let result=detectKeySegments(samples,sampleRate,span),items=result.keys.map(item=>({key:item.key,note:item.note,mode:item.mode,camelot:item.camelot,share:item.share,ranges:item.segments}));
   if(!items.length){const single=detectKey(samples,sampleRate,span);if(!single.keys.length)throw Error('This part is too short to analyse.');items=[{...single.keys[0],share:1,ranges:[]}];result={multiple:false};}
   setFound({multiple:result.multiple,items});setMode(items[0].mode);
   const add=items.map(item=>item.key).filter(key=>!chosen.has(norm(key)));
   if(add.length)onChange([...value,...add]);
  }catch(error){setProblem(error.message||'The key could not be detected.');}
  finally{setDetecting(false);}
 };
 const toggle=note=>{const key=`${note} ${mode}`;onChange(chosen.has(key)?value.filter(item=>norm(item)!==key):[...value,key]);};
 return <div className="key-picker"><RecordingLoadingHint message={detecting?'Detecting musical key from the audio…':''}/>{title&&<span className="key-picker-label">{title}</span>}
  <div className="key-picker-menu is-inline" role="group" aria-label="Choose musical keys">
   <header><div className="key-picker-mode" role="tablist" aria-label="Musical key mode">{['major','minor'].map(item=><button key={item} id={`${tabId}-${item}`} type="button" role="tab" aria-selected={mode===item} aria-controls={`${tabId}-keyboard`} tabIndex={mode===item?0:-1} onClick={()=>setMode(item)} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'major':event.key==='End'?'minor':item==='major'?'minor':'major';setMode(next);document.getElementById(`${tabId}-${next}`)?.focus();}}>{item==='major'?'Major':'Minor'}</button>)}</div></header>
   <div className="key-picker-board" id={`${tabId}-keyboard`} role="tabpanel" aria-labelledby={`${tabId}-${mode}`}>
    <div className="key-picker-whites">{WHITE.map(note=><button key={note} type="button" className="key-picker-key" aria-pressed={chosen.has(`${note} ${mode}`)} aria-label={`${note} ${mode}`} onClick={()=>toggle(note)}><b>{note}</b><small>{CAMELOT[mode][note]}</small></button>)}</div>
    {BLACK.map(([note,sharp,flat,gap])=><button key={note} type="button" className="key-picker-key is-black" style={{left:`${gap/7*100}%`}} aria-pressed={chosen.has(`${note} ${mode}`)} aria-label={`${sharp} or ${flat} ${mode}`} onClick={()=>toggle(note)}><b>{sharp}<i>{flat}</i></b><small>{CAMELOT[mode][note]}</small></button>)}
   </div>
   {audioUrl&&<div className="key-picker-detect"><button type="button" disabled={detecting} onClick={detect}><Wand2 size={14}/>{found?'Detect again':range?'Auto-detect from this atom':'Auto-detect from the audio'}</button>
    {problem&&<p role="alert">{problem}</p>}
    {found&&<div className="key-picker-found"><span className={found.multiple?'is-multiple':'is-single'}>{found.multiple?`${found.items.length} different keys found in this ${range?'atom':'recording'}`:`One key throughout the ${range?'atom':'recording'}`}</span>{found.items.map(item=><button key={item.key} type="button" aria-pressed={chosen.has(norm(item.key))} onClick={()=>{setMode(item.mode);toggle(item.note);}}><b>{item.key}</b><small>{item.camelot}{found.multiple&&item.share?` · ${Math.round(item.share*100)}% · ${item.ranges.map(part=>`${trimClock(part.from).replace(/\.\d+$/,'')}–${trimClock(part.to).replace(/\.\d+$/,'')}`).join(', ')}`:''}</small></button>)}</div>}</div>}
   <footer><span>{value.length?`${value.length} selected`:'Nothing selected'}</span><small>Camelot codes shown on each key</small>{value.length>0&&<button type="button" className="key-picker-clear" onClick={()=>onChange([])}>Clear</button>}</footer>
  </div>
 </div>;
}
