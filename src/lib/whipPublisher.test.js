import test from 'node:test';import assert from 'node:assert/strict';import {WhipRoom,iceServersFromLink,candidateFragment}from './whipPublisher.js';
test('TURN credentials are parsed from WHIP link headers, including a separate STUN entry',()=>{
 assert.deepEqual(iceServersFromLink('<stun:relay.example:3478>; rel="ice-server", <turn:relay.example:3478?transport=udp>; rel="ice-server"; username="u"; credential="p"; credential-type="password"'),[{urls:['stun:relay.example:3478']},{urls:['turn:relay.example:3478?transport=udp'],username:'u',credential:'p'}]);
});
test('one original video track is retained and a second portrait encoder is not created',async()=>{
 const room=new WhipRoom(),video={kind:'video',mediaStreamTrack:{kind:'video'}};await room.localParticipant.publishTrack(video);assert.equal(room.localParticipant.trackPublications.get('video').track,video);await assert.rejects(room.localParticipant.publishTrack(video,{name:'portrait-source'}),/original combined stream/);room.disconnect();room.disconnect();await assert.rejects(room.localParticipant.publishTrack(video),/closed/);
});

test('trickled candidates retain their media section and ICE credentials',()=>{
 const sdp='v=0\r\na=ice-ufrag:ufrag\r\na=ice-pwd:password\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=mid:0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=mid:1\r\n';
 assert.equal(candidateFragment(sdp,{sdpMLineIndex:1,sdpMid:'1',candidate:'candidate:example'}),'a=ice-ufrag:ufrag\r\na=ice-pwd:password\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=mid:1\r\na=candidate:example\r\n');
});
