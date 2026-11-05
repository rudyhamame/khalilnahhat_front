import {useCallback,useEffect,useRef} from 'react';
import {acknowledgeEchoProjectChatMessages} from '../lib/api';

// Receipt times come from the server. Failed acknowledgements stay retryable.
export default function useProjectChatMessageReceipts({token,userId}){
  const state=useRef({epoch:0,delivered:new Set(),seen:new Set(),pending:new Set()});
  useEffect(()=>{
    const current={epoch:state.current.epoch+1,delivered:new Set(),seen:new Set(),pending:new Set()};state.current=current;
    return()=>{if(state.current===current)state.current={...current,epoch:current.epoch+1};};
  },[token,userId]);
  return useCallback(async(items,seen)=>{
    if(seen&&document.hidden)return;
    const current=state.current,level=seen?'seen':'delivered';
    const ids=[...new Set(items.filter(item=>item.senderId!==userId&&item.id).map(item=>item.id))].filter(id=>!current[level].has(id)&&!current.pending.has(level+':'+id)).slice(0,200);
    if(!ids.length)return;
    ids.forEach(id=>current.pending.add(level+':'+id));
    try{
      const result=await acknowledgeEchoProjectChatMessages(ids,seen,token);
      if(result.acknowledged!==true||state.current!==current)return;
      for(const id of ids){current.delivered.add(id);if(seen)current.seen.add(id);}
      // Keep acknowledgement memory bounded in a long-running admin dashboard.
      for(const set of [current.delivered,current.seen])while(set.size>500)set.delete(set.values().next().value);
    }catch{/* Retry the next time these messages are fetched or displayed. */}
    finally{ids.forEach(id=>current.pending.delete(level+':'+id));}
  },[token,userId]);
}
