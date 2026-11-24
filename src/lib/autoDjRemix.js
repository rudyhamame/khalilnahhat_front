// Follow the live deck; restore its mix before switching adapters or crossfading.
export function createAutoDjRemix(adapter){
 let owned=false,key=null;
 const stop=()=>{if(owned)adapter.stop();owned=false;key=null;};
 return {stop,sync({enabled,remixEnabled=true,phase,active=1,selectedDeck,trackId,style='balanced'}){
  if(!enabled||!remixEnabled||phase==='mixing'){stop();return;}
  if(active!==selectedDeck){stop();adapter.select(active);return;}
  if(!trackId){stop();return;}
  const next=`${active}:${trackId}:${style}`;
  if(owned&&key===next)return;
  stop();adapter.start();owned=true;key=next;
 }};
}
