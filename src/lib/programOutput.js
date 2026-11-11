import {startLiveFrameClock} from './liveFrameClock.js';
/**
 * The "program" picture: ONE steady video track the Studio owns. Every input is drawn into it, so the published stream
 * and the recording never break when the input changes, and a hold photo can replace the input (pause) at any moment.
 * fit 'contain' keeps the whole input (bars if its shape differs); 'cover' fills the frame and crops.
 */
export function fitBox(sourceW,sourceH,W,H,fit='contain'){
  const scale=(fit==='cover'?Math.max:Math.min)(W/sourceW,H/sourceH),w=sourceW*scale,h=sourceH*scale;
  return {x:(W-w)/2,y:(H-h)/2,w,h};
}
const size=media=>media?[media.videoWidth||media.naturalWidth||media.width||0,media.videoHeight||media.naturalHeight||media.height||0]:[0,0];
export function createProgramOutput({width=1280,height=720,fps=30,fit='contain',doc=globalThis.document,clock=startLiveFrameClock,MediaStreamClass=globalThis.MediaStream}={}){
  const canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false}),video=doc.createElement('video');
  video.muted=true;video.playsInline=true;
  const state={hold:null,fit,input:null};
  const ready=video.readyState>=2;void ready;
  const draw=()=>{
    ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);
    const media=state.hold||(video.readyState>=2?video:null),[sw,sh]=size(media);
    if(!media||!sw||!sh)return;
    const box=fitBox(sw,sh,width,height,state.fit);ctx.drawImage(media,box.x,box.y,box.w,box.h);
  };
  draw();const stopClock=clock(draw,fps),stream=canvas.captureStream(fps),track=stream.getVideoTracks()[0];
  return {
    track,stream,
    // The input picture: a MediaStreamTrack (camera, tab, a file's canvas...). The previous one is only detached, not stopped.
    setInput(inputTrack){state.input=inputTrack||null;video.srcObject=inputTrack?new MediaStreamClass([inputTrack]):null;if(inputTrack)void video.play?.()?.catch?.(()=>{});},
    // A still picture (an image or canvas) shown instead of the input, until cleared with null.
    setHold(image){state.hold=image||null;draw();track?.requestFrame?.();},
    setFit(next){state.fit=next==='cover'?'cover':'contain';draw();},
    get holding(){return Boolean(state.hold);},
    get inputStream(){return state.input?new MediaStreamClass([state.input]):null;},
    stop(){stopClock();video.pause?.();video.srcObject=null;stream.getTracks().forEach(item=>item.stop());},
  };
}
