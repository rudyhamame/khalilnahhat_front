const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
// Execute the actual hook with deterministic device/transport adapters. No camera,
// microphone, network connection, or broadcast is opened by these regressions.
function harness({start,mediaFails=false,readyFails=false,endFails=false,voice=false,capture,quality='720',startRecording,presentationCapture,includeMic=false,sourceKind='camera',requireRecording=false}={}) {
 const effects=[],rooms=[],ended=[],captures=[],microphones=[],published=[];let destroyed=0,ready=0,stateIndex=0;
 class Room {
  constructor(options){this.options=options;this.events={};this.localParticipant={trackPublications:new Map(),publishTrack:async track=>{published.push(track);return {track};},setCameraEnabled:async()=>{if(mediaFails)throw new Error('Camera blocked');return {};}};rooms.push(this);}
  on(event,callback){this.events[event]=callback;}
  async connect(){this.connected=true;}
  disconnect(){this.disconnected=true;this.events.disconnected?.();}
 }
 const source=fs.readFileSync(__dirname+'/useWebrtcBroadcast.js','utf8').replace(/^import .*;\n/gm,'').replace('export function useWebrtcBroadcast','function useWebrtcBroadcast');
 const context={...require('../lib/liveAudioProcessing.js'),...require('../lib/cameraAppearance.js'),CameraMirrorProcessor:class{constructor(options){Object.assign(this,options);}configure(options){Object.assign(this,options);}async destroy(){}},console:{warn(){}},navigator:{mediaDevices:{enumerateDevices:async()=>[]}},
  useRef:value=>({current:value}),useState:value=>[stateIndex++===4&&includeMic?true:value==='camera'?sourceKind:value==='720'?quality:voice&&value==='music'?'voice':typeof value==='function'?value():value,()=>{}],useEffect:callback=>effects.push(callback),
  window:{AudioContext:class{async resume(){}close(){}createMediaStreamDestination(){return {stream:{getAudioTracks:()=>[{kind:'audio',enabled:true,stop(){}}]}};}createMediaStreamSource(){return {connect(){},disconnect(){}};}},addEventListener(){},removeEventListener(){}},
  MediaStream:class{constructor(tracks){this.tracks=tracks;}},
  capturePresentationSource:presentationCapture,
  LocalVideoTrack:class{constructor(track){this.kind='video';this.mediaStreamTrack=track;}async setProcessor(){}stop(){this.mediaStreamTrack.stop();}},
  LocalAudioTrack:class{constructor(track){this.kind='audio';this.mediaStreamTrack=track;}stop(){this.mediaStreamTrack.stop();}},
  createLocalTracks:async options=>{captures.push(options);const tracks=capture?await capture(options):[];for(const track of tracks){if(track.kind==='video'){track.setProcessor??=async value=>{track.processor=value;};track.getProcessor??=()=>track.processor;}}return tracks;},Room,VideoPresets:{h720:{resolution:{},encoding:{maxBitrate:1700000}},h1080:{encoding:{maxBitrate:3000000}},h180:{},h360:{encoding:{maxBitrate:450000}}},RoomEvent:{Disconnected:'disconnected'},workletUrl:'qa-worklet',
  useVocalSettings:()=>({}),getVocalSettings:()=>({}),setVocalStatus(){},setVocalPitch(){},resetVocalLiveStatus(){},
  VocalCorrectionProcessor:class{configure(){}destroy(){destroyed++;}},
  publishVocalMicrophone:async(_participant,options)=>{microphones.push(options);if(mediaFails)throw new Error('Microphone blocked');return {publication:{track:options.track||{}},processed:Boolean(options.processor)};},
 };
 const hook=vm.runInNewContext(source+';useWebrtcBroadcast',context)({onGoLive:start||async function(){return {token:'qa-token',url:'wss://invalid.example',roomName:'owned-room'};},onEndLive:async name=>{ended.push(name);if(endFails)throw new Error('API offline');},onStartRecording:startRecording,requireRecording,onReady:async()=>{ready++;if(readyFails)throw new Error('Media not ready');}});
 const cleanups=effects.map(callback=>callback()).filter(value=>typeof value==='function');
 return {hook,rooms,ended,captures,microphones,published,get ready(){return ready;},get destroyed(){return destroyed;},unmount:()=>cleanups.forEach(cleanup=>cleanup())};
}
test('denied devices release only the claimed room and never mark it ready',async()=>{
 const h=harness({mediaFails:true});await h.hook.goLive('QA');assert.deepEqual(h.ended,['owned-room']);assert.equal(h.ready,0);assert.equal(h.rooms[0].disconnected,true);h.unmount();
});
test('failed ready confirmation destroys audio resources even when server cleanup fails',async()=>{
 const h=harness({readyFails:true,endFails:true,voice:true});await h.hook.goLive('QA');assert.equal(h.ready,1);assert.deepEqual(h.ended,['owned-room']);assert.equal(h.destroyed,1);assert.equal(h.rooms[0].disconnected,true);h.unmount();
});
test('a start response arriving after unmount releases that exact room without connecting',async()=>{
 let resolve;const h=harness({start:()=>new Promise(done=>{resolve=done;})});const pending=h.hook.goLive('QA');h.unmount();resolve({token:'qa',url:'wss://invalid.example',roomName:'late-room'});await pending;assert.deepEqual(h.ended,['late-room']);assert.equal(h.rooms.length,0);
});
test('unexpected transport disconnect releases ownership once and cannot end another session',async()=>{
 const h=harness();await h.hook.goLive('QA');assert.equal(h.ready,1);h.rooms[0].disconnect();await Promise.resolve();assert.deepEqual(h.ended,['owned-room']);h.unmount();assert.deepEqual(h.ended,['owned-room']);
});

