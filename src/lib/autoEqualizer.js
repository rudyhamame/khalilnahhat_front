import {EQUALIZER_BANDS,equalizerGain,flatEqualizer} from './audioEqualizer.js';

// Gentle broad tonal correction, measured before the EQ so it cannot chase its own changes.
// A falling high-frequency reference preserves a musical balance rather than forcing white noise.
const EDGES=[30,100,250,630,1600,4000,10000,18000];
const TARGET=[0,0,0,-1,-3,-6,-9];
const LIMIT=3;
const median=values=>{const sorted=[...values].sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]??0;};
export function autoEqualizerTarget(spectrum,sampleRate,fftSize){
 const bands=EQUALIZER_BANDS.map((_band,index)=>{
  const low=EDGES[index],high=Math.min(EDGES[index+1],sampleRate/2);
  if(high<=low)return null;
  const first=Math.max(1,Math.ceil(low*fftSize/sampleRate)),last=Math.min(spectrum.length,Math.ceil(high*fftSize/sampleRate));
  let power=0;
  for(let bin=first;bin<last;bin++)if(Number.isFinite(spectrum[bin]))power+=10**(spectrum[bin]/10);
  return power>1e-10?10*Math.log10(power/Math.log2(high/low)):null;
 });
 const usable=bands.map((value,index)=>value!=null?value-TARGET[index]:null).filter(value=>value!=null);
 if(usable.length<3)return null;
 const reference=median(usable);
 return Object.fromEntries(EQUALIZER_BANDS.map((band,index)=>[band.key,bands[index]==null?0:Math.max(-LIMIT,Math.min(LIMIT,(reference+TARGET[index]-bands[index])*.35))]));
}

export function startAutoEqualizer({graph,base=flatEqualizer(),onChange,onStatus=()=>{},schedule=setInterval,cancel=clearInterval}){
 if(!graph?.mixInput||!graph.filters){onStatus('Auto EQ unavailable: audio processing could not start.');return ()=>{};}
 let analyser;
 try{analyser=graph.context.createAnalyser();analyser.fftSize=4096;analyser.smoothingTimeConstant=.65;graph.mixInput.connect(analyser);}
 catch{onStatus('Auto EQ unavailable: audio analysis could not start.');return ()=>{};}
 const spectrum=new Float32Array(analyser.frequencyBinCount),waveform=new Float32Array(analyser.fftSize);
 const originalLevel=graph.mixInput.gain?.value??1;
 let stopped=false,frames=0,lastTime=graph.context.currentTime,lastValues={...base},correction=flatEqualizer();
 onStatus('Auto EQ listening…');
 const apply=values=>{
  const boost=Math.max(0,...EQUALIZER_BANDS.map(band=>values[band.key]-(base[band.key]||0)));
  graph.mixInput.gain?.setTargetAtTime(originalLevel*10**(-boost/20),graph.context.currentTime,.4);
  for(const band of EQUALIZER_BANDS)graph.filters[band.key].gain.setTargetAtTime(values[band.key],graph.context.currentTime,.4);
  if(EQUALIZER_BANDS.some(band=>Math.abs(values[band.key]-lastValues[band.key])>=.05)){lastValues=values;onChange(values);}
 };
 const timer=schedule(()=>{
  if(stopped)return;
  if(graph.context.state&&graph.context.state!=='running'){onStatus('Auto EQ waiting for audio…');return;}
  analyser.getFloatTimeDomainData(waveform);
  const rms=Math.sqrt(waveform.reduce((sum,value)=>sum+value*value,0)/waveform.length);
  if(!Number.isFinite(rms)||rms<.001){onStatus('Auto EQ waiting for audio…');return;}
  analyser.getFloatFrequencyData(spectrum);
  const target=autoEqualizerTarget(spectrum,graph.context.sampleRate,analyser.fftSize);
  if(!target){onStatus('Auto EQ waiting for a clear signal…');return;}
  frames++;
  const now=graph.context.currentTime,dt=Math.max(0,Math.min(1,now-lastTime));lastTime=now;
  if(frames<8)return;
  const values={};
  for(const band of EQUALIZER_BANDS){
   correction[band.key]+=(target[band.key]-correction[band.key])*(1-Math.exp(-dt/4));
   values[band.key]=equalizerGain((base[band.key]||0)+correction[band.key]);
  }
  apply(values);onStatus('Auto EQ active · gentle ±3 dB correction');
 },250);
 return ()=>{
  if(stopped)return;stopped=true;cancel(timer);
  try{graph.mixInput.disconnect(analyser);analyser.disconnect();}catch{/* Never disconnect the audible path. */}
  graph.mixInput.gain?.setTargetAtTime(originalLevel,graph.context.currentTime,.15);
  for(const band of EQUALIZER_BANDS)graph.filters[band.key].gain.setTargetAtTime(base[band.key]||0,graph.context.currentTime,.15);
  onChange({...base});
 };
}
