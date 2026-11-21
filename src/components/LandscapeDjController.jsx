import {Btn,Knob,Fader,Ladder,T,clamp,rad,toSvg,usePlayer} from './DjControllerControls';
import {displayImageUrl} from '../lib/displayImage';
import {fetchArchivePlaybackCatalog,fetchMusicArchiveCatalog} from '../lib/musicArchiveCatalog';
import {fetchDjWorkTypes} from '../lib/musicOntology';
import {djWorkTypeText} from '../lib/djWorkTypeText';
import {createDjChannelStrip} from '../lib/djChannelStrip';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {archivePlayerCommand} from '../lib/archivePlayerBridge';
import {EQUALIZER_BANDS} from '../lib/audioEqualizer';
import {recordingBeatGrid} from '../lib/recordingBeatGrid';
import {mediaScratch} from '../lib/mediaScratch';
import {apiRequest} from '../lib/api';
import {createAiDjAutopilot} from '../lib/aiDjAutopilot';
import {localDjPlan,safeDjPlan} from '../lib/aiDjPlanner';
import {StemChannelControls} from './StemChannels';
import './ddjController.css';

// A 4-channel performance DJ controller drawn from a reference photo. Coordinates are in photo-derived units (1047 x 495).
const W=1047,H=495,DECK2=680,LABEL_H=0;// LABEL_H: room under the controller for the one-line model name
const COLS=[{n:3,x:447},{n:1,x:498},{n:2,x:549.5},{n:4,x:599.5}];
const STEM_OF={1:'vocals',2:'drums',3:'bass',4:'other'};
const STEM_NAME={vocals:'VOCALS',drums:'DRUMS',bass:'BASS',other:'MUSIC'};
const PAD_MODES=['HOT CUE','BEAT LOOP','BEAT JUMP','KEY SHIFT'];

