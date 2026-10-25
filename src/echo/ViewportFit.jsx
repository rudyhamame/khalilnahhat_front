import {useLayoutEffect,useRef} from 'react';
import './viewportFit.css';

// Fit the natural composition to its available space, rather than cropping it
// or changing the height of the surrounding viewport.
export default function ViewportFit({children}) {
  const content=useRef(null);
  useLayoutEffect(()=>{
    const element=content.current,parent=element.parentElement;
    let frame=0,alive=true;
    const update=()=>{
      frame=0;if(!alive)return;
      const css=getComputedStyle(parent);
      const left=parseFloat(css.paddingLeft)||0,right=parseFloat(css.paddingRight)||0,top=parseFloat(css.paddingTop)||0,bottom=parseFloat(css.paddingBottom)||0;
      const width=Math.max(1,parent.clientWidth-left-right),height=Math.max(1,parent.clientHeight-top-bottom);
      const display=css.display==='grid'?'grid':css.display==='flex'?'flex':'block';
      Object.assign(element.style,{width:`${width}px`,display,gridTemplateColumns:css.gridTemplateColumns==='none'?'none':css.gridTemplateColumns,gap:css.gap,flexDirection:css.flexDirection,alignItems:css.alignItems,justifyContent:css.justifyContent});
      const naturalWidth=Math.max(element.offsetWidth,element.scrollWidth),naturalHeight=Math.max(1,element.offsetHeight,element.scrollHeight);
      const scale=Math.min(1,width/naturalWidth,height/naturalHeight);
      Object.assign(element.style,{left:`${left+(width-naturalWidth*scale)/2}px`,top:`${top}px`,transform:`scale(${scale})`});
      parent.style.setProperty('--viewport-content-scale',String(scale));
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    const observer=new ResizeObserver(schedule);observer.observe(parent);observer.observe(element);
    const mutations=new MutationObserver(schedule);mutations.observe(element,{childList:true,subtree:true,characterData:true});
    document.fonts?.ready.then(schedule);window.addEventListener('resize',schedule);
    update();return()=>{alive=false;observer.disconnect();mutations.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',schedule);};
  },[]);
  return <div className="viewport-fit-content" ref={content}>{children}</div>;
}
