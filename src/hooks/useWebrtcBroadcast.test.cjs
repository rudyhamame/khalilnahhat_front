const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
// Execute the actual hook with deterministic device/transport adapters. No camera,
// microphone, network connection, or broadcast is opened by these regressions.
function harness({audioMode,audioCapture,getOutputs,beforePreview,start,mediaFails=false,readyFails=false,endFails=false,pitch=false,capture,quality='720',startRecording,presentationCapture,includeMic=false,sourceKind='camera',requireRecording=false,recordingEnabled=true}={}) {
 const videoTracks=[],programs=[],effects=[],rooms=[],ended=[],captures=[],microphones=[],published=[],publishedOptions=[],mixers=[],stateWrites=[];let destroyed=0,ready=0,stateIndex=0;
 class Room {
  constructor(options){this.options=options;this.events={};const publications=new Map();this.localParticipant={trackPublications:publications,publishTrack:async (track,options)=>{published.push(track);publishedOptions.push(options);publications.set(options?.name||'video'+publications.size,{track,trackName:options?.name});return {track};},setCameraEnabled:async()=>{if(mediaFails)throw new Error('Camera blocked');return {};}};rooms.push(this);}
  on(event,callback){this.events[event]=callback;}
  async connect(){this.connected=true;}
  disconnect(){this.disconnected=true;this.events.disconnected?.();}
 }
 const source=fs.readFileSync(__dirname+'/useWebrtcBroadcast.js','utf8').replace(/^import .*;\n/gm,'').replace('export function useWebrtcBroadcast','function useWebrtcBroadcast');
 const context={localStorage:{getItem:()=>JSON.stringify({echoCancellation:true,noiseSuppression:true,autoGainControl:true}),setItem(){}},...require('../lib/liveAudioProcessing.js'),...require('../lib/cameraAppearance.js'),CameraMirrorProcessor:class{constructor(options){Object.assign(this,options);}configure(options){Object.assign(this,options);}async destroy(){}},console:{warn(){}},navigator:{mediaDevices:{enumerateDevices:async()=>[]}},
  useRef:value=>({current:value}),useState:value=>[value==='auto'&&audioMode?(stateIndex++,audioMode):stateIndex++===4&&includeMic?true:stateIndex===11&&pitch?true:value==='camera'?sourceKind:value==='720'?quality:typeof value==='function'?value():value,next=>stateWrites.push(next)],useEffect:callback=>effects.push(callback),
  window:{AudioContext:class{async resume(){}close(){}createMediaStreamDestination(){return {stream:{getAudioTracks:()=>[{kind:'audio',enabled:true,stop(){}}]}};}createMediaStreamSource(){return {connect(){},disconnect(){}};}},addEventListener(){},removeEventListener(){}},
  MediaStream:class{constructor(tracks){this.tracks=tracks;}},
  audioInputLevel:value=>Math.max(0,Math.min(2,Number(value))),
  createStudioAudioMixer:options=>{const mixer={options,track:{kind:'audio',enabled:true,stop(){}},ready:Promise.resolve(),connectMicrophone(track){this.microphone=track;},disconnectMicrophone(){this.microphone=null;},connectSource(track){this.source=track;},connectVoice(track){this.voice=track;},disconnectVoice(){this.voice=null;},setVoiceLevel(value){this.voiceLevel=value;},setMicrophoneLevel(value){this.microphoneLevel=value;},setSourceLevel(value){this.sourceLevel=value;},stop(){this.stopped=true;}};mixers.push(mixer);return mixer;},
  capturePresentationSource:presentationCapture,captureAudioSource:audioCapture,createProgramOutput:()=>{const program={held:null,input:null,track:{kind:'video',stop(){}},setInput(track){program.input=track;},setHold(image){program.held=image;},get inputStream(){return {tracks:[program.input]};},get holding(){return Boolean(program.held);},stop(){program.stopped=true;}};programs.push(program);return program;},
  LocalVideoTrack:class{constructor(track){this.kind='video';this.mediaStreamTrack=track;this.installs=0;videoTracks.push(this);}async setProcessor(value,showLocally){this.installs++;this.processor=value;this.showLocally=showLocally;}getProcessor(){return this.processor;}attach(element){this.attachedTo=element;}detach(){}stop(){this.mediaStreamTrack?.stop?.();}},
  LocalAudioTrack:class{constructor(track){this.kind='audio';this.mediaStreamTrack=track;}stop(){this.mediaStreamTrack.stop();}},
  createLocalTracks:async options=>{captures.push(options);const tracks=capture?await capture(options):[];for(const track of tracks){if(track.kind==='audio')track.mediaStreamTrack??={kind:'audio',enabled:true};if(track.kind==='video'){track.setProcessor??=async value=>{track.processor=value;};track.getProcessor??=()=>track.processor;}}return tracks;},Room,VideoPresets:{h720:{resolution:{},encoding:{maxBitrate:1700000}},h1080:{encoding:{maxBitrate:3000000}},h180:{},h360:{encoding:{maxBitrate:450000}}},RoomEvent:{Disconnected:'disconnected'},workletUrl:'qa-worklet',
  useVocalSettings:()=>({}),getVocalSettings:()=>({}),setVocalStatus(){},setVocalPitch(){},resetVocalLiveStatus(){},
  VocalCorrectionProcessor:class{configure(){}destroy(){destroyed++;}},
  publishVocalMicrophone:async(participant,options)=>{microphones.push(options);if(mediaFails)throw new Error('Microphone blocked');const publication={track:options.track||{stop(){}}};participant.trackPublications.set('audio',publication);return {publication,processed:Boolean(options.processor)};},
 };
 const hook=vm.runInNewContext(source+';useWebrtcBroadcast',context)({getOutputs,onBeforePreview:beforePreview,onGoLive:start||async function(){return {token:'qa-token',url:'wss://invalid.example',roomName:'owned-room'};},onEndLive:async name=>{ended.push(name);if(endFails)throw new Error('API offline');},onStartRecording:startRecording,requireRecording,recordingEnabled,onReady:async()=>{ready++;if(readyFails)throw new Error('Media not ready');}});
 const cleanups=effects.map(callback=>callback()).filter(value=>typeof value==='function');
 return {hook,programs,videoTracks,rooms,ended,captures,microphones,published,publishedOptions,mixers,stateWrites,get ready(){return ready;},get destroyed(){return destroyed;},unmount:()=>cleanups.forEach(cleanup=>cleanup())};
}
test('denied devices release only the claimed room and never mark it ready',async()=>{
 const h=harness({mediaFails:true});await h.hook.goLive('QA');assert.deepEqual(h.ended,['owned-room']);assert.equal(h.ready,0);assert.equal(h.rooms[0].disconnected,true);h.unmount();
});
test('failed ready confirmation destroys audio resources even when server cleanup fails',async()=>{
 const h=harness({readyFails:true,endFails:true,pitch:true,capture:()=>[{kind:'audio',stop(){}}]});await h.hook.goLive('QA');assert.equal(h.ready,1);assert.deepEqual(h.ended,['owned-room']);assert.equal(h.destroyed,1);assert.equal(h.rooms[0].disconnected,true);h.unmount();
});
test('a start response arriving after unmount releases that exact room without connecting',async()=>{
 let resolve;const h=harness({start:()=>new Promise(done=>{resolve=done;})});const pending=h.hook.goLive('QA');h.unmount();resolve({token:'qa',url:'wss://invalid.example',roomName:'late-room'});await pending;assert.deepEqual(h.ended,['late-room']);assert.equal(h.rooms.length,0);
});
test('unexpected transport disconnect releases ownership once and cannot end another session',async()=>{
 const h=harness();await h.hook.goLive('QA');assert.equal(h.ready,1);h.rooms[0].disconnect();await Promise.resolve();assert.deepEqual(h.ended,['owned-room']);h.unmount();assert.deepEqual(h.ended,['owned-room']);
});