test('browser publisher uses bounded H.264 simulcast and pauses unused layers',async()=>{
 const h=harness();await h.hook.goLive('QA');assert.equal(h.rooms[0].options.dynacast,true);assert.equal(h.rooms[0].options.publishDefaults.videoCodec,'h264');assert.equal(h.rooms[0].options.publishDefaults.simulcast,true);assert.equal(h.rooms[0].options.publishDefaults.videoSimulcastLayers.length,2);assert.equal(h.rooms[0].options.publishDefaults.videoEncoding.maxBitrate,1700000);h.unmount();
});

test('private GoPro/audio preview never reserves a room and reuses those same tracks on go-live',async()=>{
 let stops=0;const tracks=['audio','video'].map(kind=>({kind,attach(){},detach(){},stop(){stops++;}}));
 const h=harness({capture:options=>[tracks.find(track=>options[track.kind])]});
 await h.hook.preparePreview();assert.equal(h.rooms.length,0);assert.equal(h.ready,0);
 assert.equal(h.captures[0].audio.channelCount,2);assert.equal(h.captures[0].audio.echoCancellation,false);
 await h.hook.goLive('Studio');assert.equal(h.ready,1);assert.equal(h.microphones[0].track,tracks[0]);assert.equal(h.microphones[0].processor,null);
 assert.equal(h.rooms[0].options.publishDefaults.forceStereo,true);assert.equal(h.rooms[0].options.publishDefaults.dtx,false);
 h.unmount();assert.equal(stops,2);
});
test('private capture arriving after close is released without publishing',async()=>{
 let resolve,stops=0;const h=harness({capture:()=>new Promise(done=>{resolve=done;})});
 const pending=h.hook.preparePreview();h.hook.closePreview();resolve([{kind:'audio',stop(){stops++;}}]);await pending;
 assert.equal(stops,1);assert.equal(h.rooms.length,0);assert.equal(h.ready,0);h.unmount();
});

test('mirroring processes the same preview camera that is published on go-live',async()=>{
 let processor,localPreview;
 const camera={kind:'video',attach(){},detach(){},stop(){},async setProcessor(value,showLocally){processor=value;localPreview=showLocally;}};
 const h=harness({capture:options=>options.video?[camera]:[{kind:'audio',stop(){}}]});
 await h.hook.preparePreview();await h.hook.toggleCameraMirror();
 assert.ok(processor);assert.equal(localPreview,true);
 await h.hook.goLive('Mirror test');
 assert.equal(h.published[0],camera);assert.equal(h.ready,1);
 assert.ok(processor);h.unmount();
});

test('beauty and lighting update the existing branded camera processor without reopening capture',async()=>{
 let installs=0;
 const camera={kind:'video',attach(){},detach(){},stop(){},async setProcessor(value){installs++;this.processor=value;},getProcessor(){return this.processor;}};
 const h=harness({capture:options=>options.video?[camera]:[{kind:'audio',stop(){}}]});
 await h.hook.preparePreview();const processor=camera.processor;
 assert.equal(processor.watermark,true);
 await h.hook.updateCameraAppearance({strength:75,brightness:20,smoothing:30});
 assert.equal(camera.processor,processor);assert.equal(installs,1);
 assert.equal(processor.appearance.brightness,20);assert.equal(processor.appearance.strength,75);
 await h.hook.updateCameraAppearance({strength:0});
 assert.equal(camera.processor,processor);assert.equal(processor.watermark,true);assert.equal(installs,1);
 assert.equal(h.captures.length,2);h.unmount();
});

