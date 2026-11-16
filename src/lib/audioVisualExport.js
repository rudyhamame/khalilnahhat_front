export function mediaFitRect(sourceWidth,sourceHeight,width,height,fit='cover'){
 const scale=fit==='contain'?Math.min(width/sourceWidth,height/sourceHeight):Math.max(width/sourceWidth,height/sourceHeight);
 const w=sourceWidth*scale,h=sourceHeight*scale;return {x:(width-w)/2,y:(height-h)/2,w,h};
}
export function audioVisualDuration({requested,audioDuration,audioStart=0,videoDuration=null,videoStart=0,loop=false}){
 const available=audioDuration-audioStart;
 const duration=Math.min(Number(requested),available,videoDuration!==null&&!loop?videoDuration-videoStart:Infinity);
 if(!Number.isFinite(duration)||duration<.5||audioStart<0||videoStart<0)throw Error('Choose at least half a second within your audio and video.');
 return duration;
}
const abortError=()=>new DOMException('Export cancelled.','AbortError');
export async function exportAudioVisual({visualUrl,visualKind,audioUrl,width=1080,height=1920,fit='cover',seconds=15,audioStart=0,videoStart=0,musicVolume=1,originalVolume=0,loop=false,signal,onProgress=()=>{}}){
 if(!visualUrl||!audioUrl)throw Error('Choose a photo or video and an audio track.');
 if(![width,height].every(n=>Number.isInteger(n)&&n>=320&&n<=3840))throw Error('Use output dimensions from 320 to 3840 pixels.');
 const mime=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm'].find(type=>globalThis.MediaRecorder?.isTypeSupported(type));
 if(!mime)throw Error('Video export is unavailable in this browser. Use Chrome or Edge.');
 let context,media,bitmap,recorder,stream,source;
 let frame=0;
 const checkAbort=()=>{if(signal?.aborted)throw abortError();};
 try{
  checkAbort();context=new AudioContext();await context.resume();
  const response=await fetch(audioUrl,{signal});if(!response.ok)throw Error('The audio could not be loaded.');
  const buffer=await context.decodeAudioData(await response.arrayBuffer());checkAbort();
  const destination=context.createMediaStreamDestination(),music=context.createGain();music.gain.value=musicVolume;music.connect(destination);
  source=context.createBufferSource();source.buffer=buffer;source.connect(music);
  let videoDuration=null;
  if(visualKind==='video'){
   media=document.createElement('video');media.crossOrigin='anonymous';media.playsInline=true;media.preload='auto';media.loop=loop;
   await new Promise((resolve,reject)=>{
    const cleanup=()=>{clearTimeout(timeout);signal?.removeEventListener('abort',aborted);media.onloadeddata=null;media.onerror=null;};
    const aborted=()=>{cleanup();reject(abortError());};
    const timeout=setTimeout(()=>{cleanup();reject(Error('The video could not be loaded.'));},30000);
    media.onloadeddata=()=>{cleanup();resolve();};media.onerror=()=>{cleanup();reject(Error('The selected video could not be opened.'));};
    signal?.addEventListener('abort',aborted,{once:true});media.src=visualUrl;
   });
   videoDuration=media.duration;
   if(videoStart>0){await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('The video could not seek to that start time.')),10000);media.onseeked=()=>{clearTimeout(timer);media.onseeked=null;resolve();};media.currentTime=Math.min(videoStart,Math.max(0,videoDuration-.01));});}
   const original=context.createGain();original.gain.value=originalVolume;context.createMediaElementSource(media).connect(original);original.connect(destination);
  }else{
   const image=await fetch(visualUrl,{signal});if(!image.ok)throw Error('The photo could not be loaded.');bitmap=await createImageBitmap(await image.blob());
  }
  checkAbort();const duration=audioVisualDuration({requested:seconds,audioDuration:buffer.duration,audioStart,videoDuration,videoStart,loop});
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const drawing=canvas.getContext('2d');
  const draw=()=>{const image=media||bitmap,w=media?.videoWidth||bitmap.width,h=media?.videoHeight||bitmap.height,rect=mediaFitRect(w,h,width,height,fit);drawing.fillStyle='#000';drawing.fillRect(0,0,width,height);drawing.drawImage(image,rect.x,rect.y,rect.w,rect.h);};draw();
  stream=new MediaStream([...canvas.captureStream(30).getVideoTracks(),...destination.stream.getAudioTracks()]);
  const chunks=[];recorder=new MediaRecorder(stream,{mimeType:mime,videoBitsPerSecond:6_000_000,audioBitsPerSecond:192_000});
  recorder.ondataavailable=event=>{if(event.data.size)chunks.push(event.data);};
  const finished=new Promise((resolve,reject)=>{recorder.onstop=resolve;recorder.onerror=()=>reject(Error('Video encoding failed.'));});
  // Observe failures immediately even while frames are being drawn.
  finished.catch(()=>{});recorder.start(250);
  if(media)await media.play();source.start(0,audioStart,duration);
  await new Promise((resolve,reject)=>{
   const began=performance.now();
   const aborted=()=>{clearTimeout(timer);cancelAnimationFrame(frame);reject(abortError());};
   const timer=setTimeout(()=>{signal?.removeEventListener('abort',aborted);cancelAnimationFrame(frame);onProgress(1);resolve();},duration*1000);
   signal?.addEventListener('abort',aborted,{once:true});
   const tick=()=>{draw();onProgress(Math.min(1,(performance.now()-began)/(duration*1000)));frame=requestAnimationFrame(tick);};tick();
  });
  recorder.stop();await finished;checkAbort();
  const blob=new Blob(chunks,{type:mime.split(';')[0]});if(!blob.size)throw Error('The exported video is empty.');
  return {blob,extension:mime.startsWith('video/mp4')?'mp4':'webm',width,height,duration};
 }finally{
  cancelAnimationFrame(frame);if(recorder&&recorder.state!=='inactive')recorder.stop();
  try{source?.stop();}catch{/* Source may already have ended. */}
  stream?.getTracks().forEach(track=>track.stop());if(media){media.pause();media.removeAttribute('src');media.load();}bitmap?.close();await context?.close().catch(()=>{});
 }
}