function Deck({dx,n,player,command=archivePlayerCommand,art,switchLayer,mediaTime,readout=true}){
  const dur=player.duration||0,pos=player.position||0,ready=Boolean(player.track)&&dur>0;
  const transportReady=Boolean(player.track)&&player.enabled!==false,progress=ready?clamp(pos/dur,0,1):0,playing=transportReady&&player.playing;
  const scrub=useRef(null);
  const rate=transportReady?clamp(player.playbackRate??1,.5,1.5):1,tempo=rate-.5;
  const setTempo=value=>command('rate',Math.round((value+.5)*100)/100);
  const resetTempo=()=>{const el=mediaTime();if(el)el.preservesPitch=true;command('rate',1);};
  const C={x:189,y:194},DIM=36;
  const seek=t=>command('seek',clamp(t,0,dur));
  const [mode,setMode]=useState(0),[shift,setShift]=useState(false);
  const [cues,setCues]=useState({}),[loop,setLoop]=useState(null),[tapBpm,setTapBpm]=useState(0);
  const lastTap=useRef(0),clock=useRef(null);
  const bpm=tapBpm||Number(player.track?.sound?.bpm||player.track?.bpm)||recordingBeatGrid({trackId:player.track?.id,audioUrl:player.track?.audioUrl,time:0})?.bpm;
  const beat=bpm?60/bpm:null;
  const now=()=>mediaTime()?.currentTime??pos;
  clock.current={now,seek};
  useEffect(()=>{
    if(!playing||!loop?.end)return;
    let frame;
    const tick=()=>{
      if(clock.current.now()>=loop.end)clock.current.seek(loop.start);
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return ()=>cancelAnimationFrame(frame);
  },[loop,playing]);
  const tap=()=>{
    const stamp=performance.now(),delta=stamp-lastTap.current;
    lastTap.current=stamp;
    if(delta>=200&&delta<=2000)setTapBpm(Math.round(60000/delta));
  };
  const startLoop=beats=>{
    const start=now(),end=Math.min(dur,start+beat*beats);
    if(end>start)setLoop({start,end});
  };
  const jump=[-16,-8,-4,-1,1,4,8,16],lengths=[.25,.5,1,2,4,8,16,32],keys=[-7,-5,-3,-1,0,2,4,7];
  const pad=i=>{
    if(mode===0){
      if(shift||cues[i]==null)setCues({...cues,[i]:shift?undefined:now()});
      else seek(cues[i]);
    }else if(mode===1){startLoop(lengths[i]);}
    else if(mode===2){seek(now()+jump[i]*beat);}
    else{
      const element=mediaTime();
      if(element)element.preservesPitch=false;
      command('rate',2**(keys[i]/12));
    }
  };
  const browse=()=>window.dispatchEvent(new CustomEvent('echo:ddj-pick',{detail:{deck:n}}));
  const ang=e=>{const p=toSvg(e,e.currentTarget);return Math.atan2(p.y-C.y,p.x-C.x-dx)*180/Math.PI;};
  return <g transform={`translate(${dx} 0)`} className={`deck${transportReady?' is-real':''}`}>
    <g className="deck-top">
      <Btn x={43} y={24} w={20} round label="" onClick={ready?()=>setLoop({start:now()}):undefined} lit={Boolean(loop)} ariaLabel="Set loop in"/><T x={43} y={41} s={3.8} f="#b3bbbf">LOOP IN</T>
      <Btn x={80} y={24} w={20} round label="" onClick={ready&&loop?()=>{if(now()>loop.start)setLoop({...loop,end:now()});}:undefined} lit={Boolean(loop?.end)} ariaLabel="Set loop out"/><T x={80} y={41} s={3.8} f="#b3bbbf">LOOP OUT</T>
      <Btn x={104} y={20} w={48} h={12} onClick={ready&&(loop||beat)?()=>loop?setLoop(null):startLoop(4):undefined} label="4 BEAT LOOP/EXIT" s={3.2}/><T x={128} y={40} s={3.6} f="#b3bbbf" max={46}>ACTIVE LOOP</T>
      <Btn x={248} y={20} w={38} h={13} label="TAP BPM" onClick={tap}/>
      <Btn x={332} y={25} w={31} round label="LOAD" ariaLabel={'Load deck '+n} onClick={browse}/>
      <Btn x={41} y={100} w={18} round label={String(n)} onClick={switchLayer} s={3.6} ariaLabel="Deck select"/><T x={41} y={84} s={3.4} f="#b3bbbf" max={40}>DECK SELECT</T>
    </g>
    <g className="jog">
      <circle cx={C.x} cy={C.y} r="150" fill="#050606" stroke="#2a2d2f" strokeWidth="1.2"/><circle cx={C.x} cy={C.y} r="147" fill="none" stroke="#0e1011" strokeWidth="5"/>
      {Array.from({length:DIM},(_,i)=>{const a=rad(i*360/DIM-90);const on=progress>0&&i/DIM<=progress;return <circle key={i} className={`dimple${on?' on':''}`} cx={C.x+Math.cos(a)*136} cy={C.y+Math.sin(a)*136} r="7.4"/>;})}
      <circle cx={C.x} cy={C.y} r="123" fill="url(#platter)" stroke="#000" strokeWidth="1.4"/>
      <g className="platter" style={{animationPlayState:playing?'running':'paused'}}><circle cx={C.x} cy={C.y} r="123" fill="transparent"/><line x1={C.x} y1={C.y-120} x2={C.x} y2={C.y-107} stroke="#2b2f31" strokeWidth="1.4"/>
        <circle cx={C.x} cy={C.y} r="50" fill="#3d4143" stroke="#1b1e1f" strokeWidth="2"/><circle cx={C.x} cy={C.y} r="47" fill="none" stroke="#505558" strokeWidth=".6"/>
        <path d={`M${C.x-36} ${C.y-27} A45 45 0 0 1 ${C.x+36} ${C.y-27}`} fill="none" stroke="#2a2d2f" strokeWidth="2.4"/><path d={`M${C.x-36} ${C.y+27} A45 45 0 0 0 ${C.x+36} ${C.y+27}`} fill="none" stroke="#2a2d2f" strokeWidth="2.4"/></g>
      <circle cx={C.x} cy={C.y} r="44" fill="#10191e" stroke="#63747d"/>
      {readout&&<><T x={C.x} y={C.y-18} s={6} f="#91d5f7">DECK {n}</T>
        <T x={C.x} y={C.y+3} s={12} f="#f1f6f7">{Math.floor(pos/60)}:{String(Math.floor(pos%60)).padStart(2,'0')}</T>
        <T x={C.x} y={C.y+21} s={5.5} f="#a4c8ba">{bpm?Math.round(bpm*rate)+' BPM':'TAP BPM'}</T></>}
      <circle cx={C.x} cy={C.y} r="150" fill="transparent" className="jog-hit" tabIndex={ready?0:-1} role="slider" aria-label="Jog wheel: drag to scratch and scrub" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(pos)}
        onKeyDown={e=>{if(ready&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();seek(pos+(e.key==='ArrowRight'?5:-5));}}}
        onPointerDown={e=>{if(!ready)return;e.currentTarget.setPointerCapture(e.pointerId);scrub.current={a:ang(e),t:pos,at:performance.now()};if(art)art.current.held=true;command('scratch',{phase:'start'});}}
        onPointerMove={e=>{const s=scrub.current;if(!s)return;const a=ang(e);let d=a-s.a;if(d>180)d-=360;if(d<-180)d+=360;const now=performance.now(),step=d/360*1.8;if(art)art.current.angle+=d;s.a=a;s.t=clamp(s.t+step,0,dur);command('scratch',{phase:'move',pos:s.t,vel:step/Math.max(.008,(now-s.at)/1000)});s.at=now;}}
        onPointerUp={()=>{if(scrub.current)command('scratch',{phase:'end'});if(art)art.current.held=false;scrub.current=null;}} onPointerCancel={()=>{if(scrub.current)command('scratch',{phase:'end'});if(art)art.current.held=false;scrub.current=null;}}/>
      <T x={98} y={326} s={5} f="#c5cacd">REV</T><T x={280} y={326} s={5} f="#c5cacd">FWD</T>
      <path d="M98 331 Q108 343 132 348" fill="none" stroke="#d6dbde" strokeWidth="1.1"/><path d="M280 331 Q270 343 246 348" fill="none" stroke="#d6dbde" strokeWidth="1.1"/>
    </g>
    <g className="deck-left"><Btn x={22} y={262} w={15} h={6} label="SHIFT" lit={shift} onClick={()=>setShift(!shift)} s={3}/><T x={42} y={279} s={3.2} f="#b3bbbf" max={64}>SHIFT + PAD · CLEAR</T>
      <T x={50} y={313} s={4} f="#c5cacd">SEARCH</T><Btn x={34} y={328} w={16} round onClick={ready?()=>seek(now()-5):undefined} label="◀" ariaLabel="Search reverse"/><Btn x={65} y={328} w={16} round onClick={ready?()=>seek(now()+5):undefined} label="▶" ariaLabel="Search forward"/>
      <g className={`ring-btn${transportReady?' is-live':''}`} role={transportReady?'button':undefined} tabIndex={player.track?0:-1} transform="translate(0 -4)" aria-label="Cue: stop and return to the start" onClick={()=>player.track&&command('stop')} onKeyDown={e=>{if((e.key==='Enter'||e.key===' ')){e.preventDefault();command('stop');}}}>
        <circle cx="49.5" cy="379" r="27" fill="#0c0d0e" stroke="#5c6063" strokeWidth="3"/><circle cx="49.5" cy="379" r="21" fill="none" stroke="#1d2022" strokeWidth="1"/><path d="M33 372 L66 386 M66 372 L33 386" stroke="#202426" strokeWidth="4"/><T x={49.5} y={381} s={7} f="#f1f3f4" w={800}>CUE</T></g>
      <g className={`ring-btn${transportReady?' is-live':''}${playing?' is-lit':''}`} role={transportReady?'button':undefined} tabIndex={transportReady?0:-1} aria-label={playing?'Pause':'Play'} aria-pressed={transportReady?Boolean(playing):undefined} onClick={()=>transportReady&&command('toggle')} onKeyDown={e=>{if(transportReady&&(e.key==='Enter'||e.key===' ')){e.preventDefault();command('toggle');}}}>
        <circle cx="47" cy="440" r="27" fill="#0c0d0e" stroke="#5c6063" strokeWidth="3"/><circle cx="47" cy="440" r="21" fill="none" stroke="#1d2022" strokeWidth="1"/>
        {playing?<g fill="#f1f3f4"><rect x="40.5" y="432" width="5" height="16"/><rect x="49.5" y="432" width="5" height="16"/></g>:<path d="M41 431 L57 440 L41 449Z" fill="#f1f3f4"/>}</g>
      <T x={47} y={410.5} s={4} f="#c5cacd" max={52}>PLAY/PAUSE</T></g>
    <g className="deck-pads">
      <T x={159} y={354} s={4.4} f="#c5cacd">PAD MODE</T><line x1="96" y1="352.5" x2="128" y2="352.5" stroke="#6b7276" strokeWidth=".7"/><line x1="190" y1="352.5" x2="223" y2="352.5" stroke="#6b7276" strokeWidth=".7"/>
      {PAD_MODES.map((label,i)=><Btn key={label} x={95.5+i*49} y={358} w={42} h={12} label={label} lit={i===mode} onClick={()=>setMode(i)}/>)}
      {Array.from({length:8},(_,i)=>{
        const x=95.5+i%4*49,y=386.5+Math.floor(i/4)*46.5;
        const live=ready&&((mode!==1&&mode!==2)||Boolean(beat));
        const label=[String.fromCharCode(65+i),lengths[i],jump[i],keys[i]][mode];
        return <g key={i}><rect className={`pad${mode===0&&cues[i]!=null?' on':''}${live?' is-live':''}`} x={x} y={y} width="42" height="40.5" rx="3" role="button" aria-disabled={!live} tabIndex={live?0:-1} aria-label={PAD_MODES[mode]+' '+label} onClick={()=>live&&pad(i)} onKeyDown={e=>{if(live&&(e.key==='Enter'||e.key===' ')){e.preventDefault();pad(i);}}}/><T x={x+21} y={y+23} s={6} f="#172629">{label}</T></g>;
      })}
    </g>
    <g className="deck-tempo">      <Btn x={294.5} y={422} w={20} h={25} label="" ariaLabel="Reset playback speed" onClick={transportReady?resetTempo:undefined}><T x={304.5} y={432} s={3.2} max={17}>SPEED</T><T x={304.5} y={440} s={3.2} max={17}>RESET</T></Btn>
      <rect x="324.5" y="293" width="30" height="177" rx="3" fill="#0a0b0c" stroke="#2a2d2f"/><g className="ribs">{Array.from({length:30},(_,i)=><g key={i}><rect x="327" y={297+i*5.6} width="11" height="2.8"/><rect x="341" y={297+i*5.6} width="11" height="2.8"/></g>)}</g>
      <Fader x={339.5} y={298} len={150} value={tempo} onChange={transportReady?setTempo:undefined} onReset={resetTempo} ariaLabel={`Deck ${n} playback speed`} ariaValueText={`${rate.toFixed(2)} times normal speed`} capW={29} capH={14}/>
      <T x={339.5} y={483} s={5} max={40}>{rate.toFixed(2)}×</T></g>
  </g>;
}

