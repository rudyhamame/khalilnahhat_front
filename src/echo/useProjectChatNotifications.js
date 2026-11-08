import {useCallback,useEffect,useRef,useState} from 'react';
import {markEchoProjectChatRead,fetchEchoProjectChatStatus} from '../lib/api';

import {connectProjectChatSocket} from './projectChatSocket';

const READ_EVENT='echo:project-chat-read';
export default function useProjectChatNotifications({userId,token,open,onDelivery}){
  const [status,setStatus]=useState({unreadCount:0,onlineAdmins:[],admins:[]});
  const [presenceError,setPresenceError]=useState('');
  const generation=useRef(0),readVersion=useRef(0),readRequest=useRef(0),lastRead=useRef(''),pendingRead=useRef('');
  const onDeliveryRef=useRef(onDelivery);onDeliveryRef.current=onDelivery;
  useEffect(()=>{
    const epoch=++generation.current;
    let requestNumber=0;
    lastRead.current='';pendingRead.current='';setStatus({unreadCount:0,onlineAdmins:[],admins:[]});
    const current=()=>generation.current===epoch;
    const refreshStatus=async()=>{
      if(!userId||document.hidden||!current())return;
      const number=++requestNumber,version=readVersion.current;
      try{
        const result=await fetchEchoProjectChatStatus(token);
        if(current()&&number===requestNumber){
          // Receiving a message envelope delivers it even with the chat closed.
          onDeliveryRef.current?.(result.deliveryItems||[],false);
          if(version===readVersion.current){setStatus(result);setPresenceError('');}
        }
      }catch{
        if(current()&&number===requestNumber){setStatus(value=>({...value,onlineAdmins:[]}));setPresenceError('Online status is temporarily unavailable.');}
      }
    };
    const visibility=()=>{if(document.hidden)requestNumber++;else refreshStatus();};
    const read=event=>{
      if(event.detail?.userId!==userId||!current())return;
      readRequest.current++;readVersion.current++;setStatus(event.detail.status);setPresenceError('');
    };
    const disconnectSocket=connectProjectChatSocket({token,onChange:message=>{
      if(!current())return;
      if(['messages','receipts','topics','connected'].includes(message.reason))window.dispatchEvent(new CustomEvent('echo:project-chat-changed',{detail:{userId,...message}}));
      if(message.reason!=='receipts')refreshStatus();
    },onError:message=>{if(current()){requestNumber++;setStatus(value=>({...value,onlineAdmins:[],admins:(value.admins||[]).map(admin=>({...admin,online:false}))}));setPresenceError(message);}}});
    refreshStatus();
    document.addEventListener('visibilitychange',visibility);window.addEventListener(READ_EVENT,read);
    return()=>{disconnectSocket();generation.current++;document.removeEventListener('visibilitychange',visibility);window.removeEventListener(READ_EVENT,read);};
  },[userId,token]);
  const markRead=useCallback(async (messageId,topicId='general')=>{
    if(!open||document.hidden||!messageId||lastRead.current===messageId||pendingRead.current===messageId)return;
    const epoch=generation.current,number=++readRequest.current;pendingRead.current=messageId;
    try{
      const result=await markEchoProjectChatRead(messageId,token,topicId);
      if(generation.current!==epoch||number!==readRequest.current)return;
      lastRead.current=messageId;setStatus(result);
      window.dispatchEvent(new CustomEvent(READ_EVENT,{detail:{userId,status:result}}));
    }catch{/* Keep the unread count until the server confirms a read receipt. */}
    finally{if(generation.current===epoch&&pendingRead.current===messageId)pendingRead.current='';}
  },[open,token,userId]);
  return {...status,presenceError,markRead};
}
