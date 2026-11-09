import {useEffect,useRef} from 'react';
import {VideoOff} from 'lucide-react';
import {mirrorPreviewVideo} from '../lib/previewMirror';

export default function StudioPreviewMirror({primaryRef,active,posterImage,waiting,indicatorRef}){
 const video=useRef(null);
 useEffect(()=>{
  if(!active||!primaryRef.current||!video.current)return;
  return mirrorPreviewVideo(primaryRef.current,video.current);
 },[active,primaryRef]);
 return <section className="studio-preview-window" aria-label="Portrait preview">
  <header className="studio-preview-window-head"><h4>Portrait</h4><span><bdi>9:16</bdi></span></header>
  <div className="admin-live-preview-frame-shell studio-preview-portrait">
  <div className="studio-output-source-target" ref={indicatorRef}/>
  {active?<video ref={video} className="admin-live-preview-frame" autoPlay playsInline muted aria-label="Portrait live preview"/>:posterImage?<img className="admin-live-preview-image" src={posterImage} alt=""/>:<div className="admin-live-preview-empty"><VideoOff size={18}/><span>{waiting?'Connecting source…':'No live source'}</span></div>}
  {active&&<img className="studio-portrait-logo" src="/echo/dj-khalil-nahhat-logo.svg" alt="DJ Khalil Nahhat"/>}
  </div>
 </section>;
}
