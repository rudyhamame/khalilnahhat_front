import {useEffect,useRef} from 'react';
import {ChevronLeft,ChevronRight} from 'lucide-react';

// Compact arrow controls page through the actual overflow decorations.
export default function TreeMemoryWheel({page,total,visible,onChange,ar=false}){
 const wheel=useRef(null),maximum=Math.max(0,Math.ceil(total/visible)-1);
 const change=useRef(onChange);change.current=onChange;
 useEffect(()=>{
  const element=wheel.current;
  let accumulated=0;
  const turn=event=>{
   if(event.ctrlKey||!maximum)return;
   event.preventDefault();event.stopPropagation();
   const delta=Math.abs(event.deltaX)>Math.abs(event.deltaY)?event.deltaX:event.deltaY;
   accumulated+=delta*(event.deltaMode===1?16:event.deltaMode===2?element.clientWidth:1);
   if(Math.abs(accumulated)<36)return;
   const steps=Math.trunc(accumulated/36);accumulated-=steps*36;
   change.current(value=>Math.max(0,Math.min(maximum,value+steps)));
  };
  element.addEventListener('wheel',turn,{passive:false});
  return()=>element.removeEventListener('wheel',turn);
 },[maximum]);
 const move=step=>onChange(value=>Math.max(0,Math.min(maximum,value+step)));
 const label=ar?'مرّر لعرض المزيد من زينة الشجرة':'Scroll to explore tree decorations';
 return <div className="tree-memory-wheel" ref={wheel} role="group" aria-label={label} dir="ltr">
  <div className="tree-memory-wheel-controls">
   <button type="button" disabled={!page} onClick={()=>move(-1)} aria-label={ar?'الزينة السابقة':'Previous decorations'}><ChevronLeft size={16} aria-hidden="true"/></button>
   <button type="button" disabled={page>=maximum} onClick={()=>move(1)} aria-label={ar?'المزيد من الزينة':'Next decorations'}><ChevronRight size={16} aria-hidden="true"/></button>
  </div>
  <span className="tree-memory-position" aria-live="polite" aria-atomic="true">{total?`${page*visible+1}–${Math.min(total,(page+1)*visible)} / ${total}`:(ar?'لا توجد عناصر':'No items')}</span>
 </div>;
}
