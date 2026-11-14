import {useEffect,useLayoutEffect,useRef,useState} from 'react';

// Keep zoom anchored to the point under the mouse/fingers, using the map's
// scroll area rather than changing the page's zoom or scroll position.
export function useConceptMapNavigation({viewport,frame,scale,onZoom,minScale=.1,maxScale=1.75}){
 const latest=useRef({scale,onZoom,minScale,maxScale}),anchor=useRef(null),suppressClick=useRef(false);
 const [panning,setPanning]=useState(false);
 useLayoutEffect(()=>{
  latest.current={scale,onZoom,minScale,maxScale};
  const point=anchor.current,element=viewport.current,content=frame.current;
  if(!point||!element||!content)return;
  anchor.current=null;
  const rect=content.getBoundingClientRect();
  element.scrollLeft+=rect.left+point.x*scale-point.clientX;
  element.scrollTop+=rect.top+point.y*scale-point.clientY;
 },[scale,onZoom,minScale,maxScale,viewport,frame]);
 const zoomTo=(value,point)=>{
  const element=viewport.current,content=frame.current;if(!element||!content)return;
  const current=latest.current,rect=content.getBoundingClientRect(),bounds=element.getBoundingClientRect();
  const clientX=point?.clientX??bounds.left+element.clientWidth/2,clientY=point?.clientY??bounds.top+element.clientHeight/2;
  anchor.current={clientX,clientY,x:point?.worldX??(clientX-rect.left)/current.scale,y:point?.worldY??(clientY-rect.top)/current.scale};
  const next=Math.max(current.minScale,Math.min(current.maxScale,value));
  if(next===current.scale){
   element.scrollLeft+=rect.left+anchor.current.x*next-clientX;
   element.scrollTop+=rect.top+anchor.current.y*next-clientY;
   anchor.current=null;
  }else current.onZoom(next);
 };
 const zoomRef=useRef(zoomTo);useLayoutEffect(()=>{zoomRef.current=zoomTo;});
 useEffect(()=>{
  const element=viewport.current;if(!element)return;
  const pointers=new Map();let pinch=null,dragged=false;
  const geometry=()=>{const [a,b]=[...pointers.values()];return{distance:Math.hypot(a.x-b.x,a.y-b.y),clientX:(a.x+b.x)/2,clientY:(a.y+b.y)/2};};
  const startPinch=()=>{
   const point=geometry(),rect=frame.current.getBoundingClientRect();
   pinch={...point,scale:latest.current.scale,x:(point.clientX-rect.left)/latest.current.scale,y:(point.clientY-rect.top)/latest.current.scale};
   dragged=true;suppressClick.current=true;setPanning(true);
  };
  const down=event=>{
   if(event.pointerType==='mouse'&&event.button!==0)return;
   if(!pointers.size){dragged=false;suppressClick.current=false;}
   pointers.set(event.pointerId,{x:event.clientX,y:event.clientY,startX:event.clientX,startY:event.clientY});
   if(pointers.size===2)startPinch();
  };
  const move=event=>{
   const previous=pointers.get(event.pointerId);if(!previous)return;
   pointers.set(event.pointerId,{...previous,x:event.clientX,y:event.clientY});
   if(pointers.size>=2){
    event.preventDefault();const point=geometry();
    if(pinch?.distance>0)zoomRef.current(pinch.scale*point.distance/pinch.distance,{...point,worldX:pinch.x,worldY:pinch.y});
   }else{
    if(!dragged&&Math.hypot(event.clientX-previous.startX,event.clientY-previous.startY)<5)return;
    event.preventDefault();dragged=true;suppressClick.current=true;setPanning(true);
    element.scrollLeft-=event.clientX-previous.x;element.scrollTop-=event.clientY-previous.y;
   }
  };
  const up=event=>{
   pointers.delete(event.pointerId);pinch=null;
   if(pointers.size>=2)startPinch();
   if(!pointers.size)setPanning(false);
  };
  const reset=()=>{pointers.clear();pinch=null;setPanning(false);};
  const wheel=event=>{
   event.preventDefault();
   const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?element.clientHeight:1);
   zoomRef.current(latest.current.scale*Math.exp(-Math.max(-200,Math.min(200,delta))*.0025),event);
  };
  const gesture=event=>event.preventDefault();
  element.addEventListener('wheel',wheel,{passive:false});
  element.addEventListener('pointerdown',down);
  window.addEventListener('pointermove',move,{passive:false});window.addEventListener('pointerup',up);window.addEventListener('pointercancel',up);window.addEventListener('blur',reset);
  // Pointer events handle the pinch; suppress Safari's page-level gesture.
  element.addEventListener('gesturestart',gesture,{passive:false});element.addEventListener('gesturechange',gesture,{passive:false});
  return()=>{
   element.removeEventListener('wheel',wheel);element.removeEventListener('pointerdown',down);
   window.removeEventListener('pointermove',move);window.removeEventListener('pointerup',up);window.removeEventListener('pointercancel',up);window.removeEventListener('blur',reset);
   element.removeEventListener('gesturestart',gesture);element.removeEventListener('gesturechange',gesture);
  };
 },[viewport,frame]);
 return{zoomTo,panning,onClickCapture:event=>{if(suppressClick.current&&event.detail!==0){event.preventDefault();event.stopPropagation();}}};
}
