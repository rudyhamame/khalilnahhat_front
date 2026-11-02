import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {clearRemoteStream,replaceRemoteTrack} from '../lib/liveRemoteStream.js';
// Execute the component's actual effects with in-memory media/transport adapters.
// No browser, account, microphone or real stream is opened.
function harness(mode='whep') {
 const effects=[],statuses=[],plays=[],readers=[],rooms=[];
 const video={muted:true,assignments:0,_stream:null,get srcObject(){return this._stream;},set srcObject(s){this.assignments++;this._stream=s;},play(){return new Promise((resolve,reject)=>plays.push({resolve,reject}));}};
 let states=0,refs=0;
 const access={binding:'account',session:'session',mode,url:'qa',token:'qa'};
 class MediaStream {tracks=[];getTracks(){return [...this.tracks];}getAudioTracks(){return this.tracks.filter(t=>t.kind==='audio');}addTrack(t){this.tracks.push(t);}removeTrack(t){this.tracks=this.tracks.filter(p=>p!==t);}}
 class Room {constructor(){this.events={};this.remoteParticipants=new Map();rooms.push(this);}on(e,fn){this.events[e]=fn;}async connect(){}disconnect(){this.closed=true;}}
 const source=fs.readFileSync(new URL('./WebrtcViewer.jsx',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').split('  const handleSoundControl =')[0].replaceAll('import.meta.env.DEV','false')+'\n}';
 const context={MediaStream,Room,clearRemoteStream,replaceRemoteTrack,Track:{Kind:{Video:'video',Audio:'audio'}},RoomEvent:{TrackSubscribed:'subscribe',TrackUnsubscribed:'unsubscribe',Reconnecting:'reconnecting',Reconnected:'reconnected',Disconnected:'disconnected'},MediaMTXWebRTCReader:class{constructor(conf){this.conf=conf;readers.push(this);}close(){this.closed=true;}},useEffect:fn=>effects.push(fn),useRef:v=>({current:refs++===0?video:v}),useState:v=>{const i=states++;return [i===0?access:v,value=>{if(i===2)statuses.push(value);}];},console,window:{dispatchEvent(){}},Event};
 vm.runInNewContext(source+';WebrtcViewer',context)({token:'account',sessionIdentity:'session',muted:true});
 const cleanup=effects[mode==='whep'?6:7]();
 return {video,plays,statuses,reader:readers[0],room:rooms[0],cleanup};
}
function track(kind,id){return {kind,id,readyState:'live',stops:0,stop(){this.stops++;this.readyState='ended';}};}
test('WHEP shares a timeline, releases retry tracks and ignores stale playback completion',async()=>{
 const h=harness(),audio=track('audio','a'),video=track('video','v');
 h.reader.conf.onTrack({track:audio});h.reader.conf.onTrack({track:video});
 assert.equal(h.video.assignments,1);assert.equal(h.video.muted,true);
 h.reader.conf.onError();assert.equal(audio.stops,1);assert.equal(video.stops,1);
 h.plays[0].resolve();h.plays[1].reject(new Error('old playback'));
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.statuses.at(-1),'reconnecting');
 const replacement=track('audio','new');h.reader.conf.onTrack({track:replacement});
 h.cleanup();assert.equal(replacement.stops,1);assert.equal(h.video.srcObject,null);assert.equal(h.reader.closed,true);
 const late=track('audio','late');h.reader.conf.onTrack({track:late});assert.equal(late.stops,1);assert.equal(h.video.srcObject,null);
});
test('LiveKit repeated/replaced subscriptions cannot duplicate attachment or clear current video status',()=>{
 const h=harness('webrtc');
 const make=id=>({...track('video',id),attaches:0,detaches:0,attach(){this.attaches++;},detach(){this.detaches++;}});
 const first=make('first'),next=make('next');
 h.room.events.subscribe(first);h.room.events.subscribe(first);assert.equal(first.attaches,1);
 h.room.events.subscribe(next);assert.equal(first.detaches,1);
 h.room.events.unsubscribe(first);assert.equal(h.statuses.at(-1),'connected');
 h.cleanup();assert.equal(next.detaches,1);assert.equal(h.room.closed,true);
 h.room.events.subscribe(make('late'));assert.equal(h.statuses.at(-1),'connected');
});
