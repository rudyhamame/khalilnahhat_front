import contract from './contracts/dj-remix.json' with {type:'json'};
import {trackBpm} from './aiDjPlanner.js';
export const REMIX_PRESETS=contract.presets;
export function safeStemRemixPlan(value,style='balanced'){
 const rows=value?.sequence;
 if(!Array.isArray(rows)||rows.length<2||rows.length>8||rows.some(row=>!row||typeof row!=='object'||!Object.hasOwn(REMIX_PRESETS,row.preset)||![4,8,16].includes(row.bars))||rows.at(-1).preset!=='full'||!rows.some(row=>row.preset!=='full'))return {sequence:(Object.hasOwn(contract.styles,style)?contract.styles[style]:contract.fallback).map(row=>({...row})),reason:'Local phrase arrangement',source:'local'};
 return {sequence:rows.map(row=>({preset:row.preset,bars:row.bars})),reason:String(value.reason||'Stem arrangement').slice(0,180),source:value.source==='ai'?'ai':'local'};
}

// The audio playhead schedules the arrangement. This controller never plays, pauses, seeks or reloads media.
export function createStemRemixer(adapter,{schedule=setInterval,cancel=clearInterval}={}){
 let enabled=false,generation=0,timer=null,trackId='',snapshot=null,plan=null,anchor=null,lastPosition=null,lastStep=-1,planning=false,lastStatus=null,currentSection=null,abort=null;
 const status=(phase,message)=>{if(lastStatus?.enabled===enabled&&lastStatus.phase===phase&&lastStatus.message===message)return;lastStatus={enabled,phase,message};adapter.status(lastStatus);};
 const stop=(message='Remix stopped. Previous stem mix restored.',restore=true)=>{
  if(!enabled)return;enabled=false;generation++;abort?.abort();if(timer!=null)cancel(timer);timer=null;
  if(restore&&snapshot&&adapter.track()?.id===trackId)adapter.restore(snapshot);
  snapshot=null;currentSection=null;status('off',message);
 };
 const tick=()=>{
  if(!enabled)return;
  const track=adapter.track();
  if(track?.id!==trackId){stop('Recording changed. Remix stopped.',false);return;}
  if(adapter.ended()){stop('Recording finished. Remix stopped.');return;}
  if(!adapter.ready()){lastStep=-1;currentSection=null;status('waiting',adapter.waitingMessage?.()||'Waiting for separated channels; original audio keeps playing.');return;}
  if(!adapter.playing()){status('paused','Remix paused with the song.');return;}
  if(!snapshot)snapshot=adapter.snapshot();
  if(!plan){
   if(planning)return;planning=true;const token=generation;
   status('planning','Choosing a stem arrangement…');
   Promise.resolve().then(()=>adapter.plan({signal:abort.signal})).catch(()=>null).then(value=>{if(!enabled||generation!==token)return;plan=safeStemRemixPlan(value,adapter.style?.());planning=false;tick();});return;
  }
  const bpm=trackBpm(track)||120,bar=240/bpm,position=adapter.position(),first=track.audioBeatGrid?.verified?track.audioBeatGrid.firstDownbeat:track.audioBeatGrid?.beatPhaseVerified?track.audioBeatGrid.beatOffset:0;
  if(!Number.isFinite(position)||position<0)return;
  if(anchor==null||lastPosition!=null&&position<lastPosition-.5){anchor=first+Math.max(0,Math.ceil((position+.001-first)/bar))*bar;lastStep=-1;currentSection=null;adapter.restore(snapshot);}
  lastPosition=position;
  if(position<anchor){status('armed',`Remix armed for the next bar${trackBpm(track)?'':' · estimated 120 BPM'}.`);return;}
  const cycle=plan.sequence.reduce((total,row)=>total+row.bars,0),barIndex=Math.floor((position-anchor)/bar),within=barIndex%cycle;
  let start=0,index=0;
  while(index<plan.sequence.length-1&&within>=start+plan.sequence[index].bars){start+=plan.sequence[index].bars;index++;}
  const step=Math.floor(barIndex/cycle)*plan.sequence.length+index;
  if(step===lastStep)return;lastStep=step;
  const row=plan.sequence[index],preset=REMIX_PRESETS[row.preset];
  const sectionStart=anchor+(Math.floor(barIndex/cycle)*cycle+start)*bar;
  currentSection={label:preset.label,sectionStart,sectionEnd:sectionStart+row.bars*bar,bars:row.bars};
  adapter.apply({vocals:preset.vocals,drums:preset.drums,bass:preset.bass,other:preset.other});
  status('remixing',`${plan.source==='ai'?'AI':'LOCAL'} · ${preset.label} · ${row.bars} bars${trackBpm(track)?'':' · estimated tempo'}`);
 };
 return {start(){if(enabled)return;const track=adapter.track();if(!track?.id)return;enabled=true;generation++;abort=new AbortController();trackId=track.id;snapshot=null;plan=null;anchor=null;lastPosition=null;lastStep=-1;planning=false;currentSection=null;status('waiting','Preparing remix…');timer=schedule(tick,120);tick();},stop,tick,timing(){return enabled?{trackId,anchor,phase:lastStatus?.phase,source:plan?.source||null,...currentSection}:null;},get enabled(){return enabled;}};
}
