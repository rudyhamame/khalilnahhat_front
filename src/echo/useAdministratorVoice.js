import {useEffect,useLayoutEffect,useRef} from 'react';
import {useAdministratorCall} from './administratorVoiceContext';

export default function useAdministratorVoice({token,onTranscript,onTask,blocked,services,sessionId}){
 const {voice,configure,subscribe}=useAdministratorCall();
 const callbacks=useRef({onTranscript,onTask});callbacks.current={onTranscript,onTask};
 useLayoutEffect(()=>subscribe({onTask:task=>callbacks.current.onTask?.(task),onTranscript:text=>callbacks.current.onTranscript?.(text)}),[subscribe]);
 useEffect(()=>{
  // Metadata briefly disappears when a new dashboard page mounts. Keep the
  // existing connection configured until this page has loaded its real settings.
  if(token&&services&&sessionId)configure({token,sessionId,services,blocked});
 },[token,services,sessionId,blocked,configure]);
 return voice;
}
