import {useEffect,useRef,useState} from 'react';
import {FileAudio,Upload,X} from 'lucide-react';

export default function LyricsTranscription({onTranscribe,onUse,hasLyrics}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[draft,setDraft]=useState(null),[filename,setFilename]=useState('');
 const controller=useRef(null),fileInput=useRef(null);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const transcribe=async file=>{
  if(!file||busy)return;
  if(file.size>25*1024*1024){setError('Choose an audio file under 25 MB.');return;}
  setError('');setFilename(file.name);setBusy(true);
  controller.current=new AbortController();
  try{const result=await onTranscribe(file,{signal:controller.current.signal});if(!controller.current.signal.aborted)setDraft(result.text);}
  catch(e){if(!controller.current.signal.aborted)setError(e.message||'Could not transcribe the audio.');}
  finally{if(!controller.current.signal.aborted)setBusy(false);}
 };
 return <section className="lyrics-transcription" aria-label="Transcribe audio to lyrics"><header><FileAudio size={19}/><div><h4>Transcribe audio</h4><p>Choose a song or a vocal-only track. Review the words before using them.</p></div><button type="button" disabled={busy} onClick={()=>fileInput.current?.click()}><Upload size={14}/>{busy?'Transcribing…':'Choose audio'}</button></header><input ref={fileInput} type="file" hidden accept=".mp3,.mp4,.mpeg,.mpga,.m4a,.wav,.webm" disabled={busy} onChange={e=>{const file=e.target.files?.[0];e.target.value='';transcribe(file);}}/>{busy&&<p role="status">Transcribing {filename}…</p>}{error&&<p role="alert">{error}</p>}{draft!==null&&<div className="lyrics-transcript-draft"><label>Transcript draft<textarea rows={6} value={draft} onChange={e=>setDraft(e.target.value)}/></label><footer><button type="button" disabled={busy} onClick={()=>setDraft(null)}><X size={13}/>Discard</button><button type="button" disabled={busy||!draft.trim()} onClick={()=>{onUse(draft);setDraft(null);}}>{hasLyrics?'Replace lyrics with transcript':'Use transcript'}</button></footer></div>}</section>;
}
