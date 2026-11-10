// The window that owns MediaRecorder must flush its final chunk before the
// dashboard asks the server to disconnect the broadcast.
const CHANNEL='echo-studio-stop';
export function listenForStudioStop({roomName,stop,Channel=globalThis.BroadcastChannel}){
 if(!Channel||!roomName)return()=>{};
 const channel=new Channel(CHANNEL);let pending=null;
 channel.onmessage=event=>{
  const message=event.data;
  if(message?.type!=='stop'||message.roomName!==roomName||typeof message.id!=='string')return;
  channel.postMessage({type:'accepted',roomName,id:message.id});
  if(!pending)pending=Promise.resolve().then(stop);
  void pending.then(()=>channel.postMessage({type:'stopped',roomName,id:message.id}),()=>channel.postMessage({type:'failed',roomName,id:message.id}));
 };
 return()=>{if(pending)void pending.finally(()=>channel.close()).catch(()=>{});else channel.close();};
}
export function requestStudioStop(roomName,{Channel=globalThis.BroadcastChannel,timeout=120000}={}){
 if(!Channel)return Promise.reject(new Error('End live in the Studio window so its recording can finish saving.'));
 return new Promise((resolve,reject)=>{
  const channel=new Channel(CHANNEL),id=globalThis.crypto.randomUUID();let timer;
  const finish=error=>{clearTimeout(timer);channel.close();error?reject(error):resolve();};
  timer=setTimeout(()=>finish(new Error('Studio did not respond. End live in its source window to preserve the final recording chunks.')),5000);
  channel.onmessage=event=>{
   const message=event.data;if(message?.roomName!==roomName||message.id!==id)return;
   if(message.type==='accepted'){clearTimeout(timer);timer=setTimeout(()=>finish(new Error('Studio is still finishing the recording. Check its window before retrying.')),timeout);}
   else if(message.type==='stopped')finish();
   else if(message.type==='failed')finish(new Error('Studio could not finish stopping. Check its recording status and retry there.'));
  };
  channel.postMessage({type:'stop',roomName,id});
 });
}
