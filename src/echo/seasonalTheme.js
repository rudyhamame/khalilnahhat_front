import {useEffect,useState} from 'react';
import {apiRequest} from '../lib/api';
export const DEFAULT_SEASONAL_THEME={revision:0,enabled:false,lights:true,snow:false,audio:{enabled:false,archiveIds:[]}};
export function announceSeasonalTheme(item){window.dispatchEvent(new CustomEvent('echo:seasonal-theme-changed',{detail:item}));}
export function useSeasonalTheme(){
 const [theme,setTheme]=useState(DEFAULT_SEASONAL_THEME);
 useEffect(()=>{let alive=true;const refresh=()=>apiRequest('/seasonal-theme').then(({item})=>{if(alive&&typeof item?.enabled==='boolean')setTheme(item);}).catch(()=>{});refresh();const onChanged=event=>{if(alive&&typeof event.detail?.enabled==='boolean')setTheme(event.detail);};window.addEventListener('echo:seasonal-theme-changed',onChanged);const onVisible=()=>{if(document.visibilityState==='visible')refresh();};window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',onVisible);return()=>{alive=false;window.removeEventListener('echo:seasonal-theme-changed',onChanged);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',onVisible);};},[]);
 return theme;
}
