export function encodeMp3(buffer,from,to,signal){
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./mp3Encode.worker.js',import.meta.url),{type:'module'});
  const finish=(error,blob)=>{signal?.removeEventListener('abort',abort);worker.terminate();if(error)reject(error);else resolve(blob);};
  const abort=()=>finish(new Error('MP3 encoding canceled.'));
  if(signal?.aborted){abort();return;}
  signal?.addEventListener('abort',abort,{once:true});
  worker.onmessage=({data})=>finish(data.error?new Error(data.error):null,data.blob);
  worker.onerror=event=>{event.preventDefault();finish(new Error('MP3 encoding failed. Please try again.'));};
  try{
   const channels=Array.from({length:Math.min(buffer.numberOfChannels,2)},(_,index)=>buffer.getChannelData(index).slice(from,to));
   worker.postMessage({channels,sampleRate:buffer.sampleRate},channels.map(channel=>channel.buffer));
  }catch(error){finish(error);}
 });
}
