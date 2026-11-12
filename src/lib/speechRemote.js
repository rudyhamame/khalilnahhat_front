// Whisper runs on the OVH server, not in the browser (it froze the tab). One clip (16 kHz mono samples, up to ~30 s) per request.
export async function speechClip(task,samples,token){
 const {apiBaseUrl}=await import('./api'); // loaded on use so the pure detection code stays importable in tests
 const pcm=new Int16Array(samples.length);
 for(let i=0;i<samples.length;i++)pcm[i]=Math.max(-32768,Math.min(32767,Math.round(samples[i]*32767)));
 const response=await fetch(`${apiBaseUrl}/admin/music-archive/speech/${task}`,{method:'POST',headers:{'Content-Type':'application/octet-stream',Authorization:`Bearer ${token}`},body:pcm});
 const payload=await response.json().catch(()=>({}));
 if(!response.ok)throw Error(payload.message||`The speech service could not answer (HTTP ${response.status}).`);
 return payload;
}