// LOAD opens this drop list: work types first, then that type's collections, then its recordings.
function LoadPicker({library,onPick}){
  const [open,setOpen]=useState(0),[types,setTypes]=useState([]),[collections,setCollections]=useState([]),[type,setType]=useState(''),[collection,setCollection]=useState(null),[kinds,setKinds]=useState({});
  useEffect(()=>{const on=event=>{setOpen(event.detail?.deck||0);setType('');setCollection(null);};window.addEventListener('echo:ddj-pick',on);return()=>window.removeEventListener('echo:ddj-pick',on);},[]);
  useEffect(()=>{if(!open||types.length)return;fetchDjWorkTypes().then(setTypes).catch(()=>{});fetchMusicArchiveCatalog().then(catalog=>{setCollections(catalog.collections||[]);setKinds(Object.fromEntries((catalog.recordings||[]).map(row=>[row.id,row.workType])));}).catch(()=>{});},[open,types.length]);
  if(!open)return null;
  const rows=collection?(collection.recordingIds||[]).map(id=>library.find(song=>song.id===id)).filter(Boolean):[];
  const list=collection?rows.map(song=>({key:song.id,text:song.title,go:()=>{onPick(open,song.id);setOpen(0);}})):type?[...collections.filter(item=>item.workTypeId===type),{id:'__unclassified',title:'Unclassified recordings',recordingIds:library.filter(song=>(kinds[song.id]||song.workType||song.workTypeId)===type&&!collections.some(item=>item.recordingIds?.includes(song.id))).map(song=>song.id)}].map(item=>({key:item.id,text:item.title,go:()=>setCollection(item)})):types.map(work=>({key:work.id,text:djWorkTypeText(work,false).name,go:()=>setType(work.id)}));
  const title=collection?collection.title:type?(types.find(work=>work.id===type)&&djWorkTypeText(types.find(work=>work.id===type),false).name):'Work types';
  return <div className="ddj-picker" role="dialog" aria-label={'Load deck '+open}>
    <header><button type="button" onClick={()=>collection?setCollection(null):type?setType(''):setOpen(0)} aria-label="Back">‹</button><strong>{title}</strong><span>Deck {open}</span></header>
    <ul>{list.map(item=><li key={item.key}><button type="button" onClick={item.go}>{item.text}</button></li>)}{!list.length&&<li className="is-empty">Nothing here yet.</li>}</ul>
  </div>;
}

