import {useEffect,useRef,useState} from 'react';
import {FileAudio,Play,Languages,Search,Plus,Trash2,Clock3} from 'lucide-react';
import './audioLanguagePicker.css';

import languages from '../lib/contracts/audio-languages.json';
export default function LyricsTranscription({onTranscribe,onGetStatus,recordingAudioUrl,timedLyrics,onTimedLyricsChange,selectedLanguages=[],onLanguagesChange,languageOptions=languages}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
 const [transcript,setTranscript]=useState(null),[showText,setShowText]=useState(false);
 const [model,setModel]=useState(''),[modelError,setModelError]=useState('');
 const [languageSearch,setLanguageSearch]=useState('');
 const visibleLanguages=languageOptions.filter(([code,name])=>`${name} ${code}`.toLocaleLowerCase().includes(languageSearch.trim().toLocaleLowerCase()));
 const controller=useRef(null);
 const hasRecordingAudio=Boolean(recordingAudioUrl);
 const timedLines=transcript?.segments??(timedLyrics?.audioUrl===recordingAudioUrl?timedLyrics.lines:[])??[];
 useEffect(()=>{let alive=true;if(onGetStatus)onGetStatus().then(info=>{if(alive){setModel(info.model);setModelError('');}}).catch(()=>{if(alive)setModelError('Server model settings unavailable');});return()=>{alive=false;};},[onGetStatus]);
 useEffect(()=>()=>controller.current?.abort(),[]);
 const updateLines=(lines,transcriptionModel=transcript?.model||timedLyrics?.model||'whisper-1')=>{
  setTranscript(current=>({...current,model:transcriptionModel,text:lines.map(line=>line.text).join('\n'),segments:lines,codes:current?.codes||selectedLanguages}));
  onTimedLyricsChange?.({audioUrl:recordingAudioUrl,model:transcriptionModel,lines});
 };
 const editLine=(index,patch)=>updateLines(timedLines.map((line,i)=>i===index?{...line,...patch}:line));
 const addLine=()=>{const start=Number(timedLines.at(-1)?.end)||0;updateLines([...timedLines,{start,end:start+2,text:''}]);};
 const transcribe=async()=>{
  if(!hasRecordingAudio||busy)return;
  setError('');setStatus('Transcribing recording audio…');setBusy(true);
  const request=new AbortController();controller.current=request;
  const timeout=setTimeout(()=>request.abort('timeout'),190000);
  try{
   const result=await onTranscribe(null,{signal:request.signal,language:selectedLanguages.length===1?selectedLanguages[0]:'',timestamps:true,source:'recording'});
   if(!request.signal.aborted){if(result.model){setModel(result.model);setModelError('');}if(result.text.trim()){setTranscript({text:result.text,segments:result.segments||[],model:result.model||'whisper-1',codes:selectedLanguages.length?selectedLanguages:(result.languages||[])});if(result.segments?.length)onTimedLyricsChange?.({audioUrl:recordingAudioUrl,model:result.model||'whisper-1',lines:result.segments});setStatus(result.segments?.length?'Transcription ready. Review the timed lyrics below.':'Transcription ready. Open Lyrics text to read it.');}else setStatus('No words were detected. Existing lyrics are unchanged. Try a clearer vocal track.');}
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
  <details className="lyrics-transcription-language audio-language-panel" aria-label="Choose audio language">
   <summary className="audio-language-heading"><Languages size={14} aria-hidden="true"/><span>Choose audio language</span><span className="audio-language-count">{selectedLanguages.length?`${selectedLanguages.length} selected`:'Auto'}</span></summary>
   <p className="audio-language-help">Select languages, or leave empty to detect automatically.</p>
   <label className="audio-language-search"><Search size={15} aria-hidden="true"/><input type="search" aria-label="Search audio languages" placeholder="Search languages…" value={languageSearch} onChange={event=>setLanguageSearch(event.target.value)}/></label>
   <div className="audio-language-choices" role="group" aria-label="Audio languages">{visibleLanguages.map(([code,name])=><label key={code} className={selectedLanguages.includes(code)?'is-selected':''}><input type="checkbox" checked={selectedLanguages.includes(code)} disabled={busy} onChange={()=>onLanguagesChange?.(selectedLanguages.includes(code)?selectedLanguages.filter(item=>item!==code):[...selectedLanguages,code])}/><span>{name}</span></label>)}{!visibleLanguages.length&&<p className="audio-language-empty" role="status">No matching languages.</p>}</div>
  </details></div>

  <div className="lyrics-transcription-actions"><button type="button" className="lyrics-transcription-start" disabled={busy||!hasRecordingAudio} onClick={transcribe}><Play size={14}/>{busy?'Transcribing…':'Transcribe'}</button>{busy&&<button type="button" onClick={()=>{controller.current?.abort();setStatus('');}}>Cancel transcription</button>}</div>
  <section className="transcription-timed-lyrics" aria-label="Timed lyrics">
   <header><div><h4>Timed lyrics</h4><small>{timedLines.length} {timedLines.length===1?'line':'lines'} · editable</small></div><button type="button" className="transcription-add-line" disabled={busy||!hasRecordingAudio||timedLines.length>=3000} onClick={addLine}><Plus size={14}/>Add line</button></header>
   {timedLines.length?<ol className="transcription-editable-lines">{timedLines.map((line,index)=>{
    const invalidStart=!Number.isFinite(line.start)||line.start<0||(index>0&&line.start<timedLines[index-1].start);
    const invalidEnd=!Number.isFinite(line.end)||line.end<=line.start;
    return <li key={index} className="transcription-line-card">
     <div className="transcription-line-heading"><span className="transcription-line-number">{String(index+1).padStart(2,'0')}</span><span className="transcription-line-duration"><Clock3 size={12}/>{!invalidStart&&!invalidEnd?`${(line.end-line.start).toFixed(2)} s`:'Check timing'}</span><button type="button" disabled={busy} title="Delete lyric line" aria-label={`Delete timed line ${index+1}`} onClick={()=>updateLines(timedLines.filter((_,i)=>i!==index))}><Trash2 size={14}/></button></div>
     <label className="transcription-line-text"><span>Lyrics</span><textarea aria-label={`Timed line ${index+1} lyrics`} dir="auto" rows={2} maxLength={4000} value={line.text} disabled={busy} placeholder="Enter lyric text…" onChange={event=>editLine(index,{text:event.target.value})}/></label>
     <div className="transcription-line-timing"><label>Start <span>seconds</span><input aria-label={`Timed line ${index+1} start seconds`} type="number" min="0" max="86400" step="0.01" value={line.start} aria-invalid={invalidStart} disabled={busy} onChange={event=>editLine(index,{start:event.target.value===''?'':Number(event.target.value)})}/></label><span className="transcription-time-arrow" aria-hidden="true">→</span><label>End <span>seconds</span><input aria-label={`Timed line ${index+1} end seconds`} type="number" min={Number(line.start)+0.01} max="86400" step="0.01" value={line.end} aria-invalid={invalidEnd} disabled={busy} onChange={event=>editLine(index,{end:event.target.value===''?'':Number(event.target.value)})}/></label></div>
     {(invalidStart||invalidEnd)&&<p className="transcription-line-error" role="alert">Use ordered start times and an end after the start.</p>}
    </li>;
   })}</ol>:<p className="transcription-timed-empty">Transcribe the audio or add a line to start editing lyrics.</p>}

  </section>
  {transcript&&<div className="lyrics-transcription-results"><div className="lyrics-transcription-actions"><button type="button" aria-expanded={showText} onClick={()=>setShowText(value=>!value)}>Lyrics text</button></div>{showText&&<textarea readOnly aria-label="Transcribed lyrics text" value={transcript.text}/>}</div>}
  {status&&<p role="status">{status}</p>}{error&&<p role="alert">{error}</p>}

 </section>;
}
