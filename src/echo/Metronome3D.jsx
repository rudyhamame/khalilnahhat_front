import {useEffect,useRef,useState} from 'react';
import {Crosshair} from 'lucide-react';
import {decodeMono} from '../lib/decodeMono';
import {firstBeat} from '../lib/bpmDetection';
import {weightHeight} from '../lib/metronome';
import './metronome3d.css';
// Transform/opacity animations run on the compositor, even while audio analysis
// occupies the main thread. Media events and occasional drift checks keep time.
export default function Metronome3D({bpm=null,range=null,beatStart=null,audioUrl='',onBeatStart=null,previewSlotId='metronome-preview-slot',beatUnit=4}){
 const arm=useRef(null),flash=useRef(null),[busy,setBusy]=useState(false),[problem,setProblem]=useState('');
 const start=beatStart??range?.startSec??0;
 const countBpm=bpm>0?bpm*beatUnit/4:bpm;
 const timing=useRef({bpm:countBpm,start}),refresh=useRef(null);timing.current={bpm:countBpm,start};
 const sync=async()=>{
  if(busy||!audioUrl||!(bpm>0))return;setBusy(true);setProblem('');
  try{const {samples,sampleRate}=await decodeMono(audioUrl),found=firstBeat(samples,sampleRate,bpm,range?{from:range.startSec,to:range.endSec}:{});if(!found)throw Error('No clear first beat was found.');onBeatStart?.(found.start);}
  catch(error){setProblem(error.message||'The first note could not be found.');}
  finally{setBusy(false);}
 };
 useEffect(()=>{
  const node=arm.current,light=flash.current,audio=document.querySelector('.transcription-audio-tape audio');
  if(!node||!light||!audio)return;
  const currentTiming=timing,refreshMotion=refresh;
  // A fixed timeline represents two beats at 120 BPM. Live tempo changes
  // adjust playbackRate only, preserving the running animation and its position.
  const duration=1000;
  // Sample the real pendulum curve, rather than easing between only three poses.
  const poses=Array.from({length:61},(_,i)=>({offset:i/60,transform:`rotate(${Math.cos(i/60*Math.PI*2)*28.6479}deg)`}));
  const swing=node.animate(poses,{duration,iterations:Infinity,easing:'linear'});
  const pulseFrames=[{opacity:1},{opacity:0,offset:.06},{opacity:0,offset:.44},{opacity:1,offset:.5},{opacity:0,offset:.56},{opacity:0,offset:.94},{opacity:1}];
  const pulse=light.animate(pulseFrames,{duration,iterations:Infinity});
  const animations=[swing,pulse];animations.forEach(animation=>animation.pause());
  let settling=null,state='initial',lastOrigin=currentTiming.current.start;
  const align=()=>{const phase=(((audio.currentTime-currentTiming.current.start)*1000*currentTiming.current.bpm/120%duration)+duration)%duration;animations.forEach(animation=>{animation.currentTime=phase;});};
  const update=(seek=false)=>{
   const {bpm:tempo,start:origin}=currentTiming.current;
   if(!(tempo>0)||audio.paused||audio.ended){
    if(state==='stopped')return;
    state='stopped';const transform=getComputedStyle(node).transform;
    animations.forEach(animation=>animation.pause());pulse.effect.setKeyframes([{opacity:0},{opacity:0}]);settling?.cancel();
    settling=node.animate([{transform},{transform:'rotate(0deg)'}],{duration:180,easing:'ease-out',fill:'forwards'});
    return;
   }
   // Temporary buffering and seeking hold the pose; they do not cancel the swing
   // or repeatedly animate the arm upright and back out again.
   if(audio.seeking||audio.readyState<2){
    if(state==='running')animations.forEach(animation=>animation.pause());
    state='holding';return;
   }
   if(origin!==lastOrigin){lastOrigin=origin;seek=true;}
   const resumed=state!=='running';
   if(resumed||seek){settling?.cancel();settling=null;if(resumed)pulse.effect.setKeyframes(pulseFrames);align();}
   const expected=(audio.currentTime-origin)*1000*tempo/120,actual=Number(swing.currentTime)||0;
   const error=((expected-actual)%duration+duration*1.5)%duration-duration/2;
   // A small clock difference changes the speed slightly, never the position.
   const baseRate=audio.playbackRate*tempo/120;
   const rate=baseRate+Math.max(-baseRate*.05,Math.min(baseRate*.05,error/2000));
   for(const animation of animations){
    if(Math.abs(animation.playbackRate-rate)>.001)animation.updatePlaybackRate(rate);
    if(resumed)animation.play();
   }
   state='running';
  };
  const check=()=>update(),seeked=()=>update(true);
  const events=['play','playing','pause','ended','seeking','ratechange','loadedmetadata','canplay','waiting','timeupdate'];
  events.forEach(event=>audio.addEventListener(event,check));audio.addEventListener('seeked',seeked);
  refreshMotion.current=update;
  const timer=setInterval(check,250);update();
  return()=>{refreshMotion.current=null;clearInterval(timer);events.forEach(event=>audio.removeEventListener(event,check));audio.removeEventListener('seeked',seeked);animations.forEach(animation=>animation.cancel());settling?.cancel();};
 },[audioUrl]);
 useEffect(()=>{refresh.current?.();},[countBpm,start]);
 const weightBottom=25+(weightHeight(countBpm)-.75)/(2.15-.75)*44;
 return <div className="metronome-wrap"><div className="metronome-3d" role="img" aria-label={bpm?`3D metronome at ${bpm} quarter-note BPM, counting 1/${beatUnit} notes`:'3D metronome'}>
  <div className="metronome-case" aria-hidden="true"><div className="metronome-face"/><div className="metronome-scale"/><div className="metronome-arm" ref={arm}><div className="metronome-rod"/><div className="metronome-weight" style={{bottom:`${weightBottom}%`}}><i ref={flash}/></div><div className="metronome-counterweight"/></div><div className="metronome-pivot"/><div className="metronome-base"/></div>
  <div className="metronome-preview-slot" id={previewSlotId}/>
 </div><div className="metronome-bar">{beatStart!=null?<span className="metronome-caption">Synced to first beat · {beatStart.toFixed(2)} s</span>:<span className="metronome-caption">Beat 1 · start of the atom</span>}
   {audioUrl&&bpm>0&&<button type="button" className="metronome-sync" disabled={busy} onClick={sync}><Crosshair size={13} aria-hidden="true"/>{busy?'Listening…':beatStart!=null?'Resync first beat':'Sync to first beat'}</button>}</div>
  {problem&&<p className="metronome-problem" role="alert">{problem}</p>}</div>;
}
