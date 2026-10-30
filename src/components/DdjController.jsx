import {useEffect,useRef,useState} from 'react';
import {ARCHIVE_PLAYER_STATE,archivePlayerCommand,readArchivePlayerState} from '../lib/archivePlayerBridge';
import {EQUALIZER_BANDS} from '../lib/audioEqualizer';
import {STEM_CHANNELS} from '../lib/stemMix';
import VocalCorrectionControl from './VocalCorrectionControl';
import {StemChannelControls} from './StemChannels';
import './ddjController.css';

// A 4-channel performance DJ controller drawn from a reference photo. Coordinates are in photo-derived units (1047 x 495).
const W=1047,H=495,DECK2=680;
const PORTRAIT='https://res.cloudinary.com/nqiooluk/image/upload/v1793064081/khalil/site-assets/90c13a68010e/echo/blue-portrait.webp';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const rad=d=>d*Math.PI/180;
const COLS=[{n:3,x:447},{n:1,x:498},{n:2,x:549.5},{n:4,x:599.5}];
const STEM_OF={1:'vocals',2:'drums',3:'bass',4:'other'};
const STEM_NAME={vocals:'VOCALS',drums:'DRUMS',bass:'BASS',other:'MUSIC'};
const PAD_MODES=[['HOT CUE','KEYBOARD'],['PAD FX 1','PAD FX 2'],['BEAT JUMP','BEAT LOOP'],['SAMPLER','KEY SHIFT']];

function usePlayer(){
  const [state,setState]=useState(readArchivePlayerState);
  useEffect(()=>{const on=e=>setState(e.detail);window.addEventListener(ARCHIVE_PLAYER_STATE,on);setState(readArchivePlayerState());return()=>window.removeEventListener(ARCHIVE_PLAYER_STATE,on);},[]);
  return state;
}
const toSvg=(e,node)=>{const svg=node.ownerSVGElement||node,m=svg.getScreenCTM().inverse(),p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(m);};

// The drawing is ~1000 units wide on screen, so its source sizes (3-5) read as 3-5px; scale them up for legibility.
const TEXT_SCALE=1.35,TEXT_MIN=5.6;
// `max` squeezes a label that would be wider than its box (estimated from glyph count) instead of letting it spill over neighbours.
function T({x,y,children,s=5,a='middle',f='#dfe5e8',w=700,ls='.03em',max,...rest}){
  const size=Math.max(TEXT_MIN,s*TEXT_SCALE),natural=String(children).length*size*.64,fit=max&&natural>max?{textLength:max,lengthAdjust:'spacingAndGlyphs'}:{};
  return <text x={x} y={y} fontSize={size} textAnchor={a} fill={f} fontWeight={w} letterSpacing={ls} {...fit} {...rest}>{children}</text>;
}

// Rotary: vertical drag, arrow keys, double-click to recentre; sweep -135..+135 degrees with printed scale dots.
function Knob({cx,cy,r=11,value,min=-1,max=1,step=.01,onChange,label,labelY,ariaLabel,disabled,ring=true,dots=11}){
  const drag=useRef(null),last=useRef(value);useEffect(()=>{last.current=value;},[value]);
  const set=v=>{const n=clamp(Math.round(v/step)*step,min,max);last.current=n;onChange?.(n);};
  const turn=-135+(value-min)/(max-min)*270,live=!disabled&&Boolean(onChange);
  return <g className={`knob${live?' is-live':''}`} role="slider" tabIndex={live?0:-1} aria-label={ariaLabel||label} aria-valuemin={min} aria-valuemax={max} aria-valuenow={Number(value.toFixed(2))} aria-disabled={!live||undefined}
    onPointerDown={e=>{if(!live||e.button!==0)return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);drag.current={y:e.clientY,v:value};}}
    onPointerMove={e=>{if(drag.current)set(drag.current.v+(drag.current.y-e.clientY)/(r*9)*(max-min));}}
    onPointerUp={()=>{drag.current=null;}} onPointerCancel={()=>{drag.current=null;}} onDoubleClick={()=>live&&set(min<0&&max>0?0:(min+max)/2)}
    onKeyDown={e=>{const d={ArrowUp:1,ArrowRight:1,ArrowDown:-1,ArrowLeft:-1}[e.key];if(live&&d){e.preventDefault();set(last.current+d*step*(Math.abs(max-min)>5?1:10));}}}>
    {ring&&Array.from({length:dots},(_,i)=>{const a=rad(-135+i*270/(dots-1)-90);return <circle key={i} cx={cx+Math.cos(a)*(r+3.4)} cy={cy+Math.sin(a)*(r+3.4)} r=".7" fill="#8e969a"/>;})}
    <circle cx={cx} cy={cy} r={r} fill="url(#knobBody)" stroke="#000" strokeWidth=".6"/><circle cx={cx} cy={cy} r={r*.72} fill="url(#knobTop)"/>
    <line x1={cx} y1={cy-r*.18} x2={cx} y2={cy-r*.98} stroke="#f2f4f5" strokeWidth={Math.max(1.3,r*.14)} strokeLinecap="round" transform={`rotate(${turn} ${cx} ${cy})`}/>
    {label&&<T x={cx} y={labelY??cy-r-5.5} s={4.4} max={44}>{label}</T>}</g>;
}

