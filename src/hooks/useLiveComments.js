import {useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';

const POLL_MS=2000,MAX_BACKOFF_MS=15000;
const time=value=>{const ms=new Date(value).getTime();return Number.isFinite(ms)?ms:0;};

// Live comments for the host. One non-overlapping poll per session: slow or failed requests back off instead of piling up, the last good
// list stays on screen, and a failure never blocks the controls. The host's own comment appears at once and is confirmed (or marked "not sent").
export function useLiveComments({token,session,enabled}){
  const [server,setServer]=useState({session:null,items:[],loaded:false});
  const [online,setOnline]=useState(true);
  const [local,setLocal]=useState([]);      // comments sent from here that the server has not returned yet
  const [busy,setBusy]=useState({});         // per-comment action in progress
  const [notice,setNotice]=useState('');
  const kick=useRef(()=>{}),temp=useRef(0),mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);

  useEffect(()=>{
    setServer(current=>current.session===session?current:{session,items:[],loaded:false});
    setLocal([]);setBusy({});setNotice('');setOnline(true);
    if(!enabled||!token||!session)return undefined;
    let cancelled=false,timer=0,failures=0,running=false,controller=null;
    const schedule=delay=>{clearTimeout(timer);if(!cancelled)timer=setTimeout(tick,delay);};
    const refresh=async()=>{
      if(running)return;running=true;controller=new AbortController();
      try{
        const data=await apiRequest('/live-comments/admin?session='+encodeURIComponent(session),{token,signal:controller.signal});
        if(cancelled)return;
        if(data.session!==session)throw new Error('session changed');
        failures=0;setOnline(true);
        setServer({session,items:Array.isArray(data.items)?data.items:[],loaded:true});
        setLocal(current=>current.filter(item=>item.failed));
      }catch{
        if(cancelled)return;
        failures++;if(failures>=2)setOnline(false);   // one hiccup is not worth a warning
        setServer(current=>current.session===session?{...current,loaded:true}:current);
      }finally{running=false;}
      schedule(failures?Math.min(MAX_BACKOFF_MS,POLL_MS*2**(failures-1)):POLL_MS);
    };
    // Hidden tabs do not poll; showing the tab again fetches straight away.
    const tick=()=>{if(document.hidden){schedule(POLL_MS);return;}void refresh();};
    const onVisible=()=>{if(!document.hidden&&!cancelled){clearTimeout(timer);void refresh();}};
    kick.current=()=>{clearTimeout(timer);void refresh();};
    document.addEventListener('visibilitychange',onVisible);
    window.addEventListener('online',onVisible);
    void refresh();
    return()=>{cancelled=true;clearTimeout(timer);controller?.abort();kick.current=()=>{};document.removeEventListener('visibilitychange',onVisible);window.removeEventListener('online',onVisible);};
  },[token,session,enabled]);

  const guard=useCallback(async(id,work)=>{
    if(!session)return false;
    setBusy(current=>({...current,[id]:true}));setNotice('');
    try{await work();kick.current();return true;}
    catch(error){if(mounted.current)setNotice(error?.message||'That did not save. Try again.');return false;}
    finally{if(mounted.current)setBusy(current=>{const next={...current};delete next[id];return next;});}
  },[session]);

  const send=useCallback(async(text,retryId='')=>{
    const body=text.trim();if(!body||!session)return false;
    const id=retryId||'tmp-'+(++temp.current);
    setNotice('');
    setLocal(current=>retryId?current.map(item=>item.id===id?{...item,pending:true,failed:false,error:''}:item):[...current,{id,name:'You',text:body,createdAt:new Date().toISOString(),pending:true,mine:true}]);
    try{
      const data=await apiRequest('/live-comments',{token,method:'POST',body:{session,text:body}});
      if(!mounted.current)return true;
      setLocal(current=>current.filter(item=>item.id!==id));
      if(data?.item)setServer(current=>current.session!==session||current.items.some(item=>item.id===data.item.id)?current:{...current,items:[...current.items,data.item]});
      kick.current();return true;
    }catch(error){
      if(mounted.current)setLocal(current=>current.map(item=>item.id===id?{...item,pending:false,failed:true,error:error?.message||'Not sent.'}:item));
      return false;
    }
  },[token,session]);

  const discard=useCallback(id=>setLocal(current=>current.filter(item=>item.id!==id)),[]);
  const hide=useCallback((id,hidden)=>guard(id,()=>apiRequest('/live-comments/'+id+'/moderation',{token,method:'PATCH',body:{session,hidden}})),[guard,token,session]);
  const reply=useCallback((id,text)=>guard(id,()=>apiRequest('/live-comments/'+id+'/reply',{token,method:'POST',body:{session,text:text.trim()}})),[guard,token,session]);

  const items=useMemo(()=>{
    const known=new Set(server.items.map(item=>item.id));
    return [...server.items,...local.filter(item=>!known.has(item.id))].sort((a,b)=>time(a.createdAt)-time(b.createdAt));
  },[server.items,local]);
  const ready=Boolean(session)&&server.session===session;
  return {items,loading:Boolean(session)&&!(ready&&server.loaded),online,busy,notice,clearNotice:()=>setNotice(''),send,discard,hide,reply,refresh:()=>kick.current()};
}