test('Full HD captures 1920 by 1080 and publishes with a matching higher bitrate and adaptive layers',async()=>{
 const h=harness({quality:'1080',capture:options=>[{kind:options.video?'video':'audio',stop(){}}]});
 await h.hook.preparePreview();
 assert.equal(h.captures[1].video.resolution.width,1920);assert.equal(h.captures[1].video.resolution.height,1080);
 assert.equal(h.captures[1].video.resolution.frameRate,30);
 await h.hook.goLive('Full HD');
 assert.equal(h.rooms[0].options.publishDefaults.videoEncoding.maxBitrate,3000000);
 assert.equal(h.rooms[0].options.publishDefaults.videoEncoding.maxFramerate,30);
 assert.equal(h.rooms[0].options.publishDefaults.videoSimulcastLayers.length,2);h.unmount();
});
test('low-bandwidth capture also lowers publisher bitrate rather than retaining the 720p budget',async()=>{
 const h=harness({quality:'360'});await h.hook.goLive('Low bandwidth');
 assert.equal(h.rooms[0].options.publishDefaults.videoEncoding.maxBitrate,450000);
 assert.equal(h.rooms[0].options.publishDefaults.videoSimulcastLayers.length,1);h.unmount();
});

test('direct recorder must start before on-air confirmation and finishes before ending the room',async()=>{
 let started=false,finished=false;
 const h=harness({start:async()=>({token:'qa',url:'wss://invalid.example',roomName:'owned-room',recording:{id:'recording',mode:'direct'}}),startRecording:async({id})=>{assert.equal(id,'recording');started=true;return {stop:async complete=>{assert.equal(complete,true);assert.equal(h.ended.length,0);finished=true;}};}});
 h.rooms.length=0;
 // The test transport publishes no real tracks; only lifecycle ordering is exercised.
 await h.hook.goLive('QA');
 assert.equal(started,true);assert.equal(h.ready,1);
 await h.hook.endLive();assert.equal(finished,true);assert.deepEqual(h.ended,['owned-room']);h.unmount();
});


test('choosing camera opens private preview immediately without reserving a live room',async()=>{
 const h=harness({capture:options=>[{kind:options.video?'video':'audio',stop(){}}]});
 await h.hook.selectSource('camera');
 assert.equal(h.captures.length,2);assert.equal(h.rooms.length,0);assert.equal(h.ready,0);h.unmount();
});
for(const kind of ['display','image','video'])test(`choosing ${kind} previews the selected source before React commits state`,async()=>{
 const file=kind==='display'?null:{name:'selected-file',type:kind+'/*'};
 let received,cleaned=0;
 const h=harness({presentationCapture:async options=>{received=options;return {stream:{getVideoTracks:()=>[{stop(){}}],getAudioTracks:()=>[]},cleanup(){cleaned++;}};}});
 await h.hook.selectSource(kind,file);
 assert.equal(received.kind,kind);assert.equal(received.file,file);
 assert.equal(h.captures.length,0);assert.equal(h.rooms.length,0);assert.equal(h.ready,0);
 h.unmount();assert.equal(cleaned,1);
});
test('selecting a file source waits for a file before opening capture',async()=>{
 let opened=0;const h=harness({presentationCapture:async()=>{opened++;}});
 await h.hook.selectSource('image');await h.hook.selectSource('video');
 assert.equal(opened,0);assert.equal(h.captures.length,0);h.unmount();
});


