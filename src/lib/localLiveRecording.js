// Local disk chunks are independent of the OVH upload queue.
export const localRecordingMime=Recorder=>[
 'video/webm;codecs=vp8,opus','video/webm','video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4',
].find(type=>Recorder?.isTypeSupported(type));
export function recordingFrame(sourceWidth,sourceHeight,width,height,cover=false){
 const scale=(cover?Math.max:Math.min)(width/sourceWidth,height/sourceHeight);
 return {x:(width-sourceWidth*scale)/2,y:(height-sourceHeight*scale)/2,width:sourceWidth*scale,height:sourceHeight*scale};
}
export async function downloadLocalRecording(session,{store}={}){
 if(!store?.exportFile)throw new Error('Choose the folder containing your saved recording parts first.');
 return store.exportFile(session);
}
export async function startLocalRecording({tracks,onStatus=()=>{},onFiles=()=>{},store,Recorder=globalThis.MediaRecorder,Stream=globalThis.MediaStream,document:doc=globalThis.document}){
 const mime=localRecordingMime(Recorder),source=tracks.find(track=>track.kind==='video'&&track.readyState!=='ended');
 if(!mime||!store)throw new Error('Local video recording needs a supported encoder and a selected recording folder.');
 if(!source)throw new Error('Local video recording requires an active video source.');
 const video=doc.createElement('video');video.muted=true;video.playsInline=true;video.srcObject=new Stream([source]);
 const outputs=[],sessions=[];let timer,finalizing,failed=null;
 const stopAll=()=>{for(const output of outputs)if(output.recorder.state!=='inactive')output.recorder.stop();};
 const cleanup=()=>{clearInterval(timer);video.pause();video.srcObject=null;for(const output of outputs)output.track.stop();};
 const fail=error=>{failed=error;onStatus('Local recording stopped: '+(error?.message||'Disk writing or encoding failed.')+' Keep Studio open to recover saved parts.');void stop(false).catch(()=>{});};
 const stop=complete=>{
  if(finalizing)return finalizing;
  finalizing=(async()=>{
   clearInterval(timer);stopAll();
   await Promise.all(outputs.map(output=>output.stopped));
   await Promise.all(outputs.map(output=>output.writes));
   cleanup();
   for(const session of sessions)await store.markStopped(session.id,Boolean(complete&&!failed));
   const files=(await store.sessions()).filter(session=>sessions.some(owned=>owned.id===session.id)&&session.count>0);
   onStatus('Finalizing local files. Keep Studio open; recovery chunks remain on disk.');
   await onFiles(files);onStatus(failed?'Local recording interrupted. Saved parts are available below.':'Landscape video is saved. Recovery chunks remain in the selected folder.');
   if(failed)throw failed;
  })();
  return finalizing;
 };
 try{
  await video.play();
  const settings=source.getSettings?.()||{},height=settings.height>=1080?1080:settings.height>=720?720:360,width=Math.round(height*16/9);
  const extension=mime.startsWith('video/mp4')?'mp4':'webm';
  const stamp=new Date().toISOString().replace(/[:.]/g,'-'),id=globalThis.crypto.randomUUID();
  for(const [format,w,h] of [['landscape',width,height]]){
   const canvas=doc.createElement('canvas');canvas.width=w;canvas.height=h;
   const context=canvas.getContext('2d',{alpha:false});if(!context||!canvas.captureStream)throw new Error('Canvas video recording is unavailable in this browser.');
   const draw=()=>{
    context.fillStyle='#000';context.fillRect(0,0,w,h);
    if(video.videoWidth&&video.videoHeight){const f=recordingFrame(video.videoWidth,video.videoHeight,w,h,format==='portrait');context.drawImage(video,f.x,f.y,f.width,f.height);}
   };
   draw();const track=canvas.captureStream(30).getVideoTracks()[0];
   let recorder;try{recorder=new Recorder(new Stream([track,...tracks.filter(track=>track.kind==='audio')]),{mimeType:mime,videoBitsPerSecond:height>=1080?6000000:height>=720?3500000:1500000,audioBitsPerSecond:256000});}catch(error){track.stop();throw error;}
   const session={id:`${id}-${format}`,filename:`Echo-live-${stamp}-${format}-${w}x${h}.${extension}`,format,width:w,height:h,mime:recorder.mimeType||mime,count:0,bytes:0,stopped:false,complete:false,updatedAt:Date.now()};
   try{await store.put(session);}catch(error){track.stop();throw error;}sessions.push(session);
   let stopped;const output={track,recorder,draw,writes:Promise.resolve(),stopped:new Promise(resolve=>{stopped=resolve;})};outputs.push(output);
   recorder.onstop=stopped;
   recorder.ondataavailable=event=>{
    if(!event.data?.size)return;
    output.writes=output.writes.then(async()=>{for(let offset=0;offset<event.data.size;offset+=8*1024**2)await store.append(session.id,await event.data.slice(offset,offset+8*1024**2).arrayBuffer(),session.mime);}).catch(error=>{failed=error;queueMicrotask(()=>fail(error));});
   };
   recorder.onerror=event=>fail(event.error||new Error('Video encoding was interrupted.'));
  }
  // Start capture after all storage and media setup succeeds.
  for(const output of outputs){output.recorder.start(4000);output.started=true;}
  timer=setInterval(()=>{for(const output of outputs)output.draw();},1000/30);
  onStatus('Saving landscape in recoverable chunks on this computer. Keep Studio open until the video finishes saving.');
  return {stop};
 }catch(error){
  stopAll();await Promise.all(outputs.filter(output=>output.started).map(output=>output.stopped));await Promise.all(outputs.map(output=>output.writes));cleanup();
  for(const session of sessions)await store.markStopped(session.id,false).catch(()=>{});
  throw error;
 }
}
