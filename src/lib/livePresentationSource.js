// Presentation media is captured once and shared by preview, broadcast and recording.
export async function capturePresentationSource({kind,file,width=1920,height=1080,onEnded=()=>{}}){
 let stream,context,element,url,frame;
 const cleanup=()=>{cancelAnimationFrame(frame);stream?.getTracks().forEach(t=>t.stop());element?.pause?.();if(element?.tagName==='VIDEO'){element.removeAttribute('src');element.load();}if(url)URL.revokeObjectURL(url);void context?.close();};
 try{
  if(kind==='display'){
   if(!navigator.mediaDevices?.getDisplayMedia)throw new Error('Tab/window sharing is unavailable in this browser.');
   stream=await navigator.mediaDevices.getDisplayMedia({video:{width:{ideal:width},height:{ideal:height},frameRate:{ideal:30,max:30}},audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false},selfBrowserSurface:'exclude',surfaceSwitching:'include'});
   stream.getVideoTracks()[0].contentHint='motion';stream.getVideoTracks()[0].addEventListener('ended',onEnded,{once:true});
   return {stream,cleanup};
  }
  if(!file||!file.type.startsWith(kind==='image'?'image/':'video/'))throw new Error(`Choose a supported ${kind} file first.`);
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const drawing=canvas.getContext('2d',{alpha:false});
  url=URL.createObjectURL(file);
  if(kind==='image'){
   element=new Image();element.src=url;await element.decode();
  }else{
   const Context=window.AudioContext||window.webkitAudioContext;
   if(!Context)throw new Error('Video audio capture is unavailable in this browser.');
   context=new Context();const resuming=context.resume();
   element=document.createElement('video');element.playsInline=true;element.loop=true;element.preload='auto';element.src=url;
   const audio=context.createMediaElementSource(element),destination=context.createMediaStreamDestination();audio.connect(destination);
   await Promise.all([resuming,element.play()]);stream=new MediaStream(destination.stream.getAudioTracks());
  }
  const draw=()=>{const w=element.videoWidth||element.naturalWidth,h=element.videoHeight||element.naturalHeight;drawing.fillStyle='#000';drawing.fillRect(0,0,width,height);if(w&&h){const scale=Math.min(width/w,height/h);drawing.drawImage(element,(width-w*scale)/2,(height-h*scale)/2,w*scale,h*scale);}frame=requestAnimationFrame(draw);};draw();
  const video=canvas.captureStream(30).getVideoTracks()[0];if(!stream)stream=new MediaStream();stream.addTrack(video);video.contentHint=kind==='image'?'detail':'motion';
  return {stream,cleanup,pause:()=>element.pause?.(),play:()=>element.play?.(),restart:()=>{if(kind==='video'){element.currentTime=0;void element.play();}}};
 }catch(error){cleanup();throw error;}
}