test('browser publisher uses bounded H.264 simulcast and pauses unused layers',async()=>{
 const h=harness();await h.hook.goLive('QA');assert.equal(h.rooms[0].options.dynacast,true);assert.equal(h.rooms[0].options.publishDefaults.videoCodec,'h264');assert.equal(h.rooms[0].options.publishDefaults.simulcast,true);assert.equal(h.rooms[0].options.publishDefaults.videoSimulcastLayers.length,1);assert.equal(h.rooms[0].options.publishDefaults.videoEncoding.maxBitrate,1700000);h.unmount();
});

test('private GoPro/audio preview never reserves a room and reuses those same tracks on go-live',async()=>{
 let stops=0;const tracks=['audio','video'].map(kind=>({kind,attach(){},detach(){},stop(){stops++;}}));
 const h=harness({capture:options=>[tracks.find(track=>options[track.kind])]});
 await h.hook.preparePreview();assert.equal(h.rooms.length,0);assert.equal(h.ready,0);
 assert.equal(h.captures[0].audio.channelCount,2);assert.equal(h.captures[0].audio.echoCancellation.exact,false);
 await h.hook.goLive('Studio');assert.equal(h.ready,1);assert.equal(h.microphones[0].track.mediaStreamTrack,h.mixers[0].track);assert.equal(h.mixers[0].microphone,tracks[0].mediaStreamTrack);assert.equal(h.microphones[0].processor,null);
 assert.equal(h.rooms[0].options.publishDefaults.forceStereo,true);assert.equal(h.rooms[0].options.publishDefaults.dtx,false);
 h.unmount();assert.equal(stops,2);
});
test('legacy saved speech settings cannot process microphone capture or recording by default',async()=>{
 const tracks=['audio','video'].map(kind=>({kind,mediaStreamTrack:{kind},stop(){}}));let recorded;
 const h=harness({capture:options=>[tracks.find(track=>options[track.kind])],startRecording:async({tracks})=>{recorded=tracks;return {stop:async()=>{}};},start:async()=>({token:'qa',url:'wss://invalid.example',roomName:'owned-room',recording:{mode:'direct',id:'recording'}})});
 await h.hook.preparePreview();await h.hook.goLive('Organic');
 const audio=h.captures.find(options=>options.audio).audio;
 assert.equal(audio.latency.ideal,0);assert.equal(audio.echoCancellation.exact,false);assert.equal(audio.noiseSuppression.exact,false);assert.equal(audio.autoGainControl.exact,false);
 assert.equal(h.microphones[0].processor,null);assert.equal(h.microphones[0].track.mediaStreamTrack,h.mixers[0].track);assert.equal(h.mixers[0].microphone,tracks[0].mediaStreamTrack);assert.ok(recorded.includes(h.mixers[0].track));h.unmount();
});
test('microphone speech effects apply only when explicitly selected and reset to off',async()=>{
 const applied=[];const mic={kind:'audio',stop(){},async applyConstraints(settings){applied.push(settings);},getSourceTrackSettings:()=>applied.at(-1)||{}};
 const h=harness({capture:options=>options.audio?[mic]:[]});await h.hook.preparePreview();
 await h.hook.updateAudioProcessing({noiseSuppression:true});assert.equal(applied[0].noiseSuppression.exact,true);assert.equal(applied[0].echoCancellation.exact,false);
 await h.hook.updateAudioProcessing(null);assert.deepEqual(applied[1],{echoCancellation:{exact:false},noiseSuppression:{exact:false},autoGainControl:{exact:false}});h.unmount();
});
test('a selected microphone pitch option never processes a shared source mix',async()=>{
 const h=harness({pitch:true,sourceKind:'display',presentationCapture:async()=>({stream:{getVideoTracks:()=>[{stop(){}}],getAudioTracks:()=>[{kind:'audio',stop(){}}]},cleanup(){}})});
 await h.hook.selectSource('display');await h.hook.goLive('Source music');assert.equal(h.ready,1);assert.equal(h.microphones[0].processor,null);h.unmount();
});
test('private capture arriving after close is released without publishing',async()=>{
 let resolve,stops=0;const h=harness({capture:()=>new Promise(done=>{resolve=done;})});
 const pending=h.hook.preparePreview();h.hook.closePreview();resolve([{kind:'audio',stop(){stops++;}}]);await pending;
 assert.equal(stops,1);assert.equal(h.rooms.length,0);assert.equal(h.ready,0);h.unmount();
});

