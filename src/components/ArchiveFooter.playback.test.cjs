const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');

async function harness(){
 const {retainArchiveSource}=await import('../lib/archivePlaybackSource.js');
 const slots=[],effects=[],timers=new Map();let cursor=0,pending=[],dirty=false,value,serial=0,catalogCount=0,playCalls=0,pauseCalls=0;
 const url=signature=>`https://media.example/khalil-media/private/${'a'.repeat(64)}.mp3?expires=9999999999&signature=${signature}`;
 const catalog=()=>({songs:[{id:'one',audioUrl:url(++catalogCount)},{id:'two',audioUrl:'two.mp3'}]});
 const element={paused:true,currentTime:0,duration:300,readyState:4,volume:1,play(){playCalls++;this.paused=false;return Promise.resolve();},pause(){pauseCalls++;this.paused=true;}};
 const node={current:null},graph={current:{}};
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const window=new EventTarget();window.matchMedia=()=>({addEventListener(){},removeEventListener(){}});window.location={pathname:'/music'};
 const source=fs.readFileSync(__dirname+'/ArchiveFooter.jsx','utf8');const start=source.indexOf('function ArchiveMusicPlayer()');const end=source.indexOf('\n  return <>',start);
 const program=source.slice(start,end)+'\n return {remote:remoteControl.current,archive:archiveHandler.current,url:currentUrl,track:current,ended:handleEnded,equalizer,autoEqualizer,playing};\n} ; ArchiveMusicPlayer';
 const sandbox={window,Event,CustomEvent,AbortController,console,performance:{now:()=>0},retainArchiveSource,
  isMixerAvailable:()=>true,MIXER_PHONE_MEDIA:'',readArchiveMixerState:()=>true,publishArchiveMixerState(){},ARCHIVE_MIXER_STATE:'mixer',ARCHIVE_PLAYER_COMMAND:'command',publishArchivePlayerState(){},
  localStorage:{getItem:()=>null,setItem(){}},document:{documentElement:{classList:{remove(){}}}},flatEqualizer:()=>({bass:0}),equalizerGain:v=>v,EQUALIZER_BANDS:[{key:'bass'}],
  usePartyLighting:()=>({unlock(){},setEqualizerBand(){},channelMeter:node,audioGraph:graph,rememberEqualizer(){}}),useStemPlayer:()=>({}),useMicChannel:()=>({}),useAutoEqualizer(){},
  preparePerformer:async()=>true,fetchArchivePlaybackCatalog:async()=>catalog(),apiRequest:async()=>({items:catalog().songs,enabled:true}),mediaScratch(){},
  setTimeout(fn){const id=++serial;timers.set(id,fn);return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:fn=>{fn(10000);return ++serial;},cancelAnimationFrame(){},
  useRef(initial){const i=cursor++;return slots[i]||=({current:initial});},
  useState(initial){const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],next=>{const v=typeof next==='function'?next(slots[i]):next;if(!Object.is(v,slots[i])){slots[i]=v;dirty=true;}}];},
  useEffect(fn,deps){const i=cursor++;if(!effects[i]||!same(effects[i].deps,deps))pending.push(()=>{effects[i]?.cleanup?.();effects[i]={deps,cleanup:fn()};});},
 };
 const component=vm.runInNewContext(program,sandbox);
 const render=()=>{cursor=0;dirty=false;value=component();slots[2].current=element; // audio ref follows the mixer state and its effect
  if(element.src!==value.url){element.src=value.url;element.currentTime=0;}
  const todo=pending;pending=[];todo.forEach(fn=>fn());};
 const settle=async()=>{for(let i=0;i<12;i++){await new Promise(resolve=>setImmediate(resolve));if(dirty)render();}};
 render();await settle();
 return {element,get value(){return value;},render,settle,get playCalls(){return playCalls;},get pauseCalls(){return pauseCalls;},
  refresh:async()=>{const [id,fn]=timers.entries().next().value;timers.delete(id);await fn();await settle();},
  unmount:()=>effects.forEach(e=>e?.cleanup?.())};
}

test('a catalog credential refresh preserves playback position and never pauses or reloads the song',async()=>{
 const h=await harness();h.value.remote({detail:{type:'deck-toggle'}});await h.settle();h.element.currentTime=127;
 const initial=h.value.url,plays=h.playCalls,pauses=h.pauseCalls;
 await h.refresh();assert.equal(h.value.url,initial);assert.equal(h.element.currentTime,127);assert.equal(h.playCalls,plays);assert.equal(h.pauseCalls,pauses);h.unmount();
});
test('EQ and volume controls do not reset transport, and reopening the current song keeps its position',async()=>{
 const h=await harness();h.value.remote({detail:{type:'deck-toggle'}});await h.settle();h.element.currentTime=83;
 const plays=h.playCalls,pauses=h.pauseCalls;
 for(const detail of [{type:'equalizer',value:{band:'bass',gain:-3}},{type:'equalizer-auto',value:true},{type:'volume',value:.6}]){h.value.remote({detail});await h.settle();assert.equal(h.element.currentTime,83);}
 await h.value.archive({detail:{id:'one',ids:['one','two']}});await h.settle();assert.equal(h.element.currentTime,83);assert.equal(h.playCalls,plays);assert.equal(h.pauseCalls,pauses);h.unmount();
});
test('while Auto DJ owns the transport, Deck 1 ending cannot start the playlist over it',async()=>{
 const h=await harness();h.value.remote({detail:{type:'autodj-transport',value:true}});h.element.currentTime=300;h.value.ended();await h.settle();assert.equal(h.value.track.id,'one');assert.equal(h.element.currentTime,300);
 h.value.remote({detail:{type:'autodj-transport',value:false}});h.value.ended();await h.settle();assert.equal(h.value.track.id,'two');h.unmount();
});
