import {useEffect,useRef,useState} from 'react';
import {Mic,Square} from 'lucide-react';
import {captureAdministratorSpeech,administratorAudioSupported} from '../lib/administratorAudio';
import './speechToText.css';
export default function AdministratorDictation({token,config,value,onChange,onListeningChange,disabled}){
 const [state,setState]=useState('idle'),[error,setError]=useState('');const session=useRef(null),epoch=useRef(0),callbacks=useRef({onChange,onListeningChange});callbacks.current={onChange,onListeningChange};
 const cancel=()=>{epoch.current++;session.current?.cancel();session.current=null;setState('idle');callbacks.current.onListeningChange(false);};
 useEffect(()=>{const hide=()=>{if(document.hidden)cancel();};window.addEventListener('pagehide',cancel);document.addEventListener('visibilitychange',hide);return()=>{cancel();window.removeEventListener('pagehide',cancel);document.removeEventListener('visibilitychange',hide);};},[token,config?.provider,config?.model,config?.enabled]);
 useEffect(()=>{if(disabled)cancel();},[disabled]);
 const start=()=>{const current=++epoch.current,base=value.trim();setError('');setState('listening');callbacks.current.onListeningChange(true);const update=text=>{if(current===epoch.current)callbacks.current.onChange([base,text].filter(Boolean).join(' '));};session.current=captureAdministratorSpeech({config,token,autoStop:false,onText:update,onEnd:text=>{if(current!==epoch.current)return;update(text);session.current=null;setState('idle');callbacks.current.onListeningChange(false);},onError:error=>{if(current!==epoch.current)return;session.current=null;setError(error.message);setState('idle');callbacks.current.onListeningChange(false);}});session.current.start();};
 const active=state!=='idle',supported=config&&administratorAudioSupported(config);
 return <div className="echo-stt"><button type="button" className={`echo-stt-mic${active?' is-listening':''}`} disabled={disabled||!supported||state==='transcribing'} aria-pressed={active} aria-label={active?'Stop dictation':'Dictate your message'} title={active?'Stop dictation':`Dictate your message · ${config?.provider||'loading'}`} onClick={()=>{if(active){setState('transcribing');session.current?.stop();}else start();}}>{active?<Square size={13}/>:<Mic size={17}/>}</button><span className={active||error?'echo-stt-status':'eaa-sr-only'} role={error?'alert':'status'}>{error||(state==='transcribing'?'Transcribing…':active?'Listening… Click the microphone to finish.':'Dictate, review your text, then send.')}</span></div>;
}
