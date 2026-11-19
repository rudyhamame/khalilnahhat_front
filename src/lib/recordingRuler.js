// Use time subdivisions, with label spacing based on the visible track width.
const STEPS=[.001,.002,.005,.01,.02,.05,.1,.2,.5,1,2,5,10,15,30,60,120,300,600,900,1800,3600];
export function recordingRulerTicks(start,span,duration,width=600){
 if(!(span>0)||!(duration>0)||!(width>0))return [];
 const major=STEPS.find(step=>step>=span*80/width)||Math.ceil(span*80/width/3600)*3600;
 const divisions=major===15||major===30?6:10,minor=major/divisions;
 const digits=major<.01?3:major<.1?2:major<1?1:0,scale=10**digits;
 const label=time=>{const rounded=Math.round(time*scale),whole=Math.floor(rounded/scale);return `${Math.floor(whole/60)}:${String(whole%60).padStart(2,'0')}${digits?'.'+String(rounded%scale).padStart(digits,'0'):''}`;};
 const out=[],stride=minor/span*width<4?2:1;
 for(let i=Math.ceil((start-1e-9)/minor);i*minor<=Math.min(duration,start+span)+1e-9;i++){
  if(i%stride)continue;
  const time=Number((i*minor).toFixed(7)),isMajor=i%divisions===0;
  if(time<0)continue;
  out.push({time,major:isMajor,medium:!isMajor&&i%(divisions/2)===0,label:isMajor?label(time):'',position:(time-start)/span*100});
 }
 return out;
}
