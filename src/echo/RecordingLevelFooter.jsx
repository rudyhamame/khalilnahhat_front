import RecordingLoadingHint from './RecordingLoadingHint';
import {useEffect,useRef,useState} from 'react';
import {analyzeAudio} from '../lib/audioAnalysis';
import './recordingLevelFooter.css';

const cache=new Map(),TICKS=[-48,-36,-24,-12,-6,-3,0],FLOOR=-60;
const place=value=>`${Math.max(0,Math.min(100,(value-FLOOR)/-FLOOR*100))}%`;
const dbOf=amp=>amp>1e-6?20*Math.log10(amp):-120;
const show=(value,digits=1,unit='')=>Number.isFinite(value)&&value>-119?`${value.toFixed(digits)}${unit}`:'–';
async function analyze(src,signal){
 if(cache.has(src))return cache.get(src);
 const response=await fetch(src,{signal});if(!response.ok)throw Error('The audio could not be read.');
 if(Number(response.headers.get('content-length'))>60*1024*1024)throw Error('Level analysis is skipped for files over 60 MB.');
 const Context=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!Context)throw Error('Level analysis is not supported in this browser.');
 const buffer=await new Context(2,1,32000).decodeAudioData(await response.arrayBuffer());
 if(buffer.duration>720)throw Error('Level analysis is skipped for recordings over 12 minutes.');
 const result=analyzeAudio([buffer.getChannelData(0),buffer.getChannelData(Math.min(1,buffer.numberOfChannels-1))],buffer.sampleRate);
 cache.set(src,result);if(cache.size>4)cache.delete(cache.keys().next().value);return result;
}
// Footer for DJs: live L/R level meters (dBFS) that follow the playhead, plus the loudness, headroom, noise and stereo checks for the whole file.
// Live figures: while the audio plays the chips below follow the playhead (last second for peak, RMS and stereo; 400 ms momentary loudness; clips so far). Paused: the whole-file figures.
const readout=(root,name,text,live)=>{const node=root?.querySelector(`[data-chip="${name}"]`);if(!node)return;const strong=node.querySelector('strong');if(strong.textContent!==text)strong.textContent=text;node.classList.toggle('is-live',live);};
export default function RecordingLevelFooter({src}){
 const [stats,setStats]=useState(null),[state,setState]=useState('Analyzing levels…');
 const bars=useRef({}),statsRef=useRef(null),statsBox=useRef(null),lastLive=useRef(0);statsRef.current=stats;
 useEffect(()=>{
  setStats(null);setState('Analyzing levels…');
  const controller=new AbortController();
  analyze(src,controller.signal).then(result=>{setStats(result);setState('');}).catch(error=>{if(error.name!=='AbortError')setState(error.message||'Levels could not be analyzed.');});
  return()=>controller.abort();
 },[src]);
 useEffect(()=>{
  const liveFigures=(time,data,now)=>{
   const root=statsBox.current,total=statsRef.current;
   if(!root||!total||now-lastLive.current<100)return;lastLive.current=now;
   if(time===null){const was=root.querySelector('.is-live');if(was){readout(root,'Peak',show(total.peakDb,1,' dBFS'),false);readout(root,'Loudness',show(total.lufs,1,' LUFS'),false);readout(root,'RMS',show(total.rmsDb,1,' dB'),false);readout(root,'PLR',show(total.plr,1,' dB'),false);readout(root,'Clips',String(total.clipEvents),false);readout(root,'Stereo',show(total.correlation,2),false);}return;}
   const now1=Math.min(data.peakL.length-1,Math.floor(time/data.step)),from=Math.max(0,now1-Math.round(1/data.step));
   let peak=0,sq=0,cr=0,n=0;for(let i=from;i<=now1;i++){peak=Math.max(peak,data.peakL[i],data.peakR[i]);sq+=(data.rmsL[i]**2+data.rmsR[i]**2)/2;cr+=data.corr[i];n++;}
   const rmsDb=dbOf(Math.sqrt(sq/Math.max(1,n))),mom=data.momentary[Math.min(data.momentary.length-1,Math.max(0,Math.floor(time/data.momentaryStep)-3))];
   readout(root,'Peak',show(dbOf(peak),1,' dBFS'),true);
   readout(root,'RMS',show(rmsDb,1,' dB'),true);
   readout(root,'Loudness',show(mom,1,' LUFS'),true);
   readout(root,'PLR',show(dbOf(peak)-mom,1,' dB'),true);
   readout(root,'Clips',String(data.clips[now1]),true);
   readout(root,'Stereo',show(cr/Math.max(1,n),2),true);
  };
  let frame=0;const held={L:{value:FLOOR,until:0},R:{value:FLOOR,until:0}},shown={L:FLOOR,R:FLOOR};let last=performance.now();
  const loop=now=>{
   const audio=document.querySelector('.transcription-audio-tape audio'),data=statsRef.current?.envelope,dt=Math.min(.1,(now-last)/1000);last=now;
   const live=audio&&data&&!audio.paused;
   liveFigures(live?audio.currentTime:null,data,now);
   for(const side of ['L','R']){
    let target=FLOOR;
    if(live){const index=Math.min(data.peakL.length-1,Math.floor(audio.currentTime/data.step));target=Math.max(FLOOR,dbOf((side==='L'?data.peakL:data.peakR)[index]));}
    // Fast attack, 24 dB/s release, 1.5 s peak hold.
    shown[side]=target>shown[side]?target:Math.max(target,shown[side]-24*dt);
    if(shown[side]>=held[side].value||now>held[side].until){if(shown[side]>=held[side].value)held[side]={value:shown[side],until:now+1500};else held[side]={value:shown[side],until:now+200};}
    const node=bars.current[side];
    if(node?.fill&&node.hold&&node.read&&node.clip){node.fill.style.width=`${100-parseFloat(place(shown[side]))}%`;node.hold.style.left=place(held[side].value);node.read.textContent=held[side].value>FLOOR+1?held[side].value.toFixed(1):'–';node.clip.dataset.on=held[side].value>=-.1?'true':'false';}
   }
   frame=requestAnimationFrame(loop);
  };
  frame=requestAnimationFrame(loop);return()=>cancelAnimationFrame(frame);
 },[]);
 const level=(good,warn)=>good?'is-good':warn?'is-warn':'is-bad';
 const chips=stats&&[
  ['Peak',show(stats.peakDb,1,' dBFS'),level(stats.peakDb<-1,stats.peakDb<-.1),stats.peakDb>=-.1?'At or above 0 dBFS: the file clips.':'Keep at least 1 dB of headroom.'],
  ['Loudness',show(stats.lufs,1,' LUFS'),level(stats.lufs>=-16&&stats.lufs<=-7,stats.lufs>-7||stats.lufs<-20),'Integrated, EBU R128. About −14 for streaming; −9 to −7 is a loud club master.'],
  ['RMS',show(stats.rmsDb,1,' dB'),'is-info','Average level of the whole file.'],
  ['PLR',show(stats.plr,1,' dB'),level(stats.plr>=8,stats.plr>=6),'Peak to loudness ratio: dynamics left in the master. Under 6 dB is heavily limited.'],
  ['Range',show(stats.range,1,' LU'),'is-info','Loudness range (LRA): how much the level moves.'],
  ['Noise floor',show(stats.noiseDb,1,' dB'),level(stats.noiseDb<-60,stats.noiseDb<-45),'Level of the quietest passages. Higher than −45 dB means audible hiss or room noise.'],
  ['Clips',String(stats.clipEvents),level(stats.clipEvents===0,stats.clipEvents<4),`${stats.clippedSamples} clipped samples (3 or more in a row count as an event).`],
  ['Stereo',show(stats.correlation,2),level(stats.correlation>=.3,stats.correlation>=0),'Phase correlation: +1 mono-safe, below 0 cancels in mono (club systems).'],
  ['DC offset',show(Math.max(Math.abs(stats.dcLeft),Math.abs(stats.dcRight))*100,2,' %'),level(Math.max(Math.abs(stats.dcLeft),Math.abs(stats.dcRight))<.005,Math.max(Math.abs(stats.dcLeft),Math.abs(stats.dcRight))<.02),'A constant offset wastes headroom and can click on cuts.'],
  ['Silence',`${stats.headSilence.toFixed(1)} s · ${stats.tailSilence.toFixed(1)} s`,level(stats.headSilence<1.5&&stats.tailSilence<3,stats.headSilence<4&&stats.tailSilence<8),'Silence at the start and at the end.'],
 ];
 return <footer className="recording-level-footer" aria-label="Audio level meters and checks">
  <div className="level-meters" role="group" aria-label="Live level meter in dBFS">
   {['L','R'].map(side=><div className="level-row" key={side}><b>{side}</b><div className="level-bar"><i ref={node=>{bars.current[side]={...bars.current[side],fill:node};}}/><u ref={node=>{bars.current[side]={...bars.current[side],hold:node};}}/></div><output ref={node=>{bars.current[side]={...bars.current[side],read:node};}}>–</output><span className="level-clip" data-on="false" ref={node=>{bars.current[side]={...bars.current[side],clip:node};}} title="Clip: lights above −0.1 dBFS">CLIP</span></div>)}
   <div className="level-scale" aria-hidden="true"><span/>{TICKS.map(tick=><em key={tick} style={{left:place(tick)}}>{tick}</em>)}<small>dBFS</small></div>
  </div>
  <div className="level-stats" role="list" ref={statsBox}>{stats?chips.map(([name,value,tone,hint])=><span key={name} role="listitem" data-chip={name} className={`level-chip ${tone}`} title={hint}><small>{name}</small><strong>{value}</strong></span>):state==='Analyzing levels…'?<RecordingLoadingHint message={state}/>:<span className="level-note" role="status">{state}</span>}</div>
 </footer>;
}
