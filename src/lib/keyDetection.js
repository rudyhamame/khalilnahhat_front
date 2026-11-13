// Musical key from audio: chromagram (energy per pitch class) matched against the Krumhansl-Kessler major/minor profiles.
const NOTES=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
const MAJOR=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88],MINOR=[6.33,2.68,3.52,5.38,2.6,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
const CAMELOT={major:{C:'8B',G:'9B',D:'10B',A:'11B',E:'12B',B:'1B','F#':'2B','C#':'3B','G#':'4B','D#':'5B','A#':'6B',F:'7B'},minor:{A:'8A',E:'9A',B:'10A','F#':'11A','C#':'12A','G#':'1A','D#':'2A','A#':'3A',F:'4A',C:'5A',G:'6A',D:'7A'}};
function fft(re,im){
 const n=re.length;
 for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let len=2;len<=n;len<<=1){
  const angle=-2*Math.PI/len,wr=Math.cos(angle),wi=Math.sin(angle);
  for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){
   const a=i+k,b=a+len/2,tr=re[b]*cr-im[b]*ci,ti=re[b]*ci+im[b]*cr;
   re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const next=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=next;
  }}
 }
}
const pearson=(a,b)=>{const ma=a.reduce((x,y)=>x+y,0)/12,mb=b.reduce((x,y)=>x+y,0)/12;let n=0,da=0,db=0;for(let i=0;i<12;i++){n+=(a[i]-ma)*(b[i]-mb);da+=(a[i]-ma)**2;db+=(b[i]-mb)**2;}return da&&db?n/Math.sqrt(da*db):0;};
// samples: mono Float32Array at sampleRate (11-22 kHz is plenty). range: optional {from,to} in seconds.
export function detectKey(samples,sampleRate,{from=0,to=Infinity,maxFrames=480}={}){
 const size=8192,start=Math.max(0,Math.floor(from*sampleRate)),end=Math.min(samples.length,Math.floor(to*sampleRate));
 if(end-start<size)return {keys:[],chroma:new Array(12).fill(0)};
 const hop=size/2,total=Math.floor((end-start-size)/hop)+1,stride=Math.max(1,Math.ceil(total/maxFrames)),window=Float64Array.from({length:size},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/size));
 const binLow=Math.ceil(65*size/sampleRate),binHigh=Math.min(size/2-1,Math.floor(2100*size/sampleRate)),pitch=new Int16Array(binHigh+1).fill(-1);
 for(let bin=binLow;bin<=binHigh;bin++)pitch[bin]=((Math.round(12*Math.log2(bin*sampleRate/size/440)+69)%12)+12)%12;
 const chroma=new Float64Array(12),re=new Float64Array(size),im=new Float64Array(size);
 for(let frame=0;frame<total;frame+=stride){
  const offset=start+frame*hop;let energy=0;
  for(let i=0;i<size;i++){re[i]=samples[offset+i]*window[i];im[i]=0;energy+=re[i]*re[i];}
  if(energy<1e-6)continue;
  fft(re,im);
  const frameChroma=new Float64Array(12);let sum=0;
  for(let bin=binLow;bin<=binHigh;bin++){const magnitude=Math.sqrt(re[bin]*re[bin]+im[bin]*im[bin]);frameChroma[pitch[bin]]+=magnitude;sum+=magnitude;}
  if(sum>0)for(let p=0;p<12;p++)chroma[p]+=frameChroma[p]/sum; // each frame counts equally so loud bars do not dominate
 }
 return rankKeyChroma(Array.from(chroma));
}

export function rankKeyChroma(chroma){
 const keys=[];
 for(let tonic=0;tonic<12;tonic++)for(const [mode,profile] of [['major',MAJOR],['minor',MINOR]]){
  const rotated=Array.from({length:12},(_,i)=>profile[(i-tonic+12)%12]);
  keys.push({note:NOTES[tonic],mode,key:`${NOTES[tonic]} ${mode}`,camelot:CAMELOT[mode][NOTES[tonic]],score:pearson(Array.from(chroma),rotated)});
 }
 keys.sort((a,b)=>b.score-a.score);
 const gap=keys[0].score-keys[1].score;
 return {keys:keys.slice(0,3),chroma:Array.from(chroma),confidence:gap>.08?'high':gap>.03?'medium':'low'};
}

// Whole-recording check: detect the key of overlapping windows, smooth the result, and report every key that really takes up part of the
// recording (with where it is). `multiple` is true when more than one key holds a meaningful share, so the UI can say so explicitly.
export function detectKeySegments(samples,sampleRate,{from=0,to=Infinity,windowSec=24,hopSec=12,minShare=.15,minRun=20}={}){
 const start=Math.max(0,from),end=Math.min(samples.length/sampleRate,to),total=end-start;
 if(total<windowSec/2)return {keys:[],multiple:false,duration:total,windows:[]};
 const windows=[];
 for(let at=start;at+windowSec<=end+hopSec/2;at+=hopSec){
  const a=at,b=Math.min(end,at+windowSec),result=detectKey(samples,sampleRate,{from:a,to:b,maxFrames:64});
  if(result.keys.length)windows.push({from:a,to:b,key:result.keys[0],gap:result.keys[0].score-result.keys[1].score});
 }
 if(!windows.length)return {keys:[],multiple:false,duration:total,windows:[]};
 // Smooth: a window flips to the neighbours' key when both neighbours agree with each other.
 const labels=windows.map(window=>window.key.key);
 for(let i=1;i<labels.length-1;i++)if(labels[i-1]===labels[i+1]&&labels[i]!==labels[i-1])labels[i]=labels[i-1];
 // Merge runs into segments (hop-sized slices so overlapping windows do not double count).
 const segments=[];
 windows.forEach((window,index)=>{
  const sliceFrom=index===0?window.from:window.from+hopSec/2,sliceTo=index===windows.length-1?window.to:window.from+hopSec*1.5,last=segments.at(-1);
  if(last&&last.key===labels[index])last.to=Math.min(end,sliceTo);else segments.push({key:labels[index],from:Math.max(start,sliceFrom),to:Math.min(end,sliceTo)});
 });
 const byKey=new Map();
 for(const segment of segments){
  const info=windows.find(window=>window.key.key===segment.key)?.key,entry=byKey.get(segment.key)||{key:segment.key,note:info.note,mode:info.mode,camelot:info.camelot,seconds:0,segments:[],score:0,count:0};
  entry.seconds+=Math.max(0,segment.to-segment.from);entry.segments.push({from:segment.from,to:segment.to});byKey.set(segment.key,entry);
 }
 for(const window of windows){const entry=byKey.get(window.key.key);if(entry){entry.score+=window.key.score;entry.count++;}}
 const keys=[...byKey.values()].map(entry=>({...entry,share:entry.seconds/total,score:entry.score/Math.max(1,entry.count)})).map(entry=>({...entry,longest:Math.max(...entry.segments.map(segment=>segment.to-segment.from))})).filter(entry=>entry.share>=minShare&&entry.longest>=minRun).sort((a,b)=>b.seconds-a.seconds);
 if(!keys.length)keys.push({...[...byKey.values()].sort((a,b)=>b.seconds-a.seconds)[0],share:1});
 return {keys,multiple:keys.length>1,duration:total,windows};
}
