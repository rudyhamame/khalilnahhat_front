import {useEffect,useRef,useState} from 'react';
import {rulerTicks} from '../lib/rulerTicks';
// Rulers over a picture. SCR (default): ticks in SCREEN pixels of the window as it is shown now. OUT: ticks in the picture's real
// OUTPUT pixels (0 to 1280). The tag always states both sizes and the scale between them, so the two can be calibrated by eye.
export default function PixelRuler({width,height}){
  const root=useRef(null),[shown,setShown]=useState([0,0]);
  const [mode,setMode]=useState(()=>{try{return localStorage.getItem('echo-ruler-mode')==='output'?'output':'screen';}catch{return 'screen';}});
  useEffect(()=>{
    const element=root.current;if(!element)return undefined;
    const measure=()=>{const box=element.getBoundingClientRect();setShown(previous=>previous[0]===Math.round(box.width)&&previous[1]===Math.round(box.height)?previous:[Math.round(box.width),Math.round(box.height)]);};
    measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();
  },[]);
  const switchMode=event=>{event.stopPropagation();setMode(previous=>{const next=previous==='output'?'screen':'output';try{localStorage.setItem('echo-ruler-mode',next);}catch{/* Session choice still works. */}return next;});};
  const w=mode==='output'?width:shown[0],h=mode==='output'?height:shown[1];
  const across=rulerTicks(Math.max(1,w)),down=rulerTicks(Math.max(1,h));
  const scale=shown[0]&&width?shown[0]/width:0;
  return <div className="pixel-ruler" ref={root} aria-hidden="true">
    <div className="pr-h">{across.ticks.map(tick=><i key={tick.value} className={tick.major?'is-major':''} style={{left:`${tick.percent}%`}}>{tick.major&&tick.value<w?<b>{tick.value}</b>:null}</i>)}</div>
    <div className="pr-v">{down.ticks.map(tick=><i key={tick.value} className={tick.major?'is-major':''} style={{top:`${tick.percent}%`}}>{tick.major&&tick.value<h?<b>{tick.value}</b>:null}</i>)}</div>
    <button type="button" className="pr-size" onClick={switchMode} title="Switch between output pixels and screen pixels">
      <b>{mode==='output'?'OUT px':'SCR px'}</b> {width} × {height} out · {shown[0]} × {shown[1]} shown{scale?` · ${(scale*100).toFixed(1)}%`:''}
    </button>
  </div>;
}
