import {startLiveFrameClock} from './liveFrameClock.js';
import {fitRect} from './collabCompositor.js';
// Studio scenario "2 cameras": Camera 1 fills the 16:9 frame; Camera 2 is a cut-out window laid over it.
// The overlay is described in normalised units so it is independent of the output size:
//   crop  = the part of Camera 2 that is shown (any shape of rectangle: "cut as I like")
//   x,y,w = where it sits on the frame (left, top and width as fractions; the height follows the crop so nothing is stretched)
//   shape = 'rect' | 'rounded' | 'circle' (a circle always cuts a square)
export const OVERLAY_SHAPES=[['rect','Rectangle'],['rounded','Rounded'],['circle','Circle']];
export const DEFAULT_OVERLAY={shape:'rounded',x:.68,y:.06,w:.26,crop:{x:.2,y:.05,w:.6,h:.9}};
export const MIN_CROP=.12,MIN_WIDTH=.1,MAX_WIDTH=.7;
const clamp=(value,low,high)=>Math.min(high,Math.max(low,Number.isFinite(value)?value:low));
/** The visible part of Camera 2 in source pixels. A circle is the biggest centred square inside the chosen crop. */
export function cropPixels(srcW,srcH,crop=DEFAULT_OVERLAY.crop,shape='rounded'){
  const w=clamp(crop.w,MIN_CROP,1),h=clamp(crop.h,MIN_CROP,1),x=clamp(crop.x,0,1-w),y=clamp(crop.y,0,1-h);
  let sx=x*srcW,sy=y*srcH,sw=w*srcW,sh=h*srcH;
  if(shape==='circle'){const side=Math.min(sw,sh);sx+=(sw-side)/2;sy+=(sh-side)/2;sw=sh=side;}
  return {sx,sy,sw,sh};
}
/** Where the overlay lands on a W x H frame, and which part of Camera 2 it shows. Always inside the frame. */
export function overlayBox(W,H,overlay=DEFAULT_OVERLAY,srcW=1280,srcH=720){
  const src=cropPixels(srcW,srcH,overlay.crop,overlay.shape);
  let w=clamp(overlay.w,MIN_WIDTH,MAX_WIDTH)*W,h=w*src.sh/src.sw;
  if(h>H*.9){w*=H*.9/h;h=H*.9;}
  return {src,dest:{x:clamp(overlay.x*W,0,W-w),y:clamp(overlay.y*H,0,H-h),w,h}};
}
/** Snap the overlay into a corner of the frame (keeps its size and crop). */
export function placeOverlay(overlay,corner,W,H,srcW=1280,srcH=720,margin=.025){
  const {dest}=overlayBox(W,H,overlay,srcW,srcH),mx=margin,my=margin*W/H;
  const x=corner.includes('l')?mx:1-dest.w/W-mx,y=corner.includes('t')?my:1-dest.h/H-my;
  return {...overlay,x:clamp(x,0,1),y:clamp(y,0,1)};
}
function shapePath(ctx,{x,y,w,h},shape){
  ctx.beginPath();
  if(shape==='circle'){ctx.arc(x+w/2,y+h/2,Math.min(w,h)/2,0,Math.PI*2);return;}
  if(shape==='rounded'){const r=Math.min(w,h)*.12;ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();return;}
  ctx.rect(x,y,w,h);
}
const ready=video=>Boolean(video&&video.readyState>=2&&video.videoWidth>0&&video.videoHeight>0);
/** One frame: Camera 1 fills the frame (cover), Camera 2 is cut and laid over it with a soft shadow and a thin white edge. */
export function drawTwoCameras(ctx,a,b,overlay,W,H){
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  if(ready(a)){const f=fitRect(a.videoWidth,a.videoHeight,{x:0,y:0,w:W,h:H},'cover',.5);ctx.drawImage(a,f.sx,f.sy,f.sw,f.sh,f.dx,f.dy,f.dw,f.dh);}
  if(!ready(b))return;
  const {src,dest}=overlayBox(W,H,overlay,b.videoWidth,b.videoHeight);
  ctx.save();
  ctx.shadowColor='#000a';ctx.shadowBlur=Math.round(W/64);ctx.shadowOffsetY=Math.round(W/320);
  shapePath(ctx,dest,overlay.shape);ctx.fillStyle='#000';ctx.fill();
  ctx.shadowColor='transparent';
  shapePath(ctx,dest,overlay.shape);ctx.clip();
  ctx.drawImage(b,src.sx,src.sy,src.sw,src.sh,dest.x,dest.y,dest.w,dest.h);
  ctx.restore();
  ctx.save();shapePath(ctx,dest,overlay.shape);ctx.lineWidth=Math.max(2,W/640);ctx.strokeStyle='#ffffffcc';ctx.stroke();ctx.restore();
}
/**
 * Two cameras in, one 16:9 picture out (the same kind of source as a tab or a photo, so preview, broadcast and recording all share it).
 * The overlay can be cut, moved and re-shaped while live without restarting anything.
 */
export async function captureTwoCameras({cameraId='',overlayId='',width=1280,height=720,onEnded=()=>{},media=globalThis.navigator?.mediaDevices,doc=globalThis.document,clock=startLiveFrameClock}={}){
  if(!media?.getUserMedia)throw new Error('Camera access is unavailable in this browser.');
  if(!overlayId)throw new Error('Choose a second camera for the overlay. Two cameras are needed for this scenario.');
  if(cameraId&&cameraId===overlayId)throw new Error('Camera 1 and Camera 2 are the same device. Choose two different cameras.');
  const open=id=>media.getUserMedia({video:{...(id?{deviceId:{exact:id}}:{}),width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}},audio:false});
  let first=null,second=null,frame=null;
  const cleanup=()=>{frame?.();for(const video of [va,vb]){video.pause?.();video.srcObject=null;}for(const stream of [first,second])stream?.getTracks().forEach(track=>track.stop());};
  const va=doc.createElement('video'),vb=doc.createElement('video');
  for(const video of [va,vb]){video.muted=true;video.playsInline=true;}
  try{
    first=await open(cameraId);second=await open(overlayId);
    va.srcObject=first;vb.srcObject=second;await Promise.all([va.play?.(),vb.play?.()].map(item=>Promise.resolve(item).catch(()=>{})));
    for(const track of [...first.getVideoTracks(),...second.getVideoTracks()])track.addEventListener('ended',onEnded,{once:true});
    const canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:false}),state={overlay:{...DEFAULT_OVERLAY}};
    const draw=()=>drawTwoCameras(ctx,va,vb,state.overlay,width,height);
    const track=canvas.captureStream(30).getVideoTracks()[0];if(!track)throw new Error('This browser cannot make the combined picture.');
    track.contentHint='motion';
    frame=clock(()=>{draw();track.requestFrame?.();},30);
    return {stream:new MediaStream([track]),cleanup,overlayVideo:vb,setOverlay:next=>{state.overlay={...state.overlay,...next,crop:{...state.overlay.crop,...(next?.crop||{})}};}};
  }catch(error){cleanup();throw error;}
}
