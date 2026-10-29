import {useEffect,useRef,useState} from 'react';
import {FileAudio,Play} from 'lucide-react';

const languages=[['ar','Arabic · العربية'],['en','English'],['fr','French · Français'],['es','Spanish · Español'],['de','German · Deutsch'],['it','Italian · Italiano'],['pt','Portuguese · Português'],['tr','Turkish · Türkçe'],['fa','Persian · فارسی'],['ur','Urdu · اردو'],['hi','Hindi · हिन्दी'],['ru','Russian · Русский'],['uk','Ukrainian · Українська'],['el','Greek · Ελληνικά'],['he','Hebrew · עברית'],['nl','Dutch · Nederlands'],['pl','Polish · Polski'],['zh','Chinese · 中文'],['ja','Japanese · 日本語'],['ko','Korean · 한국어']];
const extensions=/\.(mp3|mp4|mpeg|mpga|m4a|wav|webm)$/i;
export default function LyricsTranscription({onTranscribe,onUse,onGetStatus,recordingAudioUrl}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[file,setFile]=useState(null),[language,setLanguage]=useState(''),[status,setStatus]=useState('');
 const [model,setModel]=useState(''),[modelError,setModelError]=useState('');
 const [source,setSource]=useState(recordingAudioUrl?'recording':'file');
 const controller=useRef(null);
 const timed=source==='recording'&&Boolean(recordingAudioUrl);
 useEffect(()=>{let alive=true;if(onGetStatus)onGetStatus().then(info=>{if(alive){setModel(info.model);setModelError('');}}).catch(()=>{if(alive)setModelError('Server model settings unavailable');});return()=>{alive=false;};},[onGetStatus]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const chooseFile=event=>{
  const selected=event.target.files?.[0];
  setError('');setStatus('');setFile(null);
  if(!selected)return;
  if(!extensions.test(selected.name)){setError('Choose an MP3, MP4, MPEG, MPGA, M4A, WAV or WebM file.');event.target.value='';return;}
  if(selected.size>25*1024*1024){setError('Choose an audio file under 25 MB.');event.target.value='';return;}
  if(!selected.size){setError('This audio file is empty. Choose another file.');event.target.value='';return;}
  setFile(selected);
 };
 const transcribe=async()=>{
  if((!timed&&!file)||busy)return;
  setError('');setStatus(`Transcribing ${timed?'recording audio':file.name}…`);setBusy(true);
  const request=new AbortController();controller.current=request;
  const timeout=setTimeout(()=>request.abort('timeout'),190000);
  try{
   const result=await onTranscribe(file,{signal:request.signal,language,timestamps:timed,source});
   if(!request.signal.aborted){if(result.model){setModel(result.model);setModelError('');}if(result.text.trim()){onUse(result.text);setStatus(result.segments?.length?'Timed lyrics added. Save this entry, then save the recording to publish them.':'Transcription added to Lyrics text.');}else setStatus('No words were detected. Existing lyrics are unchanged. Try a clearer vocal track.');}
  }catch(e){
   if(!request.signal.aborted)setError(e.message||'Could not transcribe the audio.');
   else if(request.signal.reason==='timeout')setError('Transcription timed out. Try a shorter audio file.');
   setStatus('');
  }finally{clearTimeout(timeout);if(controller.current===request){controller.current=null;setBusy(false);}}
 };
 return <section className="lyrics-transcription" aria-label="Transcribe audio to lyrics">
  <header><FileAudio size={19}/><div><h4>Transcribe audio</h4><p>Use recording audio for lyrics synchronized with playback.</p></div></header>
  <div className="lyrics-transcription-model"><span>Model in use</span><strong>{timed?'whisper-1 · timestamps':model|| (modelError?'Unavailable':'Checking…')}</strong>{modelError&&<small>{modelError}</small>}</div>
  <label>Audio source<select value={source} disabled={busy} onChange={e=>setSource(e.target.value)}><option value="recording" disabled={!recordingAudioUrl}>Recording audio · timed lyrics</option><option value="file">Another file · text only</option></select></label>{!recordingAudioUrl&&<p>Upload the recording audio first to generate synchronized lyrics.</p>}<div className="lyrics-transcription-options">{!timed&&<label className="lyrics-transcription-file">Audio file<input type="file" accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm" disabled={busy} onChange={chooseFile}/><small>{file?`${file.name} · ${(file.size/1024/1024).toFixed(1)} MB`:'Song or vocal-only track · up to 25 MB'}</small></label>}
  <label className="lyrics-transcription-language">Audio language<select value={language} disabled={busy} onChange={e=>setLanguage(e.target.value)}><option value="">Detect automatically</option>{languages.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select><small>For mixed-language songs, use automatic detection.</small></label></div>
  <div className="lyrics-transcription-actions"><button type="button" className="lyrics-transcription-start" disabled={busy||(!timed&&!file)} onClick={transcribe}><Play size={14}/>{busy?'Transcribing…':'Transcribe'}</button>{busy&&<button type="button" onClick={()=>{controller.current?.abort();setStatus('');}}>Cancel transcription</button>}</div>
  {status&&<p role="status">{status}</p>}{error&&<p role="alert">{error}</p>}

 </section>;
}
