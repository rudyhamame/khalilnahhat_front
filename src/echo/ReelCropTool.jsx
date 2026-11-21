import {useEffect,useRef,useState} from 'react';
import {Crosshair,Move,RotateCcw,ScanFace,Save} from 'lucide-react';
import {baseWindow,windowAt,cropStyle,isPortrait916,smoothTrack,bestMatch} from '../lib/reelCrop';

const GW=192;// analysis frame width (pixels); small on purpose so tracking is fast
// Two tools for turning a video into a 9:16 reel (the crop is saved with the video, nothing is re-rendered):
// 1. Manual: pan the 9:16 window by dragging and zoom with the slider.
// 2. Auto-follow (only when the video is not already 9:16): click the face once, the window follows it through the video; zoom is adjustable.
export default function ReelCropTool({item,onSave,onClose,busy=false}){
 const video=useRef(null),stage=useRef(null),drag=useRef(null),cancel=useRef(false);
 const [size,setSize]=useState({w:0,h:0}),[time,setTime]=useState(0);
 const saved=item.reelCrop||null;
 const [mode,setMode]=useState(saved?.mode||'manual'),[zoom,setZoom]=useState(saved?.zoom||1);
 const [centre,setCentre]=useState({x:saved?.x??.5,y:saved?.y??.5}),[track,setTrack]=useState(saved?.track||[]);
 const [face,setFace]=useState(null),[progress,setProgress]=useState(null),[message,setMessage]=useState('');
 const portrait=isPortrait916(size.w,size.h),ready=size.w>0;
 const crop={mode,zoom,x:centre.x,y:centre.y,track};
 const win=ready?windowAt(size.w,size.h,crop,time):{x:0,y:0,w:1,h:1};
 useEffect(()=>{const v=video.current;if(!v)return undefined;const meta=()=>setSize({w:v.videoWidth,h:v.videoHeight}),tick=()=>setTime(v.currentTime);v.addEventListener('loadedmetadata',meta);v.addEventListener('timeupdate',tick);v.addEventListener('seeked',tick);if(v.readyState>0)meta();return()=>{v.removeEventListener('loadedmetadata',meta);v.removeEventListener('timeupdate',tick);v.removeEventListener('seeked',tick);};},[]);
 useEffect(()=>{if(portrait&&mode==='follow')setMode('manual');},[portrait,mode]);

 const point=event=>{const r=stage.current.getBoundingClientRect();return {x:Math.min(1,Math.max(0,(event.clientX-r.left)/r.width)),y:Math.min(1,Math.max(0,(event.clientY-r.top)/r.height))};};
 // Manual: dragging pans the window (the window centre follows the pointer).
 const down=event=>{
  if(!ready)return;
  const p=point(event);
  if(mode==='follow'){setFace(p);setTrack([]);setMessage('Face set. Press “Analyze” to follow it.');return;}
  event.currentTarget.setPointerCapture?.(event.pointerId);drag.current=true;setCentre(p);
 };
 const move=event=>{if(drag.current&&mode==='manual')setCentre(point(event));};
 const up=()=>{drag.current=null;};

 // Auto-follow: step through the video, find the clicked face in every sampled frame with a small template tracker, then smooth the path.
 const analyze=async()=>{
  const v=video.current;if(!v||!face||!ready)return;
  const gh=Math.round(GW*size.h/size.w),canvas=document.createElement('canvas');canvas.width=GW;canvas.height=gh;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const grab=()=>{ctx.drawImage(v,0,0,GW,gh);const rgba=ctx.getImageData(0,0,GW,gh).data,gray=new Uint8Array(GW*gh);for(let i=0;i<gray.length;i++)gray[i]=(rgba[i*4]*77+rgba[i*4+1]*150+rgba[i*4+2]*29)>>8;return gray;};
  const seek=t=>new Promise(resolve=>{const done=()=>{v.removeEventListener('seeked',done);resolve();};v.addEventListener('seeked',done);v.currentTime=t;});
  cancel.current=false;v.pause();setMessage('');setProgress(0);
  const duration=v.duration||0,step=Math.max(.25,duration/240),start=v.currentTime,tw=Math.round(gh*.2)|1,th=tw;
  try{
   const read=(gray,cx,cy)=>{const tpl=new Uint8Array(tw*th),x0=Math.round(cx-tw/2),y0=Math.round(cy-th/2);for(let y=0;y<th;y++)for(let x=0;x<tw;x++)tpl[y*tw+x]=gray[Math.min(gh-1,Math.max(0,y0+y))*GW+Math.min(GW-1,Math.max(0,x0+x))];return tpl;};
   await seek(start);
   const first=grab();let tpl=read(first,face.x*GW,face.y*gh);
   const run=async dir=>{
    const points=[];let cx=face.x*GW,cy=face.y*gh,t=start;
    for(;;){
     t+=dir*step;if(t<0||t>duration)break;
     if(cancel.current)return null;
     await seek(Math.min(duration,Math.max(0,t)));
     const gray=grab(),m=bestMatch(gray,GW,gh,tpl,tw,th,cx,cy,Math.round(GW*.1));
     // keep the path when the match is poor (face hidden): the window holds its place instead of jumping
     if(m.error<28){cx=m.x;cy=m.y;const fresh=read(gray,cx,cy);for(let i=0;i<tpl.length;i++)tpl[i]=tpl[i]*.85+fresh[i]*.15;}
     points.push({t,x:cx/GW,y:cy/gh});
     setProgress(Math.min(1,Math.abs(t-start)/Math.max(1,dir>0?duration-start:start)*.5+(dir>0?0:.5)));
    }
    return points;
   };
   const forward=await run(1);if(!forward){setProgress(null);setMessage('Analysis stopped.');return;}
   tpl=read(first,face.x*GW,face.y*gh);
   const backward=await run(-1);if(!backward){setProgress(null);setMessage('Analysis stopped.');return;}
   const all=[...backward.reverse(),{t:start,x:face.x,y:face.y},...forward];
   setTrack(smoothTrack(all));setProgress(null);setMessage('Done. Play the preview to check, then Save.');
   v.currentTime=start;
  }catch{setProgress(null);setMessage('This video cannot be analyzed here (the server blocks reading its pictures). Use the manual crop instead.');}
 };
 const reset=()=>{setZoom(1);setCentre({x:.5,y:.5});setTrack([]);setFace(null);setMessage('');};
 const canSave=ready&&(mode==='manual'||track.length>0);
 const save=()=>onSave({mode,zoom:+zoom.toFixed(2),x:+centre.x.toFixed(4),y:+centre.y.toFixed(4),...(mode==='follow'?{track}:{})});
 const view=cropStyle(win),box=baseWindow(size.w||16,size.h||9);

 return <div className="reel-crop">
  <div className="reel-crop-main">
   <div className="reel-crop-source" ref={stage} onPointerDown={down} onPointerMove={move} onPointerUp={up} data-mode={mode}>
    <video ref={video} src={item.mediaUrl} crossOrigin="anonymous" controls={false} muted playsInline preload="auto"/>
    {ready&&<i className="reel-crop-window" style={{left:`${win.x*100}%`,top:`${win.y*100}%`,width:`${win.w*100}%`,height:`${win.h*100}%`}}/>}
    {face&&mode==='follow'&&<b className="reel-crop-face" style={{left:`${face.x*100}%`,top:`${face.y*100}%`}}><Crosshair size={18}/></b>}
    {progress!==null&&<div className="reel-crop-progress" role="status"><span style={{width:`${Math.round(progress*100)}%`}}/><em>Following the face… {Math.round(progress*100)}%</em></div>}
   </div>
   <div className="reel-crop-result">
    <div className="reel-crop-frame" aria-label="9:16 result"><video src={item.mediaUrl} crossOrigin="anonymous" muted playsInline preload="auto" style={view} ref={el=>{if(el&&video.current&&Math.abs(el.currentTime-video.current.currentTime)>.3)el.currentTime=video.current.currentTime;}}/></div>
    <small>9:16 result</small>
   </div>
  </div>
  <div className="reel-crop-controls">
   <div className="reel-crop-tabs" role="tablist" aria-label="Crop tool">
    <button type="button" role="tab" aria-selected={mode==='manual'} className={mode==='manual'?'is-on':''} onClick={()=>setMode('manual')}><Move size={15}/>Crop · pan &amp; zoom</button>
    <button type="button" role="tab" aria-selected={mode==='follow'} className={mode==='follow'?'is-on':''} disabled={portrait} title={portrait?'The video is already 9:16':'Follow a face'} onClick={()=>setMode('follow')}><ScanFace size={15}/>Auto-follow face</button>
   </div>
   <p className="reel-crop-hint">{mode==='manual'?'Drag on the video to place the 9:16 window. Use the slider to zoom.':portrait?'Auto-follow is only for videos that are not 9:16.':face?'Press Analyze to make the window follow the face. Click again to choose a different face.':'Click the face you want the window to follow.'}</p>
   <label className="reel-crop-zoom">Zoom<input type="range" min="1" max="3" step=".01" value={zoom} onChange={event=>setZoom(Number(event.target.value))}/><output>{zoom.toFixed(2)}×</output></label>
   {mode==='follow'&&<button type="button" className="reel-crop-go" disabled={!face||progress!==null||!ready} onClick={analyze}><ScanFace size={15}/>{track.length?'Analyze again':'Analyze'}</button>}
   {progress!==null&&<button type="button" onClick={()=>{cancel.current=true;}}>Stop</button>}
   {message&&<p className="reel-crop-message" role="status">{message}</p>}
   <div className="reel-crop-actions">
    <button type="button" onClick={reset}><RotateCcw size={15}/>Reset</button>
    <button type="button" onClick={onClose}>Close</button>
    <button type="button" className="reel-crop-save" disabled={!canSave||busy||progress!==null} onClick={save}><Save size={15}/>Save crop</button>
   </div>
  </div>
 </div>;
}
