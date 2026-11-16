import test from 'node:test';import assert from 'node:assert/strict';import {WhipRoom,iceServersFromLink,candidateFragment}from './whipPublisher.js';
test('TURN credentials are parsed from WHIP link headers, including a separate STUN entry',()=>{
 assert.deepEqual(iceServersFromLink('<stun:relay.example:3478>; rel="ice-server", <turn:relay.example:3478?transport=udp>; rel="ice-server"; username="u"; credential="p"; credential-type="password"'),[{urls:['stun:relay.example:3478']},{urls:['turn:relay.example:3478?transport=udp'],username:'u',credential:'p'}]);
});
test('a single-output publisher refuses an unconfigured second camera',async()=>{
 const room=new WhipRoom(),video={kind:'video',mediaStreamTrack:{kind:'video'}};await room.localParticipant.publishTrack(video);assert.equal(room.localParticipant.trackPublications.get('video').track,video);await assert.rejects(room.localParticipant.publishTrack(video,{name:'portrait-source'}),/two camera outputs enabled/);room.disconnect();room.disconnect();await assert.rejects(room.localParticipant.publishTrack(video),/closed/);
});

test('trickled candidates retain their media section and ICE credentials',()=>{
 const sdp='v=0\r\na=ice-ufrag:ufrag\r\na=ice-pwd:password\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=mid:0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=mid:1\r\n';
 assert.equal(candidateFragment(sdp,{sdpMLineIndex:1,sdpMid:'1',candidate:'candidate:example'}),'a=ice-ufrag:ufrag\r\na=ice-pwd:password\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=mid:1\r\na=candidate:example\r\n');
});

test('two OVH outputs have independent video senders and the same mixed audio',async t=>{
 const names=['fetch','RTCPeerConnection','RTCRtpSender','MediaStream'],old=Object.fromEntries(names.map(n=>[n,globalThis[n]])),peers=[],requests=[];
 t.after(()=>names.forEach(n=>{if(old[n]===undefined)delete globalThis[n];else globalThis[n]=old[n];}));
 globalThis.MediaStream=class{constructor(tracks){this.tracks=tracks;}};
 globalThis.RTCRtpSender={getCapabilities:kind=>({codecs:kind==='video'?[{mimeType:'video/H264',sdpFmtpLine:'packetization-mode=1;profile-level-id=42e01f'}]:[{mimeType:'audio/opus'}]})};
 globalThis.RTCPeerConnection=class{
  constructor(){this.connectionState='connected';this.tracks=[];peers.push(this);}
  addEventListener(){}removeEventListener(){}
  addTransceiver(track){this.tracks.push(track);return {sender:{track},setCodecPreferences(){}};}
  async createOffer(){return {type:'offer',sdp:'v=0\r\na=rtpmap:111 opus/48000\r\na=fmtp:111 minptime=10\r\n'};}
  async setLocalDescription(offer){this.localDescription=offer;}
  async setRemoteDescription(){}close(){this.closed=true;}
 };
 globalThis.fetch=async(url,options)=>{requests.push({url,method:options.method});return {ok:true,status:options.method==='POST'?201:200,headers:new Headers(options.method==='POST'?{Location:url+'/publisher'}:{}),text:async()=> 'answer'};};
 const video=id=>({kind:'video',mediaStreamTrack:{kind:'video',id,readyState:'live'}}),main=video('main'),portrait=video('portrait'),audio={kind:'audio',mediaStreamTrack:{kind:'audio',id:'mix',readyState:'live'}};
 const room=new WhipRoom({portraitPublisher:{url:'https://relay.example/portrait/whip',token:'test'}});
 await room.connect('https://relay.example/main/whip','test');
 await room.localParticipant.publishTrack(main);await room.localParticipant.publishTrack(audio);await room.localParticipant.publishTrack(portrait,{name:'portrait-source'});await room.startPublishing();
 assert.equal(peers.length,2);assert.deepEqual(peers.map(p=>p.tracks.filter(t=>t.kind==='video').map(t=>t.id)),[['main'],['portrait']]);
 assert.ok(peers.every(p=>p.tracks.some(t=>t===audio.mediaStreamTrack)));assert.notEqual(main.sender,portrait.sender);
 room.disconnect();assert.ok(peers.every(p=>p.closed));assert.equal(requests.filter(r=>r.method==='DELETE').length,2);
});
test('a two-output OVH reconnect requires its second camera before sending media',async()=>{
 const room=new WhipRoom({portraitPublisher:{url:'https://relay.example/portrait/whip',token:'test'}});
 await assert.rejects(room.startPublishing(),/Restore the second camera/);room.disconnect();
});