function Btn({x,y,w,h,label,sub,lit,onClick,disabled,round,s=4.2,ariaLabel,children}){
  const live=Boolean(onClick)&&!disabled;
  const press=e=>{if(live&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onClick();}};
  return <g className={`btn${live?' is-live':''}${lit?' is-lit':''}`} role={live?'button':undefined} tabIndex={live?0:-1} aria-label={ariaLabel||label} aria-pressed={live&&lit!==undefined?Boolean(lit):undefined} onClick={live?onClick:undefined} onKeyDown={press}>
    {round?<circle cx={x} cy={y} r={w/2}/>:<rect x={x} y={y} width={w} height={h} rx="1.6"/>}
    {label&&<T x={round?x:x+w/2} y={round?y+1.6:y+h/2+1.5} s={s} max={round?w:w-3} f={lit?'#fff':'#e4e9ec'}>{label}</T>}{children}
    {sub&&<T x={round?x:x+w/2} y={round?y+w/2+8:y+h+6.2} s={3.8} max={w+4} f="#b3bbbf">{sub}</T>}</g>;
}

// Vertical (or horizontal) fader. value 0..1, drags with pointer, arrow keys step. disabled = purely decorative position.
function Fader({x,y,len,value,onChange,vertical=true,ariaLabel,disabled,capW=22,capH=11}){
  const live=Boolean(onChange)&&!disabled,last=useRef(value);useEffect(()=>{last.current=value;},[value]);
  const pos=v=>vertical?{cx:x,cy:y+len*(1-v)}:{cx:x+len*v,cy:y};
  const from=e=>{const p=toSvg(e,e.currentTarget);return clamp(vertical?1-(p.y-y)/len:(p.x-x)/len,0,1);};
  const c=pos(value);
  return <g className={`fader${live?' is-live':''}`} role="slider" tabIndex={live?0:-1} aria-label={ariaLabel} aria-orientation={vertical?'vertical':'horizontal'} aria-valuemin={0} aria-valuemax={1} aria-valuenow={Number(value.toFixed(2))} aria-disabled={!live||undefined}
    onPointerDown={e=>{if(!live)return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);onChange(from(e));}}
    onPointerMove={e=>{if(live&&e.currentTarget.hasPointerCapture(e.pointerId))onChange(from(e));}}
    onKeyDown={e=>{const d={ArrowUp:.05,ArrowRight:.05,ArrowDown:-.05,ArrowLeft:-.05}[e.key];if(live&&d){e.preventDefault();onChange(clamp(last.current+d,0,1));}}}>
    {vertical?<><rect x={x-6} y={y-8} width="12" height={len+16} fill="transparent"/><rect x={x-1.3} y={y-2} width="2.6" height={len+4} rx="1.3" fill="#020202" stroke="#3a3f42" strokeWidth=".5"/></>
      :<><rect x={x-8} y={y-8} width={len+16} height="16" fill="transparent"/><rect x={x-2} y={y-1.3} width={len+4} height="2.6" rx="1.3" fill="#020202" stroke="#3a3f42" strokeWidth=".5"/></>}
    <rect x={c.cx-(vertical?capW:capH)/2} y={c.cy-(vertical?capH:capW)/2} width={vertical?capW:capH} height={vertical?capH:capW} rx="1.6" fill="url(#capGrad)" stroke="#000" strokeWidth=".6"/>
    {vertical?<rect x={c.cx-capW/2+1} y={c.cy-.6} width={capW-2} height="1.2" fill="#f4f6f7"/>:<rect x={c.cx-.6} y={c.cy-capW/2+1} width="1.2" height={capW-2} fill="#f4f6f7"/>}</g>;
}

