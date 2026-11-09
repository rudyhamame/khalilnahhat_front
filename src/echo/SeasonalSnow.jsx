import {createPortal} from 'react-dom';
import {useEffect,useRef,useState} from 'react';
import {useSeasonalTheme} from './seasonalTheme';
import './seasonalSnow.css';
const flakes=Array.from({length:36},(_,i)=>({left:`${(i*37+11)%100}%`,'--snow-size':`${2+i%4}px`,'--snow-drift':`${(i%2?1:-1)*(14+i%7)}vw`,'--snow-duration':`${14+i%11}s`,'--snow-delay':`${-(i*3.7)%25}s`,'--snow-opacity':.25+(i%5)*.1}));
export default function SeasonalSnow(){
 const theme=useSeasonalTheme(),[route,setRoute]=useState(()=>typeof window==='undefined'?'':window.location.pathname);
 useEffect(()=>{const update=()=>setRoute(document.documentElement.dataset.echoRoute||window.location.pathname);window.addEventListener('echo:navigation',update);window.addEventListener('popstate',update);return()=>{window.removeEventListener('echo:navigation',update);window.removeEventListener('popstate',update);};},[]);
 const snow=useRef(null);
 const [backgroundHost,setBackgroundHost]=useState(null);
 useEffect(()=>{
  const update=()=>setBackgroundHost(document.querySelector('.hero-language-entry')?.closest('.hero-introduction')||null);
  const observer=new MutationObserver(update);observer.observe(document.body,{childList:true,subtree:true});update();
  return()=>observer.disconnect();
 },[]);
 // Keep flakes out of interactive surfaces even when controls live in
 // independent portals or isolated stacking contexts.
 useEffect(()=>{
  if(!snow.current)return;
  let frame=0,lastMask='';
  const update=()=>{
   frame=0;const layer=snow.current;if(!layer)return;
   const width=window.innerWidth,height=window.innerHeight;
   const holes=[...document.querySelectorAll('button,a,[role="button"],input,select,textarea')].flatMap(element=>{
    const rect=element.getBoundingClientRect();
    if(!rect.width||!rect.height||rect.right<0||rect.bottom<0||rect.left>width||rect.top>height)return [];
    const css=getComputedStyle(element);if(css.visibility==='hidden'||css.display==='none')return [];
    const radius=Math.min(parseFloat(css.borderTopLeftRadius)||0,rect.width/2,rect.height/2);
    return [`<rect x="${rect.left-2}" y="${rect.top-2}" width="${rect.width+4}" height="${rect.height+4}" rx="${radius}" fill="black"/>`];
   }).join('');
   const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs><mask id="controls"><rect width="100%" height="100%" fill="white"/>${holes}</mask></defs><rect width="100%" height="100%" fill="white" mask="url(#controls)"/></svg>`;
   const mask=`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
   if(mask!==lastMask){lastMask=mask;layer.style.maskImage=mask;layer.style.webkitMaskImage=mask;}
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  const observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class','style','hidden','open']});
  const resize=new ResizeObserver(schedule);resize.observe(document.documentElement);
  window.addEventListener('scroll',schedule,true);window.addEventListener('resize',schedule);update();
  return()=>{cancelAnimationFrame(frame);observer.disconnect();resize.disconnect();window.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);};
 },[theme.enabled,theme.snow,route,backgroundHost]);
 const dashboardRoute=/^\/(?:admin(?:\/|$)|admin-client(?:\/|$)|client-dashboard(?:\/|$)|dashboard(?:\/|$))/.test(route);
 if(!theme.enabled||!theme.snow||dashboardRoute||backgroundHost)return null;
 return createPortal(<div ref={snow} className="global-seasonal-snow" aria-hidden="true">{flakes.map((style,i)=><i key={i} style={style}/>)}</div>,backgroundHost||document.body);
}
