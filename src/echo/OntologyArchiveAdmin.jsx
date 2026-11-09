import {administratorDataChanged} from './administratorChanges';
import SampleTrimmer from './SampleTrimmer';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Layers,Music2,Pencil,Plus,Scissors,Trash2,Sparkles,X} from 'lucide-react';
import {apiRequest,apiBaseUrl} from '../lib/api';
import {blankRecording,editableWork,editableRecording,fetchOntologyRecordings,ontologyPath,announceMusicArchiveChange,musicOntologyContract as contract,recordingComponents} from '../lib/musicOntology';
import ArchiveMiniPlayer from './ArchiveMiniPlayer';
import RecordingAudioPreview from './RecordingAudioPreview';
import TranscriptionAudioTape from './TranscriptionAudioTape';
import {analyzeRecordingAudio} from '../lib/recordingAudioAnalysis';
import {atomRange,createDetectedAtoms,moveAtomBoundary} from '../lib/recordingAtoms';
import AudioTrimmer from './AudioTrimmer';
import {applyRecordingCompletion} from '../lib/recordingAiCompletion';
import {recordingDraftOwner,saveRecordingDraft,loadRecordingDraft,deleteRecordingDraft,restoreRecordingDraft} from '../lib/recordingDraftStore';
import RecordingItemsEditor,{SavedRecordingItems,AtomReleaseDate} from './RecordingItemsEditor';
import LyricsTranscription from './LyricsTranscription';
import {editableRecordingItems,validateRecordingItems,clearItemTiming,blankItemLyrics,blankRecordingItem} from '../lib/recordingItems';
import RecordingsListTable from './RecordingsListTable';
import OntologyFilters from './OntologyFilters';
import {RecordingContentList,ContentDetails} from './RecordingExplorer';
import WorkFields from './WorkFields';
import OntologyMediaUpload from './OntologyMediaUpload';
import {CreateReferenceContext} from './CreateReferenceContext';
import WorkElementDependencies from './WorkElementDependencies';
import {notifyWorkElementsChanged,subscribeWorkElementsChanged} from './workElementsCatalog';
import './musicOntology.css';
import {WorkElementsProvider,workElementListId} from './WorkElementsContext';
const vocabEmpty=()=>({kind:'language',name:'',parentId:'',isoCode:'',description:'',languageIds:[],provenance:{source:'',note:''}});
// Duration is stored in seconds and shown as mm:ss; it is read from the uploaded audio file, never typed.
const formatDuration=seconds=>seconds==null||!Number.isFinite(seconds)?'':`${Math.floor(seconds/60)}:${String(Math.round(seconds%60)).padStart(2,'0')}`.replace(/^(\d+):60$/,(_,m)=>`${+m+1}:00`);
function DurationField({value}){
 return <label>Recording Duration · mm:ss<input readOnly aria-readonly="true" tabIndex={-1} value={formatDuration(value)} placeholder="Set from the audio file" title="Set automatically from the audio file"/></label>;
}

function applyRecordingTiming(items,timing){
 if(!timing)return items;
 return items.map(item=>{
  if(!item.hasLyrics||!item.lyrics)return item;
  const {startSec,endSec}=item.audioRange||item.lyrics;
  if(items.length>1&&timing.lines.length&&(startSec===null||endSec===null))return item;
  const lines=items.length===1&&!item.audioRange?timing.lines:timing.lines.filter(line=>(line.start+line.end)/2>=startSec&&(line.start+line.end)/2<endSec).map(line=>({...line,start:Math.max(line.start,startSec),end:Math.min(line.end,endSec)}));
  return {...item,lyrics:{...item.lyrics,...(item.audioRange?item.audioRange:{}),timedLyrics:lines.length?{...timing,lines}:null,text:lines.map(line=>line.text).join('\n')}};
 });
}
function timingFromItems(items,audioUrl){
 const timings=items.flatMap(item=>item.hasLyrics&&item.lyrics?.timedLyrics?.audioUrl===audioUrl?[item.lyrics.timedLyrics]:[]);
 if(!timings.length)return null;
 const unique=new Map();
 for(const timing of timings)for(const line of timing.lines)unique.set(JSON.stringify([line.start,line.end,line.text]),line);
 return {audioUrl,model:timings[0].model,lines:[...unique.values()].sort((a,b)=>a.start-b.start)};
}

