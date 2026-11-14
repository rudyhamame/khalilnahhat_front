import {startLiveFrameClock} from './liveFrameClock.js';
import {cropRect} from './pausePhoto.js';
import {captureTwoCameras} from './twoCameraSource.js';
// Presentation media is captured once and shared by preview, broadcast and recording.
export async function capturePresentationSource({kind,file,width=1920,height=1080,onEnded=()=>{},cameraId='',overlayId=''}){
 let stream,context,element,url,frame;
 const cleanup=()=>{frame?.();stream?.getTracks().forEach(t=>t.stop());element?.pause?.();if(element?.tagName==='VIDEO'){element.removeAttribute('src');element.load();}if(url)URL.revokeObjectURL(url);void context?.close();};
 try{
  // Two live cameras composed into one 16:9 picture (Camera 1 full frame, Camera 2 as a cut-out overlay).
  if(kind==='cameras')return await captureTwoCameras({width,height,cameraId,overlayId,onEnded});
  if(kind==='display'){
   if(!navigator.mediaDevices?.getDisplayMedia)throw new Error('Tab/window sharing is unavailable in this browser.');
   stream=await navigator.mediaDevices.getDisplayMedia({video:{width:{ideal:width},height:{ideal:height},frameRate:{ideal:30,max:30}},audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},selfBrowserSurface:'exclude',surfaceSwitching:'include'});
   stream.getVideoTracks()[0].contentHint='motion';stream.getVideoTracks()[0].addEventListener('ended',onEnded,{once:true});
   return {stream,cleanup};
  }
  if(!file||!file.type.startsWith(kind==='image'?'image/':'video/')&&!(kind==='video'&&file.type.startsWith('audio/')))throw new Error(`Choose a supported ${kind} file first.`);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const drawing=canvas.getContext('2d',{alpha:false});
  url=URL.createObjectURL(file);
  if(kind==='image'){
   element=new Image();element.src=url;await element.decode();
  }else{
   const Context=window.AudioContext||window.webkitAudioContext;
   if(!Context)throw new Error('Video audio capture is unavailable in this browser.');
   context=new Context();const resuming=context.resume();
   element=document.createElement('video');element.playsInline=true;element.loop=false;element.preload='auto';element.src=url;
   const audio=context.createMediaElementSource(element),destination=context.createMediaStreamDestination();audio.connect(destination);
   // Nothing starts by itself: the video waits, on its first frame, until the operator presses play.
   await Promise.all([resuming,new Promise(done=>{if(!element.addEventListener||element.readyState>=2){done();return;}element.addEventListener('loadeddata',done,{once:true});element.addEventListener('error',done,{once:true});setTimeout(done,4000);})]);
   try{element.currentTime=.01;}catch{/* the first frame is enough */}
   stream=new MediaStream(destination.stream.getAudioTracks());
  }
  // Swap the file in the same player (the stream and the audio path stay as they are); it waits on its first frame, paused.
  const loadVideo=next=>new Promise(done=>{if(kind!=='video'||!next||!element.addEventListener){done(false);return;}setTimeout(()=>done(false),4000);const old=url;url=URL.createObjectURL(next);element.pause?.();element.addEventListener?.('loadeddata',()=>{try{element.currentTime=.01;}catch{/* first frame */}done(true);},{once:true});element.src=url;element.load?.();if(old)URL.revokeObjectURL(old);});
  // Photo viewer: the same crop model as the pause screen (zoom 0 = fit, cx/cy = the point of the photo at the centre), set live from the studio.
  const view={zoom:0,cx:.5,cy:.5};
  const draw=()=>{const w=element.videoWidth||element.naturalWidth,h=element.videoHeight||element.naturalHeight;drawing.fillStyle='#000';drawing.fillRect(0,0,width,height);if(w&&h){if(kind==='image'){const at=cropRect(w,h,view,width,height);drawing.drawImage(element,at.x,at.y,at.w,at.h);}else{const scale=Math.min(width/w,height/h);drawing.drawImage(element,(width-w*scale)/2,(height-h*scale)/2,w*scale,h*scale);}}};draw();
  // A video file's picture is streamed straight from the element: no canvas and no second 30 fps timer in between (the program picture
  // fits it into the frame), which removed the stutter of two unsynchronised clocks. Browsers without captureStream keep the canvas path.
  const direct=kind==='video'?element.captureStream?.()?.getVideoTracks?.()[0]:null;
  if(direct){stream.addTrack(direct);direct.contentHint='motion';return {stream,cleanup,element,pause:()=>element.pause?.(),play:()=>element.play?.(),restart:()=>{element.currentTime=0;void element.play();},load:loadVideo};}
  const video=canvas.captureStream(30).getVideoTracks()[0];if(!stream)stream=new MediaStream();stream.addTrack(video);video.contentHint=kind==='image'?'detail':'motion';
  frame=startLiveFrameClock(()=>{draw();video.requestFrame?.();});
  return {stream,cleanup,setView:next=>{Object.assign(view,next);},element:kind==='video'?element:null,pause:()=>element.pause?.(),play:()=>element.play?.(),restart:()=>{if(kind==='video'){element.currentTime=0;void element.play();}},load:loadVideo};
 }catch(error){cleanup();throw error;}
}
