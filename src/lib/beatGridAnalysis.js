import {archiveAudioIdentity} from './archivePlaybackSource.js';
import {playbackMediaUrl} from './playbackMediaUrl.js';
export const GRID_MAX_SECONDS=600,GRID_MAX_BYTES=32*1024*1024;
const cancelled=()=>new DOMException('Analysis cancelled','AbortError');
const cache=new Map();
export const beatAnalysisKey=track=>track?.id&&track?.audioUrl?`${track.id}|${archiveAudioIdentity(track.audioUrl)}`:'';
export function measuredTrack(track,state){return track&&state?.grid?{...track,audioBeatGrid:state.grid}:track;}
export function verifiedGridAt(track,position){
 const grid=track?.audioBeatGrid;
 return grid?.verified&&grid.tempoVerified&&Number.isFinite(grid.firstDownbeat)&&position>=grid.firstDownbeat-.05&&position>=grid.analyzedFrom-.1&&position<=grid.analyzedTo+.1?grid:null;
}
async function download(url,signal,progress){
 const response=await fetch(playbackMediaUrl(url),{signal});
 if(!response.ok)throw Error('The recording could not be read for beat analysis.');
 const total=Number(response.headers.get('content-length'))||0;
 if(total>GRID_MAX_BYTES){await response.body?.cancel();throw Error('Recording exceeds the 32 MB analysis limit.');}
 if(!response.body?.getReader){const data=await response.arrayBuffer();if(data.byteLength>GRID_MAX_BYTES)throw Error('Recording exceeds the analysis limit.');return data;}
 const reader=response.body.getReader(),parts=[];let bytes=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>GRID_MAX_BYTES)throw Error('Recording exceeds the analysis limit.');parts.push(value);progress('Reading recording',total?Math.min(.25,bytes/total*.25):null);}}
 catch(error){await reader.cancel().catch(()=>{});throw error;}
 const data=new Uint8Array(bytes);let offset=0;for(const part of parts){data.set(part,offset);offset+=part.length;}return data.buffer;
}
export async function browserBeatAnalysis(track,{signal,progress}){
 const Decoder=globalThis.OfflineAudioContext||globalThis.webkitOfflineAudioContext;
 if(!Decoder||typeof Worker==='undefined')throw Error('Background audio analysis is unavailable in this browser.');
 const data=await download(track.audioUrl,signal,progress);if(signal.aborted)throw cancelled();
 progress('Decoding audio',.3);
 let decoded=await new Decoder(1,1,11025).decodeAudioData(data);
 if(signal.aborted)throw cancelled();
 if(decoded.duration>GRID_MAX_SECONDS)throw Error('Recording exceeds the 10-minute analysis limit.');
 const mono=new Float32Array(decoded.length);
 const sampleRate=decoded.sampleRate;
 for(let from=0;from<mono.length;from+=65536){
  if(signal.aborted)throw cancelled();
  for(let c=0;c<decoded.numberOfChannels;c++){const values=decoded.getChannelData(c);for(let i=from;i<Math.min(from+65536,mono.length);i++)mono[i]+=values[i]/decoded.numberOfChannels;}
  await new Promise(done=>setTimeout(done,0));
 }
 decoded=null;if(signal.aborted)throw cancelled();
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('../workers/audioBeatGrid.worker.js',import.meta.url),{type:'module'});
  let finished=false;
  const timer=setTimeout(()=>finish(Error('Beat analysis exceeded the time limit.')),20000);
  const finish=(error,grid)=>{if(finished)return;finished=true;clearTimeout(timer);signal.removeEventListener('abort',abort);worker.terminate();if(error)reject(error);else resolve(grid);};
  const abort=()=>finish(cancelled());signal.addEventListener('abort',abort,{once:true});
  worker.onmessage=event=>{const value=event.data;if(value.type==='progress')progress(value.stage,.35+value.progress*.6);else if(value.type==='result')finish(null,value.grid);else if(value.type==='error')finish(Error(value.message));};
  worker.onerror=()=>finish(Error('Beat analysis worker could not finish.'));
  worker.postMessage({samples:mono.buffer,sampleRate},[mono.buffer]);
 });
}

// One bounded background job at a time; results are tied to exact media, never just the track ID.
export function createBeatGridAnalysis({run=browserBeatAnalysis,resultCache=cache}={}){
 const jobs=new Map(),queue=[];let active=null,disposed=false;
 const pump=async()=>{
  if(active||disposed)return;const job=queue.shift();if(!job)return;active=job;
  const controller=new AbortController();job.controller=controller;
  const progress=(stage,value)=>{if(!disposed)job.state={status:'analyzing',stage,progress:value};};
  try{
   const grid=await run(job.track,{signal:controller.signal,progress});
   if(disposed||controller.signal.aborted)job.state={status:'cancelled',stage:'Analysis cancelled'};
   else{job.state={status:grid.verified?'verified':grid.tempoVerified?'tempo-only':'uncertain',stage:grid.reason,progress:1,grid};resultCache.set(job.key,job.state);while(resultCache.size>16)resultCache.delete(resultCache.keys().next().value);}
  }catch(error){job.state={status:disposed||error.name==='AbortError'?'cancelled':'unavailable',stage:error.name==='AbortError'?'Analysis cancelled':error.message};}
  finally{job.resolve(job.state);active=null;pump();}
 };
 return {
  get(track){const key=beatAnalysisKey(track);return jobs.get(key)?.state||resultCache.get(key)||{status:'idle',stage:'Awaiting audio analysis'};},
  analyze(track,{duration}={}){
   const key=beatAnalysisKey(track);if(!key||disposed)return Promise.resolve({status:'unavailable',stage:'No recording to analyze'});
   if(resultCache.has(key))return Promise.resolve(resultCache.get(key));
   if(jobs.has(key))return jobs.get(key).promise;
   if(queue.length>=8)return Promise.resolve({status:'unavailable',stage:'The analysis queue is busy. Try again shortly.'});
   if(!Number.isFinite(duration)||duration<=0)return Promise.resolve({status:'waiting',stage:'Waiting for recording duration'});
   if(duration>GRID_MAX_SECONDS){const state={status:'unavailable',stage:'Recording exceeds the 10-minute analysis limit.'};jobs.set(key,{state,promise:Promise.resolve(state)});return Promise.resolve(state);}
   let resolve;const promise=new Promise(done=>{resolve=done;}),job={key,track,promise,resolve,state:{status:'queued',stage:'Queued for audio analysis'}};
   jobs.set(key,job);queue.push(job);pump();return promise;
  },
  retry(track,options){const key=beatAnalysisKey(track),job=jobs.get(key);if(job&&['queued','analyzing'].includes(job.state.status))return job.promise;jobs.delete(key);resultCache.delete(key);return this.analyze(track,options);},
  dispose(){disposed=true;if(active){active.state={status:'cancelled',stage:'Analysis cancelled'};active.controller?.abort();active.resolve(active.state);}for(const job of queue.splice(0)){job.state={status:'cancelled',stage:'Analysis cancelled'};job.resolve(job.state);}},
 };
}
