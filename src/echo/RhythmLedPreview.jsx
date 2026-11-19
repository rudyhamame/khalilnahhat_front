import {useEffect,useRef,useState} from 'react';
import {Pause,Play,Volume2,VolumeX} from 'lucide-react';
import {RHYTHM_PATTERNS,rhythmPattern,validBeatMap} from '../lib/rhythmPatterns';
import './rhythmLedPreview.css';

function stroke(context,output,kind,at){
 const gain=context.createGain();gain.connect(output);gain.gain.setValueAtTime(.0001,at);gain.gain.exponentialRampToValueAtTime(kind==='D'?.42:kind==='K'?.09:.19,at+.003);gain.gain.exponentialRampToValueAtTime(.0001,at+(kind==='D'?.21:.075));
 if(kind==='D'){const tone=context.createOscillator();tone.frequency.setValueAtTime(125,at);tone.frequency.exponentialRampToValueAtTime(48,at+.16);tone.connect(gain);tone.start(at);tone.stop(at+.23);}
 else{const noise=context.createBuffer(1,Math.ceil(context.sampleRate*.09),context.sampleRate),data=noise.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;const source=context.createBufferSource(),filter=context.createBiquadFilter();source.buffer=noise;filter.type='bandpass';filter.frequency.value=kind==='K'?2400:1700;filter.Q.value=1.1;source.connect(filter);filter.connect(gain);source.start(at);source.stop(at+.09);}
}
export default function RhythmLedPreview({options=[],draftName='',draftMap=null}){
 const choices=options.length?options.map(row=>row.value||row.label):RHYTHM_PATTERNS.map(row=>row.name);
 const [selected,setSelected]=useState(()=>choices[0]||'Maqsum'),[playing,setPlaying]=useState(false),[bpm,setBpm]=useState(100),[sound,setSound]=useState(true),[error,setError]=useState('');
 const board=useRef(null),soundRef=useRef(sound),tempoRef=useRef(bpm);soundRef.current=sound;tempoRef.current=bpm;
 useEffect(()=>{if(draftName.trim())setSelected(draftName.trim());},[draftName]);
 const savedMap=options.find(row=>(row.value||row.label)===selected)?.beatMap;
 const pattern=selected===draftName.trim()&&validBeatMap(draftMap)?draftMap:validBeatMap(savedMap)?savedMap:rhythmPattern(selected),menu=[...new Set([selected,...choices])];
 useEffect(()=>{
  if(!playing||!pattern)return;
  const Context=window.AudioContext||window.webkitAudioContext;
  if(!Context){setError('Audio preview is unavailable in this browser.');setPlaying(false);return;}
  const context=new Context(),output=context.createGain();output.gain.value=.65;output.connect(context.destination);
  const node=board.current,tempo=tempoRef,queue=[];
  let disposed=false,timer=0,frame=0,next=0,index=0,last=-1;const start=context.currentTime+.06;
  next=start;
  const schedule=()=>{
   // If a background tab delayed scheduling, skip missed notes instead of bursting them.
   if(next<context.currentTime-.1){queue.length=0;next=context.currentTime+.02;}
   while(next<context.currentTime+.12){const kind=pattern.steps[index%pattern.steps.length];if(soundRef.current&&kind!=='.')stroke(context,output,kind,next);queue.push({step:index%pattern.steps.length,at:next});index++;next+=60/tempo.current*4/Number(pattern.meter.split('/')[1])/pattern.subdivision;}
  };
  const draw=()=>{if(disposed)return;let current=last;while(queue.length&&queue[0].at<=context.currentTime)current=queue.shift().step;if(current!==last){last=current;node?.querySelectorAll('[data-step]').forEach(cell=>cell.classList.toggle('is-current',Number(cell.dataset.step)===current));}frame=requestAnimationFrame(draw);};
  context.resume().then(()=>{if(disposed)return;schedule();timer=setInterval(schedule,25);draw();}).catch(()=>{if(!disposed){setError('Preview could not start. Try Play again.');setPlaying(false);}});
  return()=>{disposed=true;clearInterval(timer);cancelAnimationFrame(frame);node?.querySelectorAll('.is-current').forEach(node=>node.classList.remove('is-current'));output.gain.cancelScheduledValues(context.currentTime);output.gain.setValueAtTime(0,context.currentTime);void context.close().catch(()=>{});};
 },[playing,pattern]);
 return <section className="rhythm-led-preview" aria-label="Rhythm LED preview">
  <div className="rhythm-led-controls"><select aria-label="Preview rhythm" value={selected} onChange={event=>{setSelected(event.target.value);setError('');}}>{menu.map(name=><option key={name}>{name}</option>)}</select><button type="button" className="rhythm-led-play" disabled={!pattern} aria-label={playing&&pattern?'Pause rhythm preview':'Play rhythm preview'} onClick={()=>{setError('');setPlaying(value=>!value);}}>{playing&&pattern?<Pause size={14} fill="currentColor"/>:<Play size={14} fill="currentColor"/>}</button><button type="button" aria-label={sound?'Mute rhythm preview':'Unmute rhythm preview'} aria-pressed={!sound} onClick={()=>setSound(value=>!value)}>{sound?<Volume2 size={14}/>:<VolumeX size={14}/>}</button></div>
  {pattern?<><div className="rhythm-led-board" ref={board} style={{'--steps':pattern.steps.length}} role="img" aria-label={`${selected}, ${pattern.meter}. ${pattern.steps.map(kind=>({D:'dum',T:'tak',K:'ka','.':'rest'})[kind]).join(', ')}`}>
   <div className="rhythm-led-count"><span/>{pattern.steps.map((_,i)=><i key={i} data-step={i}>{i%pattern.subdivision===0?i/pattern.subdivision+1:'·'}</i>)}</div>
   {['D','T'].map(kind=><div key={kind} className={`rhythm-led-row is-${kind==='D'?'dum':'tak'}`}><span>{kind==='D'?'DUM':'TAK'}</span>{pattern.steps.map((step,i)=><i key={i} data-step={i} className={`${(step===kind||(kind==='T'&&step==='K'))?'has-hit':''}${step==='K'?' is-soft':''}`}><b/></i>)}</div>)}
  </div><div className="rhythm-led-tempo"><input aria-label="Rhythm preview tempo" type="range" min="40" max="180" step="1" value={bpm} onChange={event=>setBpm(Number(event.target.value))}/><span>{bpm} <small>BPM</small></span></div><p className="rhythm-led-caption"><span><i/>{pattern.meter} · {pattern.source?'Basic pattern':'Custom pattern'}</span>{pattern.source&&<a href={pattern.source} target="_blank" rel="noreferrer" title="Rhythm pattern reference">Pattern reference ↗</a>}</p></>:<p className="rhythm-led-unavailable">No beat map for “{selected}” yet. Type its name in Add rhythm, then draw its beat map above.</p>}
  {error&&<p className="rhythm-led-error" role="alert">{error}</p>}
 </section>;
}
