const RANGE=40*Math.log10(2);
const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
export const trimDecibels=value=>clamp(Number.isFinite(value)?value:0,-1,1)*RANGE;
export const trimValue=db=>clamp((Number.isFinite(db)?db:0)/RANGE,-1,1);
export const trimGain=value=>10**(trimDecibels(value)/20);
const db=value=>20*Math.log10(Math.max(1e-8,value));

// Sample-level matching, not a LUFS measurement. Ignore silence and retain the user's master attenuation.
export function channelTrimTarget({rms,peak,outputPeak,currentDb=0,master=1}){
 if(![rms,peak,outputPeak,master].every(Number.isFinite)||rms<.005||peak<.01||master<=.01)return null;
 const levelTarget=-18+20*Math.log10(clamp(master,.01,1));
 const desired=levelTarget-db(rms),peakLimit=currentDb-3-db(Math.max(peak*10**(currentDb/20),outputPeak));
 return clamp(Math.min(desired,peakLimit),-12,6);
}
function readLevel(analyser,samples){
 analyser.getFloatTimeDomainData(samples);let squares=0,peak=0;
 for(const sample of samples){if(!Number.isFinite(sample))return null;squares+=sample*sample;peak=Math.max(peak,Math.abs(sample));}
 return {rms:Math.sqrt(squares/samples.length),peak};
}

export function createDjAutoTrim(adapter,{schedule=setInterval,cancel=clearInterval}={}){
 let timer=null,enabled=false,lastStatus='';const owned=new Map(),manual=new Set(),samples=new Float32Array(2048);
 const report=message=>{if(lastStatus!==message){lastStatus=message;adapter.status(message);}};
 const restore=entry=>{entry.strip.set('trim',entry.base,.25);adapter.changed(entry.n,entry.base);};
 const tick=()=>{
  if(!enabled)return;let listening=0,active=0;
  for(const n of [1,2,3,4]){
   const channel=adapter.channel(n),old=owned.get(n);
   if(old&&(!channel||old.strip!==channel.strip||old.trackId!==channel.trackId)){restore(old);owned.delete(n);}
   if(!channel?.playing||manual.has(n)||!channel.strip?.inputMeter||!channel.strip?.trimMeter||!channel.strip?.trim?.gain||channel.strip.context?.state&&channel.strip.context.state!=='running')continue;
   let entry=owned.get(n);
   if(!entry){entry={n,strip:channel.strip,trackId:channel.trackId,base:channel.manualTrim||0,frames:0,power:0};owned.set(n,entry);}
   const before=readLevel(channel.strip.inputMeter,samples),after=readLevel(channel.strip.trimMeter,samples);
   if(!before||!after)continue;
   if(before.rms<.005||before.peak<.01){entry.frames=0;entry.power=0;continue;}
   entry.power=entry.frames?entry.power*.8+before.rms**2*.2:before.rms**2;entry.frames++;listening++;
   const currentDb=20*Math.log10(Math.max(1e-8,channel.strip.trim.gain.value));
   const target=channelTrimTarget({rms:Math.sqrt(entry.power),peak:before.peak,outputPeak:after.peak,currentDb,master:adapter.master()});
   if(target==null||entry.frames<8&&after.peak<.89)continue;
   const next=clamp(target,currentDb-1,currentDb+.1);
   if(Math.abs(next-currentDb)<.08)continue;
   const value=trimValue(next);channel.strip.set('trim',value,.2);adapter.changed(n,value);active++;
  }
  const overrides=manual.size?` · CH ${[...manual].join(', ')} manual`:'';
  report(`${active?'AI trim matching levels':listening?'AI trim listening / levels steady':'AI trim waiting for audible decks'}${overrides}`);
 };
 return {
  start(){if(enabled)return;enabled=true;manual.clear();lastStatus='';report('AI trim listening…');timer=schedule(tick,250);},
  stop(){if(!enabled)return;enabled=false;if(timer!=null)cancel(timer);timer=null;for(const entry of owned.values())restore(entry);owned.clear();manual.clear();report('AI trim off · manual trims restored');},
  manual(n){if(![1,2,3,4].includes(n))return;manual.add(n);owned.delete(n);report(`CH ${n} trim is manual until AI trim is re-enabled`);},
  resume(n){manual.delete(n);},
  tick,get enabled(){return enabled;},
 };
}
