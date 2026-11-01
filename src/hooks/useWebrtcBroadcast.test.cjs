const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
// Execute the actual hook with deterministic device/transport adapters. No camera,
// microphone, network connection, or broadcast is opened by these regressions.
function harness({start,mediaFails=false,readyFails=false,endFails=false}={}) {
 const effects=[],rooms=[],ended=[];let destroyed=0,ready=0;
 class Room {
  constructor(){this.events={};this.localParticipant={setCameraEnabled:async()=>{if(mediaFails)throw new Error('Camera blocked');return {};}};rooms.push(this);}
  on(event,callback){this.events[event]=callback;}
  async connect(){this.connected=true;}
  disconnect(){this.disconnected=true;this.events.disconnected?.();}
 }
 const source=fs.readFileSync(__dirname+'/useWebrtcBroadcast.js','utf8').replace(/^import .*;\n/gm,'').replace('export function useWebrtcBroadcast','function useWebrtcBroadcast');
 const context={console:{warn(){}},navigator:{mediaDevices:{enumerateDevices:async()=>[]}},
  useRef:value=>({current:value}),useState:value=>[typeof value==='function'?value():value,()=>{}],useEffect:callback=>effects.push(callback),
  Room,VideoPresets:{h720:{resolution:{}}},RoomEvent:{Disconnected:'disconnected'},workletUrl:'qa-worklet',
  useVocalCorrection:()=>({settings:{}}),getVocalSettings:()=>({}),setVocalStatus(){},setVocalPitch(){},resetVocalLiveStatus(){},
  VocalCorrectionProcessor:class{configure(){}destroy(){destroyed++;}},
  publishVocalMicrophone:async()=>{if(mediaFails)throw new Error('Microphone blocked');return {publication:{track:{}},processed:true};},
 };
 const hook=vm.runInNewContext(source+';useWebrtcBroadcast',context)({onGoLive:start||async function(){return {token:'qa-token',url:'wss://invalid.example',roomName:'owned-room'};},onEndLive:async name=>{ended.push(name);if(endFails)throw new Error('API offline');},onReady:async()=>{ready++;if(readyFails)throw new Error('Media not ready');}});
 const cleanups=effects.map(callback=>callback()).filter(value=>typeof value==='function');
 return {hook,rooms,ended,get ready(){return ready;},get destroyed(){return destroyed;},unmount:()=>cleanups.forEach(cleanup=>cleanup())};
}
test('denied devices release only the claimed room and never mark it ready',async()=>{
 const h=harness({mediaFails:true});await h.hook.goLive('QA');assert.deepEqual(h.ended,['owned-room']);assert.equal(h.ready,0);assert.equal(h.rooms[0].disconnected,true);h.unmount();
});
test('failed ready confirmation destroys audio resources even when server cleanup fails',async()=>{
 const h=harness({readyFails:true,endFails:true});await h.hook.goLive('QA');assert.equal(h.ready,1);assert.deepEqual(h.ended,['owned-room']);assert.equal(h.destroyed,1);assert.equal(h.rooms[0].disconnected,true);h.unmount();
});
test('a start response arriving after unmount releases that exact room without connecting',async()=>{
 let resolve;const h=harness({start:()=>new Promise(done=>{resolve=done;})});const pending=h.hook.goLive('QA');h.unmount();resolve({token:'qa',url:'wss://invalid.example',roomName:'late-room'});await pending;assert.deepEqual(h.ended,['late-room']);assert.equal(h.rooms.length,0);
});
test('unexpected transport disconnect releases ownership once and cannot end another session',async()=>{
 const h=harness();await h.hook.goLive('QA');assert.equal(h.ready,1);h.rooms[0].disconnect();await Promise.resolve();assert.deepEqual(h.ended,['owned-room']);h.unmount();assert.deepEqual(h.ended,['owned-room']);
});