test('source and optional microphone mute independently before and during broadcast',async()=>{
 const sourceAudio={kind:'audio',enabled:true,stop(){}};
 const mic={kind:'audio',mediaStreamTrack:{enabled:true},stop(){}};
 const h=harness({sourceKind:'video',includeMic:true,capture:()=>[mic],presentationCapture:async()=>({stream:{getVideoTracks:()=>[{stop(){}}],getAudioTracks:()=>[sourceAudio]},cleanup(){}})});
 await h.hook.selectSource('video',{type:'video/mp4'});
 h.hook.toggleSourceAudio();assert.equal(sourceAudio.enabled,false);assert.equal(mic.mediaStreamTrack.enabled,true);
 h.hook.toggleSourceAudio();assert.equal(sourceAudio.enabled,true);
 await h.hook.toggleMicrophone();assert.equal(mic.mediaStreamTrack.enabled,false);assert.equal(sourceAudio.enabled,true);
 await h.hook.toggleMicrophone();assert.equal(mic.mediaStreamTrack.enabled,true);
 await h.hook.goLive('Audio controls');assert.equal(h.ready,1);
 h.hook.toggleSourceAudio();assert.equal(sourceAudio.enabled,false);assert.equal(mic.mediaStreamTrack.enabled,true);
 await h.hook.toggleMicrophone();assert.equal(mic.mediaStreamTrack.enabled,false);
 h.unmount();
});
test('source mute is harmless when a source has no shared audio',async()=>{
 const h=harness();h.hook.toggleSourceAudio();assert.equal(h.captures.length,0);h.unmount();
});

for(const sharedAudio of [true,false])test(`mic can join an open tab preview ${sharedAudio?'with':'without'} tab audio, without recapturing the tab`,async()=>{
 let shares=0,stops=0;
 const audio={kind:'audio',enabled:true,stop(){}};
 const mic={kind:'audio',mediaStreamTrack:{enabled:true},stop(){stops++;}};
 const h=harness({sourceKind:'display',capture:()=>[mic],presentationCapture:async()=>{shares++;return {stream:{getVideoTracks:()=>[{stop(){}}],getAudioTracks:()=>sharedAudio?[audio]:[]},cleanup(){}};}});
 await h.hook.selectSource('display');assert.equal(h.captures.length,0);
 await h.hook.toggleMicrophone();assert.equal(h.captures.length,1);assert.equal(shares,1);
 await h.hook.toggleMicrophone();assert.equal(mic.mediaStreamTrack.enabled,false);assert.equal(audio.enabled,true);
 await h.hook.setIncludeMicrophone(false);assert.equal(stops,1);
 await h.hook.setIncludeMicrophone(true);assert.equal(h.captures.length,2);assert.equal(shares,1);
 await h.hook.goLive('Tab and voice');assert.equal(h.ready,1);assert.equal(shares,1);h.unmount();
});
test('microphone permission failure leaves shared preview usable and allows retry',async()=>{
 let attempts=0,shares=0;
 const h=harness({sourceKind:'display',capture:()=>{if(++attempts===1)throw new Error('Permission denied');return [{kind:'audio',mediaStreamTrack:{enabled:true},stop(){}}];},presentationCapture:async()=>{shares++;return {stream:{getVideoTracks:()=>[{stop(){}}],getAudioTracks:()=>[]},cleanup(){}};}});
 await h.hook.selectSource('display');await h.hook.setIncludeMicrophone(true);await h.hook.setIncludeMicrophone(true);
 assert.equal(attempts,2);assert.equal(shares,1);await h.hook.goLive('Retry');assert.equal(h.ready,1);h.unmount();
});
test('closing tab preview while mic permission is pending releases the late microphone',async()=>{
 let resolve,stops=0;
 const h=harness({sourceKind:'display',capture:()=>new Promise(done=>{resolve=done;}),presentationCapture:async()=>({stream:{getVideoTracks:()=>[{stop(){}}],getAudioTracks:()=>[]},cleanup(){}})});
 await h.hook.selectSource('display');const pending=h.hook.setIncludeMicrophone(true);h.hook.closePreview();
 resolve([{kind:'audio',stop(){stops++;}}]);await pending;assert.equal(stops,1);assert.equal(h.rooms.length,0);h.unmount();
});


for(const recording of [undefined,{mode:'livekit',id:'legacy'},{mode:'direct'}])test(`studio rejects missing browser recording confirmation: ${JSON.stringify(recording)}`,async()=>{
 const h=harness({requireRecording:true,start:async()=>({token:'qa',url:'wss://invalid.example',roomName:'owned-room',recording})});
 await h.hook.goLive('Must record');assert.equal(h.rooms.length,0);assert.equal(h.ready,0);assert.deepEqual(h.ended,['owned-room']);h.unmount();
});
test('studio starts a confirmed browser recorder before going on air',async()=>{
 let started=0;const h=harness({requireRecording:true,start:async()=>({token:'qa',url:'wss://invalid.example',roomName:'owned-room',recording:{id:'recording',mode:'direct'}}),startRecording:async()=>{started++;return {stop:async()=>{}};}});
 await h.hook.goLive('Recorded');assert.equal(started,1);assert.equal(h.ready,1);await h.hook.endLive();h.unmount();
});
