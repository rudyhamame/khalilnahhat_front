import {apiBaseUrl} from './api';

// Split without dropping text; each part stays inside the bounded server request.
function speechChunks(text){
 const chunks=[];let rest=text.trim();
 while(rest.length>600){const head=rest.slice(0,600);let end=Math.max(head.lastIndexOf('. '),head.lastIndexOf('? '),head.lastIndexOf('؟ '),head.lastIndexOf('! '));if(end>=200)end+=1;else end=head.lastIndexOf(' ');if(end<1)end=600;chunks.push(rest.slice(0,end));rest=rest.slice(end).trimStart();}
 if(rest)chunks.push(rest);return chunks;
}
export async function speakCallText({text,current,isCurrent,token,usePiper,onFallback}){
 const language=current.language?.startsWith('ar')?'ar':'en';
 for(const part of speechChunks(text)){
  if(!isCurrent())return;
  if(usePiper){
   try{
    const response=await fetch(`${apiBaseUrl}/ai-booking/speech`,{method:'POST',signal:current.abort.signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({text:part,language})});
    if(!response.ok)throw Error('Piper unavailable');
    const data=await response.arrayBuffer();if(!isCurrent())return;
    const context=current.cueContext;if(!context)throw Error('Audio playback unavailable');
    const buffer=await context.decodeAudioData(data);await context.resume();if(!isCurrent())return;
    await new Promise((resolve,reject)=>{
     const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);current.ttsSource=source;
     source.onended=()=>{source.disconnect();if(current.ttsSource===source)current.ttsSource=null;resolve();};
     try{source.start();}catch(error){source.disconnect();current.ttsSource=null;reject(error);}
    });
    continue;
   }catch(error){if(!isCurrent()||current.abort.signal.aborted)return;onFallback?.();}
  }
  if(!isCurrent())return;
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)throw Error('Browser speech fallback is unavailable');
  current.speechSynthesis=true;
  await new Promise((resolve,reject)=>{
   const utterance=new SpeechSynthesisUtterance(part);utterance.lang=current.language;
   utterance.onend=resolve;utterance.onerror=event=>event.error==='canceled'||event.error==='interrupted'?resolve():reject(Error('Browser voice playback failed'));
   window.speechSynthesis.speak(utterance);
  });
 }
}
