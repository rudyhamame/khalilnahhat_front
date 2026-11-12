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
 let best=0,bestScore=-Infinity;const scores=[];
 for(let bpm=min;bpm<=max;bpm+=.25){
  const lag=rate*60/bpm;let score=at(lag)+.5*at(lag*2)+.25*at(lag*4);
  // mild preference for musical tempos (around 120) so octave errors resolve sensibly
  score*=1-.18*Math.abs(Math.log2(bpm/120));scores.push([bpm,score]);
  if(score>bestScore){bestScore=score;best=bpm;}
 }
 const second=scores.filter(([bpm])=>Math.abs(bpm-best)>best*.06).reduce((top,[,score])=>Math.max(top,score),-Infinity);
 return {bpm:Math.round(best*10)/10,strength:bestScore,clarity:bestScore-Math.max(0,second)};
}
// Tempo of the whole recording or the range, plus every distinct tempo that holds a real share (explicit about changes).
export function detectTempos(samples,sampleRate,{from=0,to=Infinity,windowSec=30,hopSec=15,minShare=.2,minRun=24,tolerance=.035}={}){
 const {flux,rate}=onsetEnvelope(samples,sampleRate),end=Math.min(flux.length/rate,to),start=Math.max(0,from),total=end-start;
 if(total<8)return {tempos:[],multiple:false,duration:total};
 const windows=[];
 for(let at=start;at+windowSec<=end+hopSec/2;at+=hopSec){const a=at,b=Math.min(end,at+windowSec),result=tempoOf(flux,rate,a,b);if(result&&result.strength>.02)windows.push({from:a,to:b,...result});}
 if(!windows.length){const whole=tempoOf(flux,rate,start,end);return whole?{tempos:[{bpm:whole.bpm,share:1,seconds:total,segments:[{from:start,to:end}]}],multiple:false,duration:total}:{tempos:[],multiple:false,duration:total};}
 // Group windows whose tempos are within `tolerance` of each other, then merge neighbouring groups into segments.
 const groups=[];
 for(const window of windows){const group=groups.find(item=>Math.abs(item.bpm-window.bpm)/item.bpm<=tolerance);if(group){group.members.push(window);group.bpm=group.members.reduce((sum,item)=>sum+item.bpm,0)/group.members.length;}else groups.push({bpm:window.bpm,members:[window]});}
 const tempos=groups.map(group=>{
  const seconds=group.members.length*hopSec,sorted=[...group.members].sort((a,b)=>a.from-b.from),segments=[];
  for(const member of sorted){const last=segments.at(-1);if(last&&member.from<=last.to+hopSec*.01)last.to=Math.min(end,member.from+hopSec*1.5);else segments.push({from:Math.max(start,member.from+(segments.length?hopSec/2:0)),to:Math.min(end,member.from+hopSec*1.5)});}
  const longest=Math.max(...segments.map(segment=>segment.to-segment.from));
  return {bpm:Math.round(group.bpm*10)/10,share:Math.min(1,seconds/(windows.length*hopSec)),seconds,segments,longest};
 }).filter(item=>item.share>=minShare&&item.longest>=minRun).sort((a,b)=>b.seconds-a.seconds);
 if(!tempos.length){const top=[...groups].sort((a,b)=>b.members.length-a.members.length)[0];tempos.push({bpm:Math.round(top.bpm*10)/10,share:1,seconds:total,segments:[{from:start,to:end}]});}
 return {tempos,multiple:tempos.length>1,duration:total};
}
