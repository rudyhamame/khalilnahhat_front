import {Btn,Knob,Fader,Ladder,T,clamp,rad,toSvg,usePlayer} from './DjControllerControls';
import {displayImageUrl} from '../lib/displayImage';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {archivePlayerCommand} from '../lib/archivePlayerBridge';
import {EQUALIZER_BANDS} from '../lib/audioEqualizer';
import LandscapeDjController from './LandscapeDjController';
import {StemChannelControls} from './StemChannels';
import './ddjController.css';

// A 4-channel performance DJ controller drawn from a reference photo. Coordinates are in photo-derived units (1047 x 495).
const W=1047,H=495,DECK2=680,LABEL_H=26;// LABEL_H: room under the controller for the one-line model name
const PORTRAIT='https://res.cloudinary.com/nqiooluk/image/upload/v1793064081/khalil/site-assets/90c13a68010e/echo/blue-portrait.webp';
const COLS=[{n:3,x:447},{n:1,x:498},{n:2,x:549.5},{n:4,x:599.5}];
const STEM_OF={1:'vocals',2:'drums',3:'bass',4:'other'};
const STEM_NAME={vocals:'VOCALS',drums:'DRUMS',bass:'BASS',other:'MUSIC'};
const PAD_MODES=[['HOT CUE','KEYBOARD'],['PAD FX 1','PAD FX 2'],['BEAT JUMP','BEAT LOOP'],['SAMPLER','KEY SHIFT']];

function Deck({dx,n,real,player,eq,art}){
  const dur=player.duration||0,pos=player.position||0,ready=real&&Boolean(player.track)&&dur>0;
  const progress=ready?clamp(pos/dur,0,1):0,playing=real&&player.playing;
  const scrub=useRef(null);
  const rate=real?clamp(player.playbackRate??1,.5,1.5):1,tempo=rate-.5;
  const setTempo=value=>archivePlayerCommand('rate',Math.round((value+.5)*100)/100);
  const resetTempo=()=>archivePlayerCommand('rate',1);
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
      <circle cx={C.x} cy={C.y} r="150" fill="transparent" className="jog-hit" tabIndex={ready?0:-1} role="slider" aria-label="Jog wheel: drag to scratch and scrub" aria-valuemin={0} aria-valuemax={Math.round(dur)} aria-valuenow={Math.round(pos)}
        onKeyDown={e=>{if(ready&&(e.key==='ArrowRight'||e.key==='ArrowLeft')){e.preventDefault();seek(pos+(e.key==='ArrowRight'?5:-5));}}}
        onPointerDown={e=>{if(!ready)return;e.currentTarget.setPointerCapture(e.pointerId);scrub.current={a:ang(e),t:pos,at:performance.now()};if(art)art.current.held=true;archivePlayerCommand('scratch',{phase:'start'});}}
        onPointerMove={e=>{const s=scrub.current;if(!s)return;const a=ang(e);let d=a-s.a;if(d>180)d-=360;if(d<-180)d+=360;const now=performance.now(),step=d/360*1.8;if(art)art.current.angle+=d;s.a=a;s.t=clamp(s.t+step,0,dur);archivePlayerCommand('scratch',{phase:'move',pos:s.t,vel:step/Math.max(.008,(now-s.at)/1000)});s.at=now;}}
        onPointerUp={()=>{if(scrub.current)archivePlayerCommand('scratch',{phase:'end'});if(art)art.current.held=false;scrub.current=null;}} onPointerCancel={()=>{if(scrub.current)archivePlayerCommand('scratch',{phase:'end'});if(art)art.current.held=false;scrub.current=null;}}/>
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
      <Btn x={294.5} y={407} w={20} h={12} label="" ariaLabel="Master tempo"/><Btn x={294.5} y={422} w={20} h={25} label="" ariaLabel="Reset playback speed" onClick={real?resetTempo:undefined}><T x={304.5} y={432} s={3.2} max={17}>SPEED</T><T x={304.5} y={440} s={3.2} max={17}>RESET</T></Btn>
      <rect x="324.5" y="293" width="30" height="177" rx="3" fill="#0a0b0c" stroke="#2a2d2f"/><g className="ribs">{Array.from({length:30},(_,i)=><g key={i}><rect x="327" y={297+i*5.6} width="11" height="2.8"/><rect x="341" y={297+i*5.6} width="11" height="2.8"/></g>)}</g>
      <Fader x={339.5} y={298} len={150} value={tempo} onChange={real?setTempo:undefined} onReset={resetTempo} ariaLabel={`Deck ${n} playback speed`} ariaValueText={`${rate.toFixed(2)} times normal speed`} capW={29} capH={14}/>
      <T x={339.5} y={483} s={5} max={40}>{rate.toFixed(2)}×</T></g>
  </g>;
}