test('mirroring processes the program picture that is published on go-live',async()=>{
 const camera={kind:'video',mediaStreamTrack:{id:'raw'},attach(){},detach(){},stop(){}};
 const h=harness({capture:options=>options.video?[camera]:[{kind:'audio',stop(){}}]});
 await h.hook.preparePreview();await h.hook.toggleCameraMirror();
 const program=h.videoTracks.find(track=>track.mediaStreamTrack===h.programs[0].track);
 assert.ok(program.processor);assert.equal(program.showLocally,true);assert.equal(h.programs[0].input.id,'raw');
 await h.hook.goLive('Mirror test');
 assert.equal(h.published[0],program);assert.equal(h.ready,1);h.unmount();
});
test('beauty and lighting update the existing branded camera processor without reopening capture',async()=>{
 const camera={kind:'video',mediaStreamTrack:{id:'raw'},attach(){},detach(){},stop(){}};
 const h=harness({capture:options=>options.video?[camera]:[{kind:'audio',stop(){}}]});
 await h.hook.preparePreview();
 const program=h.videoTracks.find(track=>track.mediaStreamTrack===h.programs[0].track),processor=program.processor;
 assert.equal(processor.watermark,true);
 await h.hook.updateCameraAppearance({strength:75,brightness:20,smoothing:30});
 assert.equal(program.processor,processor);assert.equal(program.installs,1);
 assert.equal(processor.appearance.brightness,20);assert.equal(processor.appearance.strength,75);
 await h.hook.updateCameraAppearance({strength:0});
 assert.equal(program.processor,processor);assert.equal(processor.watermark,true);assert.equal(program.installs,1);
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
 assert.equal(received.kind,kind);assert.equal(received.file??null,file);
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
test('microphone and source effects target separate input tracks and never enable noise suppression together',async()=>{
 const micCalls=[],sourceCalls=[];
 const mic={kind:'audio',mediaStreamTrack:{kind:'audio'},stop(){},async applyConstraints(value){micCalls.push(value);}};
 const sourceAudio={kind:'audio',stop(){},getCapabilities:()=>({echoCancellation:[true,false],noiseSuppression:[true,false],autoGainControl:[true,false]}),async applyConstraints(value){sourceCalls.push(value);}};
 const h=harness({sourceKind:'display',includeMic:true,capture:options=>options.audio?[mic]:[],presentationCapture:async()=>({stream:{getVideoTracks:()=>[{stop(){}}],getAudioTracks:()=>[sourceAudio]},cleanup(){}})});
 await h.hook.preparePreview();
 assert.equal(sourceCalls.length,0);
 assert.equal(h.captures[0].audio.noiseSuppression.exact,false);
 await h.hook.updateAudioProcessing({echoCancellation:true});
 assert.equal(micCalls.length,1);assert.equal(sourceCalls.length,0);
 assert.equal(micCalls[0].noiseSuppression.exact,false);
 await h.hook.updateSourceAudioProcessing({autoGainControl:true});
 assert.equal(micCalls.length,1);assert.equal(sourceCalls.length,1);
 assert.equal(sourceCalls[0].autoGainControl.exact,true);assert.equal(sourceCalls[0].noiseSuppression.exact,false);
 await h.hook.updateSourceAudioProcessing(null);
 assert.equal(sourceCalls[1].autoGainControl.exact,false);assert.equal(micCalls.length,1);
 h.unmount();
});
test('unsupported source effects cannot alter the shared source track',async()=>{
 let applied=0;
 const h=harness({sourceKind:'display',presentationCapture:async()=>({stream:{getVideoTracks:()=>[{stop(){}}],getAudioTracks:()=>[{kind:'audio',stop(){},async applyConstraints(){applied++;}}]},cleanup(){}})});
 await h.hook.preparePreview();await h.hook.updateSourceAudioProcessing({noiseSuppression:true});
 assert.equal(applied,0);h.unmount();
});
test('camera microphone fader controls the stable published and recorded audio, not source gain',async()=>{
 const mic={kind:'audio',mediaStreamTrack:{kind:'audio',enabled:true},stop(){}};
 const h=harness({capture:options=>options.audio?[mic]:[]});await h.hook.preparePreview();
 h.hook.updateMicrophoneLevel(.4);assert.equal(h.mixers[0].microphoneLevel,.4);assert.equal(h.mixers[0].sourceLevel,undefined);
 await h.hook.goLive('Fader');assert.equal(h.microphones[0].track.mediaStreamTrack,h.mixers[0].track);h.unmount();assert.equal(h.mixers[0].stopped,true);
});

test('going live without private preview still applies mic gain and releases the raw capture on unmount',async()=>{
 let stops=0;const mic={kind:'audio',mediaStreamTrack:{kind:'audio',enabled:true},stop(){stops++;}};
 const h=harness({capture:()=>[mic]});h.hook.updateMicrophoneLevel(.6);await h.hook.goLive('Direct');
 assert.equal(h.ready,1);assert.equal(h.mixers[0].options.microphoneLevel,.6);assert.equal(h.mixers[0].microphone,mic.mediaStreamTrack);assert.equal(h.microphones[0].track.mediaStreamTrack,h.mixers[0].track);
 h.unmount();assert.equal(stops,1);assert.equal(h.mixers[0].stopped,true);
});
test('live-only mode publishes and ends without starting a recorder',async()=>{
 let recordings=0;
 const h=harness({recordingEnabled:false,start:async()=>({token:'qa',url:'wss://invalid.example',roomName:'owned-room',recording:{mode:'none'}}),startRecording:async()=>{recordings++;throw new Error('Must not record');}});
 await h.hook.goLive('Live only');assert.equal(h.ready,1);assert.equal(recordings,0);
 await h.hook.endLive();assert.deepEqual(h.ended,['owned-room']);h.unmount();
});
test('live-only mode rejects a server that still enables recording',async()=>{
 let recordings=0;
 const h=harness({recordingEnabled:false,start:async()=>({token:'qa',url:'wss://invalid.example',roomName:'owned-room',recording:{id:'unexpected',mode:'direct'}}),startRecording:async()=>{recordings++;}});
 await h.hook.goLive('Live only');assert.equal(h.ready,0);assert.equal(h.rooms.length,0);assert.equal(recordings,0);assert.deepEqual(h.ended,['owned-room']);h.unmount();
});

test('recording destination gate prevents preview media access, including source selection',async()=>{
 let allowed=false,checks=0;
 const h=harness({beforePreview:()=>{checks++;return allowed;}});
 await h.hook.preparePreview();
 await h.hook.selectSource('camera');
 assert.equal(checks,2);assert.equal(h.captures.length,0);assert.equal(h.rooms.length,0);
 allowed=true;await h.hook.preparePreview();
 assert.equal(checks,3);assert.ok(h.captures.length>0);assert.equal(h.rooms.length,0);h.unmount();
});

test('failed startup clears inline progress and reports the error separately',async()=>{
 const h=harness({start:async()=>{throw new Error('Could not start the live stream.');}});
 await h.hook.goLive('QA failure');
 assert.equal(h.rooms.length,0);assert.equal(h.ready,0);
 assert.ok(h.stateWrites.includes('Could not start the live stream.'));
 assert.ok(h.stateWrites.includes(''));h.unmount();
});

test('collab outputs: landscape publishes the combined track, portrait publishes source B under its own name',async()=>{
 const landscape={kind:'video',id:'collab',stop(){}},portrait={kind:'video',id:'b',stop(){}};
 const h=harness({getOutputs:()=>({landscape,portrait}),capture:()=>[{kind:'audio',stop(){}}]});
 await h.hook.goLive('Two sources');
 const videos=h.published.filter(track=>track.kind==='video');
 assert.deepEqual(videos.map(track=>track.mediaStreamTrack.id),['collab','b']);
 assert.equal(h.publishedOptions[h.published.indexOf(videos[1])].name,'portrait-source');
 assert.equal(h.publishedOptions[h.published.indexOf(videos[1])].source,'unknown');
 h.unmount();
});
test('without collab outputs nothing extra is published',async()=>{
 const h=harness({getOutputs:()=>({}),capture:()=>[{kind:'audio',stop(){}}]});await h.hook.goLive('One source');
 assert.equal(h.publishedOptions.filter(option=>option?.name==='portrait-source').length,0);h.unmount();
});

test('the recording gets the landscape picture and the audio, never the separate portrait source',async()=>{
 const landscape={kind:'video',id:'collab',stop(){}},portrait={kind:'video',id:'portrait-b',stop(){}};let recorded=[];
 const h=harness({getOutputs:()=>({landscape,portrait}),capture:()=>[{kind:'audio',stop(){}}],
  start:async()=>({token:'qa',url:'wss://invalid.example',roomName:'owned-room',recording:{id:'rec',mode:'direct'}}),
  startRecording:async({tracks})=>{recorded=tracks;return {stop:async()=>{}};}});
 await h.hook.goLive('Two sources');
 assert.ok(recorded.some(track=>track.id==='collab'));assert.ok(!recorded.some(track=>track.id==='portrait-b'));h.unmount();
});

test('choosing an input opens the private preview at once, and a second input replaces it without locking',async()=>{
 const h=harness({capture:()=>[{kind:'video',stop(){}}]});
 await h.hook.selectSource('camera');assert.ok(h.captures.length>0);const first=h.captures.length;
 await h.hook.selectSource('camera');assert.ok(h.captures.length>first);assert.equal(h.rooms.length,0);h.unmount();
});
test('Tab / window: choosing it opens the picker once and the preview shows that very capture',async()=>{
 let captures=0,cleaned=0;
 const h=harness({presentationCapture:async()=>{captures++;return {stream:{getVideoTracks:()=>[{stop(){}}],getAudioTracks:()=>[]},cleanup(){cleaned++;}};}});
 await h.hook.selectSource('display');
 assert.equal(captures,1);assert.equal(h.rooms.length,0);assert.equal(h.captures.length,0);
 h.unmount();assert.equal(cleaned,1);
});
test('a chosen tab is released when another input is picked instead',async()=>{
 let cleaned=0;
 const h=harness({presentationCapture:async()=>({stream:{getVideoTracks:()=>[{stop(){}}],getAudioTracks:()=>[]},cleanup(){cleaned++;}})});
 await h.hook.selectSource('display');await new Promise(resolve=>setTimeout(resolve,0));
 await h.hook.selectSource('camera');assert.equal(cleaned,1);h.unmount();
});

test('split audio: audio off never asks for a microphone; the live carries a silent mixer track so the voice microphone can join at any time',async()=>{
 const h=harness({audioMode:'none',capture:()=>[{kind:'video',stop(){}}]});
 await h.hook.preparePreview();
 assert.ok(h.captures.every(options=>!options.audio));
 await h.hook.goLive('Silent');
 assert.equal(h.microphones[0].track.mediaStreamTrack,h.mixers[0].track);assert.equal(h.mixers[0].microphone,undefined);assert.equal(h.ready,1);h.unmount();
});
test('split audio: a shared tab picture can carry the microphone instead of the tab sound',async()=>{
 const h=harness({audioMode:'mic',presentationCapture:async()=>({stream:{getVideoTracks:()=>[{stop(){}}],getAudioTracks:()=>[{kind:'audio',stop(){}}]},cleanup(){}}),capture:()=>[{kind:'audio',stop(){}}]});
 await h.hook.preparePreview({kind:'display'});
 assert.ok(h.captures.some(options=>options.audio&&!options.video));
 assert.equal(h.mixers.length>=1,true);assert.equal(Boolean(h.mixers[0].microphone),true);assert.equal(Boolean(h.mixers[0].source),false);h.unmount();
});
test('split audio: camera picture with tab sound captures the sound separately and releases it with the preview',async()=>{
 let cleaned=0;const sound={kind:'audio',stop(){}};
 const h=harness({audioMode:'tab',audioCapture:async()=>({stream:{getAudioTracks:()=>[sound]},cleanup(){cleaned++;}}),capture:()=>[{kind:'video',stop(){}}]});
 await h.hook.preparePreview({kind:'camera'});
 assert.equal(h.mixers[0].source,sound);h.hook.closePreview();assert.equal(cleaned,1);h.unmount();
});
test('split audio: a shared tab used for both picture and sound is not asked for twice',async()=>{
 let asked=0;const sound={kind:'audio',stop(){}};
 const h=harness({audioMode:'tab',audioCapture:async()=>{asked++;throw new Error('should not be needed');},presentationCapture:async()=>({stream:{getVideoTracks:()=>[{stop(){}}],getAudioTracks:()=>[sound]},cleanup(){}})});
 await h.hook.preparePreview({kind:'display'});assert.equal(asked,0);assert.equal(h.mixers[0].source,sound);h.unmount();
});

test('pause live: a hold photo replaces the input, a new input can be set while paused, and resume returns the live picture',async()=>{
 const camera={kind:'video',mediaStreamTrack:{id:'camera'},attach(){},detach(){},stop(){}},newCamera={kind:'video',mediaStreamTrack:{id:'second-camera'},attach(){},detach(){},stop(){}};
 let videoCalls=0;
 const h=harness({capture:options=>options.video?[videoCalls++?newCamera:camera]:[{kind:'audio',stop(){}}]});
 await h.hook.preparePreview();await h.hook.goLive('Pause test');
 const program=h.programs[0],photo={name:'photo'};
 assert.equal(h.hook.pauseLive(photo),true);assert.equal(program.held,photo);
 assert.equal(await h.hook.setPausedInput({kind:'camera'}),true);assert.equal(program.input.id,'second-camera');assert.equal(program.held,photo);
 h.hook.resumeLive();assert.equal(program.held,null);assert.equal(program.input.id,'second-camera');
 h.unmount();assert.equal(program.stopped,true);
});

test('pause live pauses the recording and resume continues it; End live while paused really ends the live and the recording',async()=>{
 const events=[];
 const make=()=>harness({capture:options=>options.video?[{kind:'video',mediaStreamTrack:{id:'cam'},attach(){},detach(){},stop(){}}]:[{kind:'audio',stop(){}}],
  start:async()=>({token:'qa',url:'wss://invalid.example',roomName:'owned-room',recording:{id:'rec',mode:'direct'}}),
  startRecording:async()=>({stop:async complete=>{events.push('stop:'+complete);},pause(){events.push('pause');},resume(){events.push('resume');}})});
 let h=make();await h.hook.preparePreview();await h.hook.goLive('Recorded pause');
 assert.equal(h.hook.pauseLive({name:'photo'}),true);h.hook.resumeLive();
 assert.deepEqual(events,['pause','resume']);h.unmount();
 events.length=0;h=make();await h.hook.preparePreview();await h.hook.goLive('End while paused');
 h.hook.pauseLive({name:'photo'});await h.hook.endLive();
 assert.deepEqual(events,['pause','stop:true']);assert.deepEqual(h.ended,['owned-room']);assert.equal(h.programs[0].stopped,true);h.unmount();
});

test('the voice microphone is isolated: it joins the mixer on its own channel with its own level, whatever the audio input is, and is released with the live',async()=>{
 let stops=0;const voice={kind:'audio',mediaStreamTrack:{id:'voice'},stop(){stops++;}};
 const h=harness({audioMode:'none',capture:options=>options.video?[{kind:'video',mediaStreamTrack:{id:'cam'},attach(){},detach(){},stop(){}}]:[voice]});
 await h.hook.preparePreview();
 assert.equal(h.mixers.length>=1,true);const mixer=h.mixers.at(-1);
 assert.equal(await h.hook.setVoice(true),true);assert.equal(mixer.voice.id,'voice');
 h.hook.updateVoiceLevel(.4);assert.equal(mixer.voiceLevel,.4);assert.equal(mixer.microphone,undefined);assert.equal(mixer.source,undefined);
 assert.equal(await h.hook.setVoice(false),true);assert.equal(mixer.voice,null);assert.equal(stops,1);h.unmount();
});

test('no input, no recording: when the input track ends mid-live the recording pauses; choosing a new input resumes it',async()=>{
 const events=[];let ended;
 const rawTrack={id:'cam',addEventListener(type,fn){if(type==='ended')ended=fn;}};
 const make=()=>harness({capture:options=>options.video?[{kind:'video',mediaStreamTrack:rawTrack,attach(){},detach(){},stop(){}}]:[{kind:'audio',stop(){}}],
  start:async()=>({token:'qa',url:'wss://invalid.example',roomName:'owned-room',recording:{id:'rec',mode:'direct'}}),
  startRecording:async()=>({stop:async()=>{},pause(){events.push('pause');},resume(){events.push('resume');}})});
 const h=make();await h.hook.preparePreview();await h.hook.goLive('Lost input');
 ended();assert.deepEqual(events,['pause']);h.unmount();
});

test('the voice microphone uses its own device choice, apart from the audio input, and moves to a new device when it is on',async()=>{
 const voice=()=>({kind:'audio',mediaStreamTrack:{id:'voice'},stop(){}});
 const h=harness({audioMode:'none',capture:options=>options.video?[{kind:'video',mediaStreamTrack:{id:'cam'},attach(){},detach(){},stop(){}}]:[voice()]});
 await h.hook.preparePreview();
 await h.hook.selectVoiceDevice('usb-mic');await h.hook.setVoice(true);
 const first=h.captures.filter(options=>options.audio&&!options.video).at(-1);assert.equal(first.audio.deviceId.exact,'usb-mic');
 await h.hook.selectVoiceDevice('headset');
 const second=h.captures.filter(options=>options.audio&&!options.video).at(-1);assert.equal(second.audio.deviceId.exact,'headset');
 h.unmount();
});

test('the collab picture is never attached to the preview element it is built from (no hall of mirrors); one source still previews the live track',async()=>{
 const camera=()=>({kind:'video',mediaStreamTrack:{id:'cam'},attach(){},detach(){},stop(){}});
 const element={name:'preview-element'};
 const collab=harness({getOutputs:()=>({landscape:{id:'collab',kind:'video',stop(){}}}),capture:options=>options.video?[camera()]:[{kind:'audio',stop(){}}]});
 collab.hook.videoRef.current=element;await collab.hook.preparePreview();await collab.hook.goLive('Two sources');
 const composite=collab.videoTracks.find(track=>track.mediaStreamTrack?.id==='collab'),program=collab.videoTracks.find(track=>track.mediaStreamTrack===collab.programs[0].track);
 assert.equal(composite.attachedTo,undefined);assert.equal(program.attachedTo,element);collab.unmount();
 const single=harness({capture:options=>options.video?[camera()]:[{kind:'audio',stop(){}}]});
 single.hook.videoRef.current=element;await single.hook.preparePreview();await single.hook.goLive('One source');
 assert.equal(single.published[0].attachedTo,element);single.unmount();
});
