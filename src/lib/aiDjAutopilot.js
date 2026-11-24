import {nextPhraseStart,trackBpm} from './aiDjPlanner';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const summary=track=>({id:track.id,title:String(track.title||'Untitled'),artist:String(track.artist||''),bpm:trackBpm(track)||null,key:String(track.key||track.sound?.key||''),duration:Number(track.durationSeconds)||0,energy:Number(track.energy)||.5});

// AI chooses a bounded plan; this deterministic conductor owns every realtime
// command. A late/disconnected model can never interrupt the audio thread.
export function createAiDjAutopilot(adapter){
 let enabled=false,generation=0,active=1,target=0,played=[];
 const live=token=>enabled&&token===generation;
 const status=(phase,message,extra={})=>adapter.status({enabled,phase,message,active,...extra});
 const planLoop=async token=>{
  while(live(token)){
   const current=adapter.deck(active),library=adapter.library().filter(track=>track.id!==current?.track?.id);
   if(!current?.track||!library.length){status('waiting','Load a playing deck and at least one more recording.');await sleep(1000);continue;}
   target=active===1?2:active===2?3:2;
   status('planning','Choosing the next recording…',{target});
   let plan;
   try{plan=await adapter.plan({current:summary(current.track),candidates:library.map(summary),played});}
   catch{plan=await adapter.fallback({current:current.track,candidates:library,played});}
   if(!live(token)||!plan){await sleep(1000);continue;}
   const next=library.find(track=>track.id===plan.nextTrackId);
   if(!next){await sleep(500);continue;}
   status('loading',`Loading ${next.title} on Deck ${target}…`,{target,plan});
   const loaded=await adapter.load(target,next,plan.cueSeconds);
   if(!live(token)||!loaded)continue;
   const from=adapter.deck(active),to=adapter.deck(target),fromBpm=trackBpm(from.track)||120,toBpm=trackBpm(to.track)||plan.targetBpm||fromBpm;
   const rate=Math.max(.85,Math.min(1.15,(plan.targetBpm||fromBpm)/toBpm));
   adapter.rate(target,rate);
   const timing=nextPhraseStart({position:from.position(),duration:from.duration(),bpm:fromBpm*(from.rate?.()||1),transitionBars:plan.transitionBars});
   status('armed',`${plan.source==='ai'?'AI':'LOCAL'} · ${next.title} armed for ${Math.round(timing.startAt)}s · ${plan.reason}`,{target,plan,startAt:timing.startAt});
   while(live(token)&&adapter.deck(active).position()<timing.startAt-.04)await sleep(80);
   if(!live(token))break;
   const incoming=target;
   const started=await adapter.play(incoming);
   if(!live(token)){adapter.pause(incoming);break;}
   if(!started){status('waiting','The next deck could not start. Keeping the current recording playing.',{target});await sleep(1000);continue;}
   const fromSide=active===2?1:0,toSide=target===2?1:0,began=performance.now();
   status('mixing',`Mixing to ${next.title}…`,{target,plan,mixBegan:began,mixDuration:timing.duration,startAt:timing.startAt});
   while(live(token)){
    const progress=Math.min(1,(performance.now()-began)/(timing.duration*1000));
    const eased=progress*progress*(3-2*progress);
    adapter.crossfader(fromSide+(toSide-fromSide)*eased);
    adapter.bass(active,progress<.42?0:-18);
    adapter.bass(target,progress<.48?-18:0);
    if(progress>=1)break;
    await sleep(33);
   }
   if(!live(token))break;
   adapter.pause(active);adapter.bass(active,0);adapter.bass(target,0);
   played=[...played,current.track.id].slice(-24);active=target;
   status('playing',`${next.title} is live. Planning the following mix…`,{plan});
  }
 };
 return {
  start(deck=1){if(enabled)return;enabled=true;active=deck;played=[];const token=++generation;status('starting','AI DJ is starting…');void planLoop(token);},
  stop(){if(!enabled)return;enabled=false;generation++;adapter.bass(active,0);if(target)adapter.bass(target,0);target=0;status('off','AI DJ stopped. Manual controls remain live.');},
  get enabled(){return enabled;},
 };
}
