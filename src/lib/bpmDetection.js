// Tempo from audio: onset-strength envelope (spectral flux) -> autocorrelation with harmonic reinforcement -> BPM, per window so tempo changes show up.
const SIZE=1024,HOP=128;
function fft(re,im){
 const n=re.length;
 for(let i=1,j=0;i<n;i++){let bit=n>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];[im[i],im[j]]=[im[j],im[i]];}}
 for(let len=2;len<=n;len<<=1){const angle=-2*Math.PI/len,wr=Math.cos(angle),wi=Math.sin(angle);
  for(let i=0;i<n;i+=len){let cr=1,ci=0;for(let k=0;k<len/2;k++){const a=i+k,b=a+len/2,tr=re[b]*cr-im[b]*ci,ti=re[b]*ci+im[b]*cr;re[b]=re[a]-tr;im[b]=im[a]-ti;re[a]+=tr;im[a]+=ti;const next=cr*wr-ci*wi;ci=cr*wi+ci*wr;cr=next;}}
 }
}
// Onset strength per hop (positive change of log magnitude, 60 Hz - 6 kHz).
export function onsetEnvelope(samples,sampleRate){
 const frames=Math.max(0,Math.floor((samples.length-SIZE)/HOP)),flux=new Float32Array(frames),window=Float64Array.from({length:SIZE},(_,i)=>.5-.5*Math.cos(2*Math.PI*i/SIZE));
 const low=Math.max(1,Math.floor(60*SIZE/sampleRate)),high=Math.min(SIZE/2-1,Math.floor(6000*SIZE/sampleRate)),previous=new Float64Array(high+1),re=new Float64Array(SIZE),im=new Float64Array(SIZE);
 for(let f=0;f<frames;f++){
  const offset=f*HOP;for(let i=0;i<SIZE;i++){re[i]=samples[offset+i]*window[i];im[i]=0;}
  fft(re,im);let sum=0;
  for(let bin=low;bin<=high;bin++){const value=Math.log1p(Math.hypot(re[bin],im[bin])*20);const diff=value-previous[bin];if(diff>0)sum+=diff;previous[bin]=value;}
  flux[f]=sum;
 }
 return {flux,rate:sampleRate/HOP};
}
// Tempo of one stretch of the envelope.
export function tempoOf(flux,rate,from,to,{min=70,max=180}={}){
 const a=Math.max(0,Math.floor(from*rate)),b=Math.min(flux.length,Math.floor(to*rate)),n=b-a;
 if(n<rate*6)return null;
 let mean=0;for(let i=a;i<b;i++)mean+=flux[i];mean/=n;
 const x=new Float64Array(n);let energy=0;for(let i=0;i<n;i++){x[i]=flux[a+i]-mean;energy+=x[i]*x[i];}
 if(energy<=1e-9)return null;
 const maxLag=Math.min(n-1,Math.ceil(rate*60/(min/2))),ac=new Float64Array(maxLag+2);
 for(let lag=1;lag<=maxLag;lag++){let sum=0;for(let i=0;i+lag<n;i++)sum+=x[i]*x[i+lag];ac[lag]=sum/energy*(n/(n-lag));}
 const at=lag=>{const i=Math.floor(lag),frac=lag-i;return (ac[i]||0)*(1-frac)+(ac[i+1]||0)*frac;};
 let best=0,bestScore=-Infinity;const scores=[],raw=[];
 for(let bpm=min;bpm<=max;bpm+=.25){
  const lag=rate*60/bpm;const plain=at(lag)+.5*at(lag*2)+.25*at(lag*4);raw.push(plain);
  // mild preference for musical tempos (around 120) so octave errors resolve sensibly
  const score=plain*(1-.18*Math.abs(Math.log2(bpm/120)));scores.push([bpm,score]);
  if(score>bestScore){bestScore=score;best=bpm;}
 }
 const second=scores.filter(([bpm])=>Math.abs(bpm-best)>best*.06).reduce((top,[,score])=>Math.max(top,score),-Infinity);
 return {bpm:Math.round(best*10)/10,strength:bestScore,clarity:bestScore-Math.max(0,second),raw,min};
}
// The same tempo can be read at half speed or double speed (71.5 is the 143 beat counted every second beat). Tempos are folded into one octave so they count as one.
export const foldTempo=bpm=>{let value=bpm;while(value<85)value*=2;while(value>=170)value/=2;return value;};
// Tempo of the whole recording or the range, plus every distinct tempo that holds a real share (explicit about changes).
export function detectTempos(samples,sampleRate,{from=0,to=Infinity,windowSec=30,hopSec=15,minShare=.2,minRun=24,tolerance=.035}={}){
 const {flux,rate}=onsetEnvelope(samples,sampleRate),end=Math.min(flux.length/rate,to),start=Math.max(0,from),total=end-start;
 if(total<8)return {tempos:[],multiple:false,duration:total};
 const windows=[];
 for(let at=start;at+windowSec<=end+hopSec/2;at+=hopSec){const a=at,b=Math.min(end,at+windowSec),result=tempoOf(flux,rate,a,b);if(result&&result.strength>.02)windows.push({from:a,to:b,...result});}
 if(!windows.length){const whole=tempoOf(flux,rate,start,end);return whole?{tempos:[{bpm:Math.round(foldTempo(whole.bpm)*10)/10,share:1,seconds:total,segments:[{from:start,to:end}]}],multiple:false,duration:total}:{tempos:[],multiple:false,duration:total};}
// One tempo for the whole piece: the per-window autocorrelation curves are added up (each scaled to its own peak), so a few unclear windows cannot outvote the rest.
 const grid=windows[0].raw.length,step=.25,total_=new Float64Array(grid);
 for(const window of windows){const peak=Math.max(1e-9,...window.raw);for(let i=0;i<grid;i++)total_[i]+=Math.max(0,window.raw[i])/peak;}
 let mainIndex=0,mainScore=-Infinity;
 for(let i=0;i<grid;i++){const bpm=windows[0].min+i*step,score=total_[i]*(1-.18*Math.abs(Math.log2(bpm/120)));if(score>mainScore){mainScore=score;mainIndex=i;}}
 // Parabolic refinement between grid points.
 const left=total_[Math.max(0,mainIndex-1)],mid=total_[mainIndex],right=total_[Math.min(grid-1,mainIndex+1)],denominator=left-2*mid+right,shift=denominator?.5*(left-right)/denominator:0;
 const main=windows[0].min+(mainIndex+Math.max(-.5,Math.min(.5,shift)))*step;
 // A window that reads 1/2, 2/3, 3/4, 4/3, 3/2 or 2 times the main tempo is the same groove counted in a different subdivision (a dabke 6/8 reads as 122, 81 and 163); only a tempo unrelated to those is a real change.
 const RATIOS=[1/2,2/3,3/4,1,4/3,3/2,2],related=bpm=>RATIOS.some(ratio=>Math.abs(bpm/(main*ratio)-1)<.04);
 const groups=[{bpm:main,members:[]}];
 for(const window of windows){
  if(related(window.bpm)){groups[0].members.push(window);continue;}
  const group=groups.slice(1).find(item=>Math.abs(item.bpm-window.bpm)/item.bpm<=tolerance);
  if(group){group.members.push(window);group.bpm=group.members.reduce((sum,item)=>sum+item.bpm,0)/group.members.length;}
  else groups.push({bpm:window.bpm,members:[window]});
 }
 groups[0].bpm=main;
 const usedGroups=groups.filter(group=>group.members.length);
 groups.length=0;groups.push(...usedGroups);
 const tempos=groups.map(group=>{
  const seconds=group.members.length*hopSec,sorted=[...group.members].sort((a,b)=>a.from-b.from),segments=[];
  for(const member of sorted){const last=segments.at(-1);if(last&&member.from<=last.to+hopSec*.01)last.to=Math.min(end,member.from+hopSec*1.5);else segments.push({from:Math.max(start,member.from+(segments.length?hopSec/2:0)),to:Math.min(end,member.from+hopSec*1.5)});}
  const longest=Math.max(...segments.map(segment=>segment.to-segment.from));
  return {bpm:Math.round(foldTempo(group.bpm)*10)/10,share:Math.min(1,seconds/(windows.length*hopSec)),seconds,segments,longest};
 }).filter(item=>item.share>=minShare&&item.longest>=minRun).sort((a,b)=>b.seconds-a.seconds);
 if(!tempos.length){const top=[...groups].sort((a,b)=>b.members.length-a.members.length)[0];tempos.push({bpm:Math.round(top.bpm*10)/10,share:1,seconds:total,segments:[{from:start,to:end}]});}
 // The readings that fit this audio at one, half and double speed, with how strongly the beat repeats at each (1 = the strongest). Close values mean the audio itself does not say which speed is "the" beat.
 const strengthAt=bpm=>{const index=Math.round((bpm-windows[0].min)/step);return index<0||index>=grid?0:Math.max(0,total_[index])/Math.max(1e-9,total_[mainIndex]);};
 const suggested=tempos[0]?.bpm??foldTempo(main),candidates=[suggested,suggested/2,suggested*2].map(bpm=>({bpm:Math.round(bpm*10)/10,strength:Math.round(strengthAt(bpm)*100)/100})).filter(item=>item.strength>0).sort((a,b)=>b.strength-a.strength);
 const ambiguous=candidates.length>1&&candidates[1].strength>=.85*candidates[0].strength;
 return {tempos,multiple:tempos.length>1,duration:total,candidates,ambiguous};
}
