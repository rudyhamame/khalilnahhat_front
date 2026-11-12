import {useState} from 'react';
import {Wand2,X} from 'lucide-react';
import {decodeMono} from '../lib/decodeMono';
import {detectTempos} from '../lib/bpmDetection';
import {trimClock} from '../lib/audioTrim';
import './bpmPicker.css';

const clock=value=>trimClock(value).replace(/\.\d+$/,'');
// Tempo field: chips for every tempo of the recording, a box to type one, and automatic detection over the WHOLE recording (or atom) that says explicitly when the tempo changes.
export default function BpmPicker({label='Recording Tempo (BPM)',value=[],onChange,audioUrl='',range=null}){
 const [draft,setDraft]=useState(''),[detecting,setDetecting]=useState(false),[found,setFound]=useState(null),[problem,setProblem]=useState('');
 const add=bpm=>{const number=Math.round(Number(bpm)*10)/10;if(!(number>0&&number<=1000))return false;if(value.some(item=>Math.abs(item-number)<.05))return true;onChange([...value,number]);return true;};
 const detect=async()=>{
  if(!audioUrl||detecting)return;setDetecting(true);setProblem('');
  try{
   const {samples,sampleRate}=await decodeMono(audioUrl),result=detectTempos(samples,sampleRate,range?{from:range.startSec,to:range.endSec}:{});
   if(!result.tempos.length)throw Error('No steady tempo was found (the audio is too short or has no clear beat).');
   setFound(result);
   const fresh=result.tempos.map(item=>item.bpm).filter(bpm=>!value.some(item=>Math.abs(item-bpm)<=bpm*.02));
   if(fresh.length)onChange([...value,...fresh]);
  }catch(error){setProblem(error.message||'The tempo could not be detected.');}
  finally{setDetecting(false);}
 };
 const submit=()=>{if(add(draft))setDraft('');};
 return <div className="bpm-picker"><span className="bpm-picker-label">{label}{audioUrl&&<button type="button" className="bpm-picker-auto" disabled={detecting} onClick={detect} title={range?'Detect the tempo of this atom':'Detect the tempo from the audio'}><Wand2 size={12}/>{detecting?'Listening…':'Auto'}</button>}</span>
  <div className="bpm-picker-box">
   {value.map(item=><em key={item} className="bpm-picker-chip">{item}<small>BPM</small><i role="button" tabIndex={0} aria-label={`Remove ${item} BPM`} onClick={()=>onChange(value.filter(other=>other!==item))} onKeyDown={event=>{if(event.key==='Enter')onChange(value.filter(other=>other!==item));}}><X size={11}/></i></em>)}
   <input type="number" inputMode="decimal" min="1" max="1000" step="0.1" value={draft} placeholder={value.length?'Add another BPM':'Type a BPM'} onChange={event=>setDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();submit();}}} onBlur={submit}/>
  </div>
  {problem&&<p className="bpm-picker-note is-error" role="alert">{problem}</p>}
  {found&&<div className={`bpm-picker-note ${found.multiple?'is-multiple':'is-single'}`} role="status"><strong>{found.multiple?`${found.tempos.length} different tempos found in this ${range?'atom':'recording'}`:`One tempo throughout the ${range?'atom':'recording'}: ${found.tempos[0].bpm} BPM`}</strong>{found.multiple&&<ul>{found.tempos.map(item=><li key={item.bpm}><b>{item.bpm} BPM</b> · {Math.round(item.share*100)}% · {item.segments.map(part=>`${clock(part.from)}–${clock(part.to)}`).join(', ')}</li>)}</ul>}</div>}
 </div>;
}
