import {useEffect,useState} from 'react';
import {apiRequest} from '../lib/api';
import {pollStudioRecording,studioRecordingSnapshot,studioServerRecording,studioRecordingSettled} from '../lib/studioRecordingMonitor';

export function useStudioRecordingMonitor({enabled,token,diskStore,liveNow,setLocalFiles}) {
 const [pipelineLocal,setPipelineLocal]=useState(null),[remote,setRemote]=useState(null),[error,setError]=useState('');
 useEffect(()=>{
  if(!enabled)return undefined;
  return pollStudioRecording({delay:1500,read:async()=>{
   const store=diskStore.current;if(!store)return null;
   const sessions=await store.sessions();
   // A folder picked while the old read was pending must win.
   return store===diskStore.current?studioRecordingSnapshot(sessions,{live:liveNow.current}):null;
  },onValue:snapshot=>{
   if(!snapshot)return;
   setError('');
   setLocalFiles(previous=>JSON.stringify(previous)===JSON.stringify(snapshot.files)?previous:snapshot.files);
   setPipelineLocal(previous=>JSON.stringify(previous)===JSON.stringify(snapshot.local)?previous:snapshot.local);
  },onError:error=>setError('Could not read recording progress: '+(error.message||'folder unavailable.'))});
 },[enabled,diskStore,liveNow,setLocalFiles]);
 const id=pipelineLocal?.id,localOnly=pipelineLocal?.localOnly;
 useEffect(()=>{
  if(!enabled||!id||localOnly||!token)return undefined;
  return pollStudioRecording({delay:4000,read:signal=>apiRequest('/admin/live-recordings',{token,signal}),onValue:result=>{
   const recording=studioServerRecording(result.items||[],id);
   setRemote({token,id,recording});
   return !studioRecordingSettled(recording);
  }});
 },[enabled,token,id,localOnly]);
 // No previous recording/account status may leak into the current progress panel.
 const serverRec=enabled&&!localOnly&&remote?.token===token&&remote?.id===id?remote.recording:null;
 return {pipelineLocal,serverRec,monitorError:error};
}
