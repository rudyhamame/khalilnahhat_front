import {useEffect,useRef,useState} from 'react';
import {Play,Pause,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {ontologyPath} from '../lib/musicOntology';
import './sampleTrimmer.css';

const SAMPLE_SECONDS=60;
const clock=value=>`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`;
// Pick the one minute of a recording that stands for its work type, preview it, and save it on the work type.
export default function SampleTrimmer({recording,workType,token,onClose,onSaved}){
  const dialog=useRef(null),audio=useRef(null);
  const known=recording.audio?.durationSeconds,current=workType.sample?.recordingId===recording.id?workType.sample.startSec:0;
  const [duration,setDuration]=useState(Number.isFinite(known)?known:0),[start,setStart]=useState(current),[playing,setPlaying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const longest=Math.max(0,Math.floor(duration-SAMPLE_SECONDS)),begin=Math.min(start,longest),end=Math.min(duration||begin+SAMPLE_SECONDS,begin+SAMPLE_SECONDS);
  useEffect(()=>{const node=dialog.current;if(node&&!node.open)node.showModal();},[]);
  const stop=()=>{audio.current?.pause();setPlaying(false);};
  const preview=()=>{const node=audio.current;if(!node)return;if(playing){stop();return;}node.currentTime=begin;node.play().then(()=>setPlaying(true)).catch(()=>setError('The preview could not play.'));};
  // The preview ends where the sample ends; moving the trimmer stops it so it never plays a stale window.
  const onTime=()=>{const node=audio.current;if(node&&node.currentTime>=end-.05)stop();};
  const move=value=>{stop();setStart(Number(value));};
  const save=async()=>{
    setBusy(true);setError('');
    try{const result=await apiRequest(`${ontologyPath}/work-types/${encodeURIComponent(workType.id)}/sample`,{token,method:'PUT',body:{recordingId:recording.id,startSec:begin}});onSaved?.(result.item);}
    catch(problem){setError(problem.message||'The sample could not be saved.');setBusy(false);}
  };
  const share=duration>0?Math.min(100,SAMPLE_SECONDS/duration*100):100,left=duration>0?begin/duration*100:0;
  return <dialog ref={dialog} className="sample-trimmer" aria-labelledby="sample-trimmer-title" onClose={onClose} onCancel={event=>{if(busy)event.preventDefault();}}>
    <header><div><small>{workType.name.toUpperCase()} SAMPLE</small><h2 id="sample-trimmer-title">Set as sample</h2><p>{recording.title}</p></div><button type="button" aria-label="Close" disabled={busy} onClick={()=>dialog.current?.close()}><X size={18}/></button></header>
    <audio ref={audio} src={recording.storedAudioUrl||recording.audioUrl} preload="metadata" onLoadedMetadata={event=>{if(Number.isFinite(event.currentTarget.duration))setDuration(event.currentTarget.duration);}} onTimeUpdate={onTime} onEnded={stop}/>
    <div className="sample-trimmer-body">
      <p className="sample-trimmer-hint">Choose the one minute that best shows what a {workType.name} is. Visitors hear exactly this minute on the {workType.name} card.</p>
      <div className="sample-trimmer-track" aria-hidden="true"><span style={{left:`${left}%`,width:`${share}%`}}/></div>
      <input type="range" aria-label="Sample start" min="0" max={longest} step="1" value={begin} disabled={busy||longest===0} onChange={event=>move(event.target.value)}/>
      <div className="sample-trimmer-times"><span>Start <strong>{clock(begin)}</strong></span><span>Length <strong>{clock(end-begin)}</strong></span><span>End <strong>{clock(end)}</strong></span><span>of <strong>{duration?clock(duration):'…'}</strong></span></div>
      {workType.sample&&workType.sample.recordingId!==recording.id&&<p className="sample-trimmer-note">This replaces the current {workType.name} sample ({workType.sample.title}).</p>}
      {error&&<p className="sample-trimmer-error" role="alert">{error}</p>}
    </div>
    <footer><button type="button" className="sample-trimmer-preview" disabled={busy||!duration} onClick={preview}>{playing?<Pause size={16}/>:<Play size={16}/>}{playing?'Stop preview':'Preview this minute'}</button><span/><button type="button" disabled={busy} onClick={()=>dialog.current?.close()}>Cancel</button><button type="button" className="sample-trimmer-save" disabled={busy||!duration} onClick={save}>{busy?'Saving…':'Save sample'}</button></footer>
  </dialog>;
}
