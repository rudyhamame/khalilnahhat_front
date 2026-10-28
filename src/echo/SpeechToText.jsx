import {useEffect,useRef,useState} from 'react';
import {Mic,Square} from 'lucide-react';
import {createSpeechDictation} from '../lib/speechDictation';
import './speechToText.css';

export default function SpeechToText({ar,value,onChange,onListeningChange,disabled}){
 const tr=(en,arabic)=>ar?arabic:en;
 const [supported,setSupported]=useState(null),[state,setState]=useState('idle'),[error,setError]=useState('');
 const language=ar?'ar-SA':'en-CA';
 const callbacks=useRef({onChange,onListeningChange});callbacks.current={onChange,onListeningChange};
 const dictation=useRef(null);
 useEffect(()=>{
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  setSupported(Boolean(Recognition));
  if(!Recognition)return;
  const client=createSpeechDictation({Recognition,onText:text=>callbacks.current.onChange(text),onState:next=>{setState(next);callbacks.current.onListeningChange(next!=='idle');},onError:code=>setError(code)});
  dictation.current=client;
  const stop=()=>{client.cancel();};
  const visibility=()=>{if(document.hidden)stop();};
  window.addEventListener('pagehide',stop);document.addEventListener('visibilitychange',visibility);
  return()=>{client.dispose();dictation.current=null;callbacks.current.onListeningChange(false);window.removeEventListener('pagehide',stop);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 useEffect(()=>{if(disabled){dictation.current?.cancel();}},[disabled]);
 const active=state!=='idle';
 const errors={
  'not-allowed':tr('Microphone access was not allowed. Enable it in your browser, or type your message.','لم يُسمح بالميكروفون. فعّله من المتصفح أو اكتب رسالتك.'),
  'service-not-allowed':tr('Your browser has blocked speech recognition. You can still type.','حظر المتصفح التعرف على الكلام. يمكنك الكتابة.'),
  'audio-capture':tr('No microphone is available. Check your microphone connection.','الميكروفون غير متاح. تحقق من توصيله.'),
  'no-speech':tr('No speech was detected. Try the microphone again.','لم يتم التقاط كلام. حاول مجدداً.'),
  network:tr('Dictation could not connect. Check your connection or type your message.','تعذر اتصال الإملاء. تحقق من الإنترنت أو اكتب رسالتك.'),
  'language-not-supported':tr('This speech language is unavailable in your browser. Try another language.','لغة الإملاء غير متاحة في متصفحك. جرّب لغة أخرى.'),
 };
 const label=active?tr('Stop dictation','إيقاف الإملاء'):tr('Dictate your message','إملاء رسالتك');
 const message=error?errors[error]||tr('Dictation is unavailable right now. You can still type.','الإملاء غير متاح حالياً. يمكنك الكتابة.'):supported===false?tr('Dictation is not supported in this browser. You can still type.','متصفحك لا يدعم الإملاء. يمكنك الكتابة.'):active?tr('Listening… Your words appear in the message box.','أستمع… يظهر كلامك في حقل الرسالة.'):tr('Dictation uses your browser’s speech service. Review your text before sending.','يستخدم الإملاء خدمة الكلام في متصفحك. راجع النص قبل إرساله.');
 return <div className="echo-stt">
  <button type="button" className={`ai-booking-tts echo-stt-mic${active?' is-listening':''}`} disabled={disabled||!supported} aria-pressed={active} aria-label={label} title={`${supported===false?message:label} · ${tr('Browser speech service','خدمة الكلام في المتصفح')}`} onClick={()=>{if(active){dictation.current?.stop();return;}setError('');dictation.current?.start({text:value,lang:language});}}>{active?<Square size={13} fill="currentColor"/>:<Mic size={17}/>}</button>
  <span className={active||error?'echo-stt-status':'ai-booking-sr'} role={error?'alert':'status'}>{message}</span>
 </div>;
}
