import {useCallback,useEffect,useRef,useState} from 'react';
import {ARCHIVE_PLAYER_STATE,readArchivePlayerState} from '../lib/archivePlayerBridge';

export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const rad=d=>d*Math.PI/180;
export function usePlayer(){
  const [state,setState]=useState(readArchivePlayerState);
  useEffect(()=>{const on=e=>setState(e.detail);window.addEventListener(ARCHIVE_PLAYER_STATE,on);setState(readArchivePlayerState());return()=>window.removeEventListener(ARCHIVE_PLAYER_STATE,on);},[]);
  return state;
}
export const toSvg=(e,node)=>{const svg=node.ownerSVGElement||node,m=svg.getScreenCTM().inverse(),p=svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform(m);};

// The drawing is ~1000 units wide on screen, so its source sizes (3-5) read as 3-5px; scale them up for legibility.
const TEXT_SCALE=1.35,TEXT_MIN=5.6;
// `max` squeezes a label that renders wider than its box (measured, not estimated) instead of letting it spill over neighbours.
const fitText=max=>el=>{if(!el||!max)return;el.removeAttribute('textLength');el.removeAttribute('lengthAdjust');if(el.getComputedTextLength()>max){el.setAttribute('textLength',max);el.setAttribute('lengthAdjust','spacingAndGlyphs');}};
export function T({x,y,children,s=5,a='middle',f='#dfe5e8',w=700,ls='.03em',max,...rest}){
  const textRef=useCallback(el=>{if(children!=null)fitText(max)(el);},[max,children]);
  return <text ref={textRef} x={x} y={y} fontSize={Math.max(TEXT_MIN,s*TEXT_SCALE)} textAnchor={a} fill={f} fontWeight={w} letterSpacing={ls} {...rest}>{children}</text>;
}

// Rotary: vertical drag, arrow keys, double-click to recentre; sweep -135..+135 degrees with printed scale dots.
export function Knob({cx,cy,r=11,value,min=-1,max=1,step=.01,onChange,label,labelY,ariaLabel,disabled,ring=true,dots=11}){
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
    {label&&<T x={cx} y={labelY===undefined?cy-r-6.8:labelY<cy?Math.min(labelY,cy-r-6.8):Math.max(labelY,cy+r+9.6)} s={4.4} max={44}>{label}</T>}</g>;
}

export function Btn({x,y,w,h,label,sub,lit,onClick,disabled,round,s=4.2,ariaLabel,children}){
  const live=Boolean(onClick)&&!disabled;
  const press=e=>{if(live&&(e.key==='Enter'||e.key===' ')){e.preventDefault();onClick();}};
  return <g className={`btn${live?' is-live':''}${lit?' is-lit':''}`} role={live?'button':undefined} tabIndex={live?0:-1} aria-label={ariaLabel||label} aria-pressed={live&&lit!==undefined?Boolean(lit):undefined} onClick={live?onClick:undefined} onKeyDown={press}>
    {round?<circle cx={x} cy={y} r={w/2}/>:<rect x={x} y={y} width={w} height={h} rx="1.6"/>}
    {label&&<T x={round?x:x+w/2} y={round?y+1.6:y+h/2+1.5} s={s} max={round?w:w-3} f={lit?'#fff':'#e4e9ec'}>{label}</T>}{children}
    {sub&&<T x={round?x:x+w/2} y={round?y+w/2+8:y+h+6.2} s={3.8} max={w-1} f="#b3bbbf">{sub}</T>}</g>;
}

// Vertical (or horizontal) fader. value 0..1, drags with pointer, arrow keys step. disabled = purely decorative position.
export function Fader({x,y,len,value,onChange,vertical=true,ariaLabel,ariaValueText,onReset,disabled,capW=22,capH=11}){
  const live=Boolean(onChange)&&!disabled,last=useRef(value);useEffect(()=>{last.current=value;},[value]);
  const pos=v=>vertical?{cx:x,cy:y+len*(1-v)}:{cx:x+len*v,cy:y};
  const from=e=>{const p=toSvg(e,e.currentTarget);return clamp(vertical?1-(p.y-y)/len:(p.x-x)/len,0,1);};
  const c=pos(value);
  return <g className={`fader${live?' is-live':''}`} role="slider" tabIndex={live?0:-1} aria-label={ariaLabel} aria-valuetext={ariaValueText} aria-orientation={vertical?'vertical':'horizontal'} aria-valuemin={0} aria-valuemax={1} aria-valuenow={Number(value.toFixed(2))} aria-disabled={!live||undefined}
    onPointerDown={e=>{if(!live)return;e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);onChange(from(e));}}
    onPointerMove={e=>{if(live&&e.currentTarget.hasPointerCapture(e.pointerId))onChange(from(e));}}
    onDoubleClick={()=>{if(live)onReset?.();}}
    onKeyDown={e=>{const d={ArrowUp:.05,ArrowRight:.05,ArrowDown:-.05,ArrowLeft:-.05}[e.key];if(live&&d){e.preventDefault();onChange(clamp(last.current+d,0,1));}}}>
    {vertical?<><rect x={x-6} y={y-8} width="12" height={len+16} fill="transparent"/><rect x={x-1.3} y={y-2} width="2.6" height={len+4} rx="1.3" fill="#020202" stroke="#3a3f42" strokeWidth=".5"/></>
      :<><rect x={x-8} y={y-8} width={len+16} height="16" fill="transparent"/><rect x={x-2} y={y-1.3} width={len+4} height="2.6" rx="1.3" fill="#020202" stroke="#3a3f42" strokeWidth=".5"/></>}
    <rect x={c.cx-(vertical?capW:capH)/2} y={c.cy-(vertical?capH:capW)/2} width={vertical?capW:capH} height={vertical?capH:capW} rx="1.6" fill="url(#capGrad)" stroke="#000" strokeWidth=".6"/>
    {vertical?<rect x={c.cx-capW/2+1} y={c.cy-.6} width={capW-2} height="1.2" fill="#f4f6f7"/>:<rect x={c.cx-.6} y={c.cy-capW/2+1} width="1.2" height={capW-2} fill="#f4f6f7"/>}</g>;
}

// Segment ladder lit by a CSS variable (--channel-level 0..1) that the audio engine writes onto the group.
export function Ladder({x,y,w=7,count=12,gap=1.5,h=3.2,metered,levelRef,level}){
  return <g ref={levelRef} className="ladder" style={level!==undefined?{'--channel-level':level}:undefined}>{Array.from({length:count},(_,i)=><rect key={i} className={i>count-3?'hot':i>count-6?'warn':''} x={x} y={y+(count-1-i)*(h+gap)} width={w} height={h} style={{'--i':i,'--n':count}}/>)}</g>;
}

