import {useEffect,useState} from 'react';
import {apiRequest} from '../lib/api';

const EMPTY=[];
export function useLiveSetList({token,session,enabled=true,initial=EMPTY}) {
 const [feed,setFeed]=useState({session:null,items:[]});
 useEffect(()=>{
  if(!token||!session||!enabled)return;
  let cancelled=false,timer;
  const controller=new AbortController();
  const poll=async()=>{
   try {
    const data=await apiRequest('/live-sessions?session='+encodeURIComponent(session),{token,signal:controller.signal});
    if(!cancelled&&data.session===session)setFeed({session,items:data.items||[]});
   }catch{/* The next poll retries without showing another session's queue. */}
   finally{if(!cancelled)timer=setTimeout(poll,2500);}
  };
  poll();return()=>{cancelled=true;controller.abort();clearTimeout(timer);};
 },[token,session,enabled,initial]);
 if(!token||!session||!enabled)return [];
 return feed.session===session?feed.items:initial.filter(item=>item.broadcastSessionId===session);
}
