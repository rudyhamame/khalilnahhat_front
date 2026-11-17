// Schedule after completion, never on an interval: slow folder/network reads cannot overlap.
export function pollStudioRecording({read,onValue,onError=()=>{},delay,schedule=setTimeout,cancel=clearTimeout}) {
 let stopped=false,timer;
 const controller=new AbortController();
 const poll=async()=>{
  let again=true;
  try{const value=await read(controller.signal);if(!stopped)again=onValue(value)!==false;}
  catch(error){if(!stopped)onError(error);}
  if(!stopped&&again)timer=schedule(poll,delay);
 };
 void poll();
 return()=>{stopped=true;controller.abort();cancel(timer);};
}

export function studioRecordingSnapshot(sessions,{live=false,now=Date.now()}={}) {
 const files=sessions.filter(item=>item.filename);
 const latest=[...files].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0))[0];
 const local=latest&&(live||!latest.done||now-(latest.finishedAt||0)<600000)?{
  id:latest.id,count:latest.count||0,uploaded:latest.uploaded||0,bytes:latest.bytes||0,
  localOnly:Boolean(latest.localOnly),done:Boolean(latest.done),
 }:null;
 return {files,local};
}

export function studioServerRecording(items,id) {
 const found=items.find(item=>item.id===id);
 return found?{id,status:found.status,parts:found.partCount||0,error:found.error||''}:null;
}
export const studioRecordingSettled=recording=>['ready','partial'].includes(recording?.status);
