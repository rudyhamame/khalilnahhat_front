// One H.264/Opus WebRTC upload. OVH forwards and records these encoded packets.
// No MediaRecorder, additional resolution layers, or server video encoder.
export function iceServersFromLink(link=''){
 return [...link.matchAll(/<([^>]+)>\s*;\s*rel="ice-server"([^,]*)/g)].map(([,url,attributes])=>({urls:[url],...(attributes.match(/username="([^"]*)"/)?.[1]?{username:attributes.match(/username="([^"]*)"/)[1],credential:attributes.match(/credential="([^"]*)"/)?.[1]||''}:{})}));
}
export function candidateFragment(sdp,candidate){
 const sections=sdp.split('\r\nm=');
 const section=sections[candidate.sdpMLineIndex+1];
 const ufrag=sdp.match(/a=ice-ufrag:([^\r\n]+)/)?.[1],pwd=sdp.match(/a=ice-pwd:([^\r\n]+)/)?.[1];
 if(!section||!ufrag||!pwd)throw new Error('OVH ICE negotiation is incomplete.');
 return `a=ice-ufrag:${ufrag}\r\na=ice-pwd:${pwd}\r\nm=${section.split('\r\n')[0]}\r\na=mid:${candidate.sdpMid}\r\na=${candidate.candidate}\r\n`;
}
const waitFor=(target,event,predicate,timeout=15000)=>new Promise((resolve,reject)=>{
 if(predicate())return resolve();
 const done=error=>{clearTimeout(timer);target.removeEventListener(event,check);if(error)reject(error);else resolve();};
 const check=()=>{if(predicate())done();else if(['failed','closed'].includes(target.connectionState))done(new Error('The OVH media connection failed.'));};
 const timer=setTimeout(()=>done(new Error('The OVH media connection timed out.')),timeout);target.addEventListener(event,check);
});
export class WhipRoom{
 constructor(){
  this.handlers=new Map();this.closed=false;this.resource='';this.pc=null;this.abort=new AbortController();this.candidates=[];this.patching=Promise.resolve();
  const publications=new Map();
  this.localParticipant={trackPublications:publications,
   publishData:async()=>{},
   publishTrack:async(track,options={})=>{
    if(this.closed)throw new Error('Broadcast was closed.');
    if(options.name==='portrait-source')throw new Error('The original combined stream supplies both viewer layouts.');
    if(this.pc)throw new Error('Close the broadcast before adding a new media track.');
    const publication={track,kind:track.kind,trackName:options.name||track.kind};publications.set(track.kind,publication);return publication;
   },
  };
 }
 on(event,callback){this.handlers.set(event,callback);}
 async connect(url,token){this.url=url;this.token=token;}
 async startPublishing(){
  const headers={Authorization:`Bearer ${this.token}`};
  const options=await fetch(this.url,{method:'OPTIONS',headers,signal:this.abort.signal});
  if(!options.ok)throw new Error('OVH publishing is unavailable.');
  const pc=new RTCPeerConnection({iceServers:iceServersFromLink(options.headers.get('Link')||'')});this.pc=pc;
  pc.addEventListener('icecandidate',event=>{if(event.candidate){this.candidates.push(event.candidate);if(this.resource)void this.flushCandidates().catch(()=>{});}});
  for(const publication of this.localParticipant.trackPublications.values()){
   const track=publication.track.mediaStreamTrack;
   if(!track||track.readyState==='ended')throw new Error('The studio source is no longer available.');
   const transceiver=pc.addTransceiver(track,{direction:'sendonly',streams:[new MediaStream([track])],sendEncodings:[{maxBitrate:track.kind==='video'?1700000:256000,...(track.kind==='video'?{maxFramerate:30}:{})}]});
   publication.track.sender=transceiver.sender;
   if(track.kind==='video'){
    const codecs=RTCRtpSender.getCapabilities('video')?.codecs.filter(codec=>codec.mimeType.toLowerCase()==='video/h264'&&/packetization-mode=1/i.test(codec.sdpFmtpLine||'')&&/profile-level-id=42[0-9a-f]{4}/i.test(codec.sdpFmtpLine||''));
    if(!codecs?.length)throw new Error('This browser cannot publish H.264 Baseline. Use an updated Chrome, Edge or Safari.');
    transceiver.setCodecPreferences(codecs);
   }else{
    const codecs=RTCRtpSender.getCapabilities('audio')?.codecs.filter(codec=>codec.mimeType.toLowerCase()==='audio/opus');if(codecs?.length)transceiver.setCodecPreferences(codecs);
   }
  }
  const offer=await pc.createOffer();
  const opus=offer.sdp.match(/a=rtpmap:(\d+) opus\/48000/);
  if(opus){const pattern=new RegExp(`(a=fmtp:${opus[1]} [^\\r\\n]*)`);offer.sdp=offer.sdp.replace(pattern,'$1;stereo=1;sprop-stereo=1;maxaveragebitrate=256000');}
  await pc.setLocalDescription(offer);
  const response=await fetch(this.url,{method:'POST',headers:{...headers,'Content-Type':'application/sdp'},body:pc.localDescription.sdp,signal:this.abort.signal});
  if(response.status!==201)throw new Error('OVH rejected the live media. Check the source and retry.');
  const location=response.headers.get('Location');if(location)this.resource=new URL(location,this.url).href;
  if(this.closed){await this.deleteResource();throw new Error('Broadcast was closed.');}
  await pc.setRemoteDescription({type:'answer',sdp:await response.text()});
  await this.flushCandidates();
  await waitFor(pc,'connectionstatechange',()=>pc.connectionState==='connected',20000);
  pc.addEventListener('connectionstatechange',()=>{if(!this.closed&&pc.connectionState==='failed')this.handlers.get('disconnected')?.();});
 }
 flushCandidates(){
  this.patching=this.patching.then(async()=>{
   while(this.resource&&!this.closed&&this.candidates.length){
    const candidate=this.candidates.shift();
    const response=await fetch(this.resource,{method:'PATCH',headers:{Authorization:`Bearer ${this.token}`,'Content-Type':'application/trickle-ice-sdpfrag','If-Match':'*'},body:candidateFragment(this.pc.localDescription.sdp,candidate),signal:this.abort.signal});
    if(!response.ok)throw new Error('OVH could not negotiate the media connection.');
   }
  }).catch(error=>{if(!this.closed){this.connectionError=error;this.pc?.close();this.handlers.get('disconnected')?.();}});
  return this.patching.then(()=>{if(this.connectionError)throw this.connectionError;});
 }
 async deleteResource(){const resource=this.resource;this.resource='';if(resource)await fetch(resource,{method:'DELETE',headers:{Authorization:`Bearer ${this.token}`},signal:AbortSignal.timeout(10000)}).catch(()=>{});}
 disconnect(){if(this.closed)return;this.closed=true;this.abort.abort();this.pc?.close();void this.deleteResource();}
}
