import {useEffect,useRef,useState} from 'react';
import {Crop,Move,RotateCcw} from 'lucide-react';
import {OVERLAY_SHAPES,DEFAULT_OVERLAY,MIN_CROP,MIN_WIDTH,MAX_WIDTH,overlayBox,placeOverlay} from '../lib/twoCameraSource';
import './studioOverlayEditor.css';
const clamp=(value,low,high)=>Math.min(high,Math.max(low,value));
const CORNERS=[['tl','Top left'],['tr','Top right'],['bl','Bottom left'],['br','Bottom right']];
const SIZES=[['S',.18],['M',.26],['L',.4]];
// Pointer drag on a stage: reports the movement as a fraction of the stage, from where the drag started (works for mouse, pen and touch).
function useDrag(stage,onMove){
  const state=useRef(null);
  const start=(event,mode,snapshot)=>{
    if(event.button!==undefined&&event.button!==0)return;
    event.preventDefault();event.stopPropagation();
    const rect=stage.current.getBoundingClientRect();
    state.current={mode,snapshot,x:event.clientX,y:event.clientY,rect};try{event.currentTarget.setPointerCapture?.(event.pointerId);}catch{/* the drag still follows the pointer over the stage */}
  };
  const move=event=>{const d=state.current;if(!d)return;onMove(d.mode,d.snapshot,(event.clientX-d.x)/d.rect.width,(event.clientY-d.y)/d.rect.height);};
  const end=()=>{state.current=null;};
  return {start,bind:{onPointerMove:move,onPointerUp:end,onPointerCancel:end}};
}
/**
 * Overlay editor for the two-camera scenario.
 *  Cut:   draw any rectangle on Camera 2's live picture (drag it, or pull a corner). A circle always cuts a square.
 *  Place: drag the cut-out on the 16:9 output frame; pull its corner to resize it.
 * Everything applies live, also while on air.
 */
