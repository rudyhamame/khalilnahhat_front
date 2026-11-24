import {trackBpm} from './aiDjPlanner.js';

// Both transports run continuously. Switching only changes the crossfader.
export function createAiDeckSwitch(adapter,{schedule=setInterval,cancel=clearInterval}={}){
 let enabled=false,generation=0,timer=null,active=1,tracks={},cue=0,interval=0,anchor=0;
 const live=token=>enabled&&generation===token;
 const status=(phase,message,extra={})=>adapter.status({enabled,phase,message,active,target:active===1?2:1,...extra});
 const stop=(message='AI DJ stopped. Both decks remain available for manual control.')=>{
  if(!enabled)return;enabled=false;generation++;if(timer!=null)cancel(timer);timer=null;status('off',message);
 };
 const arm=()=>{
  const deck=adapter.deck(active),bpm=trackBpm(deck.track)||120,rate=deck.rate?.()||1,grid=deck.track.audioBeatGrid;
  const origin=deck.track.manualBpm?deck.track.manualBeatOffset||0:grid?.verified?grid.firstDownbeat:grid?.beatPhaseVerified?grid.beatOffset:0;
  const bar=240/bpm;interval=Number(adapter.mixAfter?.())||8;
  cue=origin+Math.ceil((anchor+interval*rate-origin)/bar)*bar;
  status('armed',`Deck ${active} live · instant cut to Deck ${active===1?2:1} at the next scheduled bar.`,{startAt:cue});
 };
 const tick=()=>{
  if(!enabled)return;
  const decks=[adapter.deck(1),adapter.deck(2)];
  if(decks.some((deck,index)=>!deck||deck.track.id!==tracks[index+1])){stop('A recording changed. Automatic deck switching stopped.');return;}
  const finished=decks.map(deck=>deck.ended?.()||deck.duration()>0&&deck.position()>=deck.duration()-.05);
  if(finished.some(Boolean)){
   if(!finished.every(Boolean))adapter.crossfader(finished[0]?1:0);
   stop('A recording finished. The remaining deck stays audible.');return;
  }
  if(decks.some(deck=>deck.playing&& !deck.playing())){
   const audible=decks.findIndex(deck=>deck.playing?.());if(audible>=0)adapter.crossfader(audible);
   stop('A deck was paused. Automatic switching stopped.');return;
  }
  if((Number(adapter.mixAfter?.())||8)!==interval)arm();
  if(decks[active-1].position()<cue-.02)return;
  active=active===1?2:1;adapter.crossfader(active===1?0:1);
  anchor=adapter.deck(active).position();arm();
 };
 const prepare=async token=>{
  try{
   let first=adapter.deck(1),second=adapter.deck(2);
   if(!first?.track){stop('Load a recording on Deck 1.');return;}
   if(!second?.track){
    const candidates=adapter.library().filter(track=>track.id!==first.track.id);
    if(!candidates.length){stop('Load a second recording on Deck 2.');return;}
    status('loading','Loading the second recording for back-and-forth mixing…');
    let plan;try{plan=await adapter.plan({current:first.track,candidates,played:[]});}catch{plan=adapter.fallback({current:first.track,candidates,played:[]});}
    if(!live(token))return;
    const next=candidates.find(track=>track.id===plan?.nextTrackId)||candidates[0];
    if(!await adapter.load(2,next,0)){if(live(token))stop('Deck 2 could not load.');return;}
    if(!live(token))return;
   }
   tracks={1:adapter.deck(1)?.track.id,2:adapter.deck(2)?.track.id};
   status('analyzing','Preparing both decks and measuring their tempos…');
   await adapter.analyze?.(1);if(!live(token))return;
   await adapter.analyze?.(2);if(!live(token))return;
   first=adapter.deck(1);second=adapter.deck(2);
   if(first?.track.id!==tracks[1]||second?.track.id!==tracks[2]){stop('A recording changed during preparation.');return;}
   const a=trackBpm(first.track),b=trackBpm(second.track);
   if(a&&b)adapter.rate(2,Math.max(.85,Math.min(1.15,a*(first.rate?.()||1)/b)));
   adapter.pause(1);adapter.pause(2);adapter.crossfader(0);
   if(adapter.cue(1,0)===false||adapter.cue(2,0)===false){stop('Both recordings must be ready before starting.');return;}
   const started=await Promise.all([adapter.play(1),adapter.play(2)]);
   if(!live(token)){adapter.pause(1);adapter.pause(2);return;}
   if(started.some(value=>!value)){
    if(started[0])adapter.crossfader(0);else if(started[1])adapter.crossfader(1);
    stop('One deck could not start. Automatic switching stopped.');return;
   }
   active=1;anchor=adapter.deck(1).position();arm();timer=schedule(tick,20);
  }catch{if(live(token))stop('Both decks could not be prepared. Manual controls remain available.');}
 };
 return {start(){if(enabled)return;enabled=true;active=1;const token=++generation;status('starting','Starting both decks for instant back-and-forth cuts…');void prepare(token);},stop,tick,get enabled(){return enabled;}};
}
