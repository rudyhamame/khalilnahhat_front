import {useCallback,useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';
import {administratorDataChanged} from './administratorChanges';
import {workElementsEndpoint,notifyWorkElementsChanged,subscribeWorkElementsChanged} from './workElementsCatalog';
export function useWorkElementsCatalog(token,{initialize=false}={}){
 const [elements,setElements]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const generation=useRef(0);
 const refresh=useCallback(async(init=false)=>{
  const current=++generation.current;
  try{
   const data=await apiRequest(workElementsEndpoint+(init?'/initialize':''),{token,...(init?{method:'POST',body:{}}:{})});
   if(!Array.isArray(data.items))throw Error('Invalid Work Elements response.');
   if(current===generation.current){setElements(data.items);setError('');}
  }catch(e){if(current===generation.current)setError(e.message);}
  finally{if(current===generation.current)setLoading(false);}
 },[token]);
 useEffect(()=>{setElements([]);setLoading(true);refresh(initialize);const unsubscribe=subscribeWorkElementsChanged(()=>refresh());
  const onAdmin=event=>{if(event.detail?.changes?.some(change=>change.name.startsWith('music_')))refresh();};
  window.addEventListener(administratorDataChanged,onAdmin);
  return()=>{++generation.current;unsubscribe();window.removeEventListener(administratorDataChanged,onAdmin);};
 },[refresh,initialize]);
 useEffect(()=>{if(loading||elements.some(row=>row.id==='lyricist'))return;const timer=setInterval(()=>refresh(),15000);return()=>clearInterval(timer);},[elements,loading,refresh]);
 const update=useCallback(items=>{++generation.current;setElements(items);setError('');notifyWorkElementsChanged();},[]);
 return {elements,loading,error,refresh,update};
}
