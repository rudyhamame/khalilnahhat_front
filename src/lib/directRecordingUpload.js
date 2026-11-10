// Keep transport errors actionable, including HTML errors from an upstream proxy.
export async function uploadDirectRecordingChunk({baseUrl,token,id,sequence,bytes,mime,fetchImpl=globalThis.fetch}){
 let response;
 try{
  response=await fetchImpl(`${baseUrl}/live-stream/recordings/${encodeURIComponent(id)}/chunks/${sequence}`,{
   method:'POST',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/octet-stream','X-Recording-Mime':mime},
   body:bytes,signal:AbortSignal.timeout(120000),
  });
 }catch(error){
  throw new Error(error.name==='TimeoutError'?'Recording upload timed out. Retrying automatically.':'Cannot reach the recording server. Check your connection.',{cause:error});
 }
 const data=await response.json().catch(()=>null);
 if(!response.ok){
  const fallback=response.status===401?'Sign in again to resume uploading.':`Recording server returned HTTP ${response.status}.`;
  const error=new Error(response.status===404&&data?.message==='Route not found.'?`Route not found: POST /live-stream/recordings/${id}/chunks/${sequence}`:data?.message||fallback);error.status=response.status;
  const retryAfter=response.headers.get('Retry-After');
  const seconds=retryAfter===null?NaN:Number(retryAfter);
  error.retryAfterMs=Number.isFinite(seconds)?Math.max(0,seconds*1000):Math.max(0,Date.parse(retryAfter)-Date.now())||0;
  throw error;
 }
 // Never delete local bytes on an empty or unrelated success response.
 if(!Number.isSafeInteger(data?.nextSequence)||data.nextSequence<=sequence)throw new Error('The recording server did not acknowledge this chunk. Retrying automatically.');
 return data;
}
