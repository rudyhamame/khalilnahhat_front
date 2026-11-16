import {startDirectRecording} from './directRecording.js';

export function recordingCaptureOutputs(main,portrait,fallback={}){
 const dimensions=track=>{const settings=track?.getSettings?.()||{};return {width:Math.round(settings.width||fallback.width),height:Math.round(settings.height||fallback.height)};};
 return [{key:'main',...dimensions(main)},...(portrait?[{key:'portrait',...dimensions(portrait)}]:[])];
}
export function recordingAspectRatios(item){
 const outputs=item.outputs?.length?item.outputs:[item];
 return [...new Set(outputs.map(output=>output.aspectRatio||'—'))].join(' + ');
}
// Each output has its own durable files/upload cursor, while sharing one live
// session. Every lifecycle action must settle all recorders, even if one fails.
export async function startRecordingOutputs({outputs,...options},start=startDirectRecording){
 const captures=outputs?.length?outputs:[{id:options.id,tracks:options.tracks}],recorders=[],progress=new Map();
 try{
  for(const capture of captures){
   recorders.push(await start({...options,id:capture.id,tracks:capture.tracks,onProgress:bytes=>{progress.set(capture.id,bytes);options.onProgress?.([...progress.values()].reduce((a,b)=>a+b,0));}}));
  }
 }catch(error){await Promise.allSettled(recorders.map(recorder=>recorder.stop(false)));throw error;}
 const settle=async work=>{
  const results=await Promise.allSettled(recorders.map(work)),failed=results.find(result=>result.status==='rejected');
  if(failed)throw failed.reason;return results.map(result=>result.value);
 };
 return {
  pause:()=>recorders.forEach(recorder=>recorder.pause?.()),resume:()=>recorders.forEach(recorder=>recorder.resume?.()),
  suspend:()=>settle(recorder=>recorder.suspend?.()),
  async stop(complete=true,{defer=false}={}){
   const uploads=await settle(recorder=>recorder.stop(complete,{defer}));
   if(defer)return async()=>{const results=await Promise.allSettled(uploads.filter(fn=>typeof fn==='function').map(fn=>fn()));const failed=results.find(result=>result.status==='rejected');if(failed)throw failed.reason;};
  },
 };
}
