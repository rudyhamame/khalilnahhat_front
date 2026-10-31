import {apiBaseUrl} from './api';
export const administratorAudioSupported=config=>Boolean(config)&&config.enabled!==false&&(config?.provider==='browser'?Boolean(window.SpeechRecognition||window.webkitSpeechRecognition):Boolean(window.MediaRecorder&&navigator.mediaDevices?.getUserMedia));
async function audioRequest(path,token,body,signal,json=false){
 const response=await fetch(apiBaseUrl+'/admin/ai-administrator/'+path,{method:'POST',headers:{Authorization:`Bearer ${token}`,...(json?{'Content-Type':'application/json'}:{})},body:json?JSON.stringify(body):body,signal:AbortSignal.any([signal,AbortSignal.timeout(95000)])});
 if(!response.ok){const data=await response.json().catch(()=>({}));throw Error(data.message||'Administrator audio request failed.');}return response;
}
export function captureAdministratorSpeech({config,token,onText,onEnd,onError,autoStop=true}){
 let canceled=false,stopRequested=false,recognition,recorder,stream,context,frame,timer,safety,controller=new AbortController();
 const clear=()=>{clearTimeout(timer);clearTimeout(safety);cancelAnimationFrame(frame);stream?.getTracks().forEach(track=>track.stop());context?.close().catch(()=>{});};
 const fail=error=>{if(canceled)return;canceled=true;clear();controller.abort();if(recorder?.state==='recording')recorder.stop();onError(error instanceof Error?error:Error('Speech recognition stopped. Try again or type.'));};
 const start=async()=>{
  if(config.provider==='browser'){
   const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;if(!Recognition){fail(Error('Browser dictation is unavailable. Select cloud STT or type your message.'));return;}
   let finalText='';recognition=new Recognition();recognition.lang=navigator.language||'en-CA';recognition.continuous=!autoStop;recognition.interimResults=true;
   recognition.onresult=event=>{if(canceled)return;const rows=Array.from(event.results);finalText=rows.filter(row=>row.isFinal).map(row=>row[0]?.transcript||'').join(' ').trim().slice(0,8000);onText(rows.map(row=>row[0]?.transcript||'').join(' ').trim().slice(0,8000));};
   recognition.onerror=event=>{if(!canceled)fail(Error(event.error==='not-allowed'?'Microphone access was denied. Enable it in your browser.':event.error==='no-speech'?'No speech detected. Try again.':'Browser speech recognition failed. Try again or choose cloud STT.'));};
   recognition.onend=()=>{if(canceled)return;clear();canceled=true;onEnd(finalText);};
   try{recognition.start();timer=setTimeout(stop,60000);}catch(error){fail(error);}return;
  }
  try{
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true}});if(canceled||stopRequested){clear();if(!canceled){canceled=true;onEnd('');}return;}
   const mime=['audio/webm;codecs=opus','audio/mp4','audio/ogg;codecs=opus'].find(type=>MediaRecorder.isTypeSupported(type));if(!mime)throw Error('This browser cannot record supported microphone audio.');
   const chunks=[];let bytes=0;recorder=new MediaRecorder(stream,{mimeType:mime});
   recorder.ondataavailable=event=>{if(canceled)return;bytes+=event.data.size;if(bytes>7*1024*1024){fail(Error('The microphone recording was too large. Try a shorter request.'));if(recorder.state!=='inactive')recorder.stop();return;}if(event.data.size)chunks.push(event.data);};
   recorder.onerror=()=>fail(Error('Microphone recording failed.'));
   recorder.onstop=async()=>{clear();if(canceled)return;try{const blob=new Blob(chunks,{type:mime});if(!blob.size){canceled=true;onEnd('');return;}onText('');const form=new FormData();form.set('file',blob,'microphone.'+(mime.includes('mp4')?'m4a':mime.includes('ogg')?'ogg':'webm'));const response=await audioRequest('transcribe',token,form,controller.signal);const result=await response.json();if(!canceled){canceled=true;onText(result.text);onEnd(result.text);}}catch(error){if(!canceled)fail(error);}};
   recorder.start(250);timer=setTimeout(stop,60000);
   if(autoStop){
    const AudioContext=window.AudioContext||window.webkitAudioContext;context=new AudioContext();await context.resume();if(canceled){clear();return;}
    const analyser=context.createAnalyser();analyser.fftSize=2048;context.createMediaStreamSource(stream).connect(analyser);const samples=new Float32Array(analyser.fftSize);let heard=false,lastSpeech=Date.now(),started=Date.now();
    const inspect=()=>{if(canceled||recorder.state!=='recording')return;analyser.getFloatTimeDomainData(samples);const rms=Math.sqrt(samples.reduce((sum,v)=>sum+v*v,0)/samples.length);if(rms>.018){heard=true;lastSpeech=Date.now();}if(!heard&&Date.now()-started>12000){fail(Error('No speech detected. Start voice again when ready.'));return;}if(heard&&Date.now()-lastSpeech>1400){stop();return;}frame=requestAnimationFrame(inspect);};inspect();
   }
  }catch(error){fail(error);}
 };
 function stop(){if(canceled)return;stopRequested=true;clearTimeout(timer);cancelAnimationFrame(frame);if(recognition){try{recognition.stop();}catch(error){fail(error);}safety=setTimeout(()=>fail(Error('Speech recognition timed out. Try again.')),2000);}else if(recorder?.state==='recording')recorder.stop();}
 function cancel(){canceled=true;controller.abort();clear();if(recognition){recognition.onresult=recognition.onerror=recognition.onend=null;try{recognition.abort();}catch{}}if(recorder?.state==='recording')recorder.stop();}
 return {start,stop,cancel};
}
