import {onsetEnvelope,tempoOf} from './bpmDetection.js';
const median=values=>{const a=[...values].sort((x,y)=>x-y);return a.length?a[Math.floor(a.length/2)]:0;};
const clamp=value=>Math.max(0,Math.min(1,value));
const mod=(value,period)=>((value%period)+period)%period;
const blank=reason=>({bpm:null,tempoVerified:false,verified:false,reason,method:'spectral-onset-4/4'});
function peaksOf(flux,rate){
 const positive=Array.from(flux).filter(value=>value>0),floor=median(positive)*1.2;
 const peaks=[];let last=-Infinity;
 for(let i=1;i<flux.length-1;i++)if(flux[i]>floor&&flux[i]>=flux[i-1]&&flux[i]>flux[i+1]){
  const time=i/rate;
  if(time-last<.1){if(peaks.length&&flux[i]>peaks.at(-1).strength){peaks.at(-1).time=time;peaks.at(-1).strength=flux[i];last=time;}continue;}
  peaks.push({time,strength:flux[i]});last=time;
 }
 return peaks;
}
function refineOnsets(peaks,samples,sampleRate){
 const hop=Math.max(1,Math.round(sampleRate*.005));
 return peaks.map(hit=>{
  const start=Math.max(hop,Math.floor((hit.time-.09)*sampleRate)),end=Math.min(samples.length-hop,Math.ceil((hit.time+.09)*sampleRate));
  let previous=0,best=0,at=hit.time;
  for(let i=start-hop;i<end;i+=hop){let power=0;for(let j=i;j<i+hop&&j<samples.length;j++)power+=samples[j]*samples[j];
   const change=power-previous;if(i>=start&&change>best){best=change;at=i/sampleRate;}previous=power;
  }
  return {...hit,time:at};
 });
}
function fitGrid(peaks,period,rate){
 const bins=Math.max(8,Math.round(period*rate)),hist=new Float64Array(bins),scale=median(peaks.map(hit=>hit.strength))||1;
 for(const hit of peaks){const p=Math.round(mod(hit.time,period)/period*bins)%bins;hist[p]+=Math.min(3,hit.strength/scale);}
 let phase=0,best=-1;
 for(let p=0;p<bins;p++){const score=hist[p]+.7*(hist[(p+1)%bins]+hist[(p+bins-1)%bins]);if(score>best){best=score;phase=p/bins*period;}}
 // Refine tempo and phase with the independent onset positions, rejecting off-grid fills.
 for(let pass=0;pass<3;pass++){
  const hits=peaks.map(hit=>({...hit,index:Math.round((hit.time-phase)/period)})).filter(hit=>Math.abs(hit.time-(phase+hit.index*period))<Math.min(.085,period*.16));
  if(hits.length<12)break;
  const x=hits.reduce((s,h)=>s+h.index,0)/hits.length,y=hits.reduce((s,h)=>s+h.time,0)/hits.length;
  let xy=0,xx=0;for(const h of hits){xy+=(h.index-x)*(h.time-y);xx+=(h.index-x)**2;}
  const next=xx?xy/xx:period;if(Math.abs(next/period-1)>.025)break;
  period=next;phase=mod(y-x*period,period);
 }
 return {period,phase};
}
function matchedBeats(peaks,period,phase){
 const byBeat=new Map();
 for(const peak of peaks){const index=Math.round((peak.time-phase)/period),error=Math.abs(peak.time-(phase+index*period));if(error>Math.min(.065,period*.13))continue;
  if(!byBeat.has(index)||byBeat.get(index).strength<peak.strength)byBeat.set(index,{...peak,index,error});
 }
 return [...byBeat.values()].sort((a,b)=>a.index-b.index);
}
function phaseScores(hits){
 const scale=median(hits.map(hit=>hit.strength))||1;
 return Array.from({length:4},(_,phase)=>{const selected=hits.filter(hit=>mod(hit.index,4)===phase);return {phase,count:selected.length,score:selected.reduce((sum,hit)=>sum+Math.min(4,hit.strength/scale),0)/Math.max(1,selected.length)};}).sort((a,b)=>b.score-a.score);
}

