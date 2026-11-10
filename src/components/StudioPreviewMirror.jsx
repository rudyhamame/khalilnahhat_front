import {useEffect,useRef} from 'react';
import {VideoOff} from 'lucide-react';
import {mirrorPreviewVideo} from '../lib/previewMirror';

export default function StudioPreviewMirror({primaryRef,active,posterImage,waiting,indicatorRef,pan=.5,onPan,overrideStream=null,source='',hidden=false}){
 const video=useRef(null),drag=useRef(null);
 useEffect(()=>{
  if(!active||!video.current)return;
  const element=video.current;
  // A dedicated source (B, or the collab picture) replaces the mirror of the landscape preview.
  if(overrideStream){element.srcObject=overrideStream;element.muted=true;void element.play().catch(()=>{});return()=>{element.srcObject=null;};}
  if(!primaryRef.current)return;
  return mirrorPreviewVideo(primaryRef.current,element);
 },[active,primaryRef,overrideStream]);
 // Dragging pans the 9:16 crop across the landscape frame. Moving the picture right shows more of the left side.
 const move=(event)=>{
  const state=drag.current;if(!state)return;
  const frame=video.current?.videoWidth&&video.current?.videoHeight?video.current.videoWidth/video.current.videoHeight:16/9;
  const visible=Math.min(1,(9/16)/frame),room=Math.max(.05,1-visible);
  onPan?.(state.start-((event.clientX-state.x)/state.width)*(visible/room));
 };
 const down=event=>{if(!active||!onPan)return;event.currentTarget.setPointerCapture?.(event.pointerId);drag.current={x:event.clientX,width:event.currentTarget.getBoundingClientRect().width||1,start:pan};};
 const up=event=>{drag.current=null;event.currentTarget.releasePointerCapture?.(event.pointerId);};
 const key=event=>{if(!onPan)return;const step=event.shiftKey?.1:.02;if(event.key==='ArrowLeft'){onPan(pan-step);event.preventDefault();}else if(event.key==='ArrowRight'){onPan(pan+step);event.preventDefault();}else if(event.key==='Home'||event.key==='End'||event.key==='0'){onPan(.5);event.preventDefault();}};
 return <section className="studio-preview-window" aria-label="Portrait preview" hidden={hidden}>
  <header className="studio-preview-window-head"><h4>Portrait{source&&<em className="studio-source-tag">{source}</em>}</h4><span>{active&&onPan&&Math.abs(pan-.5)>.01&&<button type="button" className="studio-pan-reset" onClick={()=>onPan(.5)} title="Center the crop">Center</button>}<bdi>9:16</bdi></span></header>
  <div className={`admin-live-preview-frame-shell studio-preview-portrait${active&&onPan?' is-pannable':''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={()=>active&&onPan?.(.5)} onKeyDown={key} {...(active&&onPan?{role:'slider',tabIndex:0,'aria-label':'Portrait crop position','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':Math.round(pan*100),title:'Drag to crop · double-click to center'}:{})}>
  <div className="studio-output-source-target" ref={indicatorRef}/>
  {active?<video ref={video} className="admin-live-preview-frame" style={{objectPosition:`${pan*100}% 50%`}} autoPlay playsInline muted aria-label="Portrait live preview"/>:posterImage?<img className="admin-live-preview-image" src={posterImage} alt=""/>:<div className="admin-live-preview-empty"><VideoOff size={18}/><span>{waiting?'Connecting source…':'No live source'}</span></div>}
  {active&&<img className="studio-portrait-logo" src="/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat"/>}
  </div>
 </section>;
}
