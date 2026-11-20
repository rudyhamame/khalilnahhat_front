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
/** One camera filling a whole frame (cover, centred). */
export function drawCover(ctx,video,W,H,pan=.5){
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  if(!ready(video))return;
  const f=fitRect(video.videoWidth,video.videoHeight,{x:0,y:0,w:W,h:H},'cover',pan);ctx.drawImage(video,f.sx,f.sy,f.sw,f.sh,f.dx,f.dy,f.dw,f.dh);
}
// The soft shadow behind the overlay is a blur: costly to repaint 30 times a second, so it is painted once per overlay position/shape/size and reused.
let overlayShadow=null,overlayShadowKey='';
function drawShadow(ctx,dest,shape,W,H){
  const key=[W,H,shape,dest.x,dest.y,dest.w,dest.h].map(v=>typeof v==='string'?v:Math.round(v)).join('|');
  if(key!==overlayShadowKey||!overlayShadow){
    overlayShadow||=(ctx.canvas.ownerDocument||document).createElement('canvas');
    overlayShadow.width=W;overlayShadow.height=H;const c=overlayShadow.getContext('2d');
    c.shadowColor='#000a';c.shadowBlur=Math.round(W/64);c.shadowOffsetY=Math.round(W/320);
    shapePath(c,dest,shape);c.fillStyle='#000';c.fill();overlayShadowKey=key;
  }
  ctx.drawImage(overlayShadow,0,0);
}
/** One frame: Camera 1 fills the frame (cover), Camera 2 is cut and laid over it with a soft shadow and a thin white edge. */
export function drawTwoCameras(ctx,a,b,overlay,W,H){
  ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);
  if(ready(a)){const f=fitRect(a.videoWidth,a.videoHeight,{x:0,y:0,w:W,h:H},'cover',.5);ctx.drawImage(a,f.sx,f.sy,f.sw,f.sh,f.dx,f.dy,f.dw,f.dh);}
  if(!ready(b))return;
  const {src,dest}=overlayBox(W,H,overlay,b.videoWidth,b.videoHeight);
  drawShadow(ctx,dest,overlay.shape,W,H);
  ctx.save();
  shapePath(ctx,dest,overlay.shape);ctx.clip();
  ctx.drawImage(b,src.sx,src.sy,src.sw,src.sh,dest.x,dest.y,dest.w,dest.h);
  ctx.restore();
  ctx.save();shapePath(ctx,dest,overlay.shape);ctx.lineWidth=Math.max(2,W/640);ctx.strokeStyle='#ffffffcc';ctx.stroke();ctx.restore();
}
/**
 * Two cameras in, one 16:9 picture out (the same kind of source as a tab or a photo, so preview, broadcast and recording all share it).
 * The overlay can be cut, moved and re-shaped while live without restarting anything.
 */
export async function captureTwoCameras({cameraId='',overlayId='',windows=false,width=1280,height=720,onEnded=()=>{},media=globalThis.navigator?.mediaDevices,doc=globalThis.document,clock=startLiveFrameClock}={}){
  if(!media?.getUserMedia)throw new Error('Camera access is unavailable in this browser.');
  // A camera just released by the previous preview is not always free at once (Linux, Firefox), and a camera that never answers must not leave the studio loading forever:
  // each try gives up after 6 s and a second try follows after a short pause.
  const openOnce=id=>new Promise((resolve,reject)=>{
    let late=false;const timer=setTimeout(()=>{late=true;reject(Object.assign(new Error('The camera did not respond. Allow it in the browser prompt, or close any other app that is using it, then pick it again.'),{name:'TimeoutError'}));},6000);
    media.getUserMedia({video:{...(id?{deviceId:{exact:id}}:{}),width:{ideal:1280},height:{ideal:720},frameRate:{ideal:30}},audio:false})
      .then(stream=>{clearTimeout(timer);if(late)stream.getTracks().forEach(track=>track.stop());else resolve(stream);},error=>{clearTimeout(timer);if(!late)reject(error);});
  });
  const open=async id=>{try{return await openOnce(id);}catch(error){if(!['TimeoutError','NotReadableError','AbortError'].includes(error?.name))throw error;await new Promise(done=>setTimeout(done,700));return openOnce(id);}};
  let first=null,second=null,frame=null,track=null,portraitTrack=null;
  const cleanup=()=>{frame?.();for(const video of [va,vb]){video.pause?.();video.srcObject=null;}for(const stream of new Set([first,second]))stream?.getTracks().forEach(track=>track.stop());track?.stop();portraitTrack?.stop();};
  const va=doc.createElement('video'),vb=doc.createElement('video');
  for(const video of [va,vb]){video.muted=true;video.playsInline=true;}
  try{
    // 'none' = that window has no device (it was given to the other window): its picture stays black.
    first=cameraId==='none'?null:await open(cameraId);
    // Firefox hides camera ids until a camera was allowed once: with the first camera open, the list is real, so the second is found here.
    if(!overlayId&&first){const own=first.getVideoTracks()[0]?.getSettings?.().deviceId;overlayId=(await media.enumerateDevices?.().catch(()=>[])||[]).find(d=>d.kind==='videoinput'&&d.deviceId&&d.deviceId!==own)?.deviceId||'';}
    if(!overlayId&&cameraId!=='none')throw new Error('Choose a second camera for the overlay. Two cameras are needed for this scenario.');
    // The same camera for both windows: it is opened once and feeds both (a camera cannot be opened twice).
    second=!overlayId||overlayId==='none'?null:overlayId===cameraId&&first?first:await open(overlayId);
    va.srcObject=first;vb.srcObject=second;
    let playTimer;
    try{await Promise.race([Promise.all([va,vb].filter(video=>video.srcObject).map(video=>Promise.resolve(video.play?.()).catch(()=>{}))),new Promise(done=>{playTimer=setTimeout(done,3000);})]);}
    finally{clearTimeout(playTimer);}
    for(const track of [...(first?.getVideoTracks()||[]),...(second?.getVideoTracks()||[])])track.addEventListener('ended',onEnded,{once:true});
    const canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d',{alpha:false}),state={overlay:{...DEFAULT_OVERLAY},pan:.5};
    // 2 windows: the landscape camera fills the 16:9 picture on its own, and the portrait camera fills its own 9:16 picture (no overlay).
    let pctx=null;const PW=720,PH=1280;
    if(windows){const pc=doc.createElement('canvas');pc.width=PW;pc.height=PH;pctx=pc.getContext('2d',{alpha:false});portraitTrack=pc.captureStream(30).getVideoTracks()[0];if(portraitTrack)portraitTrack.contentHint='motion';}
    const draw=()=>{
      if(!windows){drawTwoCameras(ctx,va,vb,state.overlay,width,height);return;}
      drawCover(ctx,va,width,height);if(pctx){drawCover(pctx,vb,PW,PH,state.pan);}
    };
    track=canvas.captureStream(30).getVideoTracks()[0];if(!track)throw new Error('This browser cannot make the combined picture.');
    track.contentHint='motion';
    frame=clock(()=>{draw();track.requestFrame?.();portraitTrack?.requestFrame?.();},30);
    return {stream:new MediaStream([track]),portraitStream:portraitTrack?new MediaStream([portraitTrack]):null,cleanup,overlayVideo:vb,setPortraitPan:value=>{state.pan=Math.max(0,Math.min(1,Number(value)||0));},setOverlay:next=>{state.overlay={...state.overlay,...next,crop:{...state.overlay.crop,...(next?.crop||{})}};}};
  }catch(error){cleanup();throw error;}
}
