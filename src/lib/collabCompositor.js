import {startLiveFrameClock} from './liveFrameClock.js';
// Builds one new 16:9 landscape picture from two live sources (A and B). Pure geometry first, canvas second.
export const COLLAB_LAYOUTS=[
  {id:'a',label:'A only'},
  {id:'split',label:'Side by side'},
  {id:'pip-a',label:'A + B in corner'},
  {id:'pip-b',label:'B + A in corner'},
];
export const COLLAB_CORNERS=['br','bl','tr','tl'];
/** Where each source is drawn on a W×H canvas. `mode:'cover'` fills the box and crops; nothing is ever stretched. */
export function collabRects(layout,W,H,{corner='br',pip=.28,margin=.025}={}){
  if(layout==='split'){const half=Math.floor(W/2);return [{source:'a',x:0,y:0,w:half,h:H,mode:'cover'},{source:'b',x:half,y:0,w:W-half,h:H,mode:'cover'}];}
  if(layout==='pip-a'||layout==='pip-b'){
    const [main,inset]=layout==='pip-a'?['a','b']:['b','a'];
    const w=Math.round(W*Math.min(.5,Math.max(.15,pip))),h=Math.round(w*9/16),m=Math.round(W*margin);
    const x=corner.endsWith('l')?m:W-w-m,y=corner.startsWith('t')?m:H-h-m;
    return [{source:main,x:0,y:0,w:W,h:H,mode:'cover'},{source:inset,x,y,w,h,mode:'cover',frame:true}];
  }
  return [{source:'a',x:0,y:0,w:W,h:H,mode:'cover'}];
}
/** Source crop (sx,sy,sw,sh) that fills the box (dx,dy,dw,dh) without distortion; 'contain' letterboxes instead. */
export function fitRect(srcW,srcH,box,mode='cover'){
  const scale=(mode==='cover'?Math.max:Math.min)(box.w/srcW,box.h/srcH);
  if(mode==='contain'){const dw=srcW*scale,dh=srcH*scale;return {sx:0,sy:0,sw:srcW,sh:srcH,dx:box.x+(box.w-dw)/2,dy:box.y+(box.h-dh)/2,dw,dh};}
  const sw=box.w/scale,sh=box.h/scale;
  return {sx:(srcW-sw)/2,sy:(srcH-sh)/2,sw,sh,dx:box.x,dy:box.y,dw:box.w,dh:box.h};
}
const ready=video=>Boolean(video&&video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0);
/** Draw one frame. A source that is not ready yet leaves its box dark instead of freezing the whole picture. */
export function drawCollab(ctx,videos,rects,W,H){
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  for(const rect of rects){
    const video=videos[rect.source];if(!ready(video))continue;
    const f=fitRect(video.videoWidth,video.videoHeight,rect,rect.mode);
    ctx.drawImage(video,f.sx,f.sy,f.sw,f.sh,f.dx,f.dy,f.dw,f.dh);
    if(rect.frame){ctx.strokeStyle='#ffffffcc';ctx.lineWidth=Math.max(2,Math.round(W/480));ctx.strokeRect(rect.x,rect.y,rect.w,rect.h);}
  }
}
/**
 * Live compositor: two video elements in, one MediaStream out. Frames keep coming when the tab is in the background
 * (worker clock). Change the layout or swap sources at any time without restarting the stream.
 */
export function createCollabStream({a,b,layout='split',corner='br',pip=.28,width=1280,height=720,fps=30,doc=globalThis.document,clock=startLiveFrameClock}={}){
  const canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d'),state={videos:{a,b},layout,corner,pip};
  const draw=()=>drawCollab(ctx,state.videos,collabRects(state.layout,width,height,state),width,height);
  draw();const stopClock=clock(draw,fps),stream=canvas.captureStream(fps);
  return {
    stream,canvas,
    set(next={}){Object.assign(state,next.layout&&{layout:next.layout},next.corner&&{corner:next.corner},next.pip&&{pip:next.pip});},
    swap(){state.videos={a:state.videos.b,b:state.videos.a};},
    stop(){stopClock();for(const track of stream.getTracks())track.stop();},
  };
}
