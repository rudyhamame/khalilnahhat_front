import {useEffect,useRef} from 'react';
import {Pause,Play} from 'lucide-react';
// Shown over the Landscape preview while the live is paused: viewers see the hold photo; the admin sees the NEXT input here, privately.
export default function PauseBanner({stream,onResume}){
  const video=useRef(null);
  useEffect(()=>{const element=video.current;if(!element)return undefined;element.srcObject=stream||null;if(stream)void element.play?.().catch(()=>{});return()=>{element.srcObject=null;};},[stream]);
  return <div className="pause-banner" role="status">
    <div className="pause-badge"><Pause size={13} aria-hidden="true"/><strong>PAUSED</strong><span>Viewers see your photo</span></div>
    <figure className="pause-next"><video ref={video} muted playsInline autoPlay aria-label="Next input, private"/><figcaption>Next input · private</figcaption></figure>
    <button type="button" className="pause-resume" onClick={onResume}><Play size={14} aria-hidden="true"/>Resume live</button>
  </div>;
}
