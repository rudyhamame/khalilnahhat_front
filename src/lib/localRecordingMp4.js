const mp4Types=['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4'];

// Re-encode from the disk-backed file at playback speed, writing output in
// chunks so a long recording never has to fit in browser memory.
export async function saveLocalRecordingMp4(session,{store,onStatus=()=>{},Recorder=globalThis.MediaRecorder,document:doc=globalThis.document,urls=globalThis.URL}={}){
 if(!store?.directory||!store.exportFile)throw new Error('Choose the recording folder first.');
 if(session.filename.endsWith('.mp4'))return store.exportFile(session);
 const mime=mp4Types.find(type=>Recorder?.isTypeSupported(type));
 if(!mime)throw new Error('This browser cannot encode MP4. Open the recording folder in an updated desktop Chrome or Edge, or use the cloud MP4 archive. Your original parts are kept.');
 const video=doc.createElement('video');video.muted=true;video.playsInline=true;video.preload='auto';
 if(!video.captureStream)throw new Error('This browser cannot convert a local recording. Your original parts are kept.');
 onStatus('Rebuilding source for MP4 conversion…');
 await store.exportFile(session);
 const source=await(await store.directory.getFileHandle(session.filename)).getFile();
 const url=urls.createObjectURL(source),filename=session.filename.replace(/\.webm$/i,'.mp4');
 let writer,recorder,stream,writes=Promise.resolve(),bytes=0;
 try{
  await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>{video.onloadeddata=null;video.onerror=null;reject(new Error('The saved video could not be opened.'));},15000);
   video.onloadeddata=()=>{clearTimeout(timer);video.onloadeddata=null;video.onerror=null;resolve();};
   video.onerror=()=>{clearTimeout(timer);video.onloadeddata=null;video.onerror=null;reject(new Error('The saved video could not be decoded.'));};
   video.src=url;
  });
  stream=video.captureStream();
  if(!stream.getVideoTracks().length)throw new Error('The browser could not capture the saved video for MP4 conversion.');
  recorder=new Recorder(stream,{mimeType:mime,videoBitsPerSecond:session.height>=1080?6000000:3500000,audioBitsPerSecond:320000});
  writer=await(await store.directory.getFileHandle(filename,{create:true})).createWritable();
  onStatus('Saving MP4 at playback speed. Keep Studio open and your drive connected until conversion finishes.');
  await new Promise((resolve,reject)=>{
   recorder.ondataavailable=event=>{
    if(!event.data?.size)return;
    writes=writes.then(async()=>{await writer.write(event.data);bytes+=event.data.size;});
    // Attach a handler immediately; retain the rejected promise for final cleanup.
    void writes.catch(reject);
   };
   recorder.onerror=event=>reject(event.error||new Error('MP4 encoding failed.'));
   recorder.onstop=()=>video.ended?resolve():reject(new Error('MP4 conversion was interrupted.'));
   video.onerror=()=>reject(new Error('Source playback failed during MP4 conversion.'));
   video.onended=()=>{if(recorder.state!=='inactive')recorder.stop();};
   recorder.start(4000);
   video.play().catch(reject);
  });
  await writes;
  if(!bytes)throw new Error('The MP4 encoder produced no video.');
  await writer.close();writer=null;
  return filename;
 }finally{
  video.onended=null;video.onerror=null;
  if(recorder&&recorder.state!=='inactive')recorder.stop();
  video.pause();stream?.getTracks().forEach(track=>track.stop());
  await writes.catch(()=>{});
  if(writer)await writer.abort().catch(()=>{});
  video.removeAttribute('src');video.load();urls.revokeObjectURL(url);
 }
}
