import {rankKeyChroma} from './keyDetection.js';
const NOTES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export function spectrumChroma(decibels,sampleRate,fftSize){
 const chroma=new Float64Array(12),step=sampleRate/fftSize;
 for(let bin=Math.max(1,Math.ceil(65/step));bin<Math.min(decibels.length-1,Math.floor(2100/step));bin++){
  const db=decibels[bin];if(db< -70||!Number.isFinite(db)||db<decibels[bin-1]||db<decibels[bin+1])continue;
  const midi=69+12*Math.log2(bin*step/440),note=Math.round(midi),weight=Math.max(0,1-Math.abs(midi-note)*2);
  chroma[(note%12+12)%12]+=10**(db/20)*weight;
 }
 return Array.from(chroma);
}

// Accumulate musical evidence, require repeated agreement, and drop stale keys after silence.
export function createLiveKeyTracker(){
 let frames=[],candidate='',agreements=0,locked=null,lastSignal=-Infinity;
 return {push(chroma,now){
  const sum=chroma.reduce((a,b)=>a+b,0);
  if(sum>.0001){frames.push({at:now,chroma:chroma.map(n=>n/sum)});lastSignal=now;}
  frames=frames.filter(frame=>now-frame.at<=24000);
  if(now-lastSignal>6000){frames=[];candidate='';agreements=0;locked=null;return null;}
  if(sum<=.0001)return locked;
  if(frames.length<8||now-frames[0].at<4000)return locked;
  const accumulated=Array.from({length:12},(_,i)=>frames.reduce((total,frame)=>total+frame.chroma[i],0)/frames.length);
  const result=rankKeyChroma(accumulated),best=result.keys[0],gap=best.score-result.keys[1].score;
  // Flat spectra and a single sustained note cannot establish a musical key.
  const diverse=accumulated.filter(n=>n>.045).length>=4;
  if(!diverse||best.score<.65||gap<.035){candidate='';agreements=0;return locked;}
  if(best.key===candidate)agreements++;else{candidate=best.key;agreements=1;}
  const previousScore=locked?result.keys.find(item=>item.key===locked.key)?.score??0:0;
  const clearChange=!locked||locked.key===best.key||best.score-previousScore>.15;
  if(agreements>=(locked&&locked.key!==best.key?6:3)&&clearChange)locked={key:best.key,tonic:NOTES.indexOf(best.note),mode:best.mode,confidence:result.confidence};
  return locked;
 }};
}
