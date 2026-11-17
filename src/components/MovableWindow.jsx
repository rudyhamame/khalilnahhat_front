import {useRef,useState} from 'react';
import {GripHorizontal,X} from 'lucide-react';

// A floating window the admin can drag anywhere by its title bar (or move with the arrow keys while the bar has focus; Shift moves further).
export default function MovableWindow({title,subtitle,label,onClose,children,width=520,className=''}){
 const [spot,setSpot]=useState({x:Math.max(16,window.innerWidth-width-40),y:96}),drag=useRef(null);
 const clamp=(x,y)=>({x:Math.max(0,Math.min(window.innerWidth-120,x)),y:Math.max(0,Math.min(window.innerHeight-60,y))});
 const down=event=>{if(event.target.closest('button'))return;drag.current={dx:event.clientX-spot.x,dy:event.clientY-spot.y};event.currentTarget.setPointerCapture(event.pointerId);};
 const move=event=>{if(drag.current)setSpot(clamp(event.clientX-drag.current.dx,event.clientY-drag.current.dy));};
 const up=()=>{drag.current=null;};
 const key=event=>{const step=event.shiftKey?60:20,delta={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]}[event.key];if(!delta)return;event.preventDefault();setSpot(current=>clamp(current.x+delta[0],current.y+delta[1]));};
 return <div className={`djb-prefs-popup ${className}`} role="dialog" aria-label={label||title} style={{left:spot.x,top:spot.y,width:`min(${width}px,calc(100vw - 24px))`}}>
  <header tabIndex={0} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key} aria-label="Move this window: drag, or use the arrow keys"><GripHorizontal size={16} aria-hidden="true"/><strong>{title}</strong>{subtitle&&<small>{subtitle}</small>}<button type="button" aria-label={`Close ${title}`} onClick={onClose}><X size={16}/></button></header>
  {children}
 </div>;
}