export default function StudioOverlayEditor({overlay,onOverlay,getOverlayVideo,previewing}){
  const canvas=useRef(null),cutStage=useRef(null),placeStage=useRef(null);
  const [dims,setDims]=useState({w:1280,h:720});
  const {crop,shape}=overlay;
  // Camera 2's live picture inside the cut stage.
  useEffect(()=>{
    if(!previewing)return undefined;
    let frame=0,last=0;
    const tick=time=>{
      frame=requestAnimationFrame(tick);
      if(time-last<66)return;last=time;
      const video=getOverlayVideo?.(),target=canvas.current;
      if(!video||!target||video.readyState<2||!video.videoWidth)return;
      if(target.width!==video.videoWidth/2||target.height!==video.videoHeight/2){target.width=Math.round(video.videoWidth/2);target.height=Math.round(video.videoHeight/2);setDims({w:video.videoWidth,h:video.videoHeight});}
      target.getContext('2d').drawImage(video,0,0,target.width,target.height);
    };
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
  },[previewing,getOverlayVideo]);
  const set=patch=>onOverlay({...overlay,...patch});
  const setCrop=next=>{
    let {x,y,w,h}=next;
    if(shape==='circle'){const side=Math.min(w*dims.w,h*dims.h);w=side/dims.w;h=side/dims.h;}
    w=clamp(w,MIN_CROP,1);h=clamp(h,MIN_CROP,1);set({crop:{x:clamp(x,0,1-w),y:clamp(y,0,1-h),w,h}});
  };
  const cutDrag=useDrag(cutStage,(mode,start,dx,dy)=>{
    if(mode==='move'){setCrop({...start,x:start.x+dx,y:start.y+dy});return;}
    let {x,y,w,h}=start;const right=x+w,bottom=y+h;
    if(mode.includes('w')){x=clamp(start.x+dx,0,right-MIN_CROP);w=right-x;}
    if(mode.includes('e')){w=clamp(start.w+dx,MIN_CROP,1-start.x);}
    if(mode.includes('n')){y=clamp(start.y+dy,0,bottom-MIN_CROP);h=bottom-y;}
    if(mode.includes('s')){h=clamp(start.h+dy,MIN_CROP,1-start.y);}
    setCrop({x,y,w,h});
  });
  const frameBox=overlayBox(1280,720,overlay,dims.w,dims.h).dest;
  const placeDrag=useDrag(placeStage,(mode,start,dx,dy)=>{
    if(mode==='move'){set({x:clamp(start.x+dx,0,1-frameBox.w/1280),y:clamp(start.y+dy,0,1-frameBox.h/720)});return;}
    set({w:clamp(start.w+dx,MIN_WIDTH,MAX_WIDTH)});
  });
  const cutStyle={left:`${crop.x*100}%`,top:`${crop.y*100}%`,width:`${crop.w*100}%`,height:`${crop.h*100}%`};
  const radius=shape==='circle'?'50%':shape==='rounded'?'12%':'2px';
  const placeStyle={left:`${frameBox.x/12.8}%`,top:`${frameBox.y/7.2}%`,width:`${frameBox.w/12.8}%`,height:`${frameBox.h/7.2}%`,borderRadius:radius};
  const reset=()=>onOverlay({...DEFAULT_OVERLAY,shape});
  return <div className="soe">
    <div className="soe-toolbar">
      <div className="soe-shapes" role="radiogroup" aria-label="Overlay shape">{OVERLAY_SHAPES.map(([id,label])=><button key={id} type="button" role="radio" aria-checked={shape===id} onClick={()=>set({shape:id,...(id==='circle'?{crop:(()=>{const side=Math.min(crop.w*dims.w,crop.h*dims.h);return {...crop,w:side/dims.w,h:side/dims.h};})()}:{})})}><i className={`soe-shape is-${id}`} aria-hidden="true"/>{label}</button>)}</div>
      <button type="button" className="soe-reset" onClick={reset}><RotateCcw size={14} aria-hidden="true"/>Reset</button>
    </div>
    <div className="soe-stages">
      <figure className="soe-figure">
        <figcaption><Crop size={14} aria-hidden="true"/><strong>Cut Camera 2</strong><small>Drag the box, or pull a corner. Cut it any way you like.</small></figcaption>
        <div className="soe-stage" ref={cutStage} style={{aspectRatio:`${dims.w} / ${dims.h}`}}>
          <canvas ref={canvas} aria-hidden="true"/>
          {!previewing&&<p className="soe-empty">Open the private preview to see Camera 2 here.</p>}
          <div className="soe-cut" role="group" aria-label="Cut of Camera 2" style={{...cutStyle,borderRadius:radius}} onPointerDown={event=>cutDrag.start(event,'move',crop)} {...cutDrag.bind}>
            {['nw','ne','sw','se'].map(corner=><span key={corner} className={`soe-handle is-${corner}`} role="presentation" onPointerDown={event=>cutDrag.start(event,corner,crop)} {...cutDrag.bind}/>)}
          </div>
        </div>
      </figure>
      <figure className="soe-figure">
        <figcaption><Move size={14} aria-hidden="true"/><strong>Place on the 16:9 frame</strong><small>Drag it where you want it. Pull the corner to resize.</small></figcaption>
        <div className="soe-stage soe-frame" ref={placeStage} style={{aspectRatio:'16 / 9'}}>
          <span className="soe-frame-label">Camera 1</span>
          <div className="soe-over" role="group" aria-label="Camera 2 overlay position" style={placeStyle} onPointerDown={event=>placeDrag.start(event,'move',overlay)} {...placeDrag.bind}>
            <span>Camera 2</span>
            <span className="soe-handle is-se" role="presentation" onPointerDown={event=>placeDrag.start(event,'size',overlay)} {...placeDrag.bind}/>
          </div>
        </div>
      </figure>
    </div>
    <div className="soe-quick" aria-label="Quick placement">
      <div role="group" aria-label="Corner">{CORNERS.map(([id,label])=><button key={id} type="button" title={label} aria-label={label} onClick={()=>onOverlay(placeOverlay(overlay,id,1280,720,dims.w,dims.h))}><i className={`soe-corner is-${id}`} aria-hidden="true"/></button>)}</div>
      <div role="group" aria-label="Size">{SIZES.map(([label,width])=><button key={label} type="button" aria-pressed={Math.abs(overlay.w-width)<.01} onClick={()=>set({w:width})}>{label}</button>)}</div>
    </div>
  </div>;
}
