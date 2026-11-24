import {useEffect,useRef,useState} from 'react';
import {djTimingVisual} from '../lib/djTimingVisual';
import './djAiTimingStrip.css';
const bpm=value=>value?value.toFixed(1):'—';
const seconds=value=>value==null?'—':`${value.toFixed(1)}s`;
const stages=[['planning','Plan'],['loading','Load'],['tempo','Tempo'],['armed','Cue'],['mixing','Mix']];

export default function DjAiTimingStrip({getSnapshot,onAnalyze}){
 const evidence=useRef(null);
 const latest=useRef(getSnapshot);latest.current=getSnapshot;
 const [snapshot,setSnapshot]=useState(()=>getSnapshot());
 useEffect(()=>{
  const observe=event=>{evidence.current={...event.detail,observedAt:performance.now()};};
  window.addEventListener('echo:music-frame',observe);
  const timer=setInterval(()=>{if(!document.hidden)setSnapshot({...latest.current(),pulse:evidence.current});},100);
  return()=>{clearInterval(timer);window.removeEventListener('echo:music-frame',observe);};
 },[]);
 const view=djTimingVisual(snapshot),ai=snapshot.ai||{},remix=snapshot.remix;
 const stage=ai.phase==='armed'?3:ai.phase==='mixing'?4:ai.phase==='loading'||ai.phase==='analyzing'?1:ai.phase==='playing'?4:0;
 return <section className="dj-timing" aria-label="AI DJ timing and tempo">
  <header><strong>AI DJ timing</strong><span>{remix?'Song remix':ai.enabled?'Auto DJ':'Manual playback'} · {view.playing?'Playing':'Paused'}</span><span className={`dj-timing-basis${view.firstBeatVerified?' is-reference':''}`}>{view.basis}</span></header>
  <div className="dj-timing-main">
   <div className="dj-timing-grid">
    <div className="dj-timing-caption"><span>4/4 beat grid{view.firstBeatVerified?'':' · estimated'}</span><b>{view.hasTrack?`Bar ${view.bar} · Beat ${view.beat}`:'No recording loaded'}</b></div>
    <div className={`dj-timing-rail${view.playing?' is-playing':''}`} aria-hidden="true">
     {Array.from({length:16},(_,index)=><span key={index} className={`${index%4===0?'is-first ':''}${view.hasTrack&&index===view.phraseBeat?'is-current':''}`}><i/><b>{index%4+1}</b></span>)}
     {view.hasTrack&&<i className="dj-timing-playhead" style={{insetInlineStart:`${view.railPosition*100}%`}}/>}
    </div>
    <div className="dj-timing-caption dj-timing-countdown"><span>Next {view.firstBeatVerified?'':'estimated '}first beat: {seconds(view.nextBarSeconds)}</span><span>{view.audioVerified?'First beat verified from recurring audio accents':view.firstBeatVerified?'Reference timing':'First beat not verified from audio'}</span></div>
    {view.analysis&&<div className="dj-timing-analysis">{onAnalyze&&<button type="button" onClick={onAnalyze} disabled={!view.hasTrack||['queued','analyzing'].includes(view.analysis.status)}>Analyze audio</button>}<span>{view.analysis.status==='verified'?'Audio grid verified':view.analysis.stage}{view.gridEvidence!=null?` · ${Math.round(view.gridEvidence*100)}% beat support`:''}</span>{['queued','analyzing'].includes(view.analysis.status)&&<progress aria-label="Audio beat-grid analysis" max="1" {...(view.analysis.progress!=null?{value:view.analysis.progress}:{})}/>}</div>}
    <div className="dj-timing-evidence"><span>{view.pulseBpm?`Live pulse estimate: ${bpm(view.pulseBpm)} BPM`:'Live pulse: waiting for consistent audio'}</span>{view.pulseConsistency!=null&&<span>{Math.round(view.pulseConsistency*100)}% pulse consistency <i role="meter" aria-label="Live pulse consistency" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(view.pulseConsistency*100)}><b style={{width:`${view.pulseConsistency*100}%`}}/></i></span>}</div>
   </div>
   <div className="dj-timing-tempo">
    <div><span>Playing tempo</span><strong>{bpm(view.effective)} <small>BPM</small></strong></div>
    <div><span>Incoming tempo</span><strong>{bpm(view.incomingBpm)} <small>BPM</small></strong></div>
    <p>{view.delta==null?'Waiting for incoming track BPM':`${view.delta>0?'+':''}${view.delta.toFixed(2)} BPM · ${view.tempoMatched?'Tempo matched':'Tempo offset'}`}</p>
    <div className="dj-timing-tempo-rail" aria-hidden="true"><i/>{view.delta!=null&&<b style={{insetInlineStart:`${50+Math.max(-8,Math.min(8,view.delta))/8*45}%`}}/>}</div>
   </div>
  </div>
  <div className="dj-timing-bottom">
   <ol aria-label="Auto DJ preparation">{stages.map(([key,label],index)=><li key={key} className={ai.enabled?(index===2?(view.tempoMatched?'is-done':view.delta!=null?'is-active':''):(index<stage?'is-done':index===stage?'is-active':'')):''}>{label}</li>)}</ol>
   <div className="dj-timing-progress"><span>{view.progressLabel}{view.countdown!=null?` · ${seconds(view.countdown)}`:''}{view.planner?` · ${view.planner.toUpperCase()}`:''}</span><div role="progressbar" aria-label={view.progressLabel} aria-valuemin={0} aria-valuemax={100} {...(view.progress!=null?{'aria-valuenow':Math.round(view.progress*100)}:{})}><i style={{width:`${(view.progress??0)*100}%`}}/></div></div>
  </div>
 </section>;
}
