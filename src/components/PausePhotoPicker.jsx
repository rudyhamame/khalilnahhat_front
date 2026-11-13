import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X,ImageOff,ImagePlus,Move,Type,ArrowLeft,Music,Grid3x3} from 'lucide-react';
import {fetchGallery} from '../lib/galleryApi';
import {cropRect,DEFAULT_CROP,DEFAULT_MESSAGE,MESSAGE_COLORS,MESSAGE_FONTS,loadMessageFont,FX_DEFAULT,FX_PRESETS,normalizeFx,loadImage,MAX_ZOOM,normalizeMessage,paintFrame,PAUSE_HEIGHT,PAUSE_PORTRAIT_HEIGHT,PAUSE_PORTRAIT_WIDTH,PAUSE_WIDTH,portraitBand} from '../lib/pausePhoto';

// The exact 16:9 frame viewers will see. Drag to pan, use the slider or the wheel to zoom and crop; the picture here is the picture the live shows.
export function CropStage({item,crop,onCrop,onReady,message,tool,onMessage,orientation='landscape',onPaint,guide=null,count=0,grid=false}){
  const portrait=orientation==='portrait',W=portrait?PAUSE_PORTRAIT_WIDTH:PAUSE_WIDTH,H=portrait?PAUSE_PORTRAIT_HEIGHT:PAUSE_HEIGHT;
  const canvas=useRef(null),drag=useRef(null),[image,setImage]=useState(null),[failed,setFailed]=useState(false);
  useEffect(()=>{let cancelled=false;setImage(null);setFailed(false);loadImage(item.mediaUrl).then(loaded=>{if(!cancelled){setImage(loaded);onReady?.(loaded);}}).catch(()=>{if(!cancelled)setFailed(true);});return()=>{cancelled=true;};},[item.mediaUrl]);// eslint-disable-line react-hooks/exhaustive-deps
  useEffect(()=>{const element=canvas.current;if(!element||!image)return;const ctx=element.getContext('2d');paintFrame(ctx,image,crop,W,H,message,guide);if(count>0){ctx.fillStyle='rgba(0,0,0,.45)';ctx.fillRect(0,0,W,H);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`700 ${Math.round(Math.min(W,H)*.5)}px system-ui,sans-serif`;ctx.fillText(String(count),W/2,H/2);}onPaint?.(element);},[image,crop,message,W,H,guide,count]);
  // The wheel zooms the photo and never scrolls the page: a native, non-passive listener (React's onWheel cannot cancel the scroll).
  const stage=useRef(null),latest=useRef({});latest.current={crop,onCrop,image,W,H};
  useEffect(()=>{const node=stage.current;if(!node)return undefined;const wheel=event=>{event.preventDefault();const {crop:now,onCrop:set,image:picture,W:w,H:h}=latest.current;if(!picture)return;const rect=cropRect(picture.naturalWidth,picture.naturalHeight,now,w,h);set({...now,zoom:Math.max(rect.minZoom,Math.min(MAX_ZOOM,rect.zoom*(event.deltaY<0?1.08:1/1.08)))});};node.addEventListener('wheel',wheel,{passive:false});return()=>node.removeEventListener('wheel',wheel);},[]);
  const geometry=()=>image?cropRect(image.naturalWidth,image.naturalHeight,crop,W,H):null;
  // Touch: two fingers pinch to zoom.
  const touches=useRef(new Map()),pinch=useRef(null);
  const move=event=>{if(touches.current.has(event.pointerId))touches.current.set(event.pointerId,{x:event.clientX,y:event.clientY});if(pinch.current){const [a,b]=[...touches.current.values()];const rect=geometry();if(a&&b&&rect){const distance=Math.hypot(a.x-b.x,a.y-b.y)||1;onCrop({...crop,zoom:Math.max(rect.minZoom,Math.min(MAX_ZOOM,pinch.current.zoom*distance/pinch.current.distance))});}return;}
    const state=drag.current;if(state?.message){placeMessage(event);return;}const rect=geometry();if(!state||!rect||!image)return;const scale=W/state.width;
    let cx=state.cx-((event.clientX-state.x)*scale)/rect.w,cy=state.cy-((event.clientY-state.y)*scale)/rect.h;
    if(grid){// Magnet: the photo's centre locks onto the thirds and centre lines.
      const at=cropRect(image.naturalWidth,image.naturalHeight,{zoom:rect.zoom,cx,cy},W,H),line=(value,size)=>[size/3,size/2,size*2/3].find(l=>Math.abs(value-l)<size*.03);
      const lx=line(at.x+at.w/2,W),ly=line(at.y+at.h/2,H);if(lx!==undefined)cx+=(at.x+at.w/2-lx)/at.w;if(ly!==undefined)cy+=(at.y+at.h/2-ly)/at.h;}
    onCrop({zoom:rect.zoom,cx,cy});};
  const placeMessage=event=>{const box=event.currentTarget.getBoundingClientRect();if(!box.width||!box.height)return;const snap=value=>{if(!grid)return value;const line=[1/3,.5,2/3].find(at=>Math.abs(value-at)<.03);return line??value;};const x=snap(Math.max(0,Math.min(1,(event.clientX-box.left)/box.width))),y=snap(Math.max(0,Math.min(1,(event.clientY-box.top)/box.height)));onMessage(portrait?{...message,px:x,py:y}:{...message,x,y});};
  const down=event=>{touches.current.set(event.pointerId,{x:event.clientX,y:event.clientY});if(touches.current.size===2&&tool!=='message'){const [a,b]=[...touches.current.values()],rect=geometry();if(rect){pinch.current={distance:Math.hypot(a.x-b.x,a.y-b.y)||1,zoom:rect.zoom};drag.current=null;return;}}
    if(tool==='message'&&message.text.trim()){event.currentTarget.setPointerCapture?.(event.pointerId);drag.current={message:true};placeMessage(event);return;}const rect=geometry();if(!rect)return;event.currentTarget.setPointerCapture?.(event.pointerId);drag.current={x:event.clientX,y:event.clientY,width:event.currentTarget.getBoundingClientRect().width||1,cx:crop.cx,cy:crop.cy};};
  const up=event=>{touches.current.delete(event.pointerId);if(pinch.current&&touches.current.size<2)pinch.current=null;drag.current=null;event.currentTarget.releasePointerCapture?.(event.pointerId);};
  return <div className={`pause-picker-stage is-crop${tool==='message'?' is-placing':''}${portrait?' is-portrait':''}`} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onDoubleClick={()=>{if(tool!=='message')onCrop(DEFAULT_CROP);}} ref={stage}>
    {failed?<p className="pause-picker-note">This photo could not be loaded for the live. Choose another one.</p>:<canvas ref={canvas} width={W} height={H} aria-label="The pause frame: drag to pan, scroll to zoom"/>}
    {grid&&!failed&&<div className="pause-grid" aria-hidden="true"/>}
    {guide&&!failed&&<div className="pause-band-guide" style={{left:`${guide.x/W*100}%`,width:`${guide.w/W*100}%`}} aria-hidden="true"><span>Portrait</span></div>}
  </div>;
}
// Pick the pause screen from the site's gallery (photos only).
export default function PausePhotoPicker({token,currentId,initial=null,initialSound=null,initialCountdown=3,initialIntro=0,portraitPan=.5,format='both',target='pause',onTarget,onPick,onClose}){
  const goLive=target==='golive',screenName=goLive?'Go live screen':'Pause screen';
  const [items,setItems]=useState(null),[error,setError]=useState(''),[chosen,setChosen]=useState(initial?.item||null),[busy,setBusy]=useState(false),[crop,setCrop]=useState(initial?.crop||DEFAULT_CROP),[cropP,setCropP]=useState(initial?.cropPortrait||{zoom:1,cx:.5,cy:.5}),[orientation,setOrientation]=useState(format==='portrait'?'portrait':'landscape'),peek=useRef(null),[loaded,setLoaded]=useState(null),[message,setMessage]=useState(()=>normalizeMessage(initial?.message)),[tool,setTool]=useState('photo'),[view,setView]=useState('editor'),[sound,setSound]=useState(initialSound),[countdown,setCountdown]=useState(initialCountdown),[intro,setIntro]=useState(initialIntro);
  // Clicking a countdown length plays it over the frame, as viewers will see it on resume.
  const [grid,setGrid]=useState(true),[previewCount,setPreviewCount]=useState(0),previewTimer=useRef(null);
  const runPreview=value=>{clearInterval(previewTimer.current);setPreviewCount(value);if(value<1)return;let n=value;previewTimer.current=setInterval(()=>{n-=1;setPreviewCount(n);if(n<1)clearInterval(previewTimer.current);},1000);};
  useEffect(()=>()=>clearInterval(previewTimer.current),[]);
  const portraitView=orientation==='portrait',activeCrop=portraitView?cropP:crop,setActiveCrop=portraitView?setCropP:setCrop,FW=portraitView?PAUSE_PORTRAIT_WIDTH:PAUSE_WIDTH,FH=portraitView?PAUSE_PORTRAIT_HEIGHT:PAUSE_HEIGHT,band=portraitBand(portraitPan);
  // The portrait picture of a Landscape + Portrait live is this band of the landscape frame: keep a small live copy of it.
  const drawPeek=canvas=>{const target=peek.current;if(!target||portraitView)return;target.getContext('2d').drawImage(canvas,band.x,0,band.w,PAUSE_HEIGHT,0,0,target.width,target.height);};
  useEffect(()=>{let cancelled=false;fetchGallery(['photo'],{token}).then(list=>{if(!cancelled)setItems(list);}).catch(()=>{if(!cancelled)setError('The gallery could not be loaded.');});return()=>{cancelled=true;};},[token]);
  useEffect(()=>{const key=event=>{if(event.key==='Escape')onClose();};document.addEventListener('keydown',key);return()=>document.removeEventListener('keydown',key);},[onClose]);
  // Rendered on the page itself, not inside the controls panel: a pop-up gallery over the whole Studio.
  return createPortal(<div className="pause-picker" role="dialog" aria-modal="true" aria-label="Live screens" onClick={event=>{if(event.target===event.currentTarget)onClose();}}>
    <div className="pause-picker-card">
      <header>
<div>
<h3>{view==='gallery'?'Choose a photo':'Live screens'}</h3>
<div className="pause-targets" role="tablist" aria-label="Screen target"><small>Screen target</small>{[['pause','PAUSE'],['golive','GO LIVE']].map(([key,name])=><button key={key} type="button" role="tab" aria-selected={target===key} onClick={()=>target!==key&&onTarget?.(key)}>{name}</button>)}</div>
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
            <button type="button" aria-pressed={grid} disabled={!chosen} title="Show a grid to line things up (not part of the picture)" onClick={()=>setGrid(value=>!value)}><Grid3x3 size={14} aria-hidden="true"/>Grid</button>
            <span className="pause-orient" role="tablist" aria-label="Frame for"><button type="button" role="tab" aria-selected={!portraitView} onClick={()=>setOrientation('landscape')}>Landscape 16:9</button><button type="button" role="tab" aria-selected={portraitView} onClick={()=>setOrientation('portrait')}>Portrait 9:16</button></span>
          </div>
          {chosen?<CropStage item={chosen} crop={activeCrop} onCrop={setActiveCrop} onReady={setLoaded} message={message} tool={tool} onMessage={setMessage} orientation={orientation} onPaint={drawPeek} count={previewCount} grid={grid}/>:<div className="pause-editor-empty"><ImagePlus size={34} strokeWidth={1.3} aria-hidden="true"/><strong>No photo yet</strong><span>Pick one from the gallery to start.</span><button type="button" className="pause-btn is-primary" onClick={()=>setView('gallery')}>Choose from gallery</button></div>}
        </div>
        <aside className="pause-editor-panel" aria-label="Pause screen settings">
          <section>
            <h4>Photo</h4>
            <button type="button" className="pause-btn pause-gallery-btn" onClick={()=>setView('gallery')}><ImagePlus size={15} aria-hidden="true"/>{chosen?'Change photo from gallery':'Choose from gallery'}</button>
            {!chosen?<p className="pause-muted">No photo chosen yet.</p>:loaded?(()=>{const info=cropRect(loaded.naturalWidth,loaded.naturalHeight,activeCrop,FW,FH);return <div className="pause-row">
              <label className="pause-zoom">Zoom<input type="range" min={info.minZoom} max={MAX_ZOOM} step="0.01" value={info.zoom} onChange={event=>setActiveCrop({...activeCrop,zoom:Number(event.target.value)})} aria-label="Zoom"/></label>
              <span className="pause-seg" role="group" aria-label="Framing"><button type="button" onClick={()=>setActiveCrop(DEFAULT_CROP)}>Fit</button><button type="button" onClick={()=>setActiveCrop({zoom:1,cx:.5,cy:.5})}>Fill</button></span>
            </div>;})():<p className="pause-muted">Loading the photo…</p>}
            {chosen&&<p className="pause-muted">Drag the picture to pan. Scroll to zoom. </p>}
          </section>
          <section>
            <h4>Background filter</h4>
            <div className="pause-fonts" role="group" aria-label="Filter presets">{FX_PRESETS.map(([name,preset])=><button key={name} type="button" onClick={()=>setMessage(current=>({...current,fx:{...FX_DEFAULT,...preset}}))}>{name}</button>)}</div>
            {[['blur','Blur',0,6,.1,'%'],['fade','Fade',0,90,1,'%'],['brightness','Brightness',40,160,1,'%'],['saturate','Colour',0,200,1,'%'],['gray','Mono',0,100,1,'%'],['sepia','Warm',0,100,1,'%']].map(([key,label,min,max,step])=><label className="pause-zoom pause-fx" key={key}>{label}<input type="range" min={min} max={max} step={step} value={normalizeFx(message.fx)[key]} aria-label={`Background ${label}`} onChange={event=>setMessage(current=>({...current,fx:{...normalizeFx(current.fx),[key]:Number(event.target.value)}}))}/></label>)}
          </section>
          <section>
            <h4>Pause message <small>optional</small></h4>
            <textarea value={message.text} maxLength={300} rows={3} placeholder="e.g. We'll be right back" aria-label="Pause message" onChange={event=>setMessage(current=>({...current,text:event.target.value}))}/>
            <div className="pause-row">
            <div className="pause-fonts" role="group" aria-label="Message font">{MESSAGE_FONTS.map(([name,family])=><button key={family} type="button" aria-pressed={message.font===family} style={{fontFamily:`"${family}"`}} onClick={()=>{setMessage(current=>({...current,font:family}));void loadMessageFont(family)?.then(()=>setMessage(current=>({...current})));}}>{name}</button>)}</div>
            </div>
            <div className="pause-row">
              <label className="pause-zoom">Size<input type="range" min="3" max="14" step="0.5" value={portraitView?message.psize:message.size} aria-label="Message size" onChange={event=>setMessage(current=>({...current,[portraitView?'psize':'size']:Number(event.target.value)}))}/></label>
              <span className="pause-message-colors" role="group" aria-label="Message colour">{MESSAGE_COLORS.map(color=><button key={color} type="button" aria-label={`Colour ${color}`} aria-pressed={(portraitView?message.pcolor:message.color)===color} style={{background:color}} onClick={()=>setMessage(current=>({...current,[portraitView?'pcolor':'color']:color}))}/>)}</span>
            </div>
            <div className="pause-row">
              <span className="pause-seg" role="group" aria-label="Quick positions">{[['Top',.16],['Middle',.5],['Bottom',.82]].map(([name,y])=><button key={name} type="button" disabled={!message.text.trim()} onClick={()=>setMessage(current=>portraitView?({...current,px:.5,py:y}):({...current,x:.5,y}))}>{name}</button>)}</span>
              <button type="button" className="pause-link" disabled={!message.text} onClick={()=>{setMessage({...DEFAULT_MESSAGE});setTool('photo');}}>Clear message</button>
            </div>
          </section>
          {!goLive&&<section>
            <h4>Pause sound <small>optional</small></h4>
            {sound?<div className="pause-row"><span className="pause-muted">{sound.name} · plays on a loop while paused</span><button type="button" className="pause-link" onClick={()=>setSound(null)}>Remove</button></div>:<p className="pause-muted">Viewers hear this sound on a loop while the live is paused. The live inputs are silenced.</p>}
            <label className="pause-btn pause-gallery-btn"><Music size={15} aria-hidden="true"/>{sound?'Change audio file':'Add an audio file'}<input type="file" accept="audio/*" hidden onChange={event=>{const file=event.target.files?.[0];if(file)setSound(file);event.target.value='';}}/></label>
          </section>}
          <section>
            {!goLive&&<><h4>Countdown on pause</h4>
            <div className="pause-row"><span className="pause-seg" role="group" aria-label="Countdown on pause">{[[0,'Off'],[3,'3 s'],[5,'5 s'],[10,'10 s'],[30,'30 s'],[60,'60 s']].map(([value,name])=><button key={value} type="button" aria-pressed={intro===value} onClick={()=>{setIntro(value);runPreview(value);}}>{name}</button>)}</span></div>
            <p className="pause-muted">When you press Pause, viewers see the countdown over the pause screen first.</p>
            </>}
            <h4>{goLive?'Countdown before going live':'Countdown on resume'}</h4>
            <div className="pause-row"><span className="pause-seg" role="group" aria-label="Countdown on resume">{[[0,'Off'],[3,'3 s'],[5,'5 s'],[10,'10 s'],[30,'30 s'],[60,'60 s']].map(([value,name])=><button key={value} type="button" aria-pressed={countdown===value} onClick={()=>{setCountdown(value);runPreview(value);}}>{name}</button>)}</span></div>
            <p className="pause-muted">{goLive?'When you press Go live, viewers see this screen with the countdown, then the live begins.':'When you press Resume live, viewers see the countdown over the pause screen, then the live returns.'}</p>
          </section>
          <footer className="pause-editor-actions">
            <button type="button" className="pause-btn" onClick={onClose} disabled={busy}>Cancel</button>
            <button type="button" className="pause-btn is-primary" disabled={busy||!chosen||!loaded} onClick={async()=>{setBusy(true);try{await onPick(chosen,{crop,cropPortrait:cropP,message,sound,countdown,intro});}finally{setBusy(false);}}}>{busy?'Saving…':goLive?'Set as go live screen':'Set as pause screen'}</button>
          </footer>
        </aside>
      </div>}
      {view==='gallery'&&<div className="pause-gallery-bar"><button type="button" className="pause-btn" onClick={()=>setView('editor')}><ArrowLeft size={14} aria-hidden="true"/>Back</button></div>}
      {view==='gallery'&&items?.length>0&&<ul className="pause-picker-grid">{items.map(item=><li key={item.id}><button type="button" className={item.id===currentId?'is-current':''} onClick={()=>{setChosen(item);setCrop(DEFAULT_CROP);setLoaded(null);setTool('photo');setView('editor');}}  aria-label="Gallery photo"><img src={item.mediaUrl} alt="" loading="lazy"/></button></li>)}</ul>}
    </div>
  </div>,document.body);
}
