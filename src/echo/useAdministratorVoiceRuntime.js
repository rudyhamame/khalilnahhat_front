import {isAdministratorWorkViewOpen} from './administratorActivity';
import {useCallback,useEffect,useRef,useState} from 'react';
import {apiRequest} from '../lib/api';
import {createAdminRealtimeTransport} from '../lib/adminRealtimeTransport';
const terminal=new Set(['COMPLETED','FAILED','CANCELLED']);
export default function useAdministratorVoiceRuntime({token,onTranscript,onTask,blocked,services,sessionId}){
 const [active,setActive]=useState(false),[phase,setPhase]=useState('idle'),[error,setError]=useState('');
 const runtime=useRef(null),callbacks=useRef({onTranscript,onTask,blocked});callbacks.current={onTranscript,onTask,blocked};
 const supported=typeof window!=='undefined'&&services?.text?.enabled&&services?.voice?.enabled&&Boolean(navigator.mediaDevices?.getUserMedia)&&(services.voice.provider==='alibaba'?Boolean(window.AudioWorkletNode):Boolean(window.RTCPeerConnection));
 const stop=useCallback(()=>{const current=runtime.current;runtime.current=null;current?.controller.abort();current?.timers.forEach(clearTimeout);current?.transport.stop();setActive(false);setPhase('idle');},[]);
 const start=()=>{
  if(runtime.current||!supported||callbacks.current.blocked||!sessionId)return;
  const current={controller:new AbortController(),timers:new Set(),seen:new Set(),waiting:new Set(),notifications:[]};runtime.current=current;setActive(true);setPhase('connecting');setError('');
  const isCurrent=()=>runtime.current===current&&!current.controller.signal.aborted;
  const request=(path,body)=>apiRequest('/admin/ai-administrator'+path,{token,...(body?{method:'POST',body}:{}),signal:current.controller.signal});
  const later=fn=>{const timer=setTimeout(()=>{current.timers.delete(timer);if(isCurrent())fn();},2000);current.timers.add(timer);};
  const receipt=task=>({taskId:task._id,state:task.state,message:task.result?.message||task.error||null,verifiedActions:task.result?.verifiedActions||0,approvalRequired:task.state==='AWAITING_APPROVAL',instruction:task.state==='AWAITING_APPROVAL'?'Wait for the user to CLICK Approve or Reject in the chat. Do not submit it again.':undefined});
  const respond=()=>{if(!isCurrent())return;if(current.responding){current.needsResponse=true;return;}current.responding=true;current.transport.send({type:'response.create'});current.needsResponse=false;};
  const notify=payload=>{if(!isCurrent())return;current.transport.send({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:'Backend status update, not a new request. Explain this task receipt; do not repeat the action: '+JSON.stringify(payload)}]}});respond();};
  const handleTool=async item=>{
   if(item.name!=='administrator_request'||typeof item.call_id!=='string'||current.seen.has(item.call_id))return;current.seen.add(item.call_id);current.waiting.add(item.call_id);setPhase('working');
   let taskId,delivered=false,lastApproval;
   const deliver=payload=>{if(!isCurrent())return;if(!delivered){current.transport.send({type:'conversation.item.create',item:{type:'function_call_output',call_id:item.call_id,output:JSON.stringify(payload)}});delivered=true;respond();}else notify(payload);};
   const poll=async()=>{
    if(!isCurrent())return;
    try{
     const {item:task}=await request('/tasks/'+encodeURIComponent(taskId));if(!isCurrent())return;callbacks.current.onTask?.(task);
     if(task.state==='AWAITING_APPROVAL'){
      setPhase('approval');const digest=task.pending?.digest;if(lastApproval!==digest){deliver(receipt(task));lastApproval=digest;}
     }else if(terminal.has(task.state)){deliver(receipt(task));current.waiting.delete(taskId);setPhase(current.waiting.size?'working':'listening');return;}
     later(poll);
    }catch(e){if(isCurrent()){deliver({ok:false,error:e.message,instruction:'The task status could not be confirmed. Do not claim success or resubmit automatically. Check the task in chat.'});current.waiting.delete(taskId);setError(e.message);}}
   };
   try{const args=JSON.parse(item.arguments);const result=await request('/voice/task',{callId:current.transport.callId,toolCallId:item.call_id,command:args.command});if(!isCurrent())return;taskId=result.item.taskId;current.waiting.delete(item.call_id);current.waiting.add(taskId);await poll();}
   catch(e){if(isCurrent()){current.waiting.delete(item.call_id);deliver({ok:false,error:e.message,instruction:'Do not claim completion or retry automatically.'});setError(e.message);setPhase('listening');}}
  };
  current.transport=createAdminRealtimeTransport({token,provider:services.voice.provider,sessionId,
   onReady:()=>{if(isCurrent())setPhase('listening');},
   onError:e=>{if(isCurrent()){stop();setError(e.message);}},
   onEvent:event=>{
    if(!isCurrent())return;
    if(event.type==='conversation.item.input_audio_transcription.completed'&&event.transcript)callbacks.current.onTranscript?.(event.transcript.slice(0,8000));
    if(event.type==='input_audio_buffer.speech_started')setPhase('listening');
    if(event.type==='response.created'){current.responding=true;setPhase('speaking');}
    if(event.type==='response.done'){
     current.responding=false;
     if(event.response?.status==='completed')for(const item of event.response.output||[])if(item.type==='function_call')handleTool(item);
     if(current.needsResponse)respond();
     if(!current.waiting.size)setPhase('listening');
    }
   }
  });current.transport.start();
 };
 useEffect(()=>{if(blocked&&runtime.current)stop();},[blocked,stop]);
 useEffect(()=>{const hide=()=>{if(document.hidden&&!isAdministratorWorkViewOpen())stop();};document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',stop);return()=>{stop();document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',stop);};},[token,sessionId,services?.revision,stop]);
 return {active,phase,error,supported,start,stop};
}
