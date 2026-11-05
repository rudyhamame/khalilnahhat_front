import {useCallback,useEffect,useRef,useState} from 'react';
import {apiBaseUrl,markEchoProjectChatRead,updateEchoProjectChatPresence} from '../lib/api';

const READ_EVENT='echo:project-chat-read';
export default function useProjectChatNotifications({userId,token,open}){
  const [status,setStatus]=useState({unreadCount:0,onlineAdmins:[]});
  const [presenceError,setPresenceError]=useState('');
  const generation=useRef(0),readVersion=useRef(0),lastRead=useRef(''),pendingRead=useRef('');
  useEffect(()=>{
    const epoch=++generation.current,clientId=crypto.randomUUID();
    let requestNumber=0;
    lastRead.current='';pendingRead.current='';setStatus({unreadCount:0,onlineAdmins:[]});
    const current=()=>generation.current===epoch;
    const offline=()=>{
      requestNumber++;
      fetch(`${apiBaseUrl}/echo-project-chat/presence`,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({clientId,online:false})}).catch(()=>{});
    };
    const heartbeat=async()=>{
      if(!userId||document.hidden||!current())return;
      const number=++requestNumber,version=readVersion.current;
      try{
        const result=await updateEchoProjectChatPresence({clientId,online:true},token);
        if(current()&&number===requestNumber&&version===readVersion.current){setStatus(result);setPresenceError('');}
      }catch{
        if(current()&&number===requestNumber){setStatus(value=>({...value,onlineAdmins:[]}));setPresenceError('Online status is temporarily unavailable.');}
      }
    };
    const visibility=()=>{if(document.hidden)offline();else heartbeat();};
    const read=event=>{
      if(event.detail?.userId!==userId||!current())return;
      readVersion.current++;setStatus(event.detail.status);setPresenceError('');
    };
    heartbeat();const timer=window.setInterval(heartbeat,15000);
    document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',offline);window.addEventListener(READ_EVENT,read);
    return()=>{generation.current++;window.clearInterval(timer);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',offline);window.removeEventListener(READ_EVENT,read);offline();};
  },[userId,token]);
  const markRead=useCallback(async messageId=>{
    if(!open||document.hidden||!messageId||lastRead.current===messageId||pendingRead.current===messageId)return;
    const epoch=generation.current;pendingRead.current=messageId;
    try{
      const result=await markEchoProjectChatRead(messageId,token);
      if(generation.current!==epoch)return;
      lastRead.current=messageId;setStatus(result);
      window.dispatchEvent(new CustomEvent(READ_EVENT,{detail:{userId,status:result}}));
    }catch{/* Keep the unread count until the server confirms a read receipt. */}
    finally{if(generation.current===epoch&&pendingRead.current===messageId)pendingRead.current='';}
  },[open,token,userId]);
  return {...status,presenceError,markRead};
}
