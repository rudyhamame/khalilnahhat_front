import {decodeMono} from './decodeMono';
export async function analyzeAtomRhythm({audioUrl,stems,range,signal}){
 // Saved channels may be {name,url} objects, or have no name / be plain strings (older saves): read the name defensively.
 const label=row=>String(typeof row==='string'?row:row?.name||'').toLowerCase(),saved=(Array.isArray(stems?.channels)?stems.channels:[]).filter(Boolean),drums=saved.find(row=>label(row)==='drums'),bass=saved.find(row=>label(row)==='bass'),sources=[drums,bass].filter(row=>row?.url);
 if(!sources.length&&audioUrl)sources.push({url:audioUrl,name:'master'});if(!sources.length)throw Error('Attach audio before analyzing the atom.');
 const decoded=await Promise.all(sources.map(row=>decodeMono(row.url)));if(signal?.aborted)throw new DOMException('Analysis cancelled.','AbortError');
 const rate=decoded[0].sampleRate,from=Math.max(0,range?.startSec??0),end=Math.min(...decoded.map(row=>row.samples.length/row.sampleRate),range?.endSec??Infinity,from+180),channels=decoded.map(row=>row.samples.slice(Math.round(from*rate),Math.round(end*rate)));
 const result=await new Promise((resolve,reject)=>{const worker=new Worker(new URL('./atomRhythmAnalysis.worker.js',import.meta.url),{type:'module'});const cleanup=()=>{worker.terminate();signal?.removeEventListener('abort',abort);};const abort=()=>{cleanup();reject(new DOMException('Analysis cancelled.','AbortError'));};signal?.addEventListener('abort',abort,{once:true});worker.onmessage=({data})=>{cleanup();if(data.error)reject(Error(data.error));else resolve(data.result);};worker.onerror=()=>{cleanup();reject(Error('Rhythm analysis could not run. Try again.'));};worker.postMessage({channels,sampleRate:rate,offset:from},channels.map(channel=>channel.buffer));});
 return{...result,source:sources.map(row=>label(row)||'master').join('+'),limited:end<(range?.endSec??decoded[0].samples.length/rate)-.01};
}
