import {useEffect,useId,useRef,useState} from 'react';
import {FileAudio,Play,Languages,Search,Plus,Trash2,Clock3,Maximize2,X} from 'lucide-react';
import './audioLanguagePicker.css';
import './transcriptionPopup.css';
import TranscriptionAudioTape from './TranscriptionAudioTape';

import languages from '../lib/contracts/audio-languages.json';
export default function LyricsTranscription({onTranscribe,onGetStatus,recordingAudioUrl,audioMetadata,initialMode,onModeChange,timedLyrics,onTimedLyricsChange,selectedLanguages=[],onLanguagesChange,languageOptions=languages}){
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[status,setStatus]=useState('');
 const [transcript,setTranscript]=useState(null),[activeLine,setActiveLine]=useState(-1);
 const modeId=useId(),popup=useRef(null);
 const [maximized,setMaximized]=useState(false);
 useEffect(()=>{const node=popup.current;if(maximized){if(!node.open)node.showModal();}else if(node.open)node.close();},[maximized]);
 const [mode,setMode]=useState(()=>initialMode||(timedLyrics?.model==='manual'?'manual':'ai'));
 useEffect(()=>{onModeChange?.(mode);},[mode,onModeChange]);
 const [aiModel,setAiModel]=useState('whisper-1');
 useEffect(()=>{if(mode!=='ai'||!onGetStatus)return;let active=true;onGetStatus().then(info=>{if(active)setAiModel(info.timestampModel||'whisper-1');}).catch(()=>{});return()=>{active=false;};},[mode,onGetStatus]);
 const [languageSearch,setLanguageSearch]=useState('');
 const visibleLanguages=languageOptions.filter(([code,name])=>`${name} ${code}`.toLocaleLowerCase().includes(languageSearch.trim().toLocaleLowerCase()));
 const controller=useRef(null),lineList=useRef(null),focusNewLine=useRef(false);
 const hasRecordingAudio=Boolean(recordingAudioUrl);
 const timedLines=transcript?.segments??(timedLyrics?.audioUrl===recordingAudioUrl?timedLyrics.lines:[])??[];

 useEffect(()=>()=>controller.current?.abort(),[]);
 const updateLines=(lines,transcriptionModel=mode==='manual'?'manual':transcript?.model||timedLyrics?.model||'manual')=>{
  setTranscript(current=>({...current,model:transcriptionModel,text:lines.map(line=>line.text).join('\n'),segments:lines,codes:current?.codes||selectedLanguages}));
  onTimedLyricsChange?.({audioUrl:recordingAudioUrl,model:transcriptionModel,lines});
 };
 const editLine=(index,patch)=>updateLines(timedLines.map((line,i)=>i===index?{...line,...patch}:line));
 useEffect(()=>{if(focusNewLine.current){focusNewLine.current=false;const input=lineList.current?.querySelector('li:last-child textarea');input?.focus();input?.scrollIntoView({block:'nearest'});}},[timedLines.length]);
 const addLine=()=>{if(busy||!hasRecordingAudio||timedLines.length>=3000)return;const start=Number(timedLines.at(-1)?.end)||0;focusNewLine.current=true;updateLines([...timedLines,{start,end:start+2,text:''}]);setStatus('Enter the lyric text and its start and end times. Save the recording to keep your changes.');};
 const transcribe=async()=>{
  if(!hasRecordingAudio||busy||mode!=='ai')return;
  setError('');setStatus('Transcribing recording audio…');setBusy(true);
  const request=new AbortController();controller.current=request;
  const timeout=setTimeout(()=>request.abort('timeout'),190000);
  try{
   const result=await onTranscribe(null,{signal:request.signal,language:selectedLanguages.length===1?selectedLanguages[0]:'',timestamps:true,source:'recording'});
   if(!request.signal.aborted){if(result.model)setAiModel(result.model);if(result.text.trim()){setTranscript({text:result.text,segments:result.segments||[],model:result.model||'whisper-1',codes:selectedLanguages.length?selectedLanguages:(result.languages||[])});if(result.segments?.length)onTimedLyricsChange?.({audioUrl:recordingAudioUrl,model:result.model||'whisper-1',lines:result.segments});setStatus(result.segments?.length?(maximized?'Transcription ready. Review the timed lyrics.':'Transcription ready. Open the timed lyrics popup to review and edit.'):'No timed lyric lines were returned. Try again or enter timed lyrics manually.');}else setStatus('No words were detected. Existing lyrics are unchanged. Try a clearer vocal track.');}
  }catch(e){
   if(!request.signal.aborted)setError(e.message||'Could not transcribe the audio.');
   else if(request.signal.reason==='timeout')setError('Transcription timed out. Try a shorter audio file.');
   setStatus('');
  }finally{clearTimeout(timeout);if(controller.current===request){controller.current=null;setBusy(false);}}
 };
 const content=<section className="lyrics-transcription" aria-label="Transcribe audio to lyrics">
  <header><span className="transcription-title-icon"><FileAudio size={19}/></span><div>{maximized&&<small className="transcription-eyebrow">Lyrics workspace</small>}<h4>Transcribe audio</h4><p>Transcribe the audio or enter timed lyrics manually.</p></div>{maximized&&<span className="transcription-header-count">{timedLines.length} {timedLines.length===1?'line':'lines'}</span>}<button type="button" className="transcription-maximize" aria-label={maximized?'Close expanded transcription':'Maximize Transcribe audio'} title={maximized?'Close expanded view':'Maximize'} aria-haspopup={maximized?undefined:'dialog'} onClick={()=>setMaximized(value=>!value)}>{maximized?<X size={18}/>:<Maximize2 size={16}/>}</button></header>
  <div className="transcription-workspace"><div className="transcription-controls">
  {maximized&&<div className="transcription-controls-title"><h5>Transcription setup</h5><p>Choose how to build your lyrics.</p></div>}
  <fieldset className="lyrics-entry-mode" disabled={busy}><legend>Lyrics entry</legend><div>{[['ai','AI'],['manual','Manual']].map(([value,label])=><label key={value} className={mode===value?'is-selected':''}><input type="radio" name={`lyrics-mode-${modeId}`} value={value} checked={mode===value} onChange={()=>{setMode(value);setError('');setStatus('');}}/><span>{label}</span></label>)}</div><p>{mode==='ai'?'Generate timed lyrics from the recording audio.':'Write lyric lines and set their start and end times.'}</p></fieldset>
  {mode==='ai'&&<div className="lyrics-transcription-model"><span>AI model</span><strong>{aiModel} · timestamps</strong></div>}
  <p className="transcription-audio-status" role="status">{hasRecordingAudio?'Using this recording’s audio.':'This recording has no audio set.'}</p>
  {mode==='ai'&&<div className="lyrics-transcription-options">
  <details className="lyrics-transcription-language audio-language-panel" aria-label="Choose audio language">
   <summary className="audio-language-heading"><Languages size={14} aria-hidden="true"/><span>Choose audio language</span><span className="audio-language-count">{selectedLanguages.length?`${selectedLanguages.length} selected`:'Auto'}</span></summary>
   <p className="audio-language-help">Select languages, or leave empty to detect automatically.</p>
   <label className="audio-language-search"><Search size={15} aria-hidden="true"/><input type="search" aria-label="Search audio languages" placeholder="Search languages…" value={languageSearch} onChange={event=>setLanguageSearch(event.target.value)}/></label>
   <div className="audio-language-choices" role="group" aria-label="Audio languages">{visibleLanguages.map(([code,name])=><label key={code} className={selectedLanguages.includes(code)?'is-selected':''}><input type="checkbox" checked={selectedLanguages.includes(code)} disabled={busy} onChange={()=>onLanguagesChange?.(selectedLanguages.includes(code)?selectedLanguages.filter(item=>item!==code):[...selectedLanguages,code])}/><span>{name}</span></label>)}{!visibleLanguages.length&&<p className="audio-language-empty" role="status">No matching languages.</p>}</div>
  </details></div>}

  <div className="lyrics-transcription-actions">{mode==='ai'?<button type="button" className="lyrics-transcription-start" disabled={busy||!hasRecordingAudio} onClick={transcribe}><Play size={14}/>{busy?'Transcribing…':'Transcribe'}</button>:null}{busy&&<button type="button" onClick={()=>{controller.current?.abort();setStatus('');}}>Cancel transcription</button>}</div>
  {status&&<p className="transcription-feedback" role="status">{status}</p>}{error&&<p className="transcription-feedback is-error" role="alert">{error}</p>}
  </div>
  {!maximized&&<button type="button" className="transcription-open-editor" onClick={()=>setMaximized(true)}><Maximize2 size={18}/><span><strong>Open timed lyrics editor</strong><small>Click to open the popup to view, add, or edit timed lyrics and the audio waveform.</small>{timedLines.length>0&&<small>{timedLines.length} {timedLines.length===1?'line':'lines'}</small>}</span></button>}
  {maximized&&<section className="transcription-timed-lyrics" aria-label="Timed lyrics">
   <header><div><h4>Timed lyrics</h4><small>{timedLines.length} {timedLines.length===1?'line':'lines'} · editable</small></div><button type="button" className="transcription-add-line" disabled={busy||!hasRecordingAudio||timedLines.length>=3000} onClick={addLine}><Plus size={14}/>Add line</button></header>
   {hasRecordingAudio&&<TranscriptionAudioTape src={recordingAudioUrl} metadata={audioMetadata} onTimeChange={time=>setActiveLine(timedLines.findIndex(line=>Number.isFinite(line.start)&&Number.isFinite(line.end)&&time>=line.start&&time<line.end))}/>}
   {timedLines.length?<ol ref={lineList} className="transcription-editable-lines">{timedLines.map((line,index)=>{
    const invalidStart=!Number.isFinite(line.start)||line.start<0||(index>0&&line.start<timedLines[index-1].start);
    const invalidEnd=!Number.isFinite(line.end)||line.end<=line.start;
    return <li key={index} className={`transcription-line-card${index===activeLine?' is-current':''}`}>
     <div className="transcription-line-heading"><span className="transcription-line-number">{String(index+1).padStart(2,'0')}</span><span className="transcription-line-duration"><Clock3 size={12}/>{!invalidStart&&!invalidEnd?`${(line.end-line.start).toFixed(2)} s`:'Check timing'}</span><button type="button" disabled={busy} title="Delete lyric line" aria-label={`Delete timed line ${index+1}`} onClick={()=>updateLines(timedLines.filter((_,i)=>i!==index))}><Trash2 size={14}/></button></div>
     <label className="transcription-line-text"><span>Lyrics</span><textarea aria-label={`Timed line ${index+1} lyrics`} dir="auto" rows={2} maxLength={4000} value={line.text} disabled={busy} placeholder="Enter lyric text…" onChange={event=>editLine(index,{text:event.target.value})}/></label>
     <div className="transcription-line-timing"><label>Start <span>seconds</span><input aria-label={`Timed line ${index+1} start seconds`} type="number" min="0" max="86400" step="0.01" value={line.start} aria-invalid={invalidStart} disabled={busy} onChange={event=>editLine(index,{start:event.target.value===''?'':Number(event.target.value)})}/></label><span className="transcription-time-arrow" aria-hidden="true">→</span><label>End <span>seconds</span><input aria-label={`Timed line ${index+1} end seconds`} type="number" min={Number(line.start)+0.01} max="86400" step="0.01" value={line.end} aria-invalid={invalidEnd} disabled={busy} onChange={event=>editLine(index,{end:event.target.value===''?'':Number(event.target.value)})}/></label></div>
     {(invalidStart||invalidEnd)&&<p className="transcription-line-error" role="alert">Use ordered start times and an end after the start.</p>}
    </li>;
   })}</ol>:null}

  </section>}

  </div>
  {maximized&&<footer className="transcription-workspace-footer"><span>Changes are kept in your recording draft. Save the recording when finished.</span><button type="button" onClick={()=>setMaximized(false)}>Done</button></footer>}

 </section>;
 return <>{!maximized&&content}<dialog ref={popup} className="ontology-dialog transcription-expanded-dialog" aria-label="Expanded Transcribe audio" onCancel={event=>{event.preventDefault();event.stopPropagation();setMaximized(false);}} onClose={event=>{if(event.target===event.currentTarget){event.stopPropagation();setMaximized(false);}}}>{maximized&&content}</dialog></>;
}
