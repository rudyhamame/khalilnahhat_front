const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
// Exercise the actual hook's effects, transport and audio-node lifetime.
function harness({active=false,decode,duration=10}={}){
 const slots=[],effects=[],timeouts=new Map(),intervals=new Map(),requests=[],fetches=[];let cursor=0,pending=[],dirty=false,states=0,serial=0;
 const channels=['vocals','drums','bass','other'];const mix=()=>Object.fromEntries(channels.map(n=>[n,{volume:1,solo:false,muted:false}]));
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const node=()=>({gain:{setValueAtTime(){},setTargetAtTime(){}},connect(){},disconnect(){this.disconnected=true;},getFloatTimeDomainData(samples){samples.fill(.1);}});
 const original=node(),context={currentTime:1,sampleRate:44100,resume:async()=>{},createGain:node,createAnalyser:node,decodeAudioData:decode||(async()=>({duration:10,length:441000,numberOfChannels:2}))};
 const element={paused:false,seeking:false,currentTime:0,playbackRate:1,events:{},addEventListener(n,f){this.events[n]=f;},removeEventListener(n){delete this.events[n];}};
 const props={active,audio:{current:element},track:{id:'one',audioUrl:'one.mp3'},audioGraph:{current:{context,stemInput:node(),originalGain:original}},unlock(){},master:1};
 const source=fs.readFileSync(__dirname+'/useStemPlayer.js','utf8').replace(/^import .*;\n/gm,'').replace('export default function useStemPlayer','function useStemPlayer');
 const sandbox={AbortController,Float32Array,Date,console,document:{hidden:false},localStorage:{getItem:()=>null},apiBaseUrl:'/api',STEM_DECODE_LIMIT:384*1024*1024,stemDecodeBytes:(duration,rate,n)=>duration*rate*2*4*n,STEM_CHANNELS:channels,initialStemMix:mix,stemGain:()=>1,
  scheduleStemSources:()=>channels.map(()=>({stop(){},disconnect(){}})),
  useRef(v){const i=cursor++;return slots[i]||=( {current:v});},
  useState(v){const i=cursor++;if(!(i in slots))slots[i]=typeof v==='function'?v():v;return [slots[i],value=>{const next=typeof value==='function'?value(slots[i]):value;if(!Object.is(next,slots[i])){slots[i]=next;dirty=true;states++;}}];},
  useCallback(fn,deps){const i=cursor++;if(!slots[i]||!same(slots[i].deps,deps))slots[i]={fn,deps};return slots[i].fn;},
  useEffect(fn,deps){const i=cursor++;if(!effects[i]||!same(effects[i].deps,deps))pending.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};});},
  apiRequest:async(path,options={})=>{requests.push({path,options});return {status:'ready',duration,channels:channels.map(name=>({name,url:'/audio/'+name}))};},
  fetch:async(url,options)=>{fetches.push({url,options});return {ok:true,arrayBuffer:async()=>new ArrayBuffer(8)};},
  setTimeout(fn){const id=++serial;timeouts.set(id,fn);return id;},clearTimeout:id=>timeouts.delete(id),setInterval(fn){const id=++serial;intervals.set(id,fn);return id;},clearInterval:id=>intervals.delete(id),
 };
 const hook=vm.runInNewContext(source+';useStemPlayer',sandbox);let value;
 const render=()=>{cursor=0;dirty=false;value=hook(props);const todo=pending;pending=[];todo.forEach(fn=>fn());};
 const settle=async()=>{for(let n=0;n<30;n++){await new Promise(resolve=>setImmediate(resolve));if(dirty)render();}};
 render();
 return {props,context,element,original,requests,fetches,intervals,timeouts,get value(){return value;},get states(){return states;},render,settle,unmount(){effects.forEach(e=>e?.cleanup?.());}};
}
test('ordinary playback does not poll, separate or decode hidden mixer channels',async()=>{
 let decoded=0;const h=harness({decode:async()=>{decoded++;return {duration:10};}});await h.settle();
 assert.equal(h.requests.length,0);assert.equal(h.fetches.length,0);assert.equal(decoded,0);assert.equal(h.intervals.size,0);assert.equal(h.timeouts.size,0);h.unmount();
});
test('visible mixer meters write both ladders without scheduling React state updates; closing releases work',async()=>{
 const h=harness({active:true});await h.settle();assert.equal(h.value.mode,true);assert.equal(h.fetches.length,4);assert.equal(h.intervals.size,1);assert.equal(h.timeouts.size,0);
 let writes=0;h.value.levelRefs.current.vocals=[{style:{setProperty(){writes++;}}},{style:{setProperty(){writes++;}}}];
 const before=h.states;for(const tick of h.intervals.values())for(let i=0;i<20;i++)tick();assert.equal(writes,40);assert.equal(h.states,before);
 h.props.active=false;h.render();await h.settle();assert.equal(h.value.mode,false);assert.equal(h.intervals.size,0);assert.equal(h.timeouts.size,0);assert.ok(h.fetches.every(r=>r.options.signal.aborted));h.unmount();
});
test('closing a mixer during decode aborts downloads and never loads the remaining channels',async()=>{
 let finish;const h=harness({active:true,decode:()=>new Promise(resolve=>{finish=resolve;})});await h.settle();assert.equal(h.fetches.length,1);
 h.props.active=false;h.render();await h.settle();assert.equal(h.fetches[0].options.signal.aborted,true);
 finish({duration:10,length:441000,numberOfChannels:2});await h.settle();assert.equal(h.fetches.length,1);assert.equal(h.value.mode,false);assert.equal(h.intervals.size,0);h.unmount();
});
test('reopening and switching tracks creates one new engine and cancels the old one',async()=>{
 const h=harness({active:true});await h.settle();const first=h.fetches[0].options.signal;
 h.props.track={id:'two',audioUrl:'two.mp3'};h.render();await h.settle();assert.equal(first.aborted,true);assert.equal(h.value.mode,true);assert.equal(h.intervals.size,1);assert.equal(h.fetches.length,8);
 h.props.active=false;h.render();await h.settle();h.props.active=true;h.render();await h.settle();assert.equal(h.value.mode,true);assert.equal(h.intervals.size,1);h.unmount();assert.equal(h.intervals.size,0);
});

test('long recordings retain original playback without allocating full-length stem buffers',async()=>{
 const h=harness({active:true,duration:3600});await h.settle();assert.equal(h.fetches.length,0);assert.equal(h.value.mode,false);assert.match(h.value.notice,/memory limit/);assert.equal(h.intervals.size,0);h.unmount();
});
