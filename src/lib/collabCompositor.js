import {startLiveFrameClock} from './liveFrameClock.js';
// The collab picture: ONE landscape 16:9 frame. The landscape source fills it; the portrait source is overlaid as a 9:16 window.
export const OVERLAY_SIDES=[['right','Right edge'],['left','Left edge'],['mini-br','Mini · bottom right'],['mini-bl','Mini · bottom left']];
export const MINI_HEIGHT=.42,MINI_MARGIN=.025;
/**
 * The portrait source is an overlay window.
 *  right / left:      the portrait source is the full-height third on that side; the landscape source fills the other two thirds
 *  mini-br / mini-bl: minimized into the bottom right or bottom left corner, inside a margin
 */
export function collabRects(W,H,{side='right'}={}){
  const main={source:'a',x:0,y:0,w:W,h:H,mode:'cover'};
  if(side==='mini-br'||side==='mini-bl'){
    const h=Math.round(H*MINI_HEIGHT),w=Math.round(h*9/16),m=Math.round(W*MINI_MARGIN);
    return [main,{source:'b',x:side==='mini-bl'?m:W-w-m,y:H-h-m,w,h,mode:'cover',frame:true,edge:'all'}];
  }
  // Edge to edge: the portrait source takes one third of the frame, the landscape source the other two thirds. Nothing is hidden behind anything.
  const w=Math.round(W/3),rest=W-w;
  return [{source:'a',x:side==='left'?w:0,y:0,w:rest,h:H,mode:'cover'},{source:'b',x:side==='left'?0:rest,y:0,w,h:H,mode:'cover',frame:true,edge:side==='left'?'right':'left'}];
}
/** Source crop (sx,sy,sw,sh) that fills the box without distortion. `pan` (0..1) slides a cover crop sideways; 'contain' letterboxes. */
export function fitRect(srcW,srcH,box,mode='cover',pan=.5){
  const scale=(mode==='cover'?Math.max:Math.min)(box.w/srcW,box.h/srcH);
  if(mode==='contain'){const dw=srcW*scale,dh=srcH*scale;return {sx:0,sy:0,sw:srcW,sh:srcH,dx:box.x+(box.w-dw)/2,dy:box.y+(box.h-dh)/2,dw,dh};}
  const sw=box.w/scale,sh=box.h/scale,p=Math.max(0,Math.min(1,pan));
  return {sx:(srcW-sw)*p,sy:(srcH-sh)/2,sw,sh,dx:box.x,dy:box.y,dw:box.w,dh:box.h};
}
const ready=video=>Boolean(video&&video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0);
/** Draw one frame. A source that is not ready yet leaves its box dark instead of freezing the whole picture. `pan` crops the portrait overlay. */
export function drawCollab(ctx,videos,rects,W,H,pan=.5,logo=null){
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  for(const rect of rects){
    const video=videos[rect.source];if(!ready(video))continue;
    const f=fitRect(video.videoWidth,video.videoHeight,rect,rect.mode,rect.frame?pan:.5);
    ctx.drawImage(video,f.sx,f.sy,f.sw,f.sh,f.dx,f.dy,f.dw,f.dh);
    if(rect.frame){// A thin line on the inner edge only, so the overlay reads as a panel and stays flush with the frame.
      const line=Math.max(1,Math.round(W/1280));ctx.fillStyle='#ffffff99';
      if(rect.edge==='all'){ctx.fillRect(rect.x,rect.y,rect.w,line);ctx.fillRect(rect.x,rect.y+rect.h-line,rect.w,line);ctx.fillRect(rect.x,rect.y,line,rect.h);ctx.fillRect(rect.x+rect.w-line,rect.y,line,rect.h);}
      else{// Side-by-side divider: faint gray dashes.
        const x=rect.edge==='right'?rect.x+rect.w-line:rect.x,dash=line*6;ctx.fillStyle='#8a8d9366';
        for(let y=rect.y;y<rect.y+rect.h;y+=dash*2)ctx.fillRect(x,y,line,Math.min(dash,rect.y+rect.h-y));}}
  }
  // The brand logo, once: top-left of the landscape source's area (never doubled over the portrait source).
  if(logo&&(logo.complete??true)&&(logo.naturalWidth||logo.width)){
    const main=rects.find(rect=>rect.source==='a')||rects[0],margin=Math.round(Math.min(W,H)*.025),width=Math.round(Math.min(W,H)*.2),height=width*(logo.naturalHeight||logo.height)/(logo.naturalWidth||logo.width);
    ctx.globalAlpha=.9;ctx.drawImage(logo,main.x+margin,main.y+margin,width,height);ctx.globalAlpha=1;
  }
}
/**
 * Live compositor: two video elements in, one 16:9 MediaStream out. Frames keep coming when the tab is in the background
 * (worker clock). Side, pan and sources can change at any time without restarting the stream.
 */
export function createCollabStream({a,b,side='right',pan=.5,width=1280,height=720,fps=30,doc=globalThis.document,clock=startLiveFrameClock,logoSrc='/echo/dj-khalil-nahhat-logo.svg',ImageClass=globalThis.Image}={}){
  const canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d'),state={videos:{a,b},side,pan};
  let logo=null;if(ImageClass&&logoSrc){logo=new ImageClass();logo.src=logoSrc;}
  const draw=()=>drawCollab(ctx,state.videos,collabRects(width,height,state),width,height,state.pan,logo);
  draw();const stopClock=clock(draw,fps),stream=canvas.captureStream(fps);
  return {
    stream,canvas,
    set(next={}){for(const key of ['side','videos','pan'])if(next[key]!==undefined)state[key]=next[key];},
    stop(){stopClock();for(const track of stream.getTracks())track.stop();},
  };
}
