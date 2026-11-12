import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ChevronDown,Wand2,X} from 'lucide-react';
import {automate} from '../lib/recordingAutomation';
import {decodeMono} from '../lib/decodeMono';
import {detectKey,detectKeySegments} from '../lib/keyDetection';
import {trimClock} from '../lib/audioTrim';
import './keyPicker.css';

const WHITE=['C','D','E','F','G','A','B'],BLACK=[['C#','C♯','D♭',1],['D#','D♯','E♭',2],['F#','F♯','G♭',4],['G#','G♯','A♭',5],['A#','A♯','B♭',6]];
const CAMELOT={major:{C:'8B',G:'9B',D:'10B',A:'11B',E:'12B',B:'1B','F#':'2B','C#':'3B','G#':'4B','D#':'5B','A#':'6B',F:'7B'},minor:{A:'8A',E:'9A',B:'10A','F#':'11A','C#':'12A','G#':'1A','D#':'2A','A#':'3A',F:'4A',C:'5A',G:'6A',D:'7A'}};
const FLATS={Db:'C#',Eb:'D#',Gb:'F#',Ab:'G#',Bb:'A#'};
const norm=value=>{const [note,mode]=String(value||'').split(' ');return `${FLATS[note]||note} ${mode}`;};
const label=value=>{const [note,mode]=norm(value).split(' ');return `${value} ${CAMELOT[mode]?.[note]?`· ${CAMELOT[mode][note]}`:''}`.trim();};
// Pick musical keys on a one-octave keyboard: choose major or minor, tap the notes. DJ Camelot codes (8A, 9B…) are shown beside each note.
export default function KeyPicker({label:title='Musical keys',value=[],onChange,audioUrl='',range=null}){
 const [open,setOpen]=useState(false),[mode,setMode]=useState('major'),trigger=useRef(null),menu=useRef(null),[box,setBox]=useState(null);
 const chosen=new Set(value.map(norm)),[detecting,setDetecting]=useState(false),[found,setFound]=useState(null),[problem,setProblem]=useState('');
 const stamp=range?`${range.startSec.toFixed(1)}–${range.endSec.toFixed(1)} s`:'';
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
 // Automatic: as soon as there is audio (or an atom range) and no key chosen yet, listen once and pick the most likely key.
 const latest=useRef(),autoId=useRef(''),rangeKey=range?`${range.startSec.toFixed(1)}-${range.endSec.toFixed(1)}`:'all';
 latest.current=detect;
 useEffect(()=>{
  if(!audioUrl||value.length)return undefined;
  const id=`${audioUrl}|${rangeKey}`;if(autoId.current===id)return undefined;
  autoId.current=id;automate(audioUrl,'key',()=>latest.current(),rangeKey);
  return undefined;
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[audioUrl,rangeKey,value.length]);
 const toggle=note=>{const key=`${note} ${mode}`;onChange(chosen.has(key)?value.filter(item=>norm(item)!==key):[...value,key]);};
 useEffect(()=>{
  if(!open)return undefined;
  const rect=trigger.current.getBoundingClientRect();setBox({left:rect.left,top:Math.min(rect.bottom+6,window.innerHeight-300),width:Math.max(rect.width,340)});
  const away=event=>{if(!menu.current?.contains(event.target)&&!trigger.current?.contains(event.target))setOpen(false);},key=event=>{if(event.key==='Escape')setOpen(false);};
  document.addEventListener('pointerdown',away);document.addEventListener('keydown',key);
  return()=>{document.removeEventListener('pointerdown',away);document.removeEventListener('keydown',key);};
 },[open]);
 return <div className="key-picker"><span className="key-picker-label">{title}{audioUrl&&<button type="button" className="key-picker-auto" disabled={detecting} onClick={detect} title={range?`Detect the key of this atom (${stamp})`:'Detect the key from the audio'}><Wand2 size={12}/>{detecting?'Listening…':'Auto'}</button>}</span>
  <button type="button" ref={trigger} className="key-picker-trigger" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(current=>!current)}>
   <span className="key-picker-chips">{value.length?value.map(item=><em key={item} className="key-picker-chip">{label(item)}<i role="button" tabIndex={0} aria-label={`Remove ${item}`} onClick={event=>{event.stopPropagation();onChange(value.filter(other=>other!==item));}} onKeyDown={event=>{if(event.key==='Enter'){event.stopPropagation();onChange(value.filter(other=>other!==item));}}}><X size={11}/></i></em>):<span className="key-picker-empty">Choose keys</span>}</span><ChevronDown size={15} aria-hidden="true"/>
  </button>
  {open&&box&&createPortal(<div ref={menu} className="key-picker-menu" role="dialog" aria-label="Choose musical keys" style={{left:box.left,top:box.top,width:box.width}}>
   <header><strong>Musical key</strong><div className="key-picker-mode" role="group" aria-label="Mode">{['major','minor'].map(item=><button key={item} type="button" aria-pressed={mode===item} onClick={()=>setMode(item)}>{item==='major'?'Major':'Minor'}</button>)}</div></header>
   <div className="key-picker-board" role="group" aria-label={`${mode} keys`}>
    <div className="key-picker-whites">{WHITE.map(note=><button key={note} type="button" className="key-picker-key" aria-pressed={chosen.has(`${note} ${mode}`)} aria-label={`${note} ${mode}`} onClick={()=>toggle(note)}><b>{note}</b><small>{CAMELOT[mode][note]}</small></button>)}</div>
    {BLACK.map(([note,sharp,flat,gap])=><button key={note} type="button" className="key-picker-key is-black" style={{left:`${gap/7*100}%`}} aria-pressed={chosen.has(`${note} ${mode}`)} aria-label={`${sharp} or ${flat} ${mode}`} onClick={()=>toggle(note)}><b>{sharp}<i>{flat}</i></b><small>{CAMELOT[mode][note]}</small></button>)}
   </div>
   {audioUrl&&<div className="key-picker-detect"><button type="button" disabled={detecting} onClick={detect}><Wand2 size={14}/>{detecting?'Listening to the audio…':found?'Detect again':range?'Auto-detect from this atom':'Auto-detect from the audio'}</button>
    {problem&&<p role="alert">{problem}</p>}
    {found&&<div className="key-picker-found"><span className={found.multiple?'is-multiple':'is-single'}>{found.multiple?`${found.items.length} different keys found in this ${range?'atom':'recording'}`:`One key throughout the ${range?'atom':'recording'}`}</span>{found.items.map(item=><button key={item.key} type="button" aria-pressed={chosen.has(norm(item.key))} onClick={()=>{setMode(item.mode);toggle(item.note);}}><b>{item.key}</b><small>{item.camelot}{found.multiple&&item.share?` · ${Math.round(item.share*100)}% · ${item.ranges.map(part=>`${trimClock(part.from).replace(/\.\d+$/,'')}–${trimClock(part.to).replace(/\.\d+$/,'')}`).join(', ')}`:''}</small></button>)}</div>}</div>}
   <footer><span>{value.length?`${value.length} selected`:'Nothing selected'}</span><small>Camelot codes shown on each key</small>{value.length>0&&<button type="button" className="key-picker-clear" onClick={()=>onChange([])}>Clear</button>}</footer>
  </div>,document.querySelector('.admin-workspace')||document.body)}
 </div>;
}
