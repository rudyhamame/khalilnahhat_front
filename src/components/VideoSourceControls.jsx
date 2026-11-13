import {useEffect,useRef,useState} from 'react';
import {Play,Pause,Square,RotateCcw,Repeat,Repeat1,Shuffle,SkipBack,SkipForward,Rewind,FastForward,StepBack,StepForward,Plus,X,Volume2,VolumeX,ChevronUp,ChevronDown,Trash2,Keyboard} from 'lucide-react';
const clock=seconds=>{const total=Math.max(0,Math.floor(Number(seconds)||0)),h=Math.floor(total/3600),m=Math.floor(total%3600/60),s=total%60;return h?`${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`:`${m}:${String(s).padStart(2,'0')}`;};
const REPEAT=['off','all','one'],REPEAT_LABEL={off:'Repeat off',all:'Repeat the whole list',one:'Repeat this video'};
const SPEEDS=[.5,.75,1,1.25,1.5,2],FRAME=1/30;
// Length of a file, read without playing it (for the list).
const readDuration=file=>new Promise(done=>{const probe=document.createElement('video'),url=URL.createObjectURL(file);const finish=value=>{URL.revokeObjectURL(url);probe.removeAttribute('src');done(value);};probe.preload='metadata';probe.onloadedmetadata=()=>finish(Number.isFinite(probe.duration)?probe.duration:0);probe.onerror=()=>finish(0);probe.src=url;setTimeout(()=>finish(0),6000);});
// The video player for a video file used as the live input. The operator chooses the videos; nothing plays until Play is pressed; the list
// plays in series; every control here drives the file's own player, which is what the live publishes (picture and sound).
export default function VideoSourceControls({getElement,loadVideo,onOpen,onCurrentFile,locked=false}){
  const [items,setItems]=useState([]),[index,setIndex]=useState(-1),[repeat,setRepeat]=useState('off'),[shuffle,setShuffle]=useState(false),[series,setSeries]=useState(true);
  const [loop,setLoop]=useState({a:null,b:null}),[remaining,setRemaining]=useState(false),[showKeys,setShowKeys]=useState(false);
  const [state,setState]=useState({time:0,duration:0,playing:false,ended:false,seeking:false,volume:1,muted:false,rate:1,w:0,h:0,buffered:0});
  const element=getElement();
  const latest=useRef({});latest.current={items,index,repeat,shuffle,series,loop,element};
  const played=useRef(new Set()),nextId=useRef(1);
  const select=async(position,{play=false}={})=>{
    const {items:list,element:player}=latest.current,item=list[position];if(!item)return;
    setIndex(position);setLoop({a:null,b:null});played.current.add(item.id);onCurrentFile?.(item.file);
    if(!player)return;
    const loaded=await loadVideo(item.file);
    if(play&&loaded!==false)void getElement()?.play?.();
  };
  const pickNext=()=>{
    const {items:list,index:at,repeat:mode,shuffle:random}=latest.current;
    if(random&&list.length>1){const fresh=list.map((item,position)=>position).filter(position=>position!==at&&!played.current.has(list[position].id));if(fresh.length)return fresh[Math.floor(Math.random()*fresh.length)];if(mode==='all'){played.current.clear();const others=list.map((item,position)=>position).filter(position=>position!==at);return others[Math.floor(Math.random()*others.length)];}return -1;}
    if(at+1<list.length)return at+1;
    return mode==='all'&&list.length?0:-1;
  };
  const add=files=>{
    const chosen=[...files].filter(file=>file.type.startsWith('video/')).map(file=>({id:nextId.current++,file,duration:0}));
    if(!chosen.length)return;
    const first=latest.current.items.length===0;
    setItems(current=>[...current,...chosen]);
    for(const item of chosen)void readDuration(item.file).then(duration=>setItems(current=>current.map(entry=>entry.id===item.id?{...entry,duration}:entry)));
    // The first video chosen opens the preview on it, paused. Later ones just join the list.
    if(first){setIndex(0);played.current.add(chosen[0].id);onCurrentFile?.(chosen[0].file);onOpen(chosen[0].file);}
  };
  useEffect(()=>{
    const read=()=>{const player=getElement();if(!player)return;const end=player.buffered?.length?player.buffered.end(player.buffered.length-1):0;
      setState(current=>({...current,...(current.seeking?{}:{time:player.currentTime||0}),duration:Number.isFinite(player.duration)?player.duration:0,playing:!player.paused&&!player.ended,ended:player.ended,volume:player.volume,muted:player.muted,rate:player.playbackRate,w:player.videoWidth||0,h:player.videoHeight||0,buffered:end}));
      const {a,b}=latest.current.loop;if(a!==null&&b!==null&&!player.paused&&player.currentTime>=b)player.currentTime=a;};
    read();const timer=setInterval(read,200);return()=>clearInterval(timer);
  },[getElement]);
  // Series: when a video ends, the next one starts (or this video / the list repeats).
  useEffect(()=>{
    if(!element)return undefined;
    const ended=()=>{
      const {repeat:mode,series:auto}=latest.current;
      if(mode==='one'){element.currentTime=0;void element.play();return;}
      if(!auto)return;
      const next=pickNext();if(next>=0)void select(next,{play:true});
    };
    element.addEventListener('ended',ended);return()=>element.removeEventListener('ended',ended);
  },[element]);// eslint-disable-line react-hooks/exhaustive-deps
  const idle=!element,current=items[index];
  const toggle=()=>{if(!element)return;if(element.ended)element.currentTime=0;if(element.paused)void element.play();else element.pause();};
  const seekBy=seconds=>{if(element)element.currentTime=Math.max(0,Math.min(element.duration||0,element.currentTime+seconds));};
  const stop=()=>{if(!element)return;element.pause();element.currentTime=0;};
  const setVolume=value=>{if(!element)return;element.volume=Math.max(0,Math.min(1,value));if(value>0)element.muted=false;};
  const goPrev=()=>{if(!element)return;if(element.currentTime>3||index<=0){element.currentTime=0;return;}void select(index-1,{play:!element.paused});};
  const goNext=()=>{const next=pickNext();if(next>=0)void select(next,{play:element&&!element.paused});};
  const move=(position,delta)=>{const target=position+delta;if(target<0||target>=items.length)return;setItems(list=>{const copy=[...list];[copy[position],copy[target]]=[copy[target],copy[position]];return copy;});setIndex(at=>at===position?target:at===target?position:at);};
  const remove=position=>{setItems(list=>list.filter((_,at)=>at!==position));setIndex(at=>position<at?at-1:position===at?-1:at);};
  const clear=()=>{setItems([]);setIndex(-1);played.current.clear();setLoop({a:null,b:null});};
  const keys=event=>{
    if(idle||event.target.tagName==='INPUT'&&event.target.type==='text')return;
    const handled={' ':toggle,k:toggle,ArrowLeft:()=>seekBy(-5),ArrowRight:()=>seekBy(5),j:()=>seekBy(-10),l:()=>seekBy(10),ArrowUp:()=>setVolume(state.volume+.05),ArrowDown:()=>setVolume(state.volume-.05),m:()=>{element.muted=!element.muted;},n:goNext,p:goPrev,',':()=>{element.pause();seekBy(-FRAME);},'.':()=>{element.pause();seekBy(FRAME);},Home:()=>{element.currentTime=0;},End:()=>{element.currentTime=Math.max(0,(element.duration||0)-.1);}}[event.key];
    if(handled&&!(event.target.tagName==='BUTTON'&&event.key===' ')){event.preventDefault();handled();}
  };
  const progress=state.duration?Math.min(100,state.time/state.duration*100):0,bufferedPct=state.duration?Math.min(100,state.buffered/state.duration*100):0;
  const status=idle?'NO PREVIEW':state.ended?'ENDED':state.playing?'PLAYING':'PAUSED';
  return <div className="studio-video-player" role="group" aria-label="Video player" tabIndex={0} onKeyDown={keys}>
    <div className="svp-head">
      <strong>Video player</strong><span className={`svp-status is-${status.toLowerCase().replace(' ','-')}`}>{status}</span>
      <span className="svp-head-actions">
        <button type="button" className="svp-icon" aria-label="Keyboard shortcuts" aria-pressed={showKeys} title="Keyboard shortcuts" onClick={()=>setShowKeys(open=>!open)}><Keyboard size={15} aria-hidden="true"/></button>
        <label className={`svp-add${locked?' is-disabled':''}`}><Plus size={14} aria-hidden="true"/>Add videos<input type="file" accept="video/*" multiple hidden disabled={locked} onChange={event=>{add(event.target.files||[]);event.target.value='';}}/></label>
      </span>
    </div>
    {showKeys&&<p className="svp-keys"><b>Space/K</b> play·pause <b>←/→</b> ±5 s <b>J/L</b> ±10 s <b>,/.</b> frame <b>↑/↓</b> volume <b>M</b> mute <b>N/P</b> next·prev <b>Home/End</b></p>}
    <p className="svp-now" aria-live="polite">{current?<><b>{index+1}/{items.length}</b> {current.file.name}{state.w?<small> · {state.w}×{state.h}</small>:null}</>:'Choose the videos to play. Nothing plays until you press Play.'}</p>
    <div className="svp-seek">
      <button type="button" className="svp-time" title="Switch between elapsed and remaining time" onClick={()=>setRemaining(value=>!value)}>{remaining?`-${clock(Math.max(0,state.duration-state.time))}`:clock(state.time)}</button>
      <span className="svp-track" style={{'--progress':`${progress}%`,'--buffered':`${bufferedPct}%`}}>
        {state.duration>0&&loop.a!==null&&<i className="svp-mark" style={{left:`${loop.a/state.duration*100}%`}}>A</i>}
        {state.duration>0&&loop.b!==null&&<i className="svp-mark" style={{left:`${loop.b/state.duration*100}%`}}>B</i>}
        <input type="range" min="0" max={state.duration||1} step="0.05" value={Math.min(state.time,state.duration||1)} aria-label="Seek" disabled={idle||!state.duration}
          onPointerDown={()=>setState(c=>({...c,seeking:true}))}
          onChange={event=>{const time=Number(event.target.value);setState(c=>({...c,time}));element.currentTime=time;}}
          onPointerUp={()=>setState(c=>({...c,seeking:false}))} onBlur={()=>setState(c=>({...c,seeking:false}))}/>
      </span>
      <span className="svp-time is-total">{clock(state.duration)}</span>
    </div>
    <div className="svp-transport">
      <button type="button" aria-label="Previous video" title="Previous (P): restarts first if more than 3 s in" disabled={idle} onClick={goPrev}><SkipBack size={16} aria-hidden="true"/></button>
      <button type="button" aria-label="Back 10 seconds" title="Back 10 s (J)" disabled={idle} onClick={()=>seekBy(-10)}><Rewind size={16} aria-hidden="true"/></button>
      <button type="button" aria-label="Previous frame" title="Previous frame (,)" disabled={idle} onClick={()=>{element.pause();seekBy(-FRAME);}}><StepBack size={15} aria-hidden="true"/></button>
      <button type="button" className="svp-play" aria-label={state.playing?'Pause video':'Play video'} title={state.playing?'Pause (Space)':'Play (Space)'} disabled={idle} onClick={toggle}>{state.playing?<Pause size={19} aria-hidden="true"/>:<Play size={19} aria-hidden="true"/>}</button>
      <button type="button" aria-label="Stop and return to the start" title="Stop" disabled={idle} onClick={stop}><Square size={14} aria-hidden="true"/></button>
      <button type="button" aria-label="Next frame" title="Next frame (.)" disabled={idle} onClick={()=>{element.pause();seekBy(FRAME);}}><StepForward size={15} aria-hidden="true"/></button>
      <button type="button" aria-label="Forward 10 seconds" title="Forward 10 s (L)" disabled={idle} onClick={()=>seekBy(10)}><FastForward size={16} aria-hidden="true"/></button>
      <button type="button" aria-label="Next video" title="Next (N)" disabled={idle||pickNext()<0} onClick={goNext}><SkipForward size={16} aria-hidden="true"/></button>
      <span className="svp-gap"/>
      <button type="button" aria-label="Restart video" title="Restart" disabled={idle} onClick={()=>{element.currentTime=0;}}><RotateCcw size={15} aria-hidden="true"/></button>
    </div>
    <div className="svp-options">
      <span className="svp-volume"><button type="button" aria-label={state.muted||!state.volume?'Unmute':'Mute'} title="Mute (M)" disabled={idle} onClick={()=>{element.muted=!element.muted;}}>{state.muted||!state.volume?<VolumeX size={16} aria-hidden="true"/>:<Volume2 size={16} aria-hidden="true"/>}</button>
        <input type="range" min="0" max="1" step="0.01" value={state.muted?0:state.volume} aria-label="Volume" disabled={idle} onChange={event=>setVolume(Number(event.target.value))}/><em>{Math.round((state.muted?0:state.volume)*100)}%</em></span>
      <span className="svp-seg" role="group" aria-label="Speed">{SPEEDS.map(speed=><button key={speed} type="button" aria-pressed={state.rate===speed} disabled={idle} onClick={()=>{element.playbackRate=speed;}}>{speed===1?'1×':`${speed}×`}</button>)}</span>
      <span className="svp-seg" role="group" aria-label="A–B loop">
        <button type="button" aria-pressed={loop.a!==null} disabled={idle} title="Loop start at the current time" onClick={()=>setLoop(current=>({...current,a:element.currentTime}))}>A</button>
        <button type="button" aria-pressed={loop.b!==null} disabled={idle} title="Loop end at the current time" onClick={()=>setLoop(current=>({...current,b:element.currentTime>(current.a??0)?element.currentTime:current.b}))}>B</button>
        <button type="button" disabled={idle||(loop.a===null&&loop.b===null)} title="Clear the A–B loop" onClick={()=>setLoop({a:null,b:null})}>×</button>
      </span>
      <span className="svp-seg" role="group" aria-label="Playlist mode">
        <button type="button" aria-label={REPEAT_LABEL[repeat]} title={REPEAT_LABEL[repeat]} aria-pressed={repeat!=='off'} onClick={()=>setRepeat(REPEAT[(REPEAT.indexOf(repeat)+1)%REPEAT.length])}>{repeat==='one'?<Repeat1 size={15} aria-hidden="true"/>:<Repeat size={15} aria-hidden="true"/>}</button>
        <button type="button" aria-label="Shuffle" title="Shuffle" aria-pressed={shuffle} onClick={()=>{played.current.clear();if(current)played.current.add(current.id);setShuffle(value=>!value);}}><Shuffle size={15} aria-hidden="true"/></button>
        <button type="button" aria-pressed={series} title="Play the next video automatically when one ends" onClick={()=>setSeries(value=>!value)}>Auto-next</button>
      </span>
    </div>
    {items.length>0&&<><div className="svp-list-head"><span>Playlist · {items.length} video{items.length===1?'':'s'} · {clock(items.reduce((sum,item)=>sum+item.duration,0))}</span><button type="button" className="svp-clear" onClick={clear}><Trash2 size={13} aria-hidden="true"/>Clear</button></div>
    <ol className="svp-list" aria-label="Videos to play in series">{items.map((item,position)=><li key={item.id} className={position===index?'is-current':''}>
      <button type="button" className="svp-item" disabled={idle} title={idle?'Open the preview to play videos':'Click to load (Play starts it) · double-click to play now'} onClick={()=>void select(position)} onDoubleClick={()=>void select(position,{play:true})}><b>{position+1}</b><span>{item.file.name}</span><small>{item.duration?clock(item.duration):''}</small></button>
      <button type="button" className="svp-move" aria-label="Move up" title="Move up" disabled={position===0} onClick={()=>move(position,-1)}><ChevronUp size={14} aria-hidden="true"/></button>
      <button type="button" className="svp-move" aria-label="Move down" title="Move down" disabled={position===items.length-1} onClick={()=>move(position,1)}><ChevronDown size={14} aria-hidden="true"/></button>
      <button type="button" className="svp-remove" aria-label={`Remove ${item.file.name}`} title="Remove from the list" onClick={()=>remove(position)}><X size={13} aria-hidden="true"/></button>
    </li>)}</ol></>}
  </div>;
}
