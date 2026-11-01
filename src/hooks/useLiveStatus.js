import {useCallback,useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';

// One non-overlapping poll per mounted console. Old account/session responses
// cannot replace a newer console or undo a completed control action.
export function useLiveStatus({token,admin=false,enabled=true,initial=null}) {
  const binding=admin?token||'signed-out':'audience';
  const revision=useRef(0);
  const [state,setState]=useState({binding,item:initial,error:'',loading:true});
  const [retry,setRetry]=useState(0);
  const refresh=useCallback(()=>setRetry(value=>value+1),[]);
  const update=useCallback(item=>{revision.current++;setState({binding,item,error:'',loading:false});},[binding]);
  useEffect(()=>{
    let cancelled=false,timer;
    const controller=new AbortController();
    if(!enabled||(admin&&!token))return undefined;
    const poll=async()=>{
      const version=revision.current;
      try {
        const data=await apiRequest(admin?'/live-stream/obs':'/live-stream',{token:admin?token:undefined,signal:controller.signal});
        if(!cancelled&&version===revision.current)setState({binding,item:data.item,error:'',loading:false});
      }catch(error){if(!cancelled)setState(current=>({...current,binding,error:error.message||'Live status unavailable.',loading:false}));}
      finally {if(!cancelled)timer=setTimeout(poll,5000);}
    };
    poll();
    return()=>{cancelled=true;controller.abort();clearTimeout(timer);};
  },[token,admin,enabled,binding,retry]);
  return {...(state.binding===binding?state:{item:null,error:'',loading:true}),refresh,update};
}
export const liveSessionIdentity=stream=>stream?.broadcastSessionId||stream?.webrtcRoomName||stream?.obs?.roomName||'';
