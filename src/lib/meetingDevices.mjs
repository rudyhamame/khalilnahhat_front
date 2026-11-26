const deviceConstraint=id=>id?{deviceId:{exact:id}}:true;
export const meetingMediaConstraints=(kind,selected={})=>({audio:deviceConstraint(selected.audio),video:kind==='video'?deviceConstraint(selected.video):false});
export async function meetingDeviceList(mediaDevices){
 const devices=await mediaDevices.enumerateDevices();
 const list=kind=>devices.filter(device=>device.kind===kind&&device.deviceId&&device.deviceId!=='default').map(device=>({id:device.deviceId,label:device.label}));
 return {audio:list('audioinput'),video:list('videoinput')};
}
// Capture only the device being changed. Keep the old track until replacement succeeds.
export async function replaceMeetingDevice({kind,deviceId,stream,peer,mediaDevices,isCurrent=()=>true,onCandidate=()=>{}}){
 const previous=stream.getTracks().filter(track=>track.kind===kind);
 if(!previous.length)throw new Error('No active track of this kind.');
 const nextStream=await mediaDevices.getUserMedia({audio:kind==='audio'?deviceConstraint(deviceId):false,video:kind==='video'?deviceConstraint(deviceId):false});
 const track=nextStream.getTracks().find(track=>track.kind===kind);
 let installed=false;
 try{
  if(!track)throw new Error('The device did not provide a track.');
  if(!isCurrent())return false;
  track.enabled=previous[0].enabled;onCandidate(track);
  if(peer){const sender=peer.getSenders().find(sender=>sender.track?.kind===kind);if(!sender)throw new Error('No sender for this device.');await sender.replaceTrack(track);}
  if(!isCurrent())return false;
  track.enabled=previous[0].enabled;
  stream.addTrack(track);
  for(const old of previous){stream.removeTrack(old);old.stop();}
  installed=true;return true;
 }finally{for(const candidate of nextStream.getTracks())if(!installed||candidate!==track)candidate.stop();}
}
