import {useEffect,useRef,useState} from 'react';
import {Crosshair} from 'lucide-react';
import {decodeMono} from '../lib/decodeMono';
import {firstBeat} from '../lib/bpmDetection';
import {weightHeight} from '../lib/metronome';
import './metronome3d.css';
// Transform/opacity animations run on the compositor, even while audio analysis
// occupies the main thread. Media events and occasional drift checks keep time.
export default function Metronome3D({bpm=null,range=null,beatStart=null,audioUrl='',onBeatStart=null}){
 const arm=useRef(null),flash=useRef(null),[busy,setBusy]=useState(false),[problem,setProblem]=useState('');
 const start=beatStart??range?.startSec??0;
 const sync=async()=>{
  if(busy||!audioUrl||!(bpm>0))return;setBusy(true);setProblem('');
  try{const {samples,sampleRate}=await decodeMono(audioUrl),found=firstBeat(samples,sampleRate,bpm,range?{from:range.startSec,to:range.endSec}:{});if(!found)throw Error('No clear first beat was found.');onBeatStart?.(found.start);}
  catch(error){setProblem(error.message||'The first note could not be found.');}
  finally{setBusy(false);}
 };
 useEffect(()=>{
  const node=arm.current,light=flash.current,audio=document.querySelector('.transcription-audio-tape audio');
  if(!node||!light||!audio||!(bpm>0))return;
  const duration=120000/bpm;
  const swing=node.animate([{transform:'rotate(28.6479deg)',easing:'cubic-bezier(.37,0,.63,1)'},{transform:'rotate(-28.6479deg)',offset:.5,easing:'cubic-bezier(.37,0,.63,1)'},{transform:'rotate(28.6479deg)'}],{duration,iterations:Infinity});
  const pulse=light.animate([{opacity:1},{opacity:0,offset:.06},{opacity:0,offset:.44},{opacity:1,offset:.5},{opacity:0,offset:.56},{opacity:0,offset:.94},{opacity:1}],{duration,iterations:Infinity});
  const animations=[swing,pulse];animations.forEach(animation=>animation.pause());
  let buffering=false,settling=null;
  const update=(force=false)=>{
   const playing=!audio.paused&&!audio.ended&&!audio.seeking&&!buffering&&audio.readyState>=2;
   if(!playing){
    animations.forEach(animation=>animation.pause());
    if(!settling){
     const transform=getComputedStyle(node).transform;swing.cancel();pulse.cancel();
     settling?.cancel();settling=node.animate([{transform},{transform:'rotate(0deg)'}],{duration:180,easing:'ease-out',fill:'forwards'});
    }
    return;
   }
   settling?.cancel();settling=null;
   const expected=(audio.currentTime-start)*1000,actual=Number(swing.currentTime)||0;
   const drift=Math.abs(((actual-expected)%duration+duration*1.5)%duration-duration/2);
   if(force||swing.playState!=='running'||drift>80)animations.forEach(animation=>{animation.currentTime=((expected%duration)+duration)%duration;});
   animations.forEach(animation=>{animation.playbackRate=audio.playbackRate;animation.play();});
  };
  const onMedia=()=>update(true),onWaiting=()=>{buffering=true;update();},onPlaying=()=>{buffering=false;update(true);};
  const events=['play','pause','ended','seeking','seeked','ratechange','loadedmetadata'];
  events.forEach(event=>audio.addEventListener(event,onMedia));audio.addEventListener('waiting',onWaiting);audio.addEventListener('playing',onPlaying);
  const timer=setInterval(()=>update(),500);update(true);
  return()=>{clearInterval(timer);events.forEach(event=>audio.removeEventListener(event,onMedia));audio.removeEventListener('waiting',onWaiting);audio.removeEventListener('playing',onPlaying);animations.forEach(animation=>animation.cancel());settling?.cancel();};
 },[audioUrl,bpm,start]);
 const weightBottom=25+(weightHeight(bpm)-.75)/(2.15-.75)*44;
 return <div className="metronome-wrap"><div className="metronome-3d" role="img" aria-label={bpm?`3D metronome at ${bpm} BPM`:'3D metronome'}>
  <div className="metronome-case" aria-hidden="true"><div className="metronome-face"/><div className="metronome-scale"/><div className="metronome-arm" ref={arm}><div className="metronome-rod"/><div className="metronome-weight" style={{bottom:`${weightBottom}%`}}><i ref={flash}/></div><div className="metronome-counterweight"/></div><div className="metronome-pivot"/><div className="metronome-base"/></div>
 </div><div className="metronome-bar">{beatStart!=null?<span className="metronome-caption">Synced to first beat · {beatStart.toFixed(2)} s</span>:<span className="metronome-caption">Beat 1 · start of the atom</span>}
   {audioUrl&&bpm>0&&<button type="button" className="metronome-sync" disabled={busy} onClick={sync}><Crosshair size={13} aria-hidden="true"/>{busy?'Listening…':beatStart!=null?'Resync first beat':'Sync to first beat'}</button>}</div>
  {problem&&<p className="metronome-problem" role="alert">{problem}</p>}</div>;
}
