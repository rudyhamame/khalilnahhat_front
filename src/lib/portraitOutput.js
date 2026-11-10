export async function connectPortraitOutput({room,events,params,video,logo,audioRoot,signal=message=>console.log(message)}){
 const url=params.get('url'),token=params.get('token');
 if(!url||!token||!/^wss?:\/\//.test(url))throw new Error('Recorder connection is missing.');
 let started=false,closed=false,logoReady=false,hasAudio=false,connected=false;
 const audio=new Map();
 const ready=()=>{
  if(!closed&&!started&&connected&&logoReady&&(hasAudio||video.readyState>=2)){
   started=true;signal('START_RECORDING');
  }
 };
 video.addEventListener('loadeddata',ready);
 room.on(events.TrackSubscribed,(track,_publication,participant)=>{
  if(!['khalil-broadcaster','khalil-obs'].includes(participant.identity))return;
  if(track.kind==='video'){track.attach(video);void video.play()?.catch(()=>{});ready();}
  else if(track.kind==='audio'){
   const element=track.attach();element.autoplay=true;audioRoot.append(element);audio.set(track,element);hasAudio=true;ready();
  }
 });
 // The studio's crop position; only the broadcaster may move the frame.
 if(events.DataReceived)room.on(events.DataReceived,(payload,participant)=>{
  if(participant?.identity!=='khalil-broadcaster')return;
  try{const message=JSON.parse(new TextDecoder().decode(payload));
   if(message?.t==='portrait-pan'&&Number.isFinite(message.x))video.style.objectPosition=`${Math.max(0,Math.min(1,message.x))*100}% 50%`;}catch{/* Ignore unrelated data. */}
 });
 room.on(events.TrackUnsubscribed,track=>{
  if(track.kind==='video')track.detach(video);
  const element=audio.get(track);if(element){track.detach(element);element.remove();audio.delete(track);hasAudio=audio.size>0;}
 });
 room.on(events.Disconnected,()=>{
  closed=true;video.removeEventListener('loadeddata',ready);
  for(const [track,element]of audio){track.detach(element);element.remove();}audio.clear();
  if(started)signal('END_RECORDING');
 });
 await logo.decode();logoReady=true;
 await room.connect(url,token,{autoSubscribe:true});
 await room.startAudio();connected=true;ready();
 return room;
}
