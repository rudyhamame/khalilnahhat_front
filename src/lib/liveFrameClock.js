// Frame production must continue when browser UI rendering is suspended.
export function startLiveFrameClock(draw, fps=30) {
 let worker,url,timer,stopped=false;
 const tick=()=>{if(!stopped)draw();};
 try {
  url=URL.createObjectURL(new Blob([`setInterval(()=>postMessage(0),${1000/fps})`],{type:'text/javascript'}));
  worker=new Worker(url);worker.onmessage=tick;
  worker.onerror=()=>{worker?.terminate();worker=null;if(!stopped&&!timer)timer=setInterval(tick,1000/fps);};
 }catch {timer=setInterval(tick,1000/fps);}
 return ()=>{stopped=true;worker?.terminate();clearInterval(timer);if(url)URL.revokeObjectURL(url);};
}
