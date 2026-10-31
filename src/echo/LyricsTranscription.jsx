import {useEffect,useRef,useState} from 'react';
import {FileAudio,Play} from 'lucide-react';

import languages from '../lib/contracts/audio-languages.json';
export default function LyricsTranscription({onTranscribe,onUse,onGetStatus,recordingAudioUrl,selectedLanguages=[],onLanguagesChange}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
 const [model,setModel]=useState(''),[modelError,setModelError]=useState('');
 const controller=useRef(null);
 const hasRecordingAudio=Boolean(recordingAudioUrl);
 useEffect(()=>{let alive=true;if(onGetStatus)onGetStatus().then(info=>{if(alive){setModel(info.model);setModelError('');}}).catch(()=>{if(alive)setModelError('Server model settings unavailable');});return()=>{alive=false;};},[onGetStatus]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const transcribe=async()=>{
  if(!hasRecordingAudio||busy)return;
  setError('');setStatus('Transcribing recording audio…');setBusy(true);
  const request=new AbortController();controller.current=request;
  const timeout=setTimeout(()=>request.abort('timeout'),190000);
  try{
   const result=await onTranscribe(null,{signal:request.signal,language:selectedLanguages.length===1?selectedLanguages[0]:'',timestamps:true,source:'recording'});
   if(!request.signal.aborted){if(result.model){setModel(result.model);setModelError('');}if(result.text.trim()){onUse(result.text,selectedLanguages.length?selectedLanguages:(result.languages||[]));setStatus(result.segments?.length?'Timed lyrics added. Save this entry, then save the recording to publish them.':'Transcription added to Lyrics text.');}else setStatus('No words were detected. Existing lyrics are unchanged. Try a clearer vocal track.');}
  }catch(e){
   if(!request.signal.aborted)setError(e.message||'Could not transcribe the audio.');
   else if(request.signal.reason==='timeout')setError('Transcription timed out. Try a shorter audio file.');
   setStatus('');
  }finally{clearTimeout(timeout);if(controller.current===request){controller.current=null;setBusy(false);}}
 };
 return <section className="lyrics-transcription" aria-label="Transcribe audio to lyrics">
  <header><FileAudio size={19}/><div><h4>Transcribe audio</h4><p>Generate synchronized lyrics from this recording’s audio.</p></div></header>
  <div className="lyrics-transcription-model"><span>Model in use</span><strong>{hasRecordingAudio?'whisper-1 · timestamps':model|| (modelError?'Unavailable':'Checking…')}</strong>{modelError&&<small>{modelError}</small>}</div>
  <p role="status">{hasRecordingAudio?'Using this recording’s audio.':'This recording has no audio set.'}</p>
  <div className="lyrics-transcription-options">
  <div className="lyrics-transcription-language"><span>Audio language</span><details className="audio-language-picker"><summary>{selectedLanguages.length?selectedLanguages.map(code=>languages.find(([id])=>id===code)?.[1]||code).join(', '):'Detect automatically'}</summary><div className="audio-language-choices" role="group" aria-label="Audio languages"><button type="button" aria-pressed={!selectedLanguages.length} disabled={busy} onClick={()=>onLanguagesChange?.([])}>Detect automatically</button>{languages.map(([code,name])=><label key={code}><input type="checkbox" checked={selectedLanguages.includes(code)} disabled={busy} onChange={()=>onLanguagesChange?.(selectedLanguages.includes(code)?selectedLanguages.filter(item=>item!==code):[...selectedLanguages,code])}/><span>{name}</span></label>)}</div></details></div></div>

  <div className="lyrics-transcription-actions"><button type="button" className="lyrics-transcription-start" disabled={busy||!hasRecordingAudio} onClick={transcribe}><Play size={14}/>{busy?'Transcribing…':'Transcribe'}</button>{busy&&<button type="button" onClick={()=>{controller.current?.abort();setStatus('');}}>Cancel transcription</button>}</div>
  {status&&<p role="status">{status}</p>}{error&&<p role="alert">{error}</p>}

 </section>;
}
