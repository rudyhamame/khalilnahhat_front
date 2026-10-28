import {createPortal} from 'react-dom';
import {useEffect,useState} from 'react';
import {useSeasonalTheme} from './seasonalTheme';
import './seasonalSnow.css';
const flakes=Array.from({length:36},(_,i)=>({left:`${(i*37+11)%100}%`,'--snow-size':`${2+i%4}px`,'--snow-drift':`${(i%2?1:-1)*(14+i%7)}vw`,'--snow-duration':`${14+i%11}s`,'--snow-delay':`${-(i*3.7)%25}s`,'--snow-opacity':.25+(i%5)*.1}));
export default function SeasonalSnow(){
 const theme=useSeasonalTheme(),[route,setRoute]=useState(()=>typeof window==='undefined'?'':window.location.pathname);
 useEffect(()=>{const update=()=>setRoute(document.documentElement.dataset.echoRoute||window.location.pathname);window.addEventListener('echo:navigation',update);window.addEventListener('popstate',update);return()=>{window.removeEventListener('echo:navigation',update);window.removeEventListener('popstate',update);};},[]);
 const dashboardRoute=/^\/(?:admin(?:\/|$)|admin-client(?:\/|$)|client-dashboard(?:\/|$)|dashboard(?:\/|$))/.test(route);
 if(!theme.enabled||!theme.snow||dashboardRoute)return null;
 return createPortal(<div className="global-seasonal-snow" aria-hidden="true">{flakes.map((style,i)=><i key={i} style={style}/>)}</div>,document.body);
}
