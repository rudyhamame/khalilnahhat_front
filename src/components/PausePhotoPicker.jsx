import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X,ImageOff,ImagePlus,Move,Type,ArrowLeft} from 'lucide-react';
import {fetchGallery} from '../lib/galleryApi';
import {cropRect,DEFAULT_CROP,DEFAULT_MESSAGE,MESSAGE_COLORS,loadImage,MAX_ZOOM,normalizeMessage,paintFrame,PAUSE_HEIGHT,PAUSE_PORTRAIT_HEIGHT,PAUSE_PORTRAIT_WIDTH,PAUSE_WIDTH,portraitBand} from '../lib/pausePhoto';

// The exact 16:9 frame viewers will see. Drag to pan, use the slider or the wheel to zoom and crop; the picture here is the picture the live shows.
function CropStage({item,crop,onCrop,onReady,message,tool,onMessage,orientation='landscape',onPaint,guide=null}){
  const portrait=orientation==='portrait',W=portrait?PAUSE_PORTRAIT_WIDTH:PAUSE_WIDTH,H=portrait?PAUSE_PORTRAIT_HEIGHT:PAUSE_HEIGHT;
  const canvas=useRef(null),drag=useRef(null),[image,setImage]=useState(null),[failed,setFailed]=useState(false);
  useEffect(()=>{let cancelled=false;setImage(null);setFailed(false);loadImage(item.mediaUrl).then(loaded=>{if(!cancelled){setImage(loaded);onReady?.(loaded);}}).catch(()=>{if(!cancelled)setFailed(true);});return()=>{cancelled=true;};},[item.mediaUrl]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const element=canvas.current;if(!element||!image)return;paintFrame(element.getContext('2d'),image,crop,W,H,message,guide);onPaint?.(element);},[image,crop,message,W,H,guide]);
  const geometry=()=>image?cropRect(image.naturalWidth,image.naturalHeight,crop,W,H):null;
  const move=event=>{const state=drag.current;if(state?.message){placeMessage(event);return;}const rect=geometry();if(!state||!rect||!image)return;const scale=W/state.width;
    onCrop({zoom:rect.zoom,cx:state.cx-((event.clientX-state.x)*scale)/rect.w,cy:state.cy-((event.clientY-state.y)*scale)/rect.h});};
  const placeMessage=event=>{const box=event.currentTarget.getBoundingClientRect();if(!box.width||!box.height)return;const x=Math.max(0,Math.min(1,(event.clientX-box.left)/box.width)),y=Math.max(0,Math.min(1,(event.clientY-box.top)/box.height));onMessage(portrait?{...message,px:x,py:y}:{...message,x,y});};
  const down=event=>{if(tool==='message'&&message.text.trim()){event.currentTarget.setPointerCapture?.(event.pointerId);drag.current={message:true};placeMessage(event);return;}const rect=geometry();if(!rect)return;event.currentTarget.setPointerCapture?.(event.pointerId);drag.current={x:event.clientX,y:event.clientY,width:event.currentTarget.getBoundingClientRect().width||1,cx:crop.cx,cy:crop.cy};};
  const up=event=>{drag.current=null;event.currentTarget.releasePointerCapture?.(event.pointerId);};
  return <div className={`pause-picker-stage is-crop${tool==='message'?' is-placing':''}${portrait?' is-portrait':''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={event=>{const rect=geometry();if(rect)onCrop({...crop,zoom:Math.max(rect.minZoom,Math.min(MAX_ZOOM,rect.zoom*(event.deltaY<0?1.08:1/1.08)))});}}>
    {failed?<p className="pause-picker-note">This photo could not be loaded for the live. Choose another one.</p>:<canvas ref={canvas} width={W} height={H} aria-label="The pause frame: drag to pan, scroll to zoom"/>}
    {guide&&!failed&&<div className="pause-band-guide" style={{left:`${guide.x/W*100}%`,width:`${guide.w/W*100}%`}} aria-hidden="true"><span>Portrait</span></div>}
  </div>;
}
// Pick the pause photo from the site's gallery (photos only).
export default function PausePhotoPicker({token,currentId,initial=null,portraitPan=.5,format='both',onPick,onClose}){
  const [items,setItems]=useState(null),[error,setError]=useState(''),[chosen,setChosen]=useState(initial?.item||null),[busy,setBusy]=useState(false),[crop,setCrop]=useState(initial?.crop||DEFAULT_CROP),[cropP,setCropP]=useState(initial?.cropPortrait||DEFAULT_CROP),[orientation,setOrientation]=useState(format==='portrait'?'portrait':'landscape'),peek=useRef(null),[loaded,setLoaded]=useState(null),[message,setMessage]=useState(()=>normalizeMessage(initial?.message)),[tool,setTool]=useState('photo'),[view,setView]=useState('editor');
  const portraitView=orientation==='portrait',activeCrop=portraitView?cropP:crop,setActiveCrop=portraitView?setCropP:setCrop,FW=portraitView?PAUSE_PORTRAIT_WIDTH:PAUSE_WIDTH,FH=portraitView?PAUSE_PORTRAIT_HEIGHT:PAUSE_HEIGHT,band=portraitBand(portraitPan);
  // The portrait picture of a Landscape + Portrait live is this band of the landscape frame: keep a small live copy of it.
  const drawPeek=canvas=>{const target=peek.current;if(!target||portraitView)return;target.getContext('2d').drawImage(canvas,band.x,0,band.w,PAUSE_HEIGHT,0,0,target.width,target.height);};
  useEffect(()=>{let cancelled=false;fetchGallery(['photo'],{token}).then(list=>{if(!cancelled)setItems(list);}).catch(()=>{if(!cancelled)setError('The gallery could not be loaded.');});return()=>{cancelled=true;};},[token]);
  useEffect(()=>{const key=event=>{if(event.key==='Escape')onClose();};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[onClose]);
  // Rendered on the page itself, not inside the controls panel: a pop-up gallery over the whole Studio.
  return createPortal(<div className="pause-picker" role="dialog" aria-modal="true" aria-label="Choose the pause photo from the gallery" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div className="pause-picker-card">
      <header>
<div>
<h3>{view==='gallery'?'Choose a photo':'Pause photo'}</h3>
<p>{view==='gallery'?'Pick a photo from the gallery. You can frame it and add a message next.':chosen?'Frame the photo and add an optional message. This is the frame viewers see while the live is paused.':'Choose a photo from the gallery, then frame it and add an optional message. Viewers see it while the live is paused.'}</p>
</div>
<button type="button" aria-label="Close" onClick={onClose}>
<X size={16}/>
</button>
</header>
      {error&&<p className="studio-help is-warning" role="alert">{error}</p>}
      {view==='gallery'&&!items&&!error&&<p className="pause-picker-note" role="status">Loading the gallery…</p>}
      {view==='gallery'&&items&&!items.length&&<p className="pause-picker-note"><ImageOff size={16} aria-hidden="true"/> No photos in the gallery yet. Add some in Echo → Gallery.</p>}
      {view==='editor'&&<div className="pause-editor">
        <div className="pause-editor-stage">
          <div className="pause-editor-bar" role="group" aria-label="What dragging on the picture does">
            <span>Drag on the picture to</span>
            <button type="button" aria-pressed={tool==='photo'} disabled={!chosen} onClick={()=>setTool('photo')}><Move size={14} aria-hidden="true"/>Move the photo</button>
            <button type="button" aria-pressed={tool==='message'} disabled={!chosen||!message.text.trim()} title={message.text.trim()?'Drag on the picture to place the message':'Write a message first'} onClick={()=>setTool('message')}><Type size={14} aria-hidden="true"/>Place the message</button>
            <span className="pause-orient" role="tablist" aria-label="Frame for"><button type="button" role="tab" aria-selected={!portraitView} onClick={()=>setOrientation('landscape')}>Landscape 16:9</button><button type="button" role="tab" aria-selected={portraitView} onClick={()=>setOrientation('portrait')}>Portrait 9:16</button></span>
          </div>
          {chosen?<CropStage item={chosen} crop={activeCrop} onCrop={setActiveCrop} onReady={setLoaded} message={message} tool={tool} onMessage={setMessage} orientation={orientation} onPaint={drawPeek} guide={!portraitView&&format!=='landscape'&&format!=='portrait'?band:null}/>:<div className="pause-editor-empty"><ImagePlus size={34} strokeWidth={1.3} aria-hidden="true"/><strong>No photo yet</strong><span>Pick one from the gallery to start.</span><button type="button" className="pause-btn is-primary" onClick={()=>setView('gallery')}>Choose from gallery</button></div>}
        </div>
        <aside className="pause-editor-panel" aria-label="Pause photo settings">
          <section>
            <h4>Photo</h4>
            <button type="button" className="pause-btn pause-gallery-btn" onClick={()=>setView('gallery')}><ImagePlus size={15} aria-hidden="true"/>{chosen?'Change photo from gallery':'Choose from gallery'}</button>
            {!chosen?<p className="pause-muted">No photo chosen yet.</p>:loaded?(()=>{const info=cropRect(loaded.naturalWidth,loaded.naturalHeight,activeCrop,FW,FH);return <div className="pause-row">
              <label className="pause-zoom">Zoom<input type="range" min={info.minZoom} max={MAX_ZOOM} step="0.01" value={info.zoom} onChange={event=>setActiveCrop({...activeCrop,zoom:Number(event.target.value)})} aria-label="Zoom"/></label>
              <span className="pause-seg" role="group" aria-label="Framing"><button type="button" onClick={()=>setActiveCrop(DEFAULT_CROP)}>Fit</button><button type="button" onClick={()=>setActiveCrop({zoom:1,cx:.5,cy:.5})}>Fill</button></span>
            </div>;})():<p className="pause-muted">Loading the photo…</p>}
            {chosen&&<p className="pause-muted">Drag the picture to pan. Scroll to zoom. {portraitView?'This 9:16 frame is used when you send Portrait only.':format==='portrait'?'':'Dashed lines: what portrait viewers see when you send Landscape + Portrait.'}</p>}
          </section>
          {!portraitView&&format==='both'&&<section>
            <h4>Portrait viewers see</h4>
            <canvas ref={peek} className="pause-peek" width="180" height="320" aria-label="Portrait preview"/>
            <p className="pause-muted">With Landscape + Portrait, the portrait picture is this slice of the frame. It follows the portrait crop position set in the studio.</p>
          </section>}
          <section>
            <h4>Pause message <small>optional</small></h4>
            <textarea value={message.text} maxLength={300} rows={3} placeholder="e.g. We'll be right back" aria-label="Pause message" onChange={event=>setMessage(current=>({...current,text:event.target.value}))}/>
            <div className="pause-row">
              <label className="pause-zoom">Size<input type="range" min="3" max="14" step="0.5" value={message.size} aria-label="Message size" onChange={event=>setMessage(current=>({...current,size:Number(event.target.value)}))}/></label>
              {!portraitView&&format==='both'&&<label className="pause-check"><input type="checkbox" checked={message.safe} onChange={event=>setMessage(current=>({...current,safe:event.target.checked}))}/>Fit the message inside the portrait slice</label>}
              <span className="pause-message-colors" role="group" aria-label="Message colour">{MESSAGE_COLORS.map(color=><button key={color} type="button" aria-label={`Colour ${color}`} aria-pressed={message.color===color} style={{background:color}} onClick={()=>setMessage(current=>({...current,color}))}/>)}</span>
            </div>
            <div className="pause-row">
              <span className="pause-seg" role="group" aria-label="Quick positions">{[['Top',.16],['Middle',.5],['Bottom',.82]].map(([name,y])=><button key={name} type="button" disabled={!message.text.trim()} onClick={()=>setMessage(current=>portraitView?({...current,px:.5,py:y}):({...current,x:.5,y}))}>{name}</button>)}</span>
              <button type="button" className="pause-link" disabled={!message.text} onClick={()=>{setMessage({...DEFAULT_MESSAGE});setTool('photo');}}>Clear message</button>
            </div>
          </section>
          <footer className="pause-editor-actions">
            <button type="button" className="pause-btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="pause-btn is-primary" disabled={busy||!chosen||!loaded} onClick={async()=>{setBusy(true);try{await onPick(chosen,{crop,cropPortrait:cropP,message});}finally{setBusy(false);}}}>{busy?'Saving…':'Set as pause photo'}</button>
          </footer>
        </aside>
      </div>}
      {view==='gallery'&&<div className="pause-gallery-bar"><button type="button" className="pause-btn" onClick={()=>setView('editor')}><ArrowLeft size={14} aria-hidden="true"/>Back</button></div>}
      {view==='gallery'&&items?.length>0&&<ul className="pause-picker-grid">{items.map(item=><li key={item.id}><button type="button" className={item.id===currentId?'is-current':''} onClick={()=>{setChosen(item);setCrop(DEFAULT_CROP);setLoaded(null);setTool('photo');setView('editor');}}  aria-label="Gallery photo"><img src={item.mediaUrl} alt="" loading="lazy"/></button></li>)}</ul>}
    </div>
  </div>,document.body);
}