export default function LandscapeDjController({stems,mic,audioGraph,unlock:unlockAudio}){
  const player=usePlayer(),eq=player.equalizer||{};
  const [library,setLibrary]=useState([]);
  const [notice,setNotice]=useState('');
  const [decks,setDecks]=useState({});
  const [layers,setLayers]=useState([1,2]);
  const [blend,setBlend]=useState(.5);
  const [settings,setSettings]=useState({});
  const [last,setLast]=useState('FLAT');
  const [fxDeck,setFxDeck]=useState(1);
  const [aiState,setAiState]=useState({enabled:false,phase:'off',message:'AI DJ is off.'});
  const media=useRef({}), strips=useRef({}), scratchers=useRef({}),uiClock=useRef({}),loadWaiters=useRef({});
  const playerState=useRef(player),deckState=useRef(decks),libraryState=useRef(library);
  playerState.current=player;deckState.current=decks;libraryState.current=library;
  const dv=(key,fallback=0)=>settings[key]??fallback;
  const sd=key=>value=>setSettings(previous=>({...previous,[key]:value}));
  const headphones=useRef(null), meters=useRef({}), masterLadder=useRef(null);
  const alive=useRef(false);
  const [cueReady,setCueReady]=useState(false);
  const installStrip=graph=>{
    if(!graph?.mixInput||graph.stripA)return;
    graph.stripA=createDjChannelStrip(graph.context,graph.stemInput,graph.mixInput);
    graph.stemInput.disconnect(graph.mixInput);
    graph.stripA.gain.gain.value=Math.cos(blend*Math.PI/2);
  };
  const unlock=()=>{
    unlockAudio();
    installStrip(audioGraph.current);
  };
  const configureCue=async()=>{
    unlock();
    const graph=audioGraph.current;
    if(!graph?.stripA)return;
    try{
      const device=await navigator.mediaDevices.selectAudioOutput();
      if(!alive.current)return;
      if(!headphones.current){
        const bus=graph.context.createMediaStreamDestination(),element=new Audio();
        element.srcObject=bus.stream;
        headphones.current={bus,element};
        for(const strip of [graph.stripA,...Object.values(strips.current)])strip.cue.connect(bus);
      }
      const {element}=headphones.current;
      await element.setSinkId(device.deviceId);
      if(!alive.current)return;
      await element.play();
      setCueReady(true);
      setNotice('');
    }catch(error){if(alive.current&&error.name!=='AbortError')setNotice('Headphone output could not be opened.');}
  };
  const strip=n=>n===1?audioGraph.current?.stripA:strips.current[n];
  const assign=n=>dv('assign'+n,n%2?'A':'B');
  const applyBlend=(n,value,side=assign(n))=>{
    const volume=side==='THRU'?1:side==='A'?Math.cos(value*Math.PI/2):Math.sin(value*Math.PI/2);
    strip(n)?.gain.gain.setTargetAtTime(volume,audioGraph.current.context.currentTime,.012);
  };
  const moveCrossfader=value=>{
    unlock();
    for(const n of [1,2,3,4])applyBlend(n,value);
    setBlend(value);
  };
  useEffect(()=>{
    installStrip(audioGraph.current);
    let active=true;
    alive.current=true;
    const samples=new Float32Array(256);
    const meterLevel=node=>{
      if(!node)return 0;
      node.getFloatTimeDomainData(samples);
      let peak=0;
      for(const sample of samples)peak=Math.max(peak,Math.abs(sample));
      return Math.min(1,peak);
    };
    const interval=setInterval(()=>{
      const graph=audioGraph.current;
      for(const n of [1,2,3,4]){
        meters.current[n]?.style.setProperty('--channel-level',String(meterLevel(n===1?graph?.stripA?.meter:strips.current[n]?.meter)));
      }
      masterLadder.current?.style.setProperty('--channel-level',String(meterLevel(graph?.analyser)));
    },60);
    const elements=Object.values(media.current);
    const pause=()=>elements.forEach(element=>element?.pause());
    fetchArchivePlaybackCatalog().then(({songs})=>{
      if(active)setLibrary(songs.filter(track=>track.audioUrl));
    }).catch(()=>{if(active)setNotice('Unable to load the recording library.');});
    window.addEventListener('echo:live-audio',pause);
    return ()=>{
      active=false;
      alive.current=false;
      clearInterval(interval);
      if(headphones.current){
        const {element,bus}=headphones.current;
        element.pause();
        element.srcObject=null;
        audioGraph.current?.stripA?.cue.disconnect(bus);
        bus.stream.getTracks().forEach(track=>track.stop());
        headphones.current=null;
      }
      window.removeEventListener('echo:live-audio',pause);
      pause();
      for(const channel of Object.values(strips.current))channel.disconnect();
      strips.current={};
      const graph=audioGraph.current;
      if(graph?.stripA){
        graph.stemInput.connect(graph.mixInput);
        graph.stripA.disconnect();
        delete graph.stripA;
      }
    };
  },[audioGraph]);
  const changeStrip=(n,name)=>value=>{
    unlock();
    strip(n)?.set(name,value);
    sd(name+n)(value);
  };
  const command=(n,type,value)=>{
    if(n===1){
      if(type==='toggle'){unlock();applyBlend(1,blend);archivePlayerCommand('deck-toggle');return;}
      archivePlayerCommand(type,value);
      return;
    }
    const element=media.current[n];
    if(!element||!decks[n]?.track)return;
    if(type==='toggle'){
      if(!element.paused){element.pause();return;}
      unlock();
      const graph=audioGraph.current;
      if(!graph?.mixInput){setNotice('Audio mixing is unavailable in this browser.');return;}
      if(!strips.current[n]){
        const source=graph.context.createMediaElementSource(element);
        strips.current[n]=createDjChannelStrip(graph.context,source,graph.mixInput);
        if(headphones.current)strip(n).cue.connect(headphones.current.bus);
        for(const [name,initial] of Object.entries({hi:0,mid:0,low:0,trim:0,color:0,level:1,echo:0,delay:.375,feedback:.3,cue:0}))strip(n).set(name,dv(name+n,initial));
      }
      for(const channel of [1,2,3,4])applyBlend(channel,blend);
      element.play().catch(error=>{if(error.name!=='AbortError')setNotice('Deck '+n+' could not play this recording.');});
    }else if(type==='rate'){element.playbackRate=value;}
    else if(type==='stop'){element.pause();element.currentTime=0;}
    else if(type==='seek'){element.currentTime=value;}
    else if(type==='scratch'){
      const state=scratchers.current[n]||(scratchers.current[n]={active:false,resume:false,target:0,timer:0});
      mediaScratch(element,state,value,{duration:element.duration,normalRate:decks[n]?.playbackRate||1,resume:!element.paused,onPosition:position=>setDecks(previous=>({...previous,[n]:{...previous[n],position}}))});
    }
  };
  const sync=(n,el,force=false)=>{
    const now=performance.now();
    if(!force&&now-(uiClock.current[n]||0)<125)return;
    uiClock.current[n]=now;
    const state={playing:!el.paused,position:el.currentTime,duration:Number.isFinite(el.duration)?el.duration:0,playbackRate:el.playbackRate};
    setDecks(previous=>({...previous,[n]:{...previous[n],...state}}));
  };
  useEffect(()=>{for(const el of Object.values(media.current))if(el)el.volume=player.volume??.75;},[player.volume]);
  const loadDeck=(n,id)=>{
    const track=library.find(item=>item.id===id);
    if(!track)return;
    setNotice('');
    if(n===1){
      window.dispatchEvent(new CustomEvent('echo:archive-play',{detail:{id,ids:library.map(item=>item.id),inline:true,autoplay:false}}));
    }else{
      media.current[n].pause();
      setDecks(previous=>({...previous,[n]:{track,playing:false,position:0,duration:0,playbackRate:1}}));
    }
  };
  const adapter=useRef({});
  const autopilot=useRef(null);
  adapter.current={
    status:state=>{setAiState(state);if(state.target){const pair=[state.active,state.target];setLayers([pair.find(n=>n%2)??3,pair.find(n=>n%2===0)??2]);}},
    library:()=>libraryState.current,
    deck:n=>{
      const element=n===1?audioGraph.current?.element:media.current[n],state=n===1?playerState.current:deckState.current[n];
      return state?.track&&element?{track:state.track,position:()=>element.currentTime||0,duration:()=>Number.isFinite(element.duration)?element.duration:state.duration||0,rate:()=>element.playbackRate||1}:null;
    },
    async plan(state){
      let token='';try{token=localStorage.getItem('khalil-auth-token')||'';}catch{/* Local fallback remains available. */}
      if(!token)throw Error('AI sign-in unavailable');
      const result=await apiRequest('/admin/ai-dj/plan',{method:'POST',token,body:state,timeoutMs:14000});
      return safeDjPlan(result.plan,{current:state.current,candidates:state.candidates,played:state.played});
    },
    fallback:state=>localDjPlan(state),
    load:(n,track,cue=0)=>new Promise(resolve=>{
      const element=media.current[n];
      if(deckState.current[n]?.track?.id===track.id&&element?.readyState>=1){element.currentTime=Math.min(cue,Math.max(0,(element.duration||0)-.1));resolve(true);return;}
      const previous=loadWaiters.current[n];if(previous){clearTimeout(previous.timer);previous.resolve(false);}
      const finish=ok=>{const waiter=loadWaiters.current[n];if(!waiter)return;clearTimeout(waiter.timer);delete loadWaiters.current[n];if(ok&&media.current[n])media.current[n].currentTime=Math.min(cue,Math.max(0,(media.current[n].duration||0)-.1));resolve(ok);};
      loadWaiters.current[n]={resolve:finish,timer:setTimeout(()=>finish(false),15000)};
      loadDeck(n,track.id);
    }),
    async play(n){const element=media.current[n];if(!element)return false;if(element.paused)command(n,'toggle');await new Promise(resolve=>setTimeout(resolve,80));return !element.paused;},
    pause:n=>{if(n===1)archivePlayerCommand('pause');else media.current[n]?.pause();},
    rate:(n,value)=>command(n,'rate',value),
    bass:(n,value)=>strip(n)?.set('low',value),
    crossfader:value=>moveCrossfader(value),
  };
  if(!autopilot.current)autopilot.current=createAiDjAutopilot(new Proxy({}, {get:(_target,key)=>(...args)=>adapter.current[key](...args)}));
  const toggleAi=()=>{
    if(autopilot.current.enabled){autopilot.current.stop();return;}
    if(!player.track){setNotice('Load a recording on Deck 1 before starting AI DJ.');return;}
    unlock();moveCrossfader(0);
    if(!player.playing)archivePlayerCommand('toggle');
    autopilot.current.start(1);
  };
  useEffect(()=>()=>{
    autopilot.current?.stop();
    for(const waiter of Object.values(loadWaiters.current)){clearTimeout(waiter.timer);waiter.resolve(false);}
  },[]);
  const setBand=(band,label,v)=>{archivePlayerCommand('equalizer',{band,gain:v});setLast(`${label} ${v>0?'+':''}${v} dB`);};
  const stemOn=Boolean(stems?.mode);
  const micLevel=mic?.micMeter;
  // The status line (separating progress, notices) lives in the mixer face's footer when that footer exists.
  const footerStatus=document.getElementById('echo-channels-overlay-status')||document.getElementById('home-archive-mixer-status');
  const status=<div className="ddj-msg" role="status">{stemOn?'Stems on: faders, CUE (solo) and the A·THRU·B switch (mute) control Vocals, Drums, Bass and Music.':stems?<StemChannelControls stems={stems}/>:''}{mic?.notice?` ${mic.notice}`:''}</div>;
  // The recording's artwork turns on the left record. It is a plain HTML image over the drawing (turned by the GPU, with a hole for the spindle), so the large SVG is never repainted while it spins.
  const jogArt=player.track?.coverImage?displayImageUrl(player.track.coverImage):'';
  const TH=H+LABEL_H,JC={x:189,y:194};
  const jogBpm=Number(player.track?.sound?.bpm||player.track?.bpm)||recordingBeatGrid({trackId:player.track?.id,audioUrl:player.track?.audioUrl,time:0})?.bpm;
  const jogRate=Number(player.playbackRate)||1;
  const jogPosition=Number(player.position)||0;
  const jogTime=`${Math.floor(jogPosition/60)}:${String(Math.floor(jogPosition%60)).padStart(2,'0')}`;
  // Artwork rotation, in degrees. One turn = 1.8 s of music at 1x (the same mapping the jog wheel uses to scrub), so the artwork turns at the music's speed while playing,
  // and while the record is held it follows the hand exactly (same direction, same speed) because the jog wheel adds its own angle changes here.
  const art=useRef({angle:0,held:false,el:null,playing:false,rate:1});
  art.current.playing=Boolean(player.playing);art.current.rate=Number(player.playbackRate)||1;
  useEffect(()=>{
    let frame=0,last=performance.now();
    const tick=now=>{
      const state=art.current,dt=Math.max(0,Math.min(.1,(now-last)/1000));last=now;
      if(!state.held&&state.playing)state.angle+=360/1.8*state.rate*dt;
      if(state.el)state.el.style.transform=`translateZ(0) rotate(${state.angle}deg)`;
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
  },[]);
  const view=[0,0,W,TH];
  return <div className="ddj-host ddj-performance" dir="ltr">{[2,3,4].map(n=><audio key={n} ref={el=>{media.current[n]=el;}} crossOrigin="anonymous" preload="auto" src={decks[n]?.track?.audioUrl} onLoadedMetadata={e=>{sync(n,e.currentTarget,true);loadWaiters.current[n]?.resolve(true);}} onTimeUpdate={e=>sync(n,e.currentTarget)} onRateChange={e=>sync(n,e.currentTarget,true)} onPlay={e=>sync(n,e.currentTarget,true)} onPause={e=>sync(n,e.currentTarget,true)} onEnded={e=>sync(n,e.currentTarget,true)} onError={()=>{loadWaiters.current[n]?.resolve(false);setNotice('Deck '+n+' could not load this recording.');}}/>)}
    <div className="ddj-stage"><div className="ddj-frame" style={{aspectRatio:`${view[2]} / ${view[3]}`,'--ratio':view[2]/view[3]}}><svg className="ddj-svg" viewBox={view.join(" ")} role="group" aria-label="Performance DJ controller" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#141618"/><stop offset="1" stopColor="#0a0b0c"/></linearGradient>
      <radialGradient id="knobBody" cx=".4" cy=".32"><stop offset="0" stopColor="#4d5357"/><stop offset=".6" stopColor="#15181a"/><stop offset="1" stopColor="#050606"/></radialGradient>
      <radialGradient id="knobTop" cx=".4" cy=".3"><stop offset="0" stopColor="#262b2e"/><stop offset="1" stopColor="#0b0d0e"/></radialGradient>
      <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#62696d"/><stop offset=".45" stopColor="#2b3033"/><stop offset="1" stopColor="#15181a"/></linearGradient>
      <radialGradient id="platter" cx=".5" cy=".4"><stop offset="0" stopColor="#0d0f10"/><stop offset="1" stopColor="#030404"/></radialGradient>
    </defs>
    <rect x="0" y="0" width={W} height={H} rx="9" fill="url(#body)" stroke="#2c3033" strokeWidth="1.4"/>
    <rect x="370" y="3" width="326" height={H-6} fill="#0b0c0d" stroke="#2a2d2f"/>
    {layers.map(n=><g key={n}><Deck key={(n===1?player:decks[n])?.track?.id||n} mediaTime={()=>n===1?audioGraph.current?.element:media.current[n]} dx={n%2?0:DECK2} n={n} player={n===1?player:(decks[n]||{})} command={(type,value)=>command(n,type,value)} art={n===1?art:null} readout={!(n===1&&jogArt)} switchLayer={()=>setLayers(previous=>previous.map(value=>value===n?(n>2?n-2:n+2):value))}/></g>)}
    {/* mic column */}
    <g className="mixer">
      <rect x="373" y="9" width="44" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={395} y={16} s={5.2} f="#e8ecee">MIC</T>{mic?.active&&mic.latency&&<T x={395} y={6.5} s={3.4} f="#7fd6b0" aria-label="Browser audio latency">{(()=>{const total=mic.latency.base==null&&mic.latency.output==null?null:(mic.latency.base||0)+(mic.latency.output||0);return total==null?'LAT n/a':`LAT ${(total*1000).toFixed(1)} ms`;})()}</T>}
      <Btn x={381} y={22} w={30} h={10} label={mic?.active?'ON':'OFF'} lit={mic?.active} onClick={mic&&!mic.pending?(mic.active?mic.stop:mic.enable):undefined} ariaLabel={mic?.active?'Turn microphone off':'Turn microphone on'} s={3.8}/>
      <Knob cx={396} cy={57} r={11} value={mic?.micGain??.75} min={0} max={1} onChange={mic?mic.setMicGain:undefined} label="MIC 1 LEVEL" labelY={38} ariaLabel="Microphone level"/>
      <Btn x={378} y={84} w={34} h={13} label="MONITOR" lit={mic?.monitor} onClick={mic?.active?()=>mic.setMonitor(v=>!v):undefined}/>
      <rect x="373" y="124" width="44" height="12" fill="#252b2f"/><T x={395} y={133}>ECHO FX</T>
      <Btn x={379} y={147} w={33} h={13} label={'CH '+fxDeck} onClick={()=>setFxDeck(fxDeck%4+1)} ariaLabel="Next echo channel"/>
      <Knob cx={396} cy={202} value={dv('delay'+fxDeck,.375)} min={.01} max={2} onChange={changeStrip(fxDeck,'delay')} label="TIME"/>
      <Knob cx={396} cy={258} value={dv('feedback'+fxDeck,.3)} min={0} max={.85} onChange={changeStrip(fxDeck,'feedback')} label="FEEDBACK"/>
      <Knob cx={396} cy={314} value={dv('echo'+fxDeck)} min={0} max={1} onChange={changeStrip(fxDeck,'echo')} label="DEPTH"/>
      {typeof navigator.mediaDevices?.selectAudioOutput==='function'&&<Btn x={375} y={365} w={40} h={16} label="PHONES" lit={cueReady} onClick={configureCue} ariaLabel="Select headphone output"/>}
      <g ref={micLevel} className="mic-ladder"><Ladder x={417.5} y={60} w={3} count={10} h={2.4} gap={1.2}/></g>
      {/* channels */}
      {COLS.map(({n,x})=>{const name=STEM_OF[n],ch=stems?.mix?.[name]||{volume:1,muted:false,solo:false};
        return <g key={n} ref={node=>{meters.current[n]=node;}} className="channel">
          <line x1={x-25.5} y1="22" x2={x-25.5} y2="428" stroke="#25282a" strokeWidth=".8"/>
          <T x={x} y={32} s={4}>CH {n}</T>
          <Knob cx={x} cy={58} r={11.5} value={dv(`trim${n}`)} onChange={changeStrip(n,'trim')} label="TRIM" labelY={44}/>
          <Knob cx={x} cy={95.5} r={11} value={dv(`hi${n}`)} min={-12} max={12} step={1} onChange={changeStrip(n,'hi')} label="HI" labelY={82}/>
          <Knob cx={x} cy={135.5} r={11} value={dv(`mid${n}`)} min={-12} max={12} step={1} onChange={changeStrip(n,'mid')} label="MID" labelY={122}/>
          <Knob cx={x} cy={173} r={11} value={dv(`low${n}`)} min={-12} max={12} step={1} onChange={changeStrip(n,'low')} label="LOW" labelY={160}/>
          <rect x={x-25} y="204" width="50" height="42" fill="#1b1e20"/><T x={x} y={213} s={3.6} f="#b3bbbf">COLOR</T>
          <Knob cx={x} cy={228} r={12.5} value={dv(`color${n}`)} onChange={changeStrip(n,'color')} ariaLabel={`Channel ${n} color filter`} ring={false}/><T x={x-19} y={244} s={3.2} f="#aab3b7">LOW</T><T x={x+19} y={244} s={3.2} f="#aab3b7">HI</T>
          <T x={x} y={263} s={12} f="#f1f3f4" w={700} ls="0">{n}</T>
          <Btn x={x-16} y={270} w={32} h={9} label="CUE" s={3.4} lit={stemOn?ch.solo:Boolean(dv('cue'+n))} onClick={stemOn?()=>stems.change(name,{solo:!ch.solo}):cueReady?()=>changeStrip(n,'cue')(dv('cue'+n)?0:1):undefined} ariaLabel={stemOn?`${STEM_NAME[name]} solo`:`Cue deck ${n} to headphones`}/>
          <T x={x} y={291} s={3.8} f={stemOn?'#dfe5e8':'#9aa3a7'}>{stemOn?STEM_NAME[name]:'DECK '+n}</T>
          <Ladder x={x-24} y={300} w={7} count={12} h={4.6} gap={1.8} levelRef={node=>{if(stemOn&&stems?.levelRefs)(stems.levelRefs.current[name]||=[])[0]=node;}}/><Ladder x={x+17} y={300} w={7} count={12} h={4.6} gap={1.8} levelRef={node=>{if(stemOn&&stems?.levelRefs)(stems.levelRefs.current[name]||=[])[1]=node;}}/>
          {[0,1,2,3,4,5,6,7].map(i=><line key={i} x1={x-12} x2={x+12} y1={302+i*10} y2={302+i*10} stroke="#40464a" strokeWidth=".5"/>)}
          <Fader x={x} y={300} len={78} value={stemOn?ch.volume:dv('level'+n,1)} onChange={stemOn?v=>stems.change(name,{volume:Math.round(v*100)/100}):changeStrip(n,'level')} ariaLabel={`Channel ${n} volume`}/>
          <T x={x-14} y={392} s={3.2}>A</T><T x={x} y={392} s={3.2} max={14}>THRU</T><T x={x+14} y={392} s={3.2}>B</T>
          <Btn x={x-8} y={395} w={16} h={9} label={stemOn?(ch.muted?'M':''):assign(n)} s={4} lit={ch.muted} onClick={stemOn?()=>stems.change(name,{muted:!ch.muted}):()=>{const side={A:'THRU',THRU:'B',B:'A'}[assign(n)];sd('assign'+n)(side);applyBlend(n,blend,side);}} ariaLabel={stemOn?`${STEM_NAME[name]} mute`:`Channel ${n} crossfader assignment`}/>
        </g>;})}
      <T x={535} y={418} s={3.8} f="#b3bbbf">CROSS FADER ASSIGN</T><line x1="450" x2="625" y1="421" y2="421" stroke="#40464a" strokeWidth=".5"/>
      <T x={474} y={457} s={7} f="#e8ecee" w={700} ls="0">❮ A</T><T x={598} y={457} s={7} f="#e8ecee" w={700} ls="0">B ❯</T>
      <T x={535} y={437} s={5} f="#e8ecee" w={800} ls=".14em">ECHO FADER</T>
      <Fader x={498} y={453} len={74} value={blend} onChange={moveCrossfader} onReset={()=>moveCrossfader(.5)} vertical={false} ariaLabel="Crossfader" capW={22} capH={10}/>
      {/* master + equalizer (the 7-band archive equalizer lives where the photo has Beat FX) */}
      <rect x="619" y="9" width="75" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={656.5} y={16} s={5.2} f="#e8ecee">MASTER</T>
      <Knob cx={656.5} cy={49} r={14} value={player.volume??.75} min={0} max={1} onChange={v=>archivePlayerCommand('volume',v)} label="LEVEL" labelY={28} ariaLabel="Master level"/>
      <g ref={masterLadder} className="master-ladder"><Ladder x={652} y={71} w={9} count={12} h={4} gap={2.4}/></g>
      <rect x="619" y="138" width="75" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={656.5} y={145} s={5} f="#e8ecee">EQUALIZER</T>
      <rect x="626.5" y="153" width="60" height="14" rx="1" fill="#14202a" stroke="#2a2d2f"/><T x={656.5} y={163} s={5.2} f="#6fd3ff" w={700}>{last}</T>
      {EQUALIZER_BANDS.map((b,i)=>{const cx=i%2?676.5:636.5,cy=204+Math.floor(i/2)*46;return <Knob key={b.key} cx={cx} cy={cy} r={9} value={eq[b.key]??0} min={-12} max={12} step={1} dots={7} onChange={v=>setBand(b.key,b.label.toUpperCase(),v)} label={b.label.toUpperCase()} labelY={cy+15.5} ariaLabel={`${b.label} equalizer gain`}/>;})}
      <g className="ring-btn is-live" role="button" tabIndex={0} aria-label="Reset equalizer" onClick={()=>{archivePlayerCommand('equalizer-reset');setLast('FLAT');}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();archivePlayerCommand('equalizer-reset');setLast('FLAT');}}}>
        <circle cx="656.5" cy="450.5" r="15" fill="#e9eef1" stroke="#4a5155" strokeWidth="3"/><T x={656.5} y={452} s={4.4} f="#111" w={800}>RESET</T></g>
      <T x={656.5} y={473} s={3.6} f="#aab3b7">EQ FLAT</T>
    </g>
  </svg>
  {layers[0]===1&&jogArt&&<img ref={el=>{art.current.el=el;}} className="ddj-jog-art" src={jogArt} alt="" aria-hidden="true" draggable="false" style={{left:`${(JC.x-49)/view[2]*100}%`,top:`${(JC.y-49)/view[3]*100}%`,width:`${98/view[2]*100}%`,height:`${98/view[3]*100}%`}}/>}
  {layers[0]===1&&jogArt&&<svg className="ddj-jog-readout" viewBox={view.join(' ')} preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <T x={JC.x} y={JC.y-18} s={6} f="#91d5f7">DECK 1</T>
    <T x={JC.x} y={JC.y+3} s={12} f="#f1f6f7">{jogTime}</T>
    <T x={JC.x} y={JC.y+21} s={5.5} f="#a4c8ba">{jogBpm?`${Math.round(jogBpm*jogRate)} BPM`:'TAP BPM'}</T>
  </svg>}
  <LoadPicker library={library} onPick={loadDeck}/>
  <div className="ddj-ai-top"><button type="button" className="ddj-close-mixer" onClick={()=>window.dispatchEvent(new Event('echo:close-mixer'))}>CLOSE MIXER</button><button type="button" className={aiState.enabled?'is-on':''} aria-pressed={aiState.enabled} onClick={toggleAi} title={aiState.message}>{aiState.enabled?'STOP AI DJ':'START AI DJ'}</button>{(notice||player.error)&&<span role="status" className="ddj-ai-note">{notice||player.error}</span>}</div>
  </div></div>
  {footerStatus&&createPortal(status,footerStatus)}</div>;
}