export default function OntologyArchiveAdmin({token}){return <WorkElementsProvider token={token}><OntologyArchiveWorkspace token={token}/></WorkElementsProvider>;}
function OntologyArchiveWorkspace({token}){
 const [items,setItems]=useState([]),[allItems,setAllItems]=useState([]),[vocabulary,setVocabulary]=useState([]),[workTypes,setWorkTypes]=useState([]),[filters,setFilters]=useState({}),[selected,setSelected]=useState(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[unavailable,setUnavailable]=useState(false);
 const [editor,setEditor]=useState(null),[step,setStep]=useState(0),[workEditor,setWorkEditor]=useState(null),[vocabEditor,setVocabEditor]=useState(null);
 const [contentSelection,setContentSelection]=useState(null);
 const [artworkPreview,setArtworkPreview]=useState(''),[artworkBusy,setArtworkBusy]=useState(false),[audioBusy,setAudioBusy]=useState(false);
 const [itemAiBusy,setItemAiBusy]=useState(0);
 const itemBusyChanged=useCallback(delta=>setItemAiBusy(value=>Math.max(0,value+delta)),[]);
 const [focusedAtomId,setFocusedAtomId]=useState(null),[timelineSeek,setTimelineSeek]=useState(null);
 const [completionStatus,setCompletionStatus]=useState(''),[completionReport,setCompletionReport]=useState(null);
 const completionRequest=useRef(null);
 const [draftOwner,setDraftOwner]=useState(''),[draftOpening,setDraftOpening]=useState(true),[draftStatus,setDraftStatus]=useState(''),[draftError,setDraftError]=useState('');
 const recordingLocked=busy||artworkBusy||audioBusy||itemAiBusy>0||Boolean(completionStatus)||draftOpening;
 useEffect(()=>()=>completionRequest.current?.abort(),[]);
 const [transcribeLanguages,setTranscribeLanguages]=useState([]),[transcriptionMode,setTranscriptionMode]=useState('ai'),lastTimed=useRef(null);
 const draftKey=useRef(''),savedDrafts=useRef(new Set()),draftWrite=useRef(0);
 const typeId=filters.recordingType||'',[sampleOpen,setSampleOpen]=useState(false);
 const contentRef=useRef(null),pendingReference=useRef(null);
 const createReference=(kind,onSelect,name='')=>{pendingReference.current={kind,onSelect};setVocabEditor({id:'',value:{...vocabEmpty(),kind,name}});};
 const editorOpen=Boolean(editor),workOpen=Boolean(workEditor),vocabOpen=Boolean(vocabEditor);
 useEffect(()=>{if(!editorOpen)completionRequest.current?.abort();},[editorOpen]);
 const dialog=useRef(null),workDialog=useRef(null),vocabDialog=useRef(null),request=useRef(0);
 const reload=useCallback(async()=>{
  const generation=++request.current;
  const results=await Promise.allSettled([fetchOntologyRecordings({...filters,archivalStatus:filters.archivalStatus||'ACTIVE'},{token}),apiRequest(`${ontologyPath}/vocabulary`,{token}),fetchOntologyRecordings({},{token}),apiRequest(`${ontologyPath}/work-types`,{token})]);
  if(request.current!==generation)return;
  const labels=['recordings','metadata options','all recordings','work types'];
  const setters=[setItems,setVocabulary,setAllItems,setWorkTypes];
  const failures=[];
  results.forEach((result,index)=>{
   if(result.status==='rejected'){
    const message=`Could not load ${labels[index]}: ${result.reason.message}`;failures.push(message);

    if(index===0)setUnavailable(result.reason.status===404);
    return;
   }
   const rows=[0,2].includes(index)?result.value:result.value.items;
   if(!Array.isArray(rows)){const message=`Invalid ${labels[index]} response.`;failures.push(message);return;}
   setters[index](rows);

   if(index===0)setUnavailable(false);
  });
  if(failures.length)throw Error([...new Set(failures)].join(' '));
  setError('');
 },[token,filters]);
 useEffect(()=>{let active=true;const timer=setTimeout(()=>{setLoading(true);reload().catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});},180);return()=>{active=false;++request.current;clearTimeout(timer);};},[reload]);
 useEffect(()=>{const refresh=event=>{if(event.detail?.changes?.some(change=>change.name.startsWith('music_')||change.name.startsWith('player_playlist_')))reload().catch(e=>setError('The change was saved, but the view could not refresh. '+e.message));};window.addEventListener(administratorDataChanged,refresh);return()=>window.removeEventListener(administratorDataChanged,refresh);},[reload]);
 useEffect(()=>subscribeWorkElementsChanged(()=>{reload().catch(e=>setError('Could not refresh recording options: '+e.message));}),[reload]);
 useEffect(()=>{const node=dialog.current;if(editorOpen){if(!node.open)node.showModal();}else if(node.open)node.close();},[editorOpen]);
 useEffect(()=>{const node=workDialog.current;if(workOpen){if(!node.open)node.showModal();}else if(node.open)node.close();},[workOpen]);
 useEffect(()=>{const node=vocabDialog.current;if(vocabOpen){if(!node.open)node.showModal();}else if(node.open)node.close();},[vocabOpen]);

 const task=async(fn,successMessage='Saved.')=>{setBusy(true);setError('');setNotice('');try{await fn();announceMusicArchiveChange();setNotice(successMessage);try{await reload();}catch(e){if(e.cancelled)return;setError('The change was saved, but the list could not refresh. '+e.message);}}catch(e){if(e.cancelled)return;setError(e.message);}finally{setBusy(false);}};
 const restoreDraft=saved=>{
  setTimelineSeek(null);setFocusedAtomId(null);
  const restored=restoreRecordingDraft(saved);audioDraft.current=restored.audio;
  setEditor(restored.editor);setStep(restored.step||0);setTranscribeLanguages(restored.languages||[]);setTranscriptionMode(restored.transcriptionMode||'ai');setCompletionReport(restored.completionReport||null);setArtworkPreview(restored.editor.value.coverImage||'');setDraftStatus('Browser draft restored');
 };
 useEffect(()=>{
  let active=true;setDraftOpening(true);setDraftOwner('');setEditor(null);setDraftError('');draftKey.current='';++draftWrite.current;
  recordingDraftOwner(token).then(async owner=>{
   const key=`${owner}:new`,saved=await loadRecordingDraft(key);if(!active)return;
   setDraftOwner(owner);draftKey.current=key;
   if(saved)restoreDraft(saved);
  }).catch(problem=>{if(active)setDraftError(`Browser drafts are unavailable: ${problem.message}`);}).finally(()=>{if(active)setDraftOpening(false);});
  return()=>{active=false;};
 },[token]);
 const openRecording=async row=>{
  if(!draftOwner||draftOpening)return;
  setDraftOpening(true);setWorkEditor(null);setError('');
  const key=`${draftOwner}:${row?.id||'new'}`;
  try{
   const saved=await loadRecordingDraft(key);draftKey.current=key;savedDrafts.current.delete(key);
   if(saved){restoreDraft(saved);return;}
   setCompletionReport(null);setArtworkPreview(row?.coverImage||'');setStep(0);setTranscribeLanguages([]);setTranscriptionMode('ai');setDraftStatus('');
   const value=row?editableRecording(row):{...blankRecording(),...(selectedType?{recordingType:selectedType.id,recordingAmount:selectedType.amount}:{})};
   value.items=editableRecordingItems(row||value);value.lyricsTiming=timingFromItems(value.items,value.audioUrl)||value.lyricsTiming;
   setEditor({id:row?.id||'',withLyrics:value.items.some(item=>item.hasLyrics),value});
  }catch(problem){setDraftError(`Could not restore the browser draft: ${problem.message}`);}
  finally{setDraftOpening(false);}
 };
 const [trimOpen,setTrimOpen]=useState(false);
 const audioDraft=useRef(null);
 useEffect(()=>{
  const draft=audioDraft.current;
  if(draft&&draft.url!==editor?.value.audioUrl){URL.revokeObjectURL(draft.url);audioDraft.current=null;}
 },[editor?.value.audioUrl]);
 useEffect(()=>()=>{if(audioDraft.current)URL.revokeObjectURL(audioDraft.current.url);},[]);
 const applyTrimmedAudio=draft=>{
  if(audioDraft.current)URL.revokeObjectURL(audioDraft.current.url);
  const url=URL.createObjectURL(draft.file);audioDraft.current={...draft,version:crypto.randomUUID(),url};
  setTrimOpen(false);
  applyUploadedAudio({...draft,url});
 };
 const selectDraftAudio=async file=>{
  const format=file.name.match(/\.(mp3|m4a|mp4|aac|wav|ogg|flac|webm|mpeg|mpga)$/i)?.[1]?.toLowerCase()||({'audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav','audio/mp4':'m4a','audio/aac':'aac','audio/ogg':'ogg','audio/flac':'flac','audio/webm':'webm'}[file.type]||'');
  applyTrimmedAudio({file,exportFormat:format,audioMetadata:{format,sizeBytes:file.size,trimmed:false},durationSeconds:null});
 };
 useEffect(()=>{
  const key=draftKey.current;if(!editor||!key||savedDrafts.current.has(key))return;
  const version=++draftWrite.current;setDraftStatus('Saving browser draft…');
  saveRecordingDraft(key,{editor,step,languages:transcribeLanguages,transcriptionMode,completionReport},audioDraft.current).then(()=>{if(version===draftWrite.current){setDraftStatus('Draft saved in this browser');setDraftError('');}}).catch(problem=>{if(version===draftWrite.current){setDraftStatus('');setDraftError(`Browser draft could not be saved: ${problem.message||'Check available browser storage.'}`);}});
 },[editor,step,transcribeLanguages,transcriptionMode,completionReport]);
 const updateAudioDuration=seconds=>setEditor(current=>{
  if(!current||!Number.isFinite(seconds)||seconds<=0)return current;
  const item=current.value.items[0],needsRange=current.value.items.length===1&&!item.audioRange&&item.lyrics?.startSec==null&&item.lyrics?.endSec==null;
  if(!needsRange&&Math.abs((current.value.durationSeconds??-1)-seconds)<=.05)return current;
  const audioRange={startSec:0,endSec:seconds};
  return {...current,value:{...current.value,durationSeconds:seconds,items:needsRange?[{...item,audioRange,...(item.lyrics?{lyrics:{...item.lyrics,...audioRange}}:{})}]:current.value.items}};
 });

 const uploadAudioDraft=async draft=>{
  if(draft.uploaded)return draft.uploaded;
  const body=new FormData();body.append('file',draft.file);
  if(draft.audioMetadata.trimmed)body.append('trimmed','true');
  const compress=draft.file.type==='audio/wav'&&draft.exportFormat==='aac';
  if(compress)body.append('exportFormat',draft.exportFormat);
  const response=await fetch(`${apiBaseUrl}/admin/music-archive/upload`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.message||'The trimmed audio could not be uploaded. Your draft is still in this browser.');
  if(!data.url)throw Error('The upload did not return an audio file. Your draft is still in this browser.');
  if(compress&&data.exportFormat!==draft.exportFormat)throw Error('The API did not confirm the selected compressed export.');
  draft.uploaded={...data,audioMetadata:data.audioMetadata||{...draft.audioMetadata,format:draft.exportFormat==='aac'?'m4a':draft.exportFormat,sizeBytes:data.sizeBytes??draft.file.size}};
  await saveRecordingDraft(draftKey.current,{editor,step,languages:transcribeLanguages,transcriptionMode,completionReport},draft).catch(problem=>setDraftError(`Browser draft could not be updated: ${problem.message}`));
  return draft.uploaded;
 };
 const applyUploadedAudio=r=>{setTimelineSeek(null);setFocusedAtomId(null);const duration=Number.isFinite(r.durationSeconds)?r.durationSeconds:r.duration?String(r.duration).split(':').reduce((a,b)=>a*60+Number(b),0):null;setEditor(e=>({...e,value:{...e.value,audioUrl:r.url,audioMetadata:r.audioMetadata||null,durationSeconds:duration,lyricsTiming:null,items:clearItemTiming(e.value.items)}}));};
 const completeRecordingWithAi=async(detectionOnly=false)=>{
  if(recordingLocked||!editor?.value.audioUrl||(!editor.withLyrics&&!detectionOnly))return;
  const snapshot=editor,previousReport=completionReport,controller=new AbortController(),audioVersion=audioDraft.current?.version||snapshot.value.audioUrl;
  const alreadyDetected=!detectionOnly&&previousReport?.detectionApplied&&previousReport?.audioVersion===audioVersion;
  completionRequest.current=controller;setError('');setCompletionReport(null);setCompletionStatus('Analyzing audio and transcribing…');
  let report={sources:[],warnings:[],missing:[],audioVersion};
  try{
   const [transcription,acoustics]=await Promise.allSettled([
    snapshot.withLyrics?transcribeLyrics(null,{signal:controller.signal,timestamps:true,source:'recording'}):Promise.resolve({segments:[],text:''}),
    alreadyDetected?Promise.resolve(null):analyzeRecordingAudio(snapshot.value.audioUrl,controller.signal,snapshot.value.durationSeconds)
   ]);
   if(controller.signal.aborted)return;
   if(transcription.status==='rejected'&&!detectionOnly)throw transcription.reason;
   if(transcription.status==='rejected')report.warnings.push(`Lyrics unavailable: ${transcription.reason.message}`);
   if(acoustics.status==='rejected')report.warnings.push('Acoustic transition analysis was unavailable; detection used timed lyrics only.');
   const result=transcription.status==='fulfilled'?transcription.value:{segments:[],text:''};
   const features=acoustics.status==='fulfilled'?acoustics.value:null;
   const duration=features?.duration||snapshot.value.durationSeconds||result.segments?.at(-1)?.end;
   if(!Number.isFinite(duration)||duration<=0)throw Error('Wait for the audio duration to load before detecting atoms.');
   const lines=(result.segments||[]).filter(line=>line.start<duration).map(line=>({...line,end:Math.min(line.end,duration)})).filter(line=>line.end>line.start);
   const timing=lines.length?{audioUrl:snapshot.value.audioUrl,model:result.model,lines}:snapshot.value.lyricsTiming;
   let working=applyRecordingTiming(snapshot.value.items,timing),amount=snapshot.value.recordingAmount;
   const updateDraft=()=>setEditor(current=>current?.value.audioUrl===snapshot.value.audioUrl?{...current,withLyrics:working.some(item=>item.hasLyrics),value:{...current.value,durationSeconds:duration,recordingAmount:amount,lyricsTiming:timing,items:[...working]}}:current);
   updateDraft();
   if(!alreadyDetected){
    setCompletionStatus('Detecting distinct songs and their boundaries…');
    const detection=await apiRequest(`${ontologyPath}/recording-atom-detection`,{token,signal:controller.signal,method:'POST',body:{duration,segments:lines,candidates:features?.candidates||[]}});
    if(controller.signal.aborted)return;
    report={...report,detection,detectedTiming:timing,splitBackup:{items:snapshot.value.items,amount:snapshot.value.recordingAmount,withLyrics:snapshot.withLyrics,lyricsTiming:snapshot.value.lyricsTiming}};
    if(snapshot.value.items.length>1){report.pendingDetection=true;report.warnings.push('Existing atoms were kept. Use the detected segments below to replace them.');setCompletionReport(report);return;}
    working=createDetectedAtoms(detection,timing,snapshot.value.items,snapshot.withLyrics);amount=working.length>1?'MULTIPLE':'INDIVIDUAL';report.detectionApplied=true;updateDraft();
   }else report={...report,detection:previousReport.detection,detectionApplied:true,splitBackup:previousReport.splitBackup};
   setCompletionReport(structuredClone(report));
   if(detectionOnly)return;
   let researched=0;
   for(let index=0;index<working.length;index++){
    const atom=working[index];if(!atom.hasLyrics)continue;
    const text=atom.lyrics?.text||'';
    if(text.trim().length<20){report.warnings.push(`Atom ${index+1}: not enough transcribed lyrics to research.`);continue;}
    if(researched>=6){report.warnings.push('All detected atoms are available. Online detail research was limited to six atoms in this run.');break;}
    researched++;setCompletionStatus(`Researching atom ${index+1} of ${working.length}…`);
    try{
     const analysis=await apiRequest(`${ontologyPath}/recording-completion`,{token,signal:controller.signal,method:'POST',body:{text:text.slice(0,20000),title:atom.name||snapshot.value.title}});
     if(controller.signal.aborted)return;
     const applied=applyRecordingCompletion(atom,analysis,vocabulary);working[index]=applied.item;
     report.sources.push(...analysis.sources);report.warnings.push(...analysis.warnings);report.missing.push(...applied.missing);updateDraft();
     if(working.length===1&&analysis.title)setEditor(current=>current?.value.audioUrl===snapshot.value.audioUrl?{...current,value:{...current.value,title:current.value.title||analysis.title}}:current);
    }catch(problem){if(controller.signal.aborted)return;report.warnings.push(`Atom ${index+1}: ${problem.message}`);if(problem.status===429)break;}
   }
   setCompletionReport({...report,sources:[...new Map(report.sources.map(source=>[source.url,source])).values()],warnings:[...new Set(report.warnings)],missing:[...new Set(report.missing)]});
  }catch(problem){if(!controller.signal.aborted){setCompletionReport(report);setError(problem.status===404?'Deploy the atom detection backend update to enable automatic song segmentation. Your draft has been kept.':problem.message||'AI completion failed. Your draft has been kept.');}}
  finally{if(completionRequest.current===controller){completionRequest.current=null;setCompletionStatus('');}}
 };
 const useDetectedAtoms=()=>{
  if(!completionReport?.detection)return;
  const detected=createDetectedAtoms(completionReport.detection,completionReport.detectedTiming,editor.value.items,editor.withLyrics);
  setEditor(current=>({...current,withLyrics:detected.some(item=>item.hasLyrics),value:{...current.value,items:detected,recordingAmount:detected.length>1?'MULTIPLE':'INDIVIDUAL',lyricsTiming:completionReport.detectedTiming}}));
  setCompletionReport(current=>({...current,pendingDetection:false,detectionApplied:true}));
 };
 const undoDetectedAtoms=()=>{
  const backup=completionReport?.splitBackup;if(!backup)return;
  setEditor(current=>({...current,withLyrics:backup.withLyrics,value:{...current.value,items:backup.items,recordingAmount:backup.amount,lyricsTiming:backup.lyricsTiming}}));setCompletionReport(null);
 };
 const selectTimelineAtom=id=>{
  setFocusedAtomId(id);const item=editor?.value.items.find(item=>item.id===id),range=item&&atomRange(item);
  if(range)setTimelineSeek({time:range.startSec});
 };
 const changeAtomSegment=(id,range)=>setEditor(current=>{
  if(!current)return current;
  const items=moveAtomBoundary(current.value.items,id,range,current.value.durationSeconds||86400,current.value.lyricsTiming);
  return {...current,withLyrics:items.some(item=>item.hasLyrics),value:{...current.value,items}};
 });

 const changeRecordingAmount=amount=>setEditor(current=>({...current,value:{...current.value,recordingAmount:amount,items:amount==='INDIVIDUAL'&&!current.value.items.length?[{...blankRecordingItem(current.value.title),hasLyrics:current.withLyrics,lyrics:current.withLyrics?blankItemLyrics():null}]:current.value.items}}));
 const changeRecordingTiming=timing=>setEditor(current=>current&&timing.audioUrl===current.value.audioUrl?{...current,value:{...current.value,lyricsTiming:timing,items:applyRecordingTiming(current.value.items,timing)}}:current);
 const changeRecordingLyrics=enabled=>setEditor(current=>({...current,withLyrics:enabled,value:{...current.value,items:current.value.items.map(item=>({...item,hasLyrics:enabled,lyrics:enabled?{...(item.lyrics||blankItemLyrics()),...(item.audioRange||{})}:item.lyrics}))}}));
 const change=(key,value)=>setEditor(e=>({...e,value:{...e.value,[key]:value,...(key==='title'&&e.value.recordingAmount==='INDIVIDUAL'&&e.value.items?.length===1&&(!e.value.items[0].name||e.value.items[0].name===e.value.title)?{items:[{...e.value.items[0],name:value}]}:{})}}));
 const closeEditor=()=>{if(recordingLocked)return;setEditor(null);};
 const saveRecording=()=>task(async()=>{const timing=editor.withLyrics?editor.value.lyricsTiming:null;if(timing?.lines.some((line,index,lines)=>!Number.isFinite(line.start)||!Number.isFinite(line.end)||line.start<0||line.end<=line.start||!line.text.trim()||(index>0&&line.start<lines[index-1].start)))throw Error('Each timed lyric line needs text and valid, ordered start/end times.');if(timing?.lines.length&&editor.value.items.length>1&&editor.value.items.some(item=>item.hasLyrics&&(item.lyrics?.startSec==null||item.lyrics?.endSec==null)))throw Error('Set start and end seconds in each lyric atom before saving recording timed lyrics.');const recordingItems=applyRecordingTiming(editor.value.items,timing).map(item=>editor.value.recordingAmount==='INDIVIDUAL'&&!item.name.trim()?{...item,name:editor.value.title}:item);validateRecordingItems(recordingItems,editor.value.recordingAmount);const {recordingMetadata:_metadata,credits:_credits,...fields}=editor.value;const body={...fields,items:recordingItems.map(item=>({...item,lyrics:item.hasLyrics?item.lyrics:null})),workId:'',componentWorkIds:[],lyricsTiming:null};if(audioDraft.current?.url===body.audioUrl){const draft=audioDraft.current,uploaded=await uploadAudioDraft(draft);body.audioUrl=uploaded.url;body.audioMetadata=uploaded.audioMetadata;body.items=body.items.map(item=>item.lyrics?.timedLyrics?.audioUrl===draft.url?{...item,lyrics:{...item.lyrics,timedLyrics:{...item.lyrics.timedLyrics,audioUrl:uploaded.url}}}:item);}const {item}=await apiRequest(`${ontologyPath}/recordings${editor.id?`/${encodeURIComponent(editor.id)}`:''}`,{token,method:editor.id?'PUT':'POST',body});if(!item?.id)throw Error('The API did not confirm the saved recording. Your browser draft has been kept.');if(typeId&&item.recordingType!==typeId)setFilters(current=>({...current,recordingType:item.recordingType||'',recordingAmount:''}));setSelected(item.id);const key=draftKey.current;savedDrafts.current.add(key);++draftWrite.current;try{await deleteRecordingDraft(key);setDraftError('');}catch{setDraftError('The recording was saved, but its browser draft could not be cleared.');}setEditor(null);setDraftStatus('');});
 const getTranscriptionStatus=useCallback(async()=>{
  try{return await apiRequest(`${ontologyPath}/lyrics-transcription/status`,{token});}
  catch(error){if(error.cancelled)return;if(error.status!==404)throw error;const {item,providers}=await apiRequest('/ai-booking/admin/config',{token});if(!item.stt?.model)throw Error('Speech-to-text settings are unavailable.');return {model:item.stt.model,enabled:item.stt.enabled,configured:Boolean(providers?.openai?.configured)};}
 },[token]);
 const transcribeLyrics=async(file,{signal,language,timestamps,source})=>{
  const draft=source==='recording'&&audioDraft.current?.url===editor?.value.audioUrl?audioDraft.current:null;
  const body=new FormData();if(draft){body.append('file',draft.file);body.append('draftAudioId',draft.version);}else if(source==='recording'&&editor?.value.audioUrl)body.append('audioUrl',editor.value.audioUrl);else if(file)body.append('file',file);if(language)body.append('language',language);body.append('timestamps',String(Boolean(timestamps)));
  const response=await fetch(`${apiBaseUrl}${ontologyPath}/lyrics-transcription`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body,signal});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(response.status===404?'The transcription backend is not available yet. Deploy the API update and try again.':data.message||'Could not transcribe the audio.');
  if(typeof data.text!=='string')throw Error('Invalid transcription response.');
  if(draft&&data.sourceAudioUrl===`browser-audio:${draft.version}`)data.sourceAudioUrl=draft.url;
  lastTimed.current=data.segments?.length&&data.sourceAudioUrl?{audioUrl:data.sourceAudioUrl,model:data.model,lines:data.segments}:null;
  setWorkEditor(current=>current?{...current,timedTranscript:lastTimed.current}:current);
  return data;
 };
 const saveWork=()=>task(async()=>{if(workEditor.timedTranscript?.lines?.some((line,index,lines)=>!Number.isFinite(line.start)||!Number.isFinite(line.end)||line.start<0||line.end<=line.start||!line.text.trim()||(index>0&&line.start<lines[index-1].start)))throw Error('Each lyric row needs text and valid start/end times, ordered by start time.');const body={...workEditor.value,lyrics:workEditor.value.type==='SONG'?workEditor.value.lyrics:null};const {item}=await apiRequest(`${ontologyPath}/works${workEditor.id?`/${encodeURIComponent(workEditor.id)}`:''}`,{token,method:workEditor.id?'PUT':'POST',body});if(workEditor.timedTranscript&&editor&&workEditor.timedTranscript.audioUrl===editor.value.audioUrl)setEditor(current=>({...current,value:{...current.value,lyricsTiming:{...workEditor.timedTranscript,workId:item.id}}}));if(workEditor.timedTranscript===null&&editor?.value.lyricsTiming?.workId===item.id)setEditor(current=>({...current,value:{...current.value,lyricsTiming:null}}));setWorkEditor(null);});
 const saveVocab=()=>task(async()=>{const {item}=await apiRequest(`${ontologyPath}/vocabulary${vocabEditor.id?`/${encodeURIComponent(vocabEditor.id)}`:''}`,{token,method:vocabEditor.id?'PUT':'POST',body:vocabEditor.value});setVocabulary(rows=>[...rows.filter(row=>row.id!==item.id),item].sort((a,b)=>a.name.localeCompare(b.name)));if(item.kind===pendingReference.current?.kind)pendingReference.current.onSelect(item.id,item);pendingReference.current=null;setVocabEditor(null);notifyWorkElementsChanged();});
 const deleteRecording=row=>{task(async()=>{const result=await apiRequest(`${ontologyPath}/recordings/${encodeURIComponent(row.id)}`,{token,method:'DELETE',body:{revision:row.revision,permanent:true}});if(result.ok!==true||result.deleted!==true||result.id!==row.id)throw Error('Permanent deletion was not confirmed. The server may need updating.');setItems(current=>current.filter(item=>item.id!==row.id));setAllItems(current=>current.filter(item=>item.id!==row.id));setSelected(null);setContentSelection(null);},'Recording deleted.');};
 const selectedType=workTypes.find(type=>type.id===typeId);
 const visibleRecordings=filters.archivalStatus==='ARCHIVED'?items:items.filter(item=>item.archivalStatus!=='ARCHIVED');
 const typeRecordings=typeId?visibleRecordings.filter(row=>row.recordingType===typeId):visibleRecordings;
 const at=typeRecordings.findIndex(r=>r.id===selected),step_=d=>typeRecordings[at+d]&&setSelected(typeRecordings[at+d].id);
 const chosen=typeRecordings.find(r=>r.id===selected),value=editor?.value;
 // The audio upload box unmounts once audio is attached, so it can no longer report that its upload finished.
 useEffect(()=>{if(value?.audioUrl)setAudioBusy(false);},[value?.audioUrl]);
 const chooseType=id=>{setFilters(current=>({...current,recordingType:id,recordingAmount:''}));setSelected(null);setContentSelection(null);};
 const selectedContent=chosen&&contentSelection&&chosen.id===contentSelection.recordingId?recordingComponents(chosen).find(w=>w.id===contentSelection.workId):null;
 useEffect(()=>{if(contentRef.current)contentRef.current.scrollTop=0;},[chosen?.id,selectedContent?.id]);
 const workFields=workEditor?(<WorkFields hideLyricsText={!workEditor.id} workTypes={workTypes} timedLyrics={workEditor.timedTranscript===undefined?(editor?.value.lyricsTiming?.workId===workEditor.id?editor.value.lyricsTiming:null):workEditor.timedTranscript} onTimedLyricsChange={timing=>setWorkEditor(w=>({...w,timedTranscript:timing,value:{...w.value,lyrics:{...w.value.lyrics,text:timing?timing.lines.map(line=>line.text).join('\n'):w.value.lyrics.text}}}))} recordingAudioUrl={editor?.value.audioUrl||''} onGetTranscriptionStatus={getTranscriptionStatus} onTranscribeAudio={transcribeLyrics} simple={false} onGenerateConcept={text=>apiRequest(`${ontologyPath}/lyrics-concept`,{token,method:'POST',body:{text}})} classificationLocked={Boolean(workEditor.id)||workEditor.attachToRecording} value={workEditor.value} onChange={v=>setWorkEditor(w=>({...w,value:v}))} vocabulary={vocabulary}/>):null;


 return <CreateReferenceContext.Provider value={createReference}><section className="ontology-admin ontology-view-recordings" aria-labelledby="ontology-admin-title"><div className="ontology-admin-main"> <div className="ontology-recording-workspace">
 <aside className="ontology-recording-sidebar" aria-label="Work Types"><header><div className="ontology-recordings-title"><h2>Work Types</h2></div></header><nav aria-label="Choose a work type" className="ontology-recording-list"><button type="button" aria-current={!typeId?'true':undefined} onClick={()=>chooseType('')}><span className="ontology-recording-icon" aria-hidden="true"><Layers size={18}/></span><span><strong>All work types</strong><small>{(n=>`${n} ${n===1?'recording':'recordings'}`)(allItems.filter(row=>row.archivalStatus===(filters.archivalStatus||'ACTIVE')).length)}</small></span></button>{workTypes.map(type=><button key={type.id} type="button" aria-current={typeId===type.id?'true':undefined} onClick={()=>chooseType(typeId===type.id?'':type.id)}>{type.artworkUrl?<img src={type.artworkUrl} alt="" loading="lazy"/>:<span className="ontology-recording-icon" aria-hidden="true"><Layers size={18}/></span>}<span><strong>{type.name}</strong><small>{(n=>`${n} ${n===1?'recording':'recordings'}`)(allItems.filter(row=>row.recordingType===type.id&&row.archivalStatus===(filters.archivalStatus||'ACTIVE')).length)}</small></span></button>)}</nav>{!loading&&!workTypes.length&&<p>No work types yet.</p>}<footer><small>{workTypes.length} {workTypes.length===1?'work type':'work types'}</small></footer></aside>
 <section className="ontology-archive-panel" aria-labelledby="ontology-admin-title">{draftError&&!editor&&<p role="alert">{draftError}</p>}<header className="ontology-heading"><div className="ontology-recordings-title"><small>{typeRecordings.length} {typeRecordings.length===1?'recording':'recordings'}{selectedType?` · ${selectedType.name}`:''}</small><h1 id="ontology-admin-title">Recordings</h1></div><div className="ontology-heading-actions" role="toolbar" aria-label="Recordings toolbar"><button type="button" className="ontology-add-recording" aria-label="New recording" title="New recording" disabled={unavailable||busy||draftOpening||!draftOwner} onClick={()=>openRecording()}><Plus size={18} aria-hidden="true"/></button><button type="button" className="ontology-add-recording" aria-label="Edit recording" title={chosen?`Edit ${chosen.title}`:'Select a recording to edit'} disabled={!chosen||unavailable||busy||draftOpening||!draftOwner} onClick={()=>{if(chosen)openRecording(chosen);}}><Pencil size={18} aria-hidden="true"/></button><button type="button" className="ontology-add-recording" aria-label="Delete recording" title={chosen?`Delete ${chosen.title}`:'Select a recording to delete'} disabled={!chosen||!Number.isInteger(chosen.revision)||chosen.revision<0||unavailable||busy} onClick={()=>{if(chosen)deleteRecording(chosen);}}><Trash2 size={18} aria-hidden="true"/></button><OntologyFilters admin popup value={filters} onChange={setFilters} vocabulary={vocabulary} workTypes={workTypes}/></div></header>
 {error&&<p role="alert" className="ontology-alert">{error}{unavailable&&' The ontology API must be deployed before using the new editor.'}</p>}{notice&&<p role="status">{notice}</p>}{loading&&<p role="status">Loading archive…</p>}
 <div className="ontology-recording-main"><RecordingsListTable recordings={typeRecordings} selectedId={selected} loading={loading} onSelect={id=>{setSelected(id===selected?null:id);setContentSelection(null);}}/></div>
 </section>
 {chosen&&<aside className="ontology-recording-details-panel" hidden={editorOpen||workOpen||vocabOpen} aria-labelledby="recording-details-title"><header><div><small>RECORDING CONTENT</small><h2 id="recording-details-title">{chosen.title}</h2></div><button type="button" aria-label="Close recording content" onClick={()=>{setSelected(null);setContentSelection(null);}}>×</button></header><div className="ontology-recording-details-content">
{(()=>{const type=workTypes.find(item=>item.id===chosen.recordingType),isSample=type?.sample?.recordingId===chosen.id,blocked=!type?'Give this recording a work type first':!(chosen.storedAudioUrl||chosen.audioUrl)?'This recording has no audio yet':'';return <div className="ontology-sample-bar"><button type="button" className="ontology-set-sample" disabled={Boolean(blocked)} title={blocked||`Choose a one-minute sample for ${type.name}`} onClick={()=>setSampleOpen(true)}>Set as sample</button>{isSample?<span>Current {type.name} sample · from {Math.floor(type.sample.startSec/60)}:{String(Math.floor(type.sample.startSec%60)).padStart(2,'0')}</span>:type?.sample?<span>{type.name} sample: {type.sample.title}</span>:blocked?<span>{blocked}</span>:<span>No {type.name} sample yet</span>}</div>;})()}
{chosen.items?.length?<SavedRecordingItems items={chosen.items} vocabulary={vocabulary}/>:<div className="ontology-content-browser"><RecordingContentList key={chosen.id} recording={chosen} selectedWorkId={selectedContent?.id} onSelect={w=>setContentSelection({recordingId:chosen.id,workId:w.id})}/><section ref={contentRef} id="selected-content-details" className="ontology-selected-content-details" aria-labelledby="selected-content-heading"><header><small>CONTENT DETAILS</small><h3 id="selected-content-heading">{selectedContent?.title||'Select content'}</h3></header>{selectedContent?<ContentDetails work={selectedContent} onEdit={w=>setWorkEditor({id:w.id,value:editableWork(w)})}/>:<p className="ontology-content-hint">Select a content item above to see its fields and values here.</p>}</section></div>}<ArchiveMiniPlayer src={chosen.storedAudioUrl||chosen.audioUrl} title={chosen.title} artist={chosen.artist} cover={chosen.coverImage} onPrev={at>0?()=>step_(-1):undefined} onNext={at>=0&&at<typeRecordings.length-1?()=>step_(1):undefined}/></div></aside>}
 </div>
 </div>


 <dialog ref={dialog} className="ontology-dialog ontology-editor-dialog" aria-label="Recording editor" onCancel={event=>{if(event.target===event.currentTarget&&recordingLocked)event.preventDefault();}} onClose={event=>{if(event.target===event.currentTarget){setEditor(null);}}}>{value&&<><header><div className="cb-dialog-heading"><span className="cb-dialog-icon" aria-hidden="true"><Layers size={22}/></span><div><h2>{editor.id?'Edit recording':'New recording'}</h2></div></div><button type="button" className="cb-dialog-close" disabled={recordingLocked} onClick={closeEditor} aria-label="Close recording editor"><X size={19}/></button></header>{error&&<p role="alert">{error}</p>}<fieldset disabled={recordingLocked} className="ontology-editor-body">
 {step===0&&<div className="recording-basics recording-basics--items"><div className="recording-media-column"><section className="recording-form-section"><header><span className="recording-section-icon"><Music2 size={18}/></span><div><h3>Audio file</h3><p>{value.audioUrl?.startsWith('blob:')?'Browser draft · uploads on Save recording.':value.audioUrl?'Audio is attached.':'Choose the audio for this recording.'}</p></div>{value.audioUrl&&<button type="button" className="recording-trim-audio" disabled={recordingLocked} aria-label="Trim audio" title="Trim audio" onClick={()=>setTrimOpen(true)}><Scissors size={16} aria-hidden="true"/></button>}{value.audioUrl&&<button type="button" className="recording-remove-cover recording-remove-audio" disabled={recordingLocked} aria-label="Delete selected audio" title="Delete selected audio" onClick={()=>setEditor(e=>({...e,value:{...e.value,audioUrl:'',audioMetadata:null,durationSeconds:null,lyricsTiming:null,items:clearItemTiming(e.value.items)}}))}><Trash2 size={16} aria-hidden="true"/></button>}</header>{!value.audioUrl&&<OntologyMediaUpload token={token} value={value.audioUrl} onBusyChange={setAudioBusy} onSelected={selectDraftAudio} onUploaded={applyUploadedAudio}/>}{value.audioUrl&&<RecordingAudioPreview key={value.audioUrl} src={value.audioUrl} metadata={value.audioMetadata} onDuration={updateAudioDuration}/>}<div className="recording-audio-lyrics-question"><label>Does recording have lyrics?<select aria-label="Does recording have lyrics?" value={editor.withLyrics?'yes':'no'} aria-controls="recording-transcription-panel" onChange={event=>changeRecordingLyrics(event.target.value==='yes')}><option value="no">No lyrics</option><option value="yes">With lyrics</option></select></label></div></section><aside className="recording-artwork-card"><header className="recording-artwork-header"><div><h3>Cover artwork</h3><p>Optional · square image</p></div>{value.coverImage&&<button type="button" className="recording-remove-cover" disabled={recordingLocked} aria-label="Remove cover artwork" title="Remove cover artwork" onClick={()=>{change('coverImage','');setArtworkPreview('');}}><Trash2 size={16} aria-hidden="true"/></button>}</header><OntologyMediaUpload artwork compact token={token} value={value.coverImage} previewUrl={artworkPreview||value.coverImage} onBusyChange={setArtworkBusy} onUploaded={r=>{change('coverImage',r.url);setArtworkPreview(r.previewUrl||r.url);}}/></aside></div><div className="recording-basics-main"><section className={`recording-form-section recording-information-section${editor.withLyrics?' is-with-lyrics':''}${value.recordingAmount==='MULTIPLE'?' is-with-atoms':''}`}><header className="recording-information-heading"><div><h3>Recording information</h3><p>Give your recording a name listeners will recognize.</p></div>{editor.withLyrics&&<button type="button" className="recording-complete-ai" aria-label="Complete recording information with AI" title="Transcribe audio and research missing recording information" disabled={recordingLocked||!value.audioUrl||!value.durationSeconds} onClick={()=>completeRecordingWithAi()}><Sparkles size={17} aria-hidden="true"/><span>{completionStatus?'Working…':'COMPLETE WITH AI'}</span></button>}{completionStatus&&<div className="recording-completion-status" role="status"><Sparkles size={15}/><span>{completionStatus}</span></div>}{completionReport&&<section className="recording-completion-report" aria-label="AI completion research"><strong>AI draft ready · review before saving</strong>{completionReport.detection&&<div className="recording-detected-atoms"><p><strong>{completionReport.detection.atoms.length} {completionReport.detection.atoms.length===1?'atom':'atoms'} detected</strong> · approximate song boundaries</p><p>{completionReport.detection.summary}</p><ol>{completionReport.detection.atoms.map((atom,index)=><li key={index}><strong>{atom.title}</strong> · {formatDuration(atom.start)}–{formatDuration(atom.end)} · {atom.confidence} confidence<small>{atom.reason}</small></li>)}</ol>{completionReport.pendingDetection&&<button type="button" onClick={useDetectedAtoms}>Use detected atoms</button>}{completionReport.detectionApplied&&completionReport.splitBackup&&<button type="button" onClick={undoDetectedAtoms}>Undo detected split</button>}</div>}<p>Existing entries were kept. Unverified dates, keys, rhythms, influences, and credits are left for your review.</p>{completionReport.sources.length>0&&<ul>{completionReport.sources.map(source=><li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul>}{completionReport.warnings.map(warning=><p key={warning}>{warning}</p>)}{completionReport.missing.length>0&&<p>Not found in Work Elements: {completionReport.missing.join('; ')}. Add these entries to select them.</p>}</section>}</header><label>Recording name <input required value={value.title} maxLength={240} placeholder="e.g. Christmas evening mix" onChange={e=>change('title',e.target.value)}/></label><div className="ontology-form-grid recording-classification-fields"><label>Recording atoms<select value={value.recordingAmount} onChange={event=>changeRecordingAmount(event.target.value)}><option value="INDIVIDUAL">Individual</option><option value="MULTIPLE">Multiple</option></select></label><label>Recording Work Type<select value={value.recordingType||''} onChange={e=>change('recordingType',e.target.value)}><option value="" disabled>Choose a type</option>{workTypes.map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</select></label></div><div className="ontology-form-grid recording-date-row"><DurationField value={value.durationSeconds}/><label><span className="recording-title-line">Recording Release date <small className="recording-title-hint">(DJ Production Date)</small></span><input list={workElementListId('releaseDate')} type="date" value={value.releaseDate} onChange={e=>change('releaseDate',e.target.value)}/></label></div>{value.recordingAmount==='INDIVIDUAL'&&value.items[0]&&<AtomReleaseDate inline item={value.items[0]} onChange={patch=>change('items',value.items.map((item,index)=>index===0?{...item,...patch}:item))}/>}<div className="ontology-form-grid recording-publication-fields"><label>Publication status<select value={value.archivalStatus==='ARCHIVED'?'ARCHIVED':value.publicationStatus} onChange={e=>{const status=e.target.value;if(status==='ARCHIVED')setEditor(current=>({...current,value:{...current.value,publicationStatus:'WITHDRAWN',archivalStatus:'ARCHIVED'}}));else setEditor(current=>({...current,value:{...current.value,publicationStatus:status,archivalStatus:'ACTIVE'}}));}}>{contract.publicationStatuses.filter(v=>v!=='WITHDRAWN'||value.publicationStatus==='WITHDRAWN'&&value.archivalStatus!=='ARCHIVED').map(v=><option key={v}>{v}</option>)}<option value="ARCHIVED">ARCHIVED</option></select></label></div><aside id="recording-transcription-panel" className="recording-transcribe-column" aria-label="Recording atoms and transcription" aria-hidden={!editor.withLyrics&&value.recordingAmount!=='MULTIPLE'} inert={!editor.withLyrics&&value.recordingAmount!=='MULTIPLE'}>{value.recordingAmount==='MULTIPLE'&&<RecordingItemsEditor focusedAtomId={focusedAtomId} onSelect={selectTimelineAtom} key={editor.id||'new'} withLyrics={editor.withLyrics} items={value.items} amount={value.recordingAmount} audioUrl={value.audioUrl} duration={value.durationSeconds} vocabulary={vocabulary} onChange={items=>change('items',items)} onBusyChange={itemBusyChanged} onTranscribe={({signal,language})=>transcribeLyrics(null,{signal,language,timestamps:true,source:'recording'})} onGenerateConcept={(text,signal)=>apiRequest(`${ontologyPath}/lyrics-concept`,{token,signal,method:'POST',body:{text}})}/>}{editor.withLyrics&&<LyricsTranscription key={`${editor.id||'new'}:${value.audioUrl}`} timedLyrics={value.lyricsTiming} onTimedLyricsChange={changeRecordingTiming} recordingAudioUrl={value.audioUrl} audioMetadata={value.audioMetadata} initialMode={transcriptionMode} onModeChange={setTranscriptionMode} onGetStatus={getTranscriptionStatus} selectedLanguages={transcribeLanguages} onLanguagesChange={setTranscribeLanguages} onTranscribe={transcribeLyrics}/>}</aside>{value.recordingAmount!=='MULTIPLE'&&<RecordingItemsEditor focusedAtomId={focusedAtomId} onSelect={selectTimelineAtom} key={editor.id||'new'} withLyrics={editor.withLyrics} items={value.items} amount={value.recordingAmount} audioUrl={value.audioUrl} duration={value.durationSeconds} vocabulary={vocabulary} onChange={items=>change('items',items)} onBusyChange={itemBusyChanged} onTranscribe={({signal,language})=>transcribeLyrics(null,{signal,language,timestamps:true,source:'recording'})} onGenerateConcept={(text,signal)=>apiRequest(`${ontologyPath}/lyrics-concept`,{token,signal,method:'POST',body:{text}})}/>}{value.audioUrl&&<section className="recording-detail-player" aria-label="Recording audio and atom segments"><header><div><h3>Recording timeline</h3><p>Each colored segment references one atom. Drag its start/end handles, or click its label to seek.</p></div><button type="button" disabled={recordingLocked||!value.durationSeconds} onClick={()=>completeRecordingWithAi(true)}><Sparkles size={16}/>Detect atoms with AI</button></header><TranscriptionAudioTape key={value.audioUrl} src={value.audioUrl} metadata={value.audioMetadata} onDuration={updateAudioDuration} seekTo={timelineSeek} onTimeChange={time=>{const atom=value.items.find(item=>{const range=atomRange(item);return range&&time>=range.startSec&&time<range.endSec;});if(atom)setFocusedAtomId(atom.id);}} regions={value.items.flatMap((atom,index)=>{const range=atomRange(atom);return range?[{id:atom.id,name:atom.name||`Atom ${index+1}`,index,start:range.startSec,end:range.endSec}]:[];})} onRegionSelect={setFocusedAtomId} onRegionChange={changeAtomSegment}/></section>}</section></div></div>}

 


 </fieldset><footer><button type="button" disabled={recordingLocked} onClick={step===0?closeEditor:()=>setStep(0)}>{step===0?'Close':'Back to Recording'}</button><span role={draftError?'alert':'status'}>{draftError||draftStatus||`${value.items.length} ${value.items.length===1?'item':'items'}`}</span><button type="button" className="ontology-recording-save" disabled={!value.title.trim()||!value.recordingType||!value.items.length||recordingLocked} onClick={saveRecording}>{busy?'Saving…':'Save recording'}</button>{completionStatus&&<button type="button" onClick={()=>completionRequest.current?.abort()}>Cancel AI</button>}</footer></>}</dialog>
 <dialog ref={workDialog} className="ontology-dialog ontology-editor-dialog ontology-secondary-editor work-content-dialog" onCancel={event=>{if(event.target===event.currentTarget&&busy)event.preventDefault();}} onClose={event=>{if(event.target===event.currentTarget)setWorkEditor(null);}} aria-label="Content editor">{workEditor&&<><header><div className="work-dialog-heading"><span className="work-dialog-icon" aria-hidden="true">{workEditor.value.type==='SONG'?<Layers size={22}/>:<Music2 size={22}/>}</span><div><small>CONTENT LIBRARY</small><h2>{`${workEditor.id?'Edit':'New'} ${workEditor.value.type==='SONG'?'lyrical music':'instrumental entry'}`}</h2><p>{workEditor.value.type==='SONG'?'Bring the words and melody together.':'Capture the sound and the people behind it.'}</p></div></div><button type="button" className="cb-dialog-close" aria-label="Close content editor" disabled={busy} onClick={()=>{setWorkEditor(null);}}><X size={19}/></button></header>{error&&<p role="alert">{error}</p>}<fieldset disabled={busy}>{workFields}</fieldset><footer><span>Shared with recordings that use this entry</span><div className="work-dialog-footer-actions"><button type="button" disabled={busy} onClick={()=>setWorkEditor(null)}>Cancel</button><button type="button" disabled={busy||!workEditor.value.title.trim()} onClick={saveWork}>{busy?'Saving…':workEditor.attachToRecording?'Save & add entry':'Save content'}</button></div></footer></>}</dialog>
 <dialog ref={vocabDialog} className="ontology-dialog ontology-editor-dialog ontology-secondary-editor" onCancel={event=>{if(event.target===event.currentTarget&&busy)event.preventDefault();}} onClose={event=>{if(event.target===event.currentTarget){setVocabEditor(null);pendingReference.current=null;}}} aria-label="Details editor">{vocabEditor&&<><header><h2>{vocabEditor.value.kind==='lyricist'?'Lyricist':vocabEditor.value.kind==='artist'?'Vocalist / person':vocabEditor.value.kind==='instrument'?'New instrument':vocabEditor.value.kind==='musician'?'New musician / person':'Detail entry'}</h2><button type="button" disabled={busy} onClick={()=>{setVocabEditor(null);}}>Close</button></header>{error&&<p role="alert">{error}</p>}<fieldset disabled={busy}>{[['kind','Entity kind'],['name',vocabEditor.value.kind==='instrument'?'Instrument name':'Display name'],['isoCode','ISO language code (when available)'],['description','Description']].filter(([key])=>key!=='isoCode'&&(!pendingReference.current||key!=='kind')).map(([key,label])=><label key={key}>{label}{key==='kind'?<select disabled={Boolean(vocabEditor.id)||Boolean(pendingReference.current)} value={vocabEditor.value.kind} onChange={e=>setVocabEditor(v=>({...v,value:{...v.value,kind:e.target.value,parentId:''}}))}>{contract.vocabularyKinds.filter(kind=>kind!=='region').map(k=><option key={k}>{k}</option>)}</select>:<input value={vocabEditor.value[key]} onChange={e=>setVocabEditor(v=>({...v,value:{...v.value,[key]:e.target.value}}))}/>}</label>)}<WorkElementDependencies value={vocabEditor.value} onChange={value=>setVocabEditor(current=>({...current,value}))} vocabulary={vocabulary}/>{!pendingReference.current&&<label>Source attribution<input value={vocabEditor.value.provenance.source} onChange={e=>setVocabEditor(v=>({...v,value:{...v.value,provenance:{...v.value.provenance,source:e.target.value}}}))}/></label>}<button type="button" disabled={!vocabEditor.value.name.trim()} onClick={saveVocab}>{vocabEditor.value.kind==='artist'?'Save artist / person':vocabEditor.value.kind==='instrument'?'Save & select instrument':vocabEditor.value.kind==='musician'?'Save & select person':'Save details'}</button><p>Equivalent names within the same kind and parent reuse one identity. Referenced details are retained.</p></fieldset></>}</dialog>
 {trimOpen&&value?.audioUrl&&<AudioTrimmer key={value.audioUrl} src={value.audioUrl} token={token} metadata={value.audioMetadata} onClose={()=>setTrimOpen(false)} onTrimmed={applyTrimmedAudio}/>}{sampleOpen&&chosen&&workTypes.find(item=>item.id===chosen.recordingType)&&<SampleTrimmer key={chosen.id} recording={chosen} workType={workTypes.find(item=>item.id===chosen.recordingType)} token={token} onClose={()=>setSampleOpen(false)} onSaved={()=>{setSampleOpen(false);reload();}}/>}</section></CreateReferenceContext.Provider>;
}