// Segment ladder lit by a CSS variable (--channel-level 0..1) that the audio engine writes onto the group.
function Ladder({x,y,w=7,count=12,gap=1.5,h=3.2,metered,levelRef,level}){
  return <g ref={levelRef} className="ladder" style={level!==undefined?{'--channel-level':level}:undefined}>{Array.from({length:count},(_,i)=><rect key={i} className={i>count-3?'hot':i>count-6?'warn':''} x={x} y={y+(count-1-i)*(h+gap)} width={w} height={h} style={{'--i':i,'--n':count}}/>)}</g>;
}

function Deck({dx,n,real,player,eq}){
  const dur=player.duration||0,pos=player.position||0,ready=real&&Boolean(player.track)&&dur>0;
  const progress=ready?clamp(pos/dur,0,1):0,playing=real&&player.playing;
  const scrub=useRef(null),[tempo,setTempo]=useState(.5),[lit,setLit]=useState(null);
  const C={x:189,y:194},DIM=36;
  const seek=t=>archivePlayerCommand('seek',clamp(t,0,dur));
  const ang=e=>{const p=toSvg(e,e.currentTarget);return Math.atan2(p.y-C.y,p.x-C.x-dx)*180/Math.PI;};
  return <g transform={`translate(${dx} 0)`} className={`deck${real?' is-real':''}`}>
    <g className="deck-top">
      <Btn x={43} y={24} w={20} round label="" ariaLabel="In / half loop"/><T x={43} y={41} s={3.8} f="#b3bbbf">IN · 1/2X</T>
      <Btn x={80} y={24} w={20} round label="" ariaLabel="Out / double loop"/><T x={80} y={41} s={3.8} f="#b3bbbf">OUT · 2X</T>
      <Btn x={104} y={20} w={48} h={12} label="4 BEAT LOOP/EXIT" s={3.2}/><T x={128} y={40} s={3.6} f="#b3bbbf" max={46}>ACTIVE LOOP</T>
      <Btn x={240} y={20} w={20} h={12} label="" ariaLabel="Slot"/><Btn x={270} y={20} w={20} h={12} label="" ariaLabel="Slip"/>
      <Knob cx={332} cy={25} r={15} value={0} min={-1} max={1} ring={false} ariaLabel="Browse"/>
      <T x={332} y={48} s={3.2} f="#b3bbbf" max={56}>LOAD / INSERT · DOUBLES</T><Btn x={309} y={58} w={18} h={9} label="BACK" s={3.6}/><Btn x={337} y={58} w={18} h={9} label="VIEW" s={3.6}/>
      <Knob cx={342} cy={98} r={10} value={0} ariaLabel="Jog adjust" dots={5}/><T x={342} y={117} s={3.4} f="#b3bbbf">JOG ADJUST</T>
      <Btn x={32} y={59} w={35} h={7} label="" ariaLabel="Clip"/><Btn x={41} y={100} w={18} round label="2/1" s={3.6} ariaLabel="Deck select"/><T x={41} y={84} s={3.4} f="#b3bbbf" max={40}>DECK SELECT</T>
    </g>
    <g className="jog">
      <circle cx={C.x} cy={C.y} r="150" fill="#050606" stroke="#2a2d2f" strokeWidth="1.2"/><circle cx={C.x} cy={C.y} r="147" fill="none" stroke="#0e1011" strokeWidth="5"/>
      {Array.from({length:DIM},(_,i)=>{const a=rad(i*360/DIM-90);const on=real&&progress>0&&i/DIM<=progress;return <circle key={i} className={`dimple${on?' on':''}`} cx={C.x+Math.cos(a)*136} cy={C.y+Math.sin(a)*136} r="7.4"/>;})}
      <circle cx={C.x} cy={C.y} r="123" fill="url(#platter)" stroke="#000" strokeWidth="1.4"/>
      <g className="platter" style={{animationPlayState:playing?'running':'paused'}}><circle cx={C.x} cy={C.y} r="123" fill="transparent"/><line x1={C.x} y1={C.y-120} x2={C.x} y2={C.y-107} stroke="#2b2f31" strokeWidth="1.4"/>
        <circle cx={C.x} cy={C.y} r="50" fill="#3d4143" stroke="#1b1e1f" strokeWidth="2"/><circle cx={C.x} cy={C.y} r="47" fill="none" stroke="#505558" strokeWidth=".6"/>
        <path d={`M${C.x-36} ${C.y-27} A45 45 0 0 1 ${C.x+36} ${C.y-27}`} fill="none" stroke="#2a2d2f" strokeWidth="2.4"/><path d={`M${C.x-36} ${C.y+27} A45 45 0 0 0 ${C.x+36} ${C.y+27}`} fill="none" stroke="#2a2d2f" strokeWidth="2.4"/></g>
      <circle cx={C.x} cy={C.y} r="150" fill="transparent" className="jog-hit" tabIndex={ready?0:-1} role="slider" aria-label="Jog wheel: drag to scrub" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(pos)}
        onKeyDown={e=>{if(ready&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();seek(pos+(e.key==='ArrowRight'?5:-5));}}}
        onPointerDown={e=>{if(!ready)return;e.currentTarget.setPointerCapture(e.pointerId);scrub.current={a:ang(e),t:pos};}}
        onPointerMove={e=>{const s=scrub.current;if(!s)return;const a=ang(e);let d=a-s.a;if(d>180)d-=360;if(d<-180)d+=360;s.a=a;s.t=clamp(s.t+d/360*1.8,0,dur);seek(s.t);}}
        onPointerUp={()=>{scrub.current=null;}} onPointerCancel={()=>{scrub.current=null;}}/>
      <T x={98} y={326} s={5} f="#c5cacd">REV</T><T x={280} y={326} s={5} f="#c5cacd">FWD</T>
      <path d="M98 331 Q108 343 132 348" fill="none" stroke="#d6dbde" strokeWidth="1.1"/><path d="M280 331 Q270 343 246 348" fill="none" stroke="#d6dbde" strokeWidth="1.1"/>
    </g>
    <g className="deck-left"><Btn x={22} y={262} w={15} h={6} label="SHIFT" s={3}/><T x={42} y={279} s={3.2} f="#b3bbbf" max={64}>CUE/LOOP CALL · MEMORY</T>
      <T x={50} y={313} s={4} f="#c5cacd">SEARCH</T><Btn x={34} y={328} w={16} round label="" ariaLabel="Search reverse"/><Btn x={65} y={328} w={16} round label="" ariaLabel="Search forward"/>
      <g className={`ring-btn${real?' is-live':''}`} role={real?'button':undefined} tabIndex={real&&player.track?0:-1} transform="translate(0 -4)" aria-label="Cue: stop and return to the start" onClick={()=>real&&player.track&&archivePlayerCommand('stop')} onKeyDown={e=>{if(real&&(e.key==='Enter'||e.key===' ')){e.preventDefault();archivePlayerCommand('stop');}}}>
        <circle cx="49.5" cy="379" r="27" fill="#0c0d0e" stroke="#5c6063" strokeWidth="3"/><circle cx="49.5" cy="379" r="21" fill="none" stroke="#1d2022" strokeWidth="1"/><path d="M33 372 L66 386 M66 372 L33 386" stroke="#202426" strokeWidth="4"/><T x={49.5} y={381} s={7} f="#f1f3f4" w={800}>CUE</T></g>
      <g className={`ring-btn${real?' is-live':''}${playing?' is-lit':''}`} role={real?'button':undefined} tabIndex={real&&player.track?0:-1} aria-label={playing?'Pause':'Play'} aria-pressed={real?Boolean(playing):undefined} onClick={()=>real&&player.track&&archivePlayerCommand('toggle')} onKeyDown={e=>{if(real&&(e.key==='Enter'||e.key===' ')){e.preventDefault();archivePlayerCommand('toggle');}}}>
        <circle cx="47" cy="440" r="27" fill="#0c0d0e" stroke="#5c6063" strokeWidth="3"/><circle cx="47" cy="440" r="21" fill="none" stroke="#1d2022" strokeWidth="1"/>
        {playing?<g fill="#f1f3f4"><rect x="40.5" y="432" width="5" height="16"/><rect x="49.5" y="432" width="5" height="16"/></g>:<path d="M41 431 L57 440 L41 449Z" fill="#f1f3f4"/>}</g>
      <T x={47} y={410.5} s={4} f="#c5cacd" max={52}>PLAY/PAUSE</T></g>
    <g className="deck-pads">
      <T x={159} y={354} s={4.4} f="#c5cacd">PAD MODE</T><line x1="96" y1="352.5" x2="128" y2="352.5" stroke="#6b7276" strokeWidth=".7"/><line x1="190" y1="352.5" x2="223" y2="352.5" stroke="#6b7276" strokeWidth=".7"/>
      {PAD_MODES.map(([a,b],i)=><Btn key={a} x={95.5+i*33} y={358} w={30} h={10} label={a} sub={b} s={3.4} lit={i===0}/>)}
      <T x={262} y={354} s={4.4} f="#c5cacd">PAGE</T><Btn x={243} y={358} w={17} h={10} label="◀" s={4}/><Btn x={263} y={358} w={17} h={10} label="▶" s={4}/>
      {Array.from({length:8},(_,i)=>{const col=i%4,row=Math.floor(i/4),x=95.5+col*49,y=386.5+row*46.5,on=real&&ready&&progress>=i/8;
        return <rect key={i} className={`pad${on?' on':''}${real&&ready?' is-live':''}`} x={x} y={y} width="42" height="40.5" rx="3" role={real?'button':undefined} tabIndex={real&&ready?0:-1} aria-label={`Hot cue ${i+1}`} onClick={()=>real&&ready&&seek(dur*i/8)} onKeyDown={e=>{if(real&&ready&&(e.key==='Enter'||e.key===' ')){e.preventDefault();seek(dur*i/8);}}}/>;})}
    </g>
    <g className="deck-tempo"><Btn x={294.5} y={354} w={20} h={23} label="" ariaLabel="Tempo range"/><T x={304.5} y={385} s={3.4} f="#b3bbbf" max={24}>TEMPO</T><T x={304.5} y={392} s={3.4} f="#b3bbbf" max={24}>RANGE</T>
      <Btn x={294.5} y={407} w={20} h={12} label="" ariaLabel="Master tempo"/><Btn x={294.5} y={422} w={20} h={25} label="" ariaLabel="Key reset"><T x={304.5} y={432} s={3.2} max={17}>KEY</T><T x={304.5} y={440} s={3.2} max={17}>RESET</T></Btn>
      <rect x="324.5" y="293" width="30" height="177" rx="3" fill="#0a0b0c" stroke="#2a2d2f"/><g className="ribs">{Array.from({length:30},(_,i)=><g key={i}><rect x="327" y={297+i*5.6} width="11" height="2.8"/><rect x="341" y={297+i*5.6} width="11" height="2.8"/></g>)}</g>
      <Fader x={339.5} y={298} len={150} value={tempo} onChange={setTempo} ariaLabel={`Deck ${n} tempo (visual)`} capW={29} capH={14}/></g>
  </g>;
}

