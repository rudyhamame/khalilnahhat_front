import RecordingLoadingHint from './RecordingLoadingHint';
import {useEffect,useRef,useState} from 'react';
import {AudioWaveform,Check,Hand,Minus,Wand2} from 'lucide-react';
import {decodeMono} from '../lib/decodeMono';
import {detectTempos} from '../lib/bpmDetection';
import './bpmPicker.css';

const round=value=>Math.round(value*10)/10;
const valid=value=>Number.isFinite(value)&&value>=20&&value<=400;
// Tempo of one atom or recording: ONE value. Detection only suggests; half, double, tap and typing confirm it. A value you set yourself is never re-guessed.
export default function BpmPicker({label='Tempo (BPM)',value=null,onChange,audioUrl='',range=null}){
 const [detecting,setDetecting]=useState(false),[found,setFound]=useState(null),[problem,setProblem]=useState('');
 // 'confirmed' = saved or set by you; 'suggested' = just detected and not touched yet.
 const [source,setSource]=useState(value==null?'':'confirmed');
 const [draft,setDraft]=useState(value==null?'':String(value)),taps=useRef([]),[tapCount,setTapCount]=useState(0),tapTimer=useRef(null);
 useEffect(()=>{setDraft(value==null?'':String(value));},[value]);
 useEffect(()=>()=>clearTimeout(tapTimer.current),[]);
 const set=(next,from='confirmed')=>{const bpm=next==null?null:round(next);if(bpm!=null&&!valid(bpm))return;setSource(bpm==null?'':from);onChange(bpm);};
 const detect=async()=>{
  if(!audioUrl||detecting)return;setDetecting(true);setProblem('');
  try{
   const {samples,sampleRate}=await decodeMono(audioUrl),result=detectTempos(samples,sampleRate,range?{from:range.startSec,to:range.endSec}:{});
   if(!result.tempos.length)throw Error('No steady tempo was found (the audio is too short or has no clear beat).');
   setFound(result);set(result.tempos[0].bpm,'suggested');
  }catch(error){setProblem(error.message||'The tempo could not be detected.');}
  finally{setDetecting(false);}
 };
 // Tap tempo: the median gap of the last taps; a pause of two seconds starts over.
 const tap=()=>{
  const now=performance.now(),list=taps.current;if(list.length&&now-list.at(-1)>2000)list.length=0;
  list.push(now);if(list.length>9)list.shift();setTapCount(list.length);
  clearTimeout(tapTimer.current);tapTimer.current=setTimeout(()=>{taps.current=[];setTapCount(0);},2000);
  if(list.length>=3){const gaps=list.slice(1).map((time,index)=>time-list[index]).sort((a,b)=>a-b),median=gaps[Math.floor(gaps.length/2)];set(60000/median);}
 };
 // Shift+B taps too, from anywhere on the page except while typing in a text field (the tempo box itself is fine).
 const tapRef=useRef(tap);tapRef.current=tap;
 useEffect(()=>{
  const onKey=event=>{
   if(!event.shiftKey||event.ctrlKey||event.metaKey||event.altKey||event.repeat||event.code!=='KeyB')return;
   const target=event.target,tag=target?.tagName,ownBox=target?.closest?.('.bpm-value');
   if(!ownBox&&(tag==='TEXTAREA'||tag==='SELECT'||target?.isContentEditable||(tag==='INPUT'&&!['checkbox','radio','range','button'].includes(target.type))))return;
   event.preventDefault();tapRef.current();
  };
  window.addEventListener('keydown',onKey);return()=>window.removeEventListener('keydown',onKey);
 },[]);
 const commit=()=>{const number=Number(draft);if(draft===''){set(null);return;}if(valid(number))set(number);else setDraft(value==null?'':String(value));};
 const alternatives=(found?.candidates||[]).filter(item=>value==null||Math.abs(item.bpm-value)>.05);
 return <div className="bpm"><RecordingLoadingHint message={detecting?'Detecting tempo from the audio…':''}/>
  <div className="bpm-head"><span className="bpm-label">{label}</span>{value!=null&&source&&<span className={`bpm-state is-${source}`}>{source==='confirmed'?<><Check size={11} aria-hidden="true"/>Confirmed</>:<><Wand2 size={11} aria-hidden="true"/>Suggested</>}</span>}</div>
  <div className="bpm-dial">
   <button type="button" className="bpm-step" disabled={value==null} onClick={()=>set(value/2)} title="Half speed" aria-label="Half the tempo">÷2</button>
   <label className="bpm-value"><input type="number" inputMode="decimal" min="20" max="400" step="0.1" value={draft} placeholder="—" aria-label={label} onChange={event=>setDraft(event.target.value)} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();commit();}}}/><small>BPM</small></label>
   <button type="button" className="bpm-step" disabled={value==null} onClick={()=>set(value*2)} title="Double speed" aria-label="Double the tempo">×2</button>
  </div>
  <div className="bpm-actions">
   <button type="button" onClick={tap} title="Tap along with the beat (3 taps or more). Shortcut: Shift+B"><Hand size={13} aria-hidden="true"/>{tapCount>0?`Tap · ${tapCount}`:'Tap'}<kbd>⇧B</kbd></button>
   {audioUrl&&<button type="button" disabled={detecting} onClick={detect} title={range?'Detect the tempo of this atom':'Detect the tempo from the audio'}><AudioWaveform size={13} aria-hidden="true"/>Detect</button>}
   {value!=null&&<button type="button" className="is-quiet" onClick={()=>{set(null);setFound(null);}} aria-label="Clear the tempo"><Minus size={13} aria-hidden="true"/>Clear</button>}
  </div>
  {problem&&<p className="bpm-note is-error" role="alert">{problem}</p>}
  {found&&<div className={`bpm-note ${found.ambiguous?'is-ambiguous':found.multiple?'is-multiple':'is-clear'}`} role="status">
   {found.ambiguous?<><strong>The audio fits two speeds equally well.</strong> Pick the one you feel as the beat.</>
    :found.multiple?<><strong>The tempo changes in this {range?'atom':'recording'}.</strong> The main tempo is suggested; the others:</>
    :<><strong>One steady tempo</strong> through the {range?'atom':'recording'}.</>}
   {(found.ambiguous||found.multiple)&&<ul className="bpm-options">
    {(found.ambiguous?alternatives:found.tempos.slice(1)).map(item=><li key={item.bpm}><button type="button" onClick={()=>set(item.bpm)}><b>{item.bpm}</b> BPM{item.share!=null&&<small>{Math.round(item.share*100)}%</small>}</button></li>)}
    {found.ambiguous&&value!=null&&<li className="is-current"><span><b>{value}</b> BPM<small>chosen</small></span></li>}
   </ul>}
  </div>}
 </div>;
}