function StandardController({stems,mic,masterMeter}){
  const player=usePlayer(),eq=player.equalizer||{};
  const [last,setLast]=useState('FLAT'),[decor,setDecor]=useState({});
  const dv=(k,d=0)=>decor[k]??d,sd=k=>v=>setDecor(o=>({...o,[k]:v}));
  const setBand=(band,label,v)=>{archivePlayerCommand('equalizer',{band,gain:v});setLast(`${label} ${v>0?'+':''}${v} dB`);};
  const stemOn=Boolean(stems?.mode);
  const micLevel=mic?.micMeter;
  // The status line (separating progress, notices) lives in the mixer face's footer when that footer exists.
  const footerStatus=document.getElementById('echo-channels-overlay-status')||document.getElementById('home-archive-mixer-status');
  const status=<div className="ddj-msg" role="status">{stemOn?'Stems on: faders, CUE (solo) and the A·THRU·B switch (mute) control Vocals, Drums, Bass and Music.':stems?<StemChannelControls stems={stems}/>:''}{mic?.notice?` ${mic.notice}`:''}</div>;
  // The recording's artwork turns on the left record. It is a plain HTML image over the drawing (turned by the GPU, with a hole for the spindle), so the large SVG is never repainted while it spins.
  const jogArt=player.track?.coverImage?displayImageUrl(player.track.coverImage):'';
  const TH=H+LABEL_H,JC={x:189,y:194};
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
  return <div className="ddj-host"><div className="ddj-stage"><div className="ddj-frame" style={{aspectRatio:`${W} / ${TH}`,'--ratio':W/TH}}><svg className="ddj-svg" viewBox={`0 0 ${W} ${TH}`} role="group" aria-label="Performance DJ controller" preserveAspectRatio="xMidYMid meet">
    <defs>
      <linearGradient id="body" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#141618"/><stop offset="1" stopColor="#0a0b0c"/></linearGradient>
      <radialGradient id="knobBody" cx=".4" cy=".32"><stop offset="0" stopColor="#4d5357"/><stop offset=".6" stopColor="#15181a"/><stop offset="1" stopColor="#050606"/></radialGradient>
      <radialGradient id="knobTop" cx=".4" cy=".3"><stop offset="0" stopColor="#262b2e"/><stop offset="1" stopColor="#0b0d0e"/></radialGradient>
      <linearGradient id="capGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#62696d"/><stop offset=".45" stopColor="#2b3033"/><stop offset="1" stopColor="#15181a"/></linearGradient>
      <radialGradient id="platter" cx=".5" cy=".4"><stop offset="0" stopColor="#0d0f10"/><stop offset="1" stopColor="#030404"/></radialGradient>
    </defs>
    <rect x="0" y="0" width={W} height={H} rx="9" fill="url(#body)" stroke="#2c3033" strokeWidth="1.4"/>
    <rect x="370" y="3" width="326" height={H-6} fill="#0b0c0d" stroke="#2a2d2f"/>
    <Deck dx={0} n={1} real player={player} eq={eq} art={art}/><Deck dx={DECK2} n={2} player={player} eq={eq}/>
    {/* mic column */}
    <g className="mixer">
      <rect x="373" y="9" width="44" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={395} y={16} s={5.2} f="#e8ecee">MIC</T>{mic?.active&&mic.latency&&<T x={395} y={6.5} s={3.4} f="#7fd6b0" aria-label="Browser audio latency">{(()=>{const total=mic.latency.base==null&&mic.latency.output==null?null:(mic.latency.base||0)+(mic.latency.output||0);return total==null?'LAT n/a':`LAT ${(total*1000).toFixed(1)} ms`;})()}</T>}
      <Btn x={381} y={22} w={30} h={10} label={mic?.active?'ON':'OFF'} lit={mic?.active} onClick={mic&&!mic.pending?(mic.active?mic.stop:mic.enable):undefined} ariaLabel={mic?.active?'Turn microphone off':'Turn microphone on'} s={3.8}/>
      <Knob cx={396} cy={57} r={11} value={mic?.micGain??.75} min={0} max={1} onChange={mic?mic.setMicGain:undefined} label="MIC 1 LEVEL" labelY={38} ariaLabel="Microphone level"/>
      <Knob cx={396} cy={94.5} r={11} value={dv('mic2',.5)} min={0} max={1} onChange={sd('mic2')} label="MIC 2 LEVEL" labelY={80.5}/>
      <Knob cx={396} cy={133} r={11} value={dv('mhi')} onChange={sd('mhi')} label="HI" labelY={119.5}/><Knob cx={396} cy={173} r={11} value={dv('mlo')} onChange={sd('mlo')} label="LOW" labelY={159.5}/>
      <rect x="373" y="203" width="44" height="42" fill="#17191b"/><T x={395} y={212} s={3.4} f="#c3cacd" max={40}>SOUND COLOR FX</T>
      <Btn x={376} y={216} w={18} h={8} label="MON" s={3.2} lit={mic?.monitor} onClick={mic&&mic.active?()=>mic.setMonitor(v=>!v):undefined} ariaLabel="Monitor microphone"/><Btn x={397} y={216} w={18} h={8} label="" ariaLabel="Effect"/><Btn x={376} y={230} w={18} h={8} label="" ariaLabel="Effect"/><Btn x={397} y={230} w={18} h={8} label="" ariaLabel="Effect"/>
      <rect x="373" y="253" width="44" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={395} y={260} s={4.6} f="#e8ecee">SAMPLER</T><Btn x={376} y={270} w={38} h={8} label="CUE" s={3.4}/>
      <Knob cx={396} cy={307} r={13} value={dv('svol',.5)} min={0} max={1} onChange={sd('svol')} label="SAMPLER VOL" labelY={285}/>
      <rect x="373" y="329" width="44" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={395} y={336} s={4.2} f="#e8ecee">HEADPHONES</T>
      <Knob cx={397} cy={365} r={11} value={dv('mix',.5)} min={0} max={1} onChange={sd('mix')} label="MIXING" labelY={344}/><Knob cx={398} cy={407} r={11} value={dv('hp',.6)} min={0} max={1} onChange={sd('hp')} label="LEVEL" labelY={382}/>
      <g ref={micLevel} className="mic-ladder"><Ladder x={417.5} y={60} w={3} count={10} h={2.4} gap={1.2}/></g>
      {/* channels */}
      {COLS.map(({n,x})=>{const name=STEM_OF[n],ch=stems?.mix?.[name]||{volume:1,muted:false,solo:false};
        return <g key={n} className="channel">
          <line x1={x-25.5} y1="22" x2={x-25.5} y2="428" stroke="#25282a" strokeWidth=".8"/>
          <Btn x={x-11} y={24} w={22} h={9} label="" ariaLabel={`Channel ${n} input`}/>
          <Knob cx={x} cy={58} r={11.5} value={dv(`trim${n}`)} onChange={sd(`trim${n}`)} label="TRIM" labelY={44}/>
          <Knob cx={x} cy={95.5} r={11} value={dv(`hi${n}`)} min={-12} max={12} step={1} onChange={sd(`hi${n}`)} label="HI" labelY={82}/>
          <Knob cx={x} cy={135.5} r={11} value={dv(`mid${n}`)} min={-12} max={12} step={1} onChange={sd(`mid${n}`)} label="MID" labelY={122}/>
          <Knob cx={x} cy={173} r={11} value={dv(`low${n}`)} min={-12} max={12} step={1} onChange={sd(`low${n}`)} label="LOW" labelY={160}/>
          <rect x={x-25} y="204" width="50" height="42" fill="#1b1e20"/><T x={x} y={213} s={3.6} f="#b3bbbf">COLOR</T>
          <Knob cx={x} cy={228} r={12.5} value={dv(`col${n}`)} onChange={sd(`col${n}`)} ring={false}/><T x={x-19} y={244} s={3.2} f="#aab3b7">LOW</T><T x={x+19} y={244} s={3.2} f="#aab3b7">HI</T>
          <T x={x} y={266} s={15} f="#f1f3f4" w={700} ls="0">{n}</T>
          <Btn x={x-16} y={270} w={32} h={9} label="CUE" s={3.4} lit={ch.solo} onClick={stemOn?()=>stems.change(name,{solo:!ch.solo}):undefined} ariaLabel={`${STEM_NAME[name]} solo`}/>
          <T x={x} y={291} s={3.8} f={stemOn?'#dfe5e8':'#9aa3a7'}>{STEM_NAME[name]}</T>
          <Ladder x={x-24} y={300} w={7} count={12} h={4.6} gap={1.8} levelRef={node=>{if(stems?.levelRefs)(stems.levelRefs.current[name]||=[])[0]=node;}}/><Ladder x={x+17} y={300} w={7} count={12} h={4.6} gap={1.8} levelRef={node=>{if(stems?.levelRefs)(stems.levelRefs.current[name]||=[])[1]=node;}}/>
          {[0,1,2,3,4,5,6,7].map(i=><line key={i} x1={x-12} x2={x+12} y1={302+i*10} y2={302+i*10} stroke="#40464a" strokeWidth=".5"/>)}
          <Fader x={x} y={300} len={78} value={stemOn?ch.volume:.75} onChange={stemOn?v=>stems.change(name,{volume:Math.round(v*100)/100}):undefined} ariaLabel={`${STEM_NAME[name]} channel volume`} disabled={!stemOn}/>
          <T x={x-14} y={392} s={3.2}>A</T><T x={x} y={392} s={3.2} max={14}>THRU</T><T x={x+14} y={392} s={3.2}>B</T>
          <Btn x={x-8} y={395} w={16} h={9} label={ch.muted?'M':''} s={4} lit={ch.muted} onClick={stemOn?()=>stems.change(name,{muted:!ch.muted}):undefined} ariaLabel={`${STEM_NAME[name]} mute`}/>
        </g>;})}
      <T x={535} y={418} s={3.8} f="#b3bbbf">CROSS FADER ASSIGN</T><line x1="450" x2="625" y1="421" y2="421" stroke="#40464a" strokeWidth=".5"/>
      <T x={474} y={457} s={7} f="#e8ecee" w={700} ls="0">❮ A</T><T x={598} y={457} s={7} f="#e8ecee" w={700} ls="0">B ❯</T>
      <T x={535} y={437} s={5} f="#e8ecee" w={800} ls=".14em">ECHO FADER</T>
      <Fader x={498} y={453} len={74} value={dv('xf',.5)} onChange={sd('xf')} vertical={false} ariaLabel="Crossfader (visual)" capW={22} capH={10}/>
      <T x={W/2} y={H+17} s={7} f="#e8ecee" a="middle" w={700} ls=".14em">PERFORMANCE DJ CONTROLLER · ECHO-1000</T>
      {/* master + equalizer (the 7-band archive equalizer lives where the photo has Beat FX) */}
      <rect x="619" y="9" width="75" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={656.5} y={16} s={5.2} f="#e8ecee">MASTER</T>
      <Knob cx={656.5} cy={49} r={14} value={player.volume??.75} min={0} max={1} onChange={v=>archivePlayerCommand('volume',v)} label="LEVEL" labelY={28} ariaLabel="Master level"/>
      <g ref={masterMeter} className="master-ladder"><Ladder x={652} y={71} w={9} count={12} h={4} gap={2.4}/></g>
      <Knob cx={656.5} cy={178} r={11.5} value={dv('booth',.7)} min={0} max={1} onChange={sd('booth')} label="BOOTH MONITOR" labelY={160}/>
      <Btn x={631.5} y={196} w={22} h={9} label="" ariaLabel="Booth"/><Btn x={659.5} y={196} w={22} h={9} label="" ariaLabel="Booth"/>
      <rect x="619" y="214" width="75" height="9" fill="#17191b" stroke="#2a2d2f"/><T x={656.5} y={221} s={5} f="#e8ecee">EQUALIZER</T>
      <rect x="626.5" y="228" width="60" height="14" rx="1" fill="#14202a" stroke="#2a2d2f"/><T x={656.5} y={238} s={5.2} f="#6fd3ff" w={700}>{last}</T>
      {EQUALIZER_BANDS.map((b,i)=>{const cx=i%2?676.5:636.5,cy=264+Math.floor(i/2)*36;return <Knob key={b.key} cx={cx} cy={cy} r={9} value={eq[b.key]??0} min={-12} max={12} step={1} dots={7} onChange={v=>setBand(b.key,b.label.toUpperCase(),v)} label={b.label.toUpperCase()} labelY={cy+15.5} ariaLabel={`${b.label} equalizer gain`}/>;})}
      <g className="ring-btn is-live" role="button" tabIndex={0} aria-label="Reset equalizer" onClick={()=>{archivePlayerCommand('equalizer-reset');setLast('FLAT');}} onKeyDown={e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();archivePlayerCommand('equalizer-reset');setLast('FLAT');}}}>
        <circle cx="656.5" cy="450.5" r="15" fill="#e9eef1" stroke="#4a5155" strokeWidth="3"/><T x={656.5} y={452} s={4.4} f="#111" w={800}>RESET</T></g>
      <T x={656.5} y={473} s={3.6} f="#aab3b7">EQ FLAT</T>
    </g>
  </svg>
  {jogArt&&<img ref={el=>{art.current.el=el;}} className="ddj-jog-art" src={jogArt} alt="" aria-hidden="true" draggable="false" style={{left:`${(JC.x-123)/W*100}%`,top:`${(JC.y-123)/TH*100}%`,width:`${246/W*100}%`,height:`${246/TH*100}%`}}/>}
  </div></div>
  {footerStatus&&createPortal(status,footerStatus)}</div>;
}

// A short landscape phone viewport keeps the original controller.
const performanceLayout='(orientation: landscape) and (min-width: 760px)';
function matchesLandscapeMixer(media){
  const phone=navigator.userAgentData?.mobile===true||/iPhone|iPod|Android.*Mobile|Windows Phone/i.test(navigator.userAgent);
  return media.matches&&!phone;
}

export default function DdjController(props){
  const [landscape,setLandscape]=useState(()=>matchesLandscapeMixer(window.matchMedia(performanceLayout)));
  useEffect(()=>{
    const media=window.matchMedia(performanceLayout);
    const sync=()=>setLandscape(matchesLandscapeMixer(media));
    sync();
    media.addEventListener('change',sync);
    return ()=>media.removeEventListener('change',sync);
  },[]);
  return landscape?<LandscapeDjController {...props}/>:<StandardController {...props}/>;
}