// Requires repeated tempo support and a distinct bar accent in independent halves of the recording.
// Equal clicks, silence, tempo changes and ambiguous accents cannot verify a first downbeat.
export function analyzeAudioBeatGrid(samples,sampleRate,progress=()=>{}){
 if(!(samples instanceof Float32Array)||sampleRate<4000||samples.length/sampleRate<24)return blank('At least 24 seconds of audio are needed.');
 const duration=samples.length/sampleRate;
 let energy=0;for(const value of samples){if(!Number.isFinite(value))return blank('Invalid audio samples.');energy+=value*value;}
 if(Math.sqrt(energy/samples.length)<.0001)return blank('No rhythmic audio was detected.');
 progress('Finding onsets',.1);const {flux,rate}=onsetEnvelope(samples,sampleRate),half=512/sampleRate;
 const peaks=refineOnsets(peaksOf(flux,rate).map(hit=>({...hit,time:hit.time+half})),samples,sampleRate);
 if(peaks.length<32)return blank('Not enough repeated transients to verify the grid.');
 progress('Measuring tempo',.45);
 const window=Math.min(30,duration/2),readings=[];
 for(let at=0;at+window<=duration+.01;at+=window*.75){const result=tempoOf(flux,rate,at,at+window);if(result&&result.strength>.15)readings.push(result);}
 if(readings.length<2)return blank('The audio does not support a stable tempo.');
 const bpm=median(readings.map(item=>item.bpm)),consistent=readings.filter(item=>Math.abs(item.bpm/bpm-1)<.025).length/readings.length;
 const fitted=fitGrid(peaks,60/bpm,rate),hits=matchedBeats(peaks,fitted.period,fitted.phase),first=hits[0],last=hits.at(-1);
 if(!first||!last)return blank('No stable beat phase was detected.');
 const span=last.index-first.index+1,coverage=hits.length/Math.max(1,span),jitter=median(hits.map(hit=>hit.error));
 const split=(first.time+last.time)/2,training=hits.filter(hit=>hit.time<split),validation=hits.filter(hit=>hit.time>=split);
 const validationSpan=validation.length?validation.at(-1).index-validation[0].index+1:Infinity;
 const tempoVerified=consistent>=.8&&readings.length>=2;
 const beatPhaseVerified=tempoVerified&&coverage>=.7&&validation.length/validationSpan>=.65&&jitter<=.03&&hits.length>=32;
 const confidence=clamp(consistent*coverage*(1-jitter/.08));
 const result={method:'spectral-onset-4/4',bpm:60/fitted.period,tempoVerified,beatPhaseVerified,verified:false,beatOffset:fitted.phase,confidence,coverage,jitter,tempoConsistency:consistent,beatsPerBar:4,analyzedFrom:first.time,analyzedTo:last.time,duration};
 if(!tempoVerified)return {...result,reason:'Tempo changes across the recording.'};
 if(!beatPhaseVerified)return {...result,reason:'Audio tempo detected, but beat phase is not consistent enough to verify.'};
 progress('Checking the first beat across bars',.8);
 const all=phaseScores(hits),train=phaseScores(training),check=phaseScores(validation);
 const margin=all[0].score/Math.max(.001,all[1].score),trainMargin=train[0].score/Math.max(.001,train[1].score),checkMargin=check[0].score/Math.max(.001,check[1].score);
 const verified=all.every(slot=>slot.count>=8)&&all[0].phase===train[0].phase&&all[0].phase===check[0].phase&&margin>=1.3&&trainMargin>=1.2&&checkMargin>=1.2;
 const index=first.index+mod(all[0].phase-mod(first.index,4),4),firstDownbeat=Math.max(0,fitted.phase+index*fitted.period);
 return {...result,verified,firstDownbeat:verified?firstDownbeat:null,downbeatContrast:margin,reason:verified?'Stable tempo and recurring first-beat accents confirmed in both halves.':'Tempo detected, but the first beat of the bar is ambiguous.'};
}
