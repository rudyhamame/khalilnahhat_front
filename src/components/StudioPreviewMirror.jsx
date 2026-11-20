import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {VideoOff} from 'lucide-react';
import {Crosshair} from 'lucide-react';
import {PortraitBlurBoxes,PortraitBlurButton,Pct} from './PeopleBlurControl';
import {useFollowDj} from '../lib/useFollowDj';
import {mirrorPreviewVideo} from '../lib/previewMirror';

export default function StudioPreviewMirror({primaryRef,active,posterImage,waiting,indicatorRef,pan=.5,onPan:steer,overrideStream=null,followSource=null,source='',hidden=false,logo=true,standalone=false,cropSlot=null}){
 const video=useRef(null),drag=useRef(null);
 // Auto crop: follows the DJ on the landscape preview. A manual drag, key or reset switches it off.
 // With a dedicated portrait camera (2 windows) the crop of that camera's own picture is steered; otherwise the crop of the landscape preview.
 const [ownPan,setOwnPan]=useState(.5),own=Boolean(followSource),canFollow=Boolean(active&&steer&&!standalone&&(own||!overrideStream));
 const steerCrop=own?value=>{setOwnPan(value);followSource.setPan?.(value);}:steer;
 const auto=useFollowDj({enabled:canFollow,getVideo:own?()=>followSource.getVideo?.():()=>primaryRef?.current?.querySelector('video'),onSteer:steerCrop});
 const onPan=steer&&(value=>{auto.setFollow(false);steerCrop(value);});
 pan=own?ownPan:pan;
 const source$=own?followSource.getVideo?.():video.current,frameAspect=source$?.videoWidth&&source$?.videoHeight?source$.videoWidth/source$.videoHeight:16/9,cw=Math.min(1,(9/16)/frameAspect),left=pan*(1-cw);
 const place=b=>({left:`${(b.cx-b.w/2-left)/cw*100}%`,top:`${(b.cy-b.h/2)*100}%`,width:`${b.w/cw*100}%`,height:`${b.h*100}%`});
 const inView=b=>b.cx>=left&&b.cx<=left+cw;
 useEffect(()=>{
  if(!active||!video.current)return;
  const element=video.current;
  if(standalone&&!overrideStream)return;
  // A dedicated source (B, or the collab picture) replaces the mirror of the landscape preview.
  if(overrideStream){element.srcObject=overrideStream;element.muted=true;void element.play().catch(()=>{});return()=>{element.srcObject=null;};}
  if(!primaryRef.current)return;
  return mirrorPreviewVideo(primaryRef.current,element);
 },[active,primaryRef,overrideStream,standalone]);
 // Dragging pans the 9:16 crop across the landscape frame. Moving the picture right shows more of the left side.
 const move=(event)=>{
  const state=drag.current;if(!state)return;
  const frame=frameAspect;
  const visible=Math.min(1,(9/16)/frame),room=Math.max(.05,1-visible);
  onPan?.(state.start-((event.clientX-state.x)/state.width)*(visible/room));
 };
 const down=event=>{if(!active||!onPan)return;event.currentTarget.setPointerCapture?.(event.pointerId);drag.current={x:event.clientX,width:event.currentTarget.getBoundingClientRect().width||1,start:pan};};
 const up=event=>{drag.current=null;event.currentTarget.releasePointerCapture?.(event.pointerId);};
 const key=event=>{if(!onPan)return;const step=event.shiftKey?.1:.02;if(event.key==='ArrowLeft'){onPan(pan-step);event.preventDefault();}else if(event.key==='ArrowRight'){onPan(pan+step);event.preventDefault();}else if(event.key==='Home'||event.key==='End'||event.key==='0'){onPan(.5);event.preventDefault();}};
 const cropButton=canFollow&&<button type="button" className="studio-follow-dj" aria-pressed={auto.follow} onClick={auto.toggle} title={auto.error||'Auto crop: click the DJ\'s face in this window, then the crop keeps his face centered.'}><Crosshair size={13}/>{auto.pick?'Click the DJ…':'Auto crop'}{auto.follow&&!auto.pick?' · on':''}</button>;
 return <section className="studio-preview-window" aria-label="Portrait preview" hidden={hidden}>
  <header className="studio-preview-window-head"><h4>Portrait</h4>{own&&<PortraitBlurButton/>}{cropSlot?createPortal(cropButton,cropSlot):cropButton}</header>
  <div className={`admin-live-preview-frame-shell studio-preview-portrait${active&&onPan?' is-pannable':''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={()=>active&&onPan?.(.5)} onKeyDown={key} {...(active&&onPan?{role:'slider',tabIndex:0,'aria-label':'Portrait crop position','aria-valuemin':0,'aria-valuemax':100,'aria-valuenow':Math.round(pan*100),title:'Drag to crop · double-click to center'}:{})}>
  {auto.follow&&<div className="people-blur-boxes" aria-hidden={!auto.pick}>{auto.pick?auto.boxes.filter(inView).map((b,i)=><button type="button" key={i} className="follow-dj-pick" aria-label="This is DJ Khalil" style={place(b)} onPointerDown={event=>event.stopPropagation()} onClick={()=>auto.choose(b)}><Pct b={b}/></button>):auto.dj&&<span className="is-dj" style={place({...auto.dj,h:auto.dj.w*1.3})}><Pct b={auto.dj}/></span>}</div>}
  {own&&!auto.follow&&<PortraitBlurBoxes/>}
  <div className="studio-output-source-target" ref={indicatorRef}/>
  {active&&onPan&&Math.abs(pan-.5)>.01&&<button type="button" className="studio-pan-reset is-overlay" onClick={event=>{event.stopPropagation();onPan(.5);}} onPointerDown={event=>event.stopPropagation()} title="Center the crop">Center</button>}
  {active&&standalone&&!overrideStream?<div className="admin-live-preview-empty"><VideoOff size={18}/><span>Waiting for the portrait source</span></div>:active?<video ref={video} className="admin-live-preview-frame" style={{objectPosition:`${pan*100}% 50%`}} autoPlay playsInline muted aria-label="Portrait live preview"/>:posterImage?<img className="admin-live-preview-image" src={posterImage} alt=""/>:<div className="admin-live-preview-empty"><VideoOff size={18}/><span>{waiting?'Connecting source…':'No live source'}</span></div>}
  {active&&logo&&!(standalone&&!overrideStream)&&<img className="studio-portrait-logo" src="/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat"/>}
  </div>
 </section>;
}
