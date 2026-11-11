import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X,ImageOff} from 'lucide-react';
import {fetchGallery} from '../lib/galleryApi';
import {cropRect,DEFAULT_CROP,loadImage,MAX_ZOOM,paintFrame,PAUSE_HEIGHT,PAUSE_WIDTH} from '../lib/pausePhoto';

// The exact 16:9 frame viewers will see. Drag to pan, use the slider or the wheel to zoom and crop; the picture here is the picture the live shows.
function CropStage({item,crop,onCrop,onReady}){
  const canvas=useRef(null),drag=useRef(null),[image,setImage]=useState(null),[failed,setFailed]=useState(false);
  useEffect(()=>{let cancelled=false;setImage(null);setFailed(false);loadImage(item.mediaUrl).then(loaded=>{if(!cancelled){setImage(loaded);onReady?.(loaded);}}).catch(()=>{if(!cancelled)setFailed(true);});return()=>{cancelled=true;};},[item.mediaUrl]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const element=canvas.current;if(!element||!image)return;paintFrame(element.getContext('2d'),image,crop,PAUSE_WIDTH,PAUSE_HEIGHT);},[image,crop]);
  const geometry=()=>image?cropRect(image.naturalWidth,image.naturalHeight,crop):null;
  const move=event=>{const state=drag.current,rect=geometry();if(!state||!rect||!image)return;const scale=PAUSE_WIDTH/state.width;
    onCrop({zoom:rect.zoom,cx:state.cx-((event.clientX-state.x)*scale)/rect.w,cy:state.cy-((event.clientY-state.y)*scale)/rect.h});};
  const down=event=>{const rect=geometry();if(!rect)return;event.currentTarget.setPointerCapture?.(event.pointerId);drag.current={x:event.clientX,y:event.clientY,width:event.currentTarget.getBoundingClientRect().width||1,cx:crop.cx,cy:crop.cy};};
  const up=event=>{drag.current=null;event.currentTarget.releasePointerCapture?.(event.pointerId);};
  return <div className="pause-picker-stage is-crop" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={event=>{const rect=geometry();if(rect)onCrop({...crop,zoom:Math.max(rect.minZoom,Math.min(MAX_ZOOM,rect.zoom*(event.deltaY<0?1.08:1/1.08)))});}}>
    {failed?<p className="pause-picker-note">This photo could not be loaded for the live. Choose another one.</p>:<canvas ref={canvas} width={PAUSE_WIDTH} height={PAUSE_HEIGHT} aria-label="The pause frame: drag to pan, scroll to zoom"/>}
  </div>;
}
// Pick the pause photo from the site's gallery (photos only).
export default function PausePhotoPicker({token,currentId,onPick,onClose}){
  const [items,setItems]=useState(null),[error,setError]=useState(''),[chosen,setChosen]=useState(null),[busy,setBusy]=useState(false),[crop,setCrop]=useState(DEFAULT_CROP),[loaded,setLoaded]=useState(null);
  useEffect(()=>{let cancelled=false;fetchGallery(['photo'],{token}).then(list=>{if(!cancelled)setItems(list);}).catch(()=>{if(!cancelled)setError('The gallery could not be loaded.');});return()=>{cancelled=true;};},[token]);
  useEffect(()=>{const key=event=>{if(event.key==='Escape')onClose();};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[onClose]);
  // Rendered on the page itself, not inside the controls panel: a pop-up gallery over the whole Studio.
  return createPortal(<div className="pause-picker" role="dialog" aria-modal="true" aria-label="Choose the pause photo from the gallery" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div className="pause-picker-card">
      <header><div><h3>Pause photo</h3><p>Choose a photo from the gallery. Viewers see it while the live is paused.</p></div><button type="button" aria-label="Close" onClick={onClose}><X size={16}/></button></header>
      {error&&<p className="studio-help is-warning" role="alert">{error}</p>}
      {!items&&!error&&<p className="pause-picker-note" role="status">Loading the gallery…</p>}
      {items&&!items.length&&<p className="pause-picker-note"><ImageOff size={16} aria-hidden="true"/> No photos in the gallery yet. Add some in Echo → Gallery.</p>}
      {chosen&&<div className="pause-picker-preview"><p className="pause-picker-hint">This is what viewers will see while the live is paused.</p><CropStage item={chosen} crop={crop} onCrop={setCrop} onReady={setLoaded}/>
        {loaded&&(()=>{const info=cropRect(loaded.naturalWidth,loaded.naturalHeight,crop);return <div className="pause-crop-tools">
          <label>Zoom<input type="range" min={info.minZoom} max={MAX_ZOOM} step="0.01" value={info.zoom} onChange={event=>setCrop({...crop,zoom:Number(event.target.value)})} aria-label="Zoom"/></label>
          <button type="button" className="admin-live-control" onClick={()=>setCrop(DEFAULT_CROP)}>Fit</button>
          <button type="button" className="admin-live-control" onClick={()=>setCrop({zoom:1,cx:.5,cy:.5})}>Fill</button>
        </div>;})()}
        <p className="pause-picker-hint">Drag the picture to pan. Zoom with the slider or the mouse wheel to crop.</p>
        <div className="pause-picker-actions"><button type="button" className="admin-live-control" onClick={()=>setChosen(null)} disabled={busy}>Choose another</button><button type="button" className="admin-live-control pause-picker-set" disabled={busy||!loaded} onClick={async()=>{setBusy(true);try{await onPick(chosen,crop);}finally{setBusy(false);}}}>{busy?'Setting…':'Set as pause photo'}</button></div></div>}
      {!chosen&&items?.length>0&&<ul className="pause-picker-grid">{items.map(item=><li key={item.id}><button type="button" className={item.id===currentId?'is-current':''} onClick={()=>{setChosen(item);setCrop(DEFAULT_CROP);setLoaded(null);}}  aria-label="Gallery photo"><img src={item.mediaUrl} alt="" loading="lazy"/></button></li>)}</ul>}
    </div>
  </div>,document.body);
}
