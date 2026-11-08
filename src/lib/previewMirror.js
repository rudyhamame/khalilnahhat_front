// A second muted view shares the existing stream. It never owns or stops tracks.
export function mirrorPreviewVideo(container,target,{Observer=globalThis.MutationObserver}={}){
 const sync=()=>{
  const source=container.querySelector('video');
  const stream=source?.srcObject||null;
  const url=stream?'':source?.currentSrc||source?.getAttribute('src')||'';
  if(target.srcObject!==stream)target.srcObject=stream;
  if(target.getAttribute('src')!==(url||null)){
   if(url)target.setAttribute('src',url);else target.removeAttribute('src');
  }
  target.muted=true;
  if(stream||url)target.play()?.catch(()=>{});
 };
 const events=['loadedmetadata','emptied','playing'];
 for(const event of events)container.addEventListener(event,sync,true);
 const observer=new Observer(sync);observer.observe(container,{childList:true,subtree:true,attributes:true,attributeFilter:['src']});
 sync();
 return ()=>{
  observer.disconnect();for(const event of events)container.removeEventListener(event,sync,true);
  target.pause();target.srcObject=null;target.removeAttribute('src');
 };
}
