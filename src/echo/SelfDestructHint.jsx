import {useEffect,useRef,useState} from 'react';
import {AlertCircle,CheckCircle2,Info,X} from 'lucide-react';
import './selfDestructHint.css';
const ICON={error:AlertCircle,ok:CheckCircle2,info:Info};
// A one-line message that removes itself: errors stay a little longer than confirmations, and hovering or focusing it pauses the countdown.
export default function SelfDestructHint({kind='info',children,onDone,ms}){
 const text=typeof children==='string'?children:'';
 const life=ms??Math.min(14000,Math.max(kind==='error'?7000:4500,3500+text.length*55));
 const [paused,setPaused]=useState(false),[leaving,setLeaving]=useState(false),done=useRef(onDone);done.current=onDone;
 // Leaving plays the exit animation first, then the message is removed.
 const leave=()=>setLeaving(true);
 useEffect(()=>{setLeaving(false);},[text]);
 useEffect(()=>{if(paused||leaving)return undefined;const timer=setTimeout(leave,life);return()=>clearTimeout(timer);},[paused,leaving,life,text]);
 useEffect(()=>{if(!leaving)return undefined;const timer=setTimeout(()=>done.current?.(),220);return()=>clearTimeout(timer);},[leaving]);
 const Icon=ICON[kind]||Info;
 return <span className={`sd-hint is-${kind}${paused?' is-paused':''}${leaving?' is-leaving':''}`} role={kind==='error'?'alert':'status'} style={{'--sd-life':`${life}ms`}} onMouseEnter={()=>setPaused(true)} onMouseLeave={()=>setPaused(false)} onFocus={()=>setPaused(true)} onBlur={()=>setPaused(false)}>
  <Icon size={15} aria-hidden="true"/><span className="sd-hint-text">{children}</span>
  <button type="button" className="sd-hint-close" aria-label="Dismiss" onClick={leave}><X size={13} aria-hidden="true"/></button>
  <i className="sd-hint-life" key={text} aria-hidden="true"/>
 </span>;
}
