import {useEffect,useRef} from 'react';
import {PAUSE_HEIGHT,PAUSE_WIDTH} from '../lib/pausePhoto';

// The pause frame as viewers see it: 16:9, photo plus the pause message, drawn from the same canvas that is sent while the live is paused.
export default function PausePhotoPreview({photo}){
  const canvas=useRef(null);
  useEffect(()=>{const element=canvas.current;if(!element||!photo?.frame)return;const ctx=element.getContext('2d');ctx.drawImage(photo.frame,0,0,PAUSE_WIDTH,PAUSE_HEIGHT);},[photo]);
  return <div className="pause-photo-preview">{photo?<canvas ref={canvas} width={PAUSE_WIDTH} height={PAUSE_HEIGHT} role="img" aria-label={photo.message?.text?`Pause photo with the message: ${photo.message.text}`:'Pause photo'}/>:<span className="pause-photo-empty">No pause photo yet</span>}</div>;
}