export default function DdjController({stems,mic,masterMeter}){
  const player=usePlayer(),eq=player.equalizer||{};
  const [last,setLast]=useState('FLAT'),[decor,setDecor]=useState({});
  const dv=(k,d=0)=>decor[k]??d,sd=k=>v=>setDecor(o=>({...o,[k]:v}));
  const setBand=(band,label,v)=>{archivePlayerCommand('equalizer',{band,gain:v});setLast(`${label} ${v>0?'+':''}${v} dB`);};
  const stemOn=Boolean(stems?.mode);
  const micLevel=mic?.micMeter;
  return <div className="ddj-host"><svg className="ddj-svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Performance DJ controller" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#141618"/><stop offset="1" stopColor="#0a0b0c"/></linearGradient>
      <radialGradient id="knobBody" cx=".4" cy=".32"><stop offset="0" stopColor="#4d5357"/><stop offset=".6" stopColor="#15181a"/><stop offset="1" stopColor="#050606"/></radialGradient>
      <radialGradient id="knobTop" cx=".4" cy=".3"><stop offset="0" stopColor="#262b2e"/><stop offset="1" stopColor="#0b0d0e"/></radialGradient>
      <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#62696d"/><stop offset=".45" stopColor="#2b3033"/><stop offset="1" stopColor="#15181a"/></linearGradient>
      <radialGradient id="platter" cx=".5" cy=".4"><stop offset="0" stopColor="#0d0f10"/><stop offset="1" stopColor="#030404"/></radialGradient>
    </defs>
    <rect x="0" y="0" width={W} height={H} rx="9" fill="url(#body)" stroke="#2c3033" strokeWidth="1.4"/>
    <rect x="370" y="3" width="326" height={H-6} fill="#0b0c0d" stroke="#2a2d2f"/>
    <Deck dx={0} n={1} real player={player} eq={eq}/><Deck dx={DECK2} n={2} player={player} eq={eq}/>
    {/* mic column */}
    <g className="mixer">
      <rect x="373" y="9" width="44" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={395} y={16} s={5.2} f="#e8ecee">MIC</T>{mic?.active&&mic.latency&&<T x={395} y={6.5} s={3.4} f="#7fd6b0" aria-label="Browser audio latency">{(()=>{const total=mic.latency.base==null&&mic.latency.output==null?null:(mic.latency.base||0)+(mic.latency.output||0);return total==null?'LAT n/a':`LAT ${(total*1000).toFixed(1)} ms`;})()}</T>}
      <Btn x={381} y={22} w={30} h={10} label={mic?.active?'ON':'OFF'} lit={mic?.active} onClick={mic&&!mic.pending?(mic.active?mic.stop:mic.enable):undefined} ariaLabel={mic?.active?'Turn microphone off':'Turn microphone on'} s={3.8}/>
      <Knob cx={396} cy={52} r={11} value={mic?.micGain??.75} min={0} max={1} onChange={mic?mic.setMicGain:undefined} label="MIC 1 LEVEL" labelY={38} ariaLabel="Microphone level"/>
      <Knob cx={396} cy={94.5} r={11} value={dv('mic2',.5)} min={0} max={1} onChange={sd('mic2')} label="MIC 2 LEVEL" labelY={80.5}/>
      <Knob cx={396} cy={133} r={11} value={dv('mhi')} onChange={sd('mhi')} label="HI" labelY={119.5}/><Knob cx={396} cy={173} r={11} value={dv('mlo')} onChange={sd('mlo')} label="LOW" labelY={159.5}/>
      <rect x="373" y="203" width="44" height="42" fill="#17191b"/><T x={395} y={212} s={3.4} f="#c3cacd" max={40}>SOUND COLOR FX</T>
      <Btn x={376} y={216} w={18} h={8} label="MON" s={3.2} lit={mic?.monitor} onClick={mic&&mic.active?()=>mic.setMonitor(v=>!v):undefined} ariaLabel="Monitor microphone"/><Btn x={397} y={216} w={18} h={8} label="" ariaLabel="Effect"/><Btn x={376} y={230} w={18} h={8} label="" ariaLabel="Effect"/><Btn x={397} y={230} w={18} h={8} label="" ariaLabel="Effect"/>
      <rect x="373" y="253" width="44" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={395} y={260} s={4.6} f="#e8ecee">SAMPLER</T><Btn x={376} y={270} w={38} h={8} label="CUE" s={3.4}/>
      <Knob cx={396} cy={303} r={13} value={dv('svol',.5)} min={0} max={1} onChange={sd('svol')} label="SAMPLER VOL" labelY={285}/>
      <rect x="373" y="324" width="44" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={395} y={331} s={4.2} f="#e8ecee">HEADPHONES</T>
      <Knob cx={397} cy={355} r={11} value={dv('mix',.5)} min={0} max={1} onChange={sd('mix')} label="MIXING" labelY={344}/><Knob cx={398} cy={395.5} r={11} value={dv('hp',.6)} min={0} max={1} onChange={sd('hp')} label="LEVEL" labelY={382}/>
      <g ref={micLevel} className="mic-ladder"><Ladder x={417.5} y={60} w={3} count={10} h={2.4} gap={1.2}/></g>
      {/* channels */}
      {COLS.map(({n,x})=>{const name=STEM_OF[n],ch=stems?.mix?.[name]||{volume:1,muted:false,solo:false},lvl=stemOn?stems.levels?.[name]||0:0;
        return <g key={n} className="channel">
          <line x1={x-25.5} y1="22" x2={x-25.5} y2="428" stroke="#25282a" strokeWidth=".8"/>
          <Btn x={x-11} y={24} w={22} h={9} label="" ariaLabel={`Channel ${n} input`}/>
          <Knob cx={x} cy={58} r={11.5} value={dv(`trim${n}`)} onChange={sd(`trim${n}`)} label="TRIM" labelY={44}/>
          <Knob cx={x} cy={95.5} r={11} value={dv(`hi${n}`)} min={-12} max={12} step={1} onChange={sd(`hi${n}`)} label="HI" labelY={82}/>
          <Knob cx={x} cy={135.5} r={11} value={dv(`mid${n}`)} min={-12} max={12} step={1} onChange={sd(`mid${n}`)} label="MID" labelY={122}/>
          <Knob cx={x} cy={173} r={11} value={dv(`low${n}`)} min={-12} max={12} step={1} onChange={sd(`low${n}`)} label="LOW" labelY={160}/>
          <rect x={x-25} y="204" width="50" height="42" fill="#1b1e20"/><T x={x} y={213} s={3.6} f="#b3bbbf">COLOR</T>
          <Knob cx={x} cy={228} r={12.5} value={dv(`col${n}`)} onChange={sd(`col${n}`)} ring={false}/><T x={x-17} y={243} s={3.2} f="#aab3b7">LOW</T><T x={x+17} y={243} s={3.2} f="#aab3b7">HI</T>
          <T x={x} y={266} s={15} f="#f1f3f4" w={700} ls="0">{n}</T>
          <Btn x={x-16} y={270} w={32} h={9} label="CUE" s={3.4} lit={ch.solo} onClick={stemOn?()=>stems.change(name,{solo:!ch.solo}):undefined} ariaLabel={`${STEM_NAME[name]} solo`}/>
          <T x={x} y={291} s={3.8} f={stemOn?'#dfe5e8':'#9aa3a7'}>{STEM_NAME[name]}</T>
          <Ladder x={x-24} y={300} w={7} count={12} h={4.6} gap={1.8} level={lvl}/><Ladder x={x+17} y={300} w={7} count={12} h={4.6} gap={1.8} level={lvl}/>
          {[0,1,2,3,4,5,6,7].map(i=><line key={i} x1={x-12} x2={x+12} y1={302+i*10} y2={302+i*10} stroke="#40464a" strokeWidth=".5"/>)}
          <Fader x={x} y={300} len={78} value={stemOn?ch.volume:.75} onChange={stemOn?v=>stems.change(name,{volume:Math.round(v*100)/100}):undefined} ariaLabel={`${STEM_NAME[name]} channel volume`} disabled={!stemOn}/>
          <T x={x-14} y={392} s={3.2}>A</T><T x={x} y={392} s={3.2} max={14}>THRU</T><T x={x+14} y={392} s={3.2}>B</T>
          <Btn x={x-8} y={395} w={16} h={9} label={ch.muted?'M':''} s={4} lit={ch.muted} onClick={stemOn?()=>stems.change(name,{muted:!ch.muted}):undefined} ariaLabel={`${STEM_NAME[name]} mute`}/>
        </g>;})}
      <T x={535} y={418} s={3.8} f="#b3bbbf">CROSS FADER ASSIGN</T><line x1="450" x2="625" y1="421" y2="421" stroke="#40464a" strokeWidth=".5"/>
      <T x={483} y={457} s={7} f="#e8ecee" w={700} ls="0">❮ A</T><T x={590} y={457} s={7} f="#e8ecee" w={700} ls="0">B ❯</T>
      <T x={535} y={437} s={5} f="#e8ecee" w={800} ls=".14em">ECHO FADER</T>
      <Fader x={498} y={453} len={74} value={dv('xf',.5)} onChange={sd('xf')} vertical={false} ariaLabel="Crossfader (visual)" capW={22} capH={10}/>
      <T x={384} y={455} s={4.2} f="#e8ecee" a="start">PERFORMANCE</T><T x={384} y={461} s={4.2} f="#e8ecee" a="start">DJ CONTROLLER</T><T x={384} y={474} s={8.6} f="#f1f3f4" a="start" w={800} ls=".02em">ECHO-1000</T>
      {/* master + equalizer (the 7-band archive equalizer lives where the photo has Beat FX) */}
      <rect x="619" y="9" width="75" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={656} y={16} s={5.2} f="#e8ecee">MASTER</T>
      <Knob cx={645.5} cy={44} r={14} value={player.volume??.75} min={0} max={1} onChange={v=>archivePlayerCommand('volume',v)} label="LEVEL" labelY={28} ariaLabel="Master level"/>
      <g ref={masterMeter} className="master-ladder"><Ladder x={655} y={60} w={9} count={16} h={4} gap={2.4}/></g>
      <Knob cx={652} cy={178} r={11.5} value={dv('booth',.7)} min={0} max={1} onChange={sd('booth')} label="BOOTH MONITOR" labelY={160}/>
      <Btn x={632} y={196} w={22} h={9} label="" ariaLabel="Booth"/><Btn x={660} y={196} w={22} h={9} label="" ariaLabel="Booth"/>
      <rect x="619" y="214" width="75" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={656} y={221} s={5} f="#e8ecee">EQUALIZER</T>
      <rect x="627" y="228" width="60" height="14" rx="1" fill="#14202a" stroke="#2a2d2f"/><T x={657} y={238} s={5.2} f="#6fd3ff" w={700}>{last}</T>
      {EQUALIZER_BANDS.map((b,i)=>{const cx=i%2?677:637,cy=264+Math.floor(i/2)*36;return <Knob key={b.key} cx={cx} cy={cy} r={9} value={eq[b.key]??0} min={-12} max={12} step={1} dots={7} onChange={v=>setBand(b.key,b.label.toUpperCase(),v)} label={b.label.toUpperCase()} labelY={cy+15.5} ariaLabel={`${b.label} equalizer gain`}/>;})}
      <g className="ring-btn is-live" role="button" tabIndex={0} aria-label="Reset equalizer" onClick={()=>{archivePlayerCommand('equalizer-reset');setLast('FLAT');}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();archivePlayerCommand('equalizer-reset');setLast('FLAT');}}}>
        <circle cx="664.5" cy="450.5" r="15" fill="#e9eef1" stroke="#4a5155" strokeWidth="3"/><T x={664.5} y={452} s={4.4} f="#111" w={800}>RESET</T></g>
      <T x={664.5} y={473} s={3.6} f="#aab3b7">EQ FLAT</T>
    </g>
  </svg>
  <div className="ddj-foot"><VocalCorrectionControl/><div className="ddj-msg" role="status">{stemOn?'Stems on: faders, CUE (solo) and the A·THRU·B switch (mute) control Vocals, Drums, Bass and Music.':stems?<StemChannelControls stems={stems}/>:''}{mic?.notice?` ${mic.notice}`:''}</div></div></div>;
}
