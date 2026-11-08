function speechChunks(text){
 const chunks=[];let rest=text.trim();
 while(rest.length>600){const head=rest.slice(0,600);let end=Math.max(head.lastIndexOf('. '),head.lastIndexOf('? '),head.lastIndexOf('؟ '),head.lastIndexOf('! '));if(end>=200)end+=1;else end=head.lastIndexOf(' ');if(end<1)end=600;chunks.push(rest.slice(0,end));rest=rest.slice(end).trimStart();}
 if(rest)chunks.push(rest);return chunks;
}
export async function speakBrowserText({text,current,isCurrent}){
 for(const part of speechChunks(text)){
  if(!isCurrent())return;
  if(!window.speechSynthesis||!window.SpeechSynthesisUtterance)throw Error('Browser speech playback is unavailable');
  await new Promise((resolve,reject)=>{
   const utterance=new SpeechSynthesisUtterance(part);utterance.lang=current.language;
   utterance.onend=resolve;utterance.onerror=event=>event.error==='canceled'||event.error==='interrupted'?resolve():reject(Error('Browser voice playback failed'));
   current.speechSynthesis=true;window.speechSynthesis.speak(utterance);
  });
 }
}
