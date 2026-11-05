export async function analyzeRecordingAudio(src,signal,duration){
 if(duration>7200)throw Error('Acoustic analysis supports recordings up to two hours.');
 const response=await fetch(src,{signal});if(!response.ok)throw Error('Audio could not be loaded for boundary detection.');
 const limit=100*1024*1024;if(Number(response.headers.get('content-length'))>limit)throw Error('Audio analysis accepts files under 100 MB.');
 const chunks=[];let size=0;const reader=response.body?.getReader();
 if(reader){try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>limit){await reader.cancel();throw Error('Audio analysis accepts files under 100 MB.');}chunks.push(value);}}finally{reader.releaseLock();}}
 else{const value=new Uint8Array(await response.arrayBuffer());if(value.byteLength>limit)throw Error('Audio analysis accepts files under 100 MB.');chunks.push(value);size=value.byteLength;}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}chunks.length=0;
 const context=new OfflineAudioContext(1,1,8000),decoded=await context.decodeAudioData(bytes.buffer);
 if(signal.aborted)throw new DOMException('Canceled','AbortError');
 if(decoded.duration>7200)throw Error('Automatic boundary analysis supports recordings up to two hours.');
 return new Promise((resolve,reject)=>{
  const worker=new Worker(new URL('./recordingAudioAnalysis.worker.js',import.meta.url),{type:'module'});
  const finish=(error,data)=>{signal.removeEventListener('abort',abort);worker.terminate();if(error)reject(error);else resolve(data);};
  const abort=()=>finish(new DOMException('Canceled','AbortError'));
  signal.addEventListener('abort',abort,{once:true});
  worker.onmessage=({data})=>finish(data.error?new Error(data.error):null,data);worker.onerror=()=>finish(new Error('Audio boundary analysis failed.'));
  const samples=decoded.getChannelData(0).slice();worker.postMessage({samples,rate:decoded.sampleRate},[samples.buffer]);
 });
}
