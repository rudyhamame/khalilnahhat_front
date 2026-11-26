import {useCallback,useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';

// Both workspaces refresh on focus and ignore stale responses after an account change.
export function useMeetingSchedule({token,client=false,authenticated=true}){
 const [data,setData]=useState({items:[],slots:[]}),[loading,setLoading]=useState(true),[error,setError]=useState('');
 const sequence=useRef(0);
 const refresh=useCallback(async(quiet=false)=>{
  const request=++sequence.current;
  if(quiet!==true)setLoading(true);
  try{
   const next=client?await Promise.all([apiRequest('/meetings/slots'),authenticated?apiRequest('/meetings/mine',{token}):Promise.resolve({items:[]})]):[null,await apiRequest('/meetings/admin',{token})];
   if(request!==sequence.current)return;
   setData({items:next[1].items||[],slots:next[0]?.items||[]});setError('');
   return true;
  }catch(failure){if(request===sequence.current)setError(failure.message||'Meetings could not be loaded. Please try again.');return false;}
  finally{if(request===sequence.current)setLoading(false);}
 },[token,client,authenticated]);
 useEffect(()=>{
  setData({items:[],slots:[]});refresh();
  const onFocus=()=>{if(!document.hidden)refresh(true);};
  const timer=setInterval(onFocus,30000);
  window.addEventListener('focus',onFocus);document.addEventListener('visibilitychange',onFocus);
  return()=>{sequence.current++;clearInterval(timer);window.removeEventListener('focus',onFocus);document.removeEventListener('visibilitychange',onFocus);};
 },[refresh]);
 return {...data,loading,error,refresh};
}
