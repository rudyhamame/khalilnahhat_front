// Each microphone session owns its callbacks; stopped/replaced sessions cannot edit chat.
export function createSpeechDictation({Recognition,onText,onState,onError,setTimer=setTimeout,clearTimer=clearTimeout}){
 let session=null,disposed=false;
 const finish=(current,abort=false)=>{
  if(session!==current)return;
  session=null;clearTimer(current.timer);
  current.engine.onstart=current.engine.onresult=current.engine.onerror=current.engine.onend=null;
  if(abort){try{current.engine.abort();}catch{/* Already ended. */}}
  if(!disposed){onText(current.text);onState('idle');}
 };
 return {
  start({text='',lang='en-CA'}={}){
   if(disposed||session||!Recognition)return false;
   let engine;try{engine=new Recognition();}catch{onError('unavailable');return false;}
   const current={engine,base:text.trim(),text,timer:null};session=current;
   engine.lang=lang;engine.continuous=true;engine.interimResults=true;engine.maxAlternatives=1;
   engine.onstart=()=>{if(session===current&&!disposed)onState('listening');};
   engine.onresult=event=>{
    if(session!==current||disposed)return;
    const words=Array.from(event.results,result=>result[0]?.transcript||'').join(' ').trim();
    current.text=[current.base,words].filter(Boolean).join(' ').slice(0,2000);
    onText(current.text);
    if(current.text.length>=2000)finish(current,true);
   };
   engine.onerror=event=>{if(session!==current||disposed)return;onError(event.error||'unavailable');finish(current,true);};
   engine.onend=()=>finish(current);
   current.timer=setTimer(()=>finish(current,true),90000);
   onState('starting');
   try{engine.start();return true;}catch{onError('unavailable');finish(current,true);return false;}
  },
  stop(){if(!session)return;const current=session;onState('stopping');try{current.engine.stop();}catch{finish(current,true);}if(session!==current)return;clearTimer(current.timer);current.timer=setTimer(()=>finish(current,true),1500);},
  cancel(){if(session)finish(session,true);},
  dispose(){disposed=true;if(session)finish(session,true);},
 };
}
