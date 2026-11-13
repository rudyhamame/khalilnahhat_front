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
export function createProgramOutput({width=1280,height=720,fps=30,fit='contain',doc=globalThis.document,clock=startLiveFrameClock,MediaStreamClass=globalThis.MediaStream,transitions=true}={}){
  const canvas=doc.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{alpha:false}),video=doc.createElement('video');
  video.muted=true;video.playsInline=true;
  const state={hold:null,fit,input:null};
  const ready=video.readyState>=2;void ready;
  const now=()=>globalThis.performance?.now?.()??Date.now();
  // Transitions: a cross-fade from the previous picture (or from black) and a fade out to black.
  const fx={from:null,start:0,ms:0,out:null};
  const overlay=()=>{
    const time=now();
    if(fx.ms&&time-fx.start<fx.ms){const alpha=1-(time-fx.start)/fx.ms;ctx.save();ctx.globalAlpha=alpha*alpha;if(fx.from)ctx.drawImage(fx.from,0,0,width,height);else{ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);}ctx.restore();}else fx.ms=0;
    if(fx.out){const alpha=Math.min(1,(time-fx.out.start)/fx.out.ms);ctx.save();ctx.globalAlpha=alpha;ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);ctx.restore();}
  };
  const draw=()=>{
    ctx.fillStyle='#000';ctx.fillRect(0,0,width,height);
    const media=state.hold||(video.readyState>=2?video:null),[sw,sh]=size(media);
    if(media&&sw&&sh){const box=fitBox(sw,sh,width,height,state.fit);ctx.drawImage(media,box.x,box.y,box.w,box.h);}
    if(fx.ms||fx.out)overlay();
  };
  // Start a cross-fade: from='frame' keeps the picture shown right now, 'black' fades in from black.
  const begin=(ms=600,from='frame')=>{
    if(!transitions)return;
    try{
      let copy=null;
      if(from==='frame'&&typeof doc.createElement==='function'){copy=doc.createElement('canvas');copy.width=width;copy.height=height;copy.getContext('2d').drawImage(canvas,0,0);}
      fx.from=copy;fx.start=now();fx.ms=ms;fx.out=null;
    }catch{fx.ms=0;}
  };
  draw();const stopClock=clock(draw,fps),stream=canvas.captureStream(fps),track=stream.getVideoTracks()[0];
  return {
    track,stream,
    // The input picture: a MediaStreamTrack (camera, tab, a file's canvas...). The previous one is only detached, not stopped.
    setInput(inputTrack){state.input=inputTrack||null;video.srcObject=inputTrack?new MediaStreamClass([inputTrack]):null;if(inputTrack)void video.play?.()?.catch?.(()=>{});},
    // A still picture (an image or canvas) shown instead of the input, until cleared with null.
    setHold(image){
      // Going between the live picture and a still fades; swapping one still for another (countdown numbers) does not.
      if(Boolean(state.hold)!==Boolean(image))begin(600);
      state.hold=image||null;draw();track?.requestFrame?.();
    },
    begin,
    // Fades the picture to black, then resolves: used before the live ends.
    fadeToBlack(ms=700){if(!transitions)return Promise.resolve();fx.out={start:now(),ms};return new Promise(done=>setTimeout(done,ms));},
    setFit(next){state.fit=next==='cover'?'cover':'contain';draw();},
    get holding(){return Boolean(state.hold);},
    get inputStream(){return state.input?new MediaStreamClass([state.input]):null;},
    stop(){stopClock();video.pause?.();video.srcObject=null;stream.getTracks().forEach(item=>item.stop());},
  };
}
