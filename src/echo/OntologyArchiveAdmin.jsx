import {acknowledgeRecordingAutosave} from '../lib/recordingAutosave';
import RecordingLoadingHint from './RecordingLoadingHint';
import {administratorDataChanged} from './administratorChanges';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Layers,Music2,Pencil,Plus,Trash2,X} from 'lucide-react';
import {apiRequest,apiBaseUrl} from '../lib/api';
import {blankRecording,editableRecording,recordingName,fetchOntologyRecordings,ontologyPath,announceMusicArchiveChange,musicOntologyContract as contract,recordingComponents} from '../lib/musicOntology';
import TranscriptionAudioTape from './TranscriptionAudioTape';
import {atomRange,moveAtomBoundary,moveAtomSegment} from '../lib/recordingAtoms';
import {EXPORT_FORMATS,estimateSizeMB,trimAudioFile} from '../lib/trimAudioFile';
import {recordingDraftOwner,saveRecordingDraft,loadRecordingDraft,deleteRecordingDraft,restoreRecordingDraft,getStems,deleteStems} from '../lib/recordingDraftStore';
import StemLanes from './StemLanes';
import RecordingLevelFooter from './RecordingLevelFooter';
import RecordingInfoSection from './RecordingInfoSection';
import {collectionPatches} from '../lib/recordingCollections';
import './ontologyHierarchy.css';
import {confirmDeletion} from '../lib/confirmDeletion';
import RecordingEditorBar from './RecordingEditorBar';
import {recordingStage,recordingSaveState} from '../lib/recordingWorkflow';
import RecordingItemsEditor from './RecordingItemsEditor';
import {editableRecordingItems,validateRecordingItems,clearItemTiming,blankItemLyrics} from '../lib/recordingItems';
import RecordingsListTable from './RecordingsListTable';
import SelfDestructHint from './SelfDestructHint';
import RecordingFilters from './RecordingFilters';
import WorkFields from './WorkFields';
import OntologyMediaUpload from './OntologyMediaUpload';
import {CreateReferenceContext} from './CreateReferenceContext';
import WorkElementDependencies from './WorkElementDependencies';
import {notifyWorkElementsChanged,subscribeWorkElementsChanged} from './workElementsCatalog';
import './musicOntology.css';
import {WorkElementsProvider} from './WorkElementsContext';
import {uuid} from '../lib/uuid.js';
import './liveArchiveCold.css';
const vocabEmpty=()=>({kind:'language',name:'',parentId:'',isoCode:'',description:'',languageIds:[],provenance:{source:'',note:''}});
export default function OntologyArchiveAdmin({token}){return <WorkElementsProvider token={token}><OntologyArchiveWorkspace token={token}/></WorkElementsProvider>;}
function OntologyArchiveWorkspace({token}){
 const [collections,setCollections]=useState([]),[collectionId,setCollectionId]=useState(''),[newCollection,setNewCollection]=useState(null),[newCollectionType,setNewCollectionType]=useState('');
 const [items,setItems]=useState([]),[allItems,setAllItems]=useState([]),[vocabulary,setVocabulary]=useState([]),[workTypes,setWorkTypes]=useState([]),[filters,setFilters]=useState(()=>{try{const saved=JSON.parse(localStorage.getItem('echo-recording-filters')||'{}');return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};}catch{return {};}}),[selected,setSelected]=useState(null);
  const activeFilters=Object.entries(filters).filter(([key,value])=>value!==''&&value!=null&&!(Array.isArray(value)&&!value.length)&&!(key==='bpmScope'&&value==='work')).length;
 useEffect(()=>{try{localStorage.setItem('echo-recording-filters',JSON.stringify(filters));}catch{/* the filter just resets on refresh */}},[filters]);// the Draft / Published filter survives a page refresh, so drafts stay in view
 // Leaving the Recording panel clears the saved filter, so coming back starts from the full list (a page refresh while inside still keeps it).
 useEffect(()=>()=>{try{localStorage.removeItem('echo-recording-filters');}catch{/* nothing saved */}},[]);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[unavailable,setUnavailable]=useState(false);
 const [editor,setEditor]=useState(null),[step,setStep]=useState(0),[workEditor,setWorkEditor]=useState(null),[vocabEditor,setVocabEditor]=useState(null);
 const [contentSelection,setContentSelection]=useState(null);
 const pickedCollection=editor?.collectionId;
 const setPickedCollection=id=>setEditor(current=>current?{...current,collectionId:id}:current);
 const [savingAction,setSavingAction]=useState(''),[artworkPreview,setArtworkPreview]=useState(''),[artworkBusy,setArtworkBusy]=useState(false),[audioBusy,setAudioBusy]=useState(false);
 const [focusedAtomId,setFocusedAtomId]=useState(null),[timelineSeek,setTimelineSeek]=useState(null);
 const [draftOwner,setDraftOwner]=useState(''),[draftOpening,setDraftOpening]=useState(true),[draftStatus,setDraftStatus]=useState(''),[draftError,setDraftError]=useState('');
 const recordingLocked=busy||artworkBusy||audioBusy||draftOpening;
 const draftKey=useRef(''),savedDrafts=useRef(new Map()),draftWrite=useRef(0);
 // What the open recording looked like when it was opened or last saved: any difference means it was changed, and a changed recording goes back to Draft until it is published again.
 const [,setOpeningTick]=useState(0);// re-render once the address-bar recording has been resolved
 const baseline=useRef(''),snap=value=>JSON.stringify(value);
 const [autosaveState,setAutosaveState]=useState('');
 const autosaveAttempt=useRef(''),autosaveLatest=useRef(null),saveInFlight=useRef(false);
 const rhythmTimingSupport=useRef(false);
 const liveEditor=useRef(editor);liveEditor.current=editor;
 const editorSession=useRef(0),backgroundSave=useRef(null),saveLatest=useRef(null),deleteLatest=useRef(null),savedCollection=useRef('');
 const [autosaveVersion,setAutosaveVersion]=useState(0);
 const typeId=filters.workType||'';
 const contentRef=useRef(null),pendingReference=useRef(null);
 const createReference=(kind,onSelect,name='')=>{pendingReference.current={kind,onSelect};setVocabEditor({id:'',value:{...vocabEmpty(),kind,name}});};
 const editorOpen=Boolean(editor),workOpen=Boolean(workEditor),vocabOpen=Boolean(vocabEditor);
 const formatId=format=>{const f=String(format||'').toLowerCase();return f==='m4a'||f==='aac'?'aac':f==='mp3'?'mp3':f==='wav'?'wav':'';};
 // The format the audio will be saved as: the picked one, otherwise whatever the audio already is.
 const currentSaveFormat=()=>{const draft=audioDraft.current,isDraft=draft&&draft.url===editor?.value?.audioUrl;return formatId(isDraft?draft.exportFormat:editor?.value?.audioMetadata?.format)||'mp3';};
 const closeEditorAction=useRef(null);
 const pagePushed=useRef(false),pendingRecording=useRef(new URL(window.location.href).searchParams.get('recording')),workDialog=useRef(null),vocabDialog=useRef(null),request=useRef(0);
 const reload=useCallback(async()=>{
  const generation=++request.current;
  const results=await Promise.allSettled([fetchOntologyRecordings({...filters,q:'',rhythm:'',key:'',genre:'',instrument:'',musician:'',bpmMin:'',bpmMax:'',bpmScope:'',status:(filters.status||'ALL')==='ALL'?'':filters.status},{token}),apiRequest(`${ontologyPath}/vocabulary`,{token}),fetchOntologyRecordings({},{token}),apiRequest(`${ontologyPath}/work-types`,{token}),apiRequest('/admin/music-archive',{token})]);
  if(request.current!==generation)return;
  const labels=['recordings','metadata options','all recordings','work types','collections'];
  const setters=[setItems,setVocabulary,setAllItems,setWorkTypes,setCollections];
  const failures=[];
  results.forEach((result,index)=>{
   if(result.status==='rejected'){
    const message=`Could not load ${labels[index]}: ${result.reason.message}`;failures.push(message);

    if(index===0)setUnavailable(result.reason.status===404);
    return;
   }
   const rows=[0,2].includes(index)?result.value:index===4?result.value.collections:result.value.items;
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
 // The recording editor is a page: it owns a ?recording= URL so the browser Back button returns to the list.
 useEffect(()=>{
  const url=new URL(window.location.href),has=url.searchParams.has('recording');
  if(editorOpen&&!has){url.searchParams.set('recording',editor?.id||'new');window.history.pushState({recordingEditor:true},'',url);pagePushed.current=true;}
  else if(!editorOpen&&has&&!pendingRecording.current){
   // Back only if this page pushed the entry; a stale ?recording= (a recording that no longer exists) is just cleaned.
   if(pagePushed.current&&window.history.state?.recordingEditor){pagePushed.current=false;window.history.back();}
   else{url.searchParams.delete('recording');window.history.replaceState(window.history.state,'',url);}
  }
 },[editorOpen]);
 // A reload keeps you in the editor: the recording named in ?recording= opens again once the list has loaded.
 useEffect(()=>{
  const wanted=pendingRecording.current;
  if(!wanted||loading||!draftOwner||draftOpening)return;
  pendingRecording.current=null;setOpeningTick(n=>n+1);
  const row=wanted==='new'?null:allItems.find(item=>item.id===wanted);
  if(wanted==='new'||row)openRecording(row||null);
  else{const url=new URL(window.location.href);url.searchParams.delete('recording');window.history.replaceState(window.history.state,'',url);}
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[loading,draftOwner,draftOpening,allItems]);
 useEffect(()=>{
  const onPop=()=>{
   const url=new URL(window.location.href);
   if(!url.searchParams.has('recording')&&closeEditorAction.current){
    pagePushed.current=false;
    // Keep the editor address until the draft save succeeds (a failed save stays open).
    url.searchParams.set('recording',closeEditorAction.current.id||'new');
    window.history.replaceState(window.history.state,'',url);
    void closeEditorAction.current.close();
   }
  };
  window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);
 },[]);
 useEffect(()=>{if(editorOpen)window.scrollTo?.({top:0});},[editorOpen]);
 useEffect(()=>{const node=workDialog.current;if(workOpen){if(!node.open)node.showModal();}else if(node.open)node.close();},[workOpen]);
 useEffect(()=>{const node=vocabDialog.current;if(vocabOpen){if(!node.open)node.showModal();}else if(node.open)node.close();},[vocabOpen]);

 const task=async(fn,successMessage='Saved.',{quiet=false}={})=>{
  if(!quiet){setBusy(true);setNotice('');}setError('');let succeeded=false;
  try{await fn();succeeded=true;announceMusicArchiveChange();if(!quiet){setNotice(successMessage);try{await reload();}catch(e){if(!e.cancelled)setError('The change was saved, but the list could not refresh. '+e.message);}}}
  catch(e){if(!e.cancelled)setError(e.message);}
  finally{if(!quiet)setBusy(false);}
  return succeeded;
 };
 const restoreDraft=saved=>{
  setTimelineSeek(null);setFocusedAtomId(null);
  const restored=restoreRecordingDraft(saved);audioDraft.current=restored.audio;
  baseline.current=saved.serverBaseline||snap(restored.editor.value);autosaveAttempt.current='';setAutosaveState('local');
  setEditor(restored.editor);setStep(restored.step||0);setArtworkPreview(restored.editor.value.coverImage||'');setDraftStatus('Browser draft restored');
 };
 useEffect(()=>{
  let active=true;setDraftOpening(true);setDraftOwner('');setEditor(null);setDraftError('');draftKey.current='';++draftWrite.current;
  recordingDraftOwner(token).then(async owner=>{
   if(!active)return;
   setDraftOwner(owner);draftKey.current=`${owner}:new`; // the draft is restored when New recording is opened, not on page load
  }).catch(problem=>{if(active)setDraftError(`Browser drafts are unavailable: ${problem.message}`);}).finally(()=>{if(active)setDraftOpening(false);});
  return()=>{active=false;};
 },[token]);
 const openRecording=async row=>{
  if(row?.browserDraft)row=null;
  if(!draftOwner||draftOpening)return;
  ++editorSession.current;savedCollection.current=collections.find(collection=>collection.recordingIds?.includes(row?.id))?.id||'';
  setDraftOpening(true);setWorkEditor(null);setError('');
  const key=`${draftOwner}:${row?.id||'new'}`;
  try{
   const saved=await loadRecordingDraft(key);draftKey.current=key;savedDrafts.current.delete(key);autosaveAttempt.current='';setAutosaveState('');
   if(saved){restoreDraft(saved);if(row)setEditor(current=>({...current,previewAudio:{storedUrl:row.storedAudioUrl||row.audioUrl,url:row.audioUrl}}));return;}
   setArtworkPreview(row?.coverImage||'');setStep(0);setDraftStatus('');
   const value=row?editableRecording(row):{...blankRecording(),...(selectedType?{workType:selectedType.id}:{})};
   value.atoms=editableRecordingItems(row||value);
   baseline.current=snap(value);setEditor({id:row?.id||'',value,...(row?{previewAudio:{storedUrl:value.audioUrl,url:row.audioUrl}}:{})});
  }catch(problem){setDraftError(`Could not restore the browser draft: ${problem.message}`);}
  finally{setDraftOpening(false);}
 };
 const audioDraft=useRef(null),[hasDraft,setHasDraft]=useState(false),[browserDraft,setBrowserDraft]=useState(null);
 useEffect(()=>{
  if(editor||!draftOwner)return;let active=true;
  loadRecordingDraft(`${draftOwner}:new`,{includeAudio:false}).then(saved=>{if(!active)return;setHasDraft(Boolean(saved));setBrowserDraft(saved?{...saved.editor.value,id:'browser-recording-draft',name:recordingName(saved.editor.value)||'No info set',noInfo:!recordingName(saved.editor.value),status:'DRAFT',browserDraft:true}:null);}).catch(()=>{});
  return()=>{active=false;};
 },[editor,draftOwner]);
 useEffect(()=>{
  const draft=audioDraft.current;
  if(draft&&draft.url!==editor?.value.audioUrl){URL.revokeObjectURL(draft.url);audioDraft.current=null;}
 },[editor?.value.audioUrl]);
 useEffect(()=>()=>{if(audioDraft.current)URL.revokeObjectURL(audioDraft.current.url);},[]);
 // Export a separate audio file; selecting an export format does not change or save the recording.
 const [downloading,setDownloading]=useState(false);
 const downloadAudio=async requestedFormat=>{
  const value=editor?.value;if(!value?.audioUrl||downloading)return;
  setDownloading(true);
  try{
   const wanted=typeof requestedFormat==='string'?requestedFormat:currentSaveFormat(),draft=audioDraft.current&&audioDraft.current.url===value.audioUrl?audioDraft.current:null,have=formatId(draft?draft.exportFormat:value.audioMetadata?.format);
   let blob,ext=wanted==='aac'?'m4a':wanted;
   if(wanted==='aac'){
    // The existing authenticated converter accepts WAV and returns the AAC/M4A derivative.
    const converted=await trimAudioFile({src:previewAudioUrl,from:0,to:1e9,exportFormat:'wav'});
    const body=new FormData();body.append('file',converted.file);body.append('exportFormat','aac');
    const response=await fetch(`${apiBaseUrl}/admin/music-archive/upload`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body}),result=await response.json().catch(()=>({}));
    if(!response.ok||!result.url||result.exportFormat!=='aac')throw Error(result.message||'AAC export is unavailable. Please try again.');
    const audio=await fetch(result.url);if(!audio.ok)throw Error('The AAC export could not be downloaded.');blob=await audio.blob();
   }else if(wanted!==have){const converted=await trimAudioFile({src:previewAudioUrl,from:0,to:1e9,exportFormat:wanted});blob=converted.file;}
   else{const response=await fetch(previewAudioUrl);if(!response.ok)throw Error('The audio could not be downloaded.');blob=await response.blob();}
   const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`${(recordingName(value)||'recording').trim().replace(/[^\w\- ]+/g,'').replace(/\s+/g,'-').toLowerCase()||'recording'}.${ext}`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),1500);
  }catch(problem){setDraftError(problem.message||'The audio could not be downloaded.');}
  finally{setDownloading(false);}
 };
 // Channel-split audio: the saved split (value.stems) is read back from the worker; one channel as FLAC, or all of them as a ZIP.
 // Trimming happens on the main waveform: cut the chosen span, encode it in the browser and swap the draft audio.
 const trimWaveform=async({from,to})=>{
  const exportFormat=currentSaveFormat();
  if(exportFormat==='aac'){const data=await apiRequest('/admin/music-archive/export-formats',{token}).catch(()=>null);if(!['mp3','aac'].every(id=>data?.formats?.some(row=>row.id===id)))throw Error('AAC compression is unavailable on the server right now. Choose MP3 or WAV.');}
  const draft=await trimAudioFile({src:previewAudioUrl,from,to,exportFormat});
  applyTrimmedAudio(draft);
 };
 const applyTrimmedAudio=draft=>{
  if(audioDraft.current)URL.revokeObjectURL(audioDraft.current.url);
  const url=URL.createObjectURL(draft.file);audioDraft.current={...draft,version:uuid(),url};
  
  applyUploadedAudio({...draft,url});
 };
 const selectDraftAudio=async file=>{
  const format=file.name.match(/\.(mp3|m4a|mp4|aac|wav|ogg|flac|webm|mpeg|mpga)$/i)?.[1]?.toLowerCase()||({'audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav','audio/mp4':'m4a','audio/aac':'aac','audio/ogg':'ogg','audio/flac':'flac','audio/webm':'webm'}[file.type]||'');
  applyTrimmedAudio({file,exportFormat:format,audioMetadata:{format,sizeBytes:file.size},durationSeconds:null});
 };
 // Autosave below backs up the current edits, then syncs complete recordings to the server.
 const updateAudioDuration=seconds=>setEditor(current=>{
  if(!current||!Number.isFinite(seconds)||seconds<=0)return current;
  const item=current.value.atoms[0],needsRange=current.value.atoms.length===1&&!item.audioRange;
  if(!needsRange&&Math.abs((current.value.durationSeconds??-1)-seconds)<=.05)return current;
  const audioRange={startSec:0,endSec:seconds};
  const next={...current,value:{...current.value,durationSeconds:seconds,atoms:needsRange?[{...item,audioRange,...(item.lyrics?{lyrics:{...item.lyrics,...audioRange}}:{})}]:current.value.atoms}};
  // Measuring the audio on open is not an edit.
  if(snap(current.value)===baseline.current)baseline.current=snap(next.value);
  return next;
 });

 const uploadAudioDraft=async draft=>{
  if(draft.uploaded)return draft.uploaded;
  const body=new FormData();body.append('file',draft.file);
  const compress=draft.file.type==='audio/wav'&&draft.exportFormat==='aac';
  if(compress)body.append('exportFormat',draft.exportFormat);
  const response=await fetch(`${apiBaseUrl}/admin/music-archive/upload`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.message||'The trimmed audio could not be uploaded. Your draft is still in this browser.');
  if(!data.url)throw Error('The upload did not return an audio file. Your draft is still in this browser.');
  if(compress&&data.exportFormat!==draft.exportFormat)throw Error('The API did not confirm the selected compressed export.');
  draft.uploaded={...data,audioMetadata:data.audioMetadata||{...draft.audioMetadata,format:draft.exportFormat==='aac'?'m4a':draft.exportFormat,sizeBytes:data.sizeBytes??draft.file.size}};
  await saveRecordingDraft(draftKey.current,{editor,step},draft).catch(problem=>setDraftError(`Browser draft could not be updated: ${problem.message}`));
  return draft.uploaded;
 };
 const applyUploadedAudio=r=>{setTimelineSeek(null);setFocusedAtomId(null);const duration=Number.isFinite(r.durationSeconds)?r.durationSeconds:r.duration?String(r.duration).split(':').reduce((a,b)=>a*60+Number(b),0):null;setEditor(e=>({...e,value:{...e.value,stems:null,audioUrl:r.url,audioMetadata:r.audioMetadata||null,durationSeconds:duration,atoms:clearItemTiming(e.value.atoms)}}));};
 const selectTimelineAtom=id=>{
  setFocusedAtomId(id);const item=editor?.value.atoms.find(item=>item.id===id),range=item&&atomRange(item);
  if(range)setTimelineSeek({time:range.startSec});
 };
 const moveAtom=(id,startSec)=>setEditor(current=>current?{...current,value:{...current.value,atoms:moveAtomSegment(current.value.atoms,id,startSec,current.value.durationSeconds||86400)}}:current);
 const changeAtomSegment=(id,range)=>setEditor(current=>{
  if(!current)return current;
  const items=moveAtomBoundary(current.value.atoms,id,range,current.value.durationSeconds||86400);
  return {...current,value:{...current.value,atoms:items}};
 });

 const change=(key,value)=>setEditor(e=>({...e,value:{...e.value,[key]:value}}));
 // Deleting the audio asks first. For a saved recording it permanently removes the audio and its separated channels from the cloud; audio that was never saved is just removed from the editor.
 const deleteAudio=async()=>{
  if(!editor||recordingLocked)return;
  const inCloud=Boolean(editor.id)&&Boolean(editor.value.audioUrl)&&!String(editor.value.audioUrl).startsWith('blob:');
  const message=inCloud?'This permanently deletes the audio and all of its separated channels from the cloud. It cannot be undone.':'This removes the audio and its separated channels from this recording. Nothing has been saved to the cloud yet.';
  if(!await confirmDeletion(message,{title:'Delete audio?',confirmLabel:inCloud?'Delete permanently':'Remove audio'}))return;
  const clear=extra=>setEditor(e=>e?({...e,value:{...e.value,stems:null,audioUrl:'',audioMetadata:null,durationSeconds:null,atoms:clearItemTiming(e.value.atoms),...extra}}):e);
  if(!inCloud){clear({});return;}
  await task(async()=>{
   const result=await apiRequest(`${ontologyPath}/recordings/${encodeURIComponent(editor.id)}/audio`,{token,method:'DELETE',body:{revision:editor.value.revision??0,permanent:true}});
   audioDraft.current=null;clear({status:result.status||'DRAFT',revision:result.revision});
   // What is on screen now is what the server holds, so this is not an unsaved edit.
   baseline.current=snap({...editor.value,stems:null,audioUrl:'',audioMetadata:null,durationSeconds:null,atoms:clearItemTiming(editor.value.atoms),status:result.status||'DRAFT',revision:result.revision});
  },'Audio deleted from the cloud.');
 };
 const deleteOpenRecording=async()=>{
  if(backgroundSave.current){await backgroundSave.current;await new Promise(requestAnimationFrame);return deleteLatest.current?.();}
  if(editor?.id){const row=allItems.find(item=>item.id===editor.id)||items.find(item=>item.id===editor.id);if(!row){setError('This recording is not in the list yet. Go back and try again.');return;}deleteRecording(row);return;}
  // An unsaved new recording only exists as a browser draft.
  setBusy(true);
  try{
   if(!await confirmDeletion('Delete this unsaved draft and its audio?',{title:'Delete draft?',confirmLabel:'Delete draft'}))return;
   if(draftKey.current)await deleteRecordingDraft(draftKey.current);
   setHasDraft(false);setBrowserDraft(null);setEditor(null);
  }catch(problem){setDraftError(`Could not delete the draft: ${problem.message}`);}
  finally{setBusy(false);}
 };
 deleteLatest.current=deleteOpenRecording;
 // In that window, closing the editor closes the page.
 const windowMode=useRef(new URLSearchParams(window.location.search).get('window')==='1'),wasOpen=useRef(false);
 useEffect(()=>{if(!windowMode.current)return undefined;document.documentElement.classList.add('echo-recording-window');return()=>document.documentElement.classList.remove('echo-recording-window');},[]);
 useEffect(()=>{if(editorOpen)wasOpen.current=true;else if(wasOpen.current&&windowMode.current)window.close();},[editorOpen]);
 const closeEditor=async()=>{
  if(backgroundSave.current){await backgroundSave.current;await new Promise(requestAnimationFrame);return closeEditorAction.current?.close();}
  if(recordingLocked||!editor)return;
  // A new recording with nothing added is not worth keeping: Back just closes it, no draft.
  if(!editor.id&&!audioDraft.current&&snap(editor.value)===baseline.current){try{await deleteRecordingDraft(draftKey.current);}catch{/* nothing was stored */}setHasDraft(false);setEditor(null);return;}
  const value=editor.value;
  let complete=Boolean(value.workType);
  try{validateRecordingItems(value.atoms||[]);}catch{complete=false;}
  if(!editor.id&&!complete){
   setBusy(true);
   try{await saveRecordingDraft(draftKey.current,{editor,step,serverBaseline:baseline.current},audioDraft.current);setHasDraft(true);setCollectionId('');setSelected(null);setEditor(null);setNotice('Draft saved in this browser.');}
   catch(problem){setDraftError(`Could not save the draft: ${problem.message}`);}
   finally{setBusy(false);}
   return;
  }
  await saveRecording({closeAfterSave:true});
 };
 closeEditorAction.current=editor?{id:editor.id,close:closeEditor}:null;
 const saveRecording=async({publish=false,closeAfterSave=false,automatic=false}={})=>{
  if(!automatic&&backgroundSave.current){await backgroundSave.current;await new Promise(requestAnimationFrame);return saveLatest.current?.({publish,closeAfterSave});}
  const editor=liveEditor.current;if(!editor||saveInFlight.current)return false;
  const session=editorSession.current;
  saveInFlight.current=true;let collectionWarning='';const unpublishes=!publish&&!closeAfterSave&&Boolean(editor.id)&&editor.value.status==='PUBLISHED'&&snap(editor.value)!==baseline.current;setSavingAction(automatic?'auto':publish?'publish':'save');const succeeded=await task(async()=>{if(publish&&!editor.id)throw Error('Save the recording before publishing.');const recordingItems=editor.value.atoms;validateRecordingItems(recordingItems);if(recordingItems.some(atom=>atom.sound?.rhythmTiming)&&!rhythmTimingSupport.current){const remoteContract=await apiRequest('/music-ontology/contract');if(!remoteContract.features?.atomRhythmTiming)throw Error('The API needs updating to save beat and measure settings. Your browser draft has been kept.');rhythmTimingSupport.current=true;}const {recordingMetadata:_metadata,credits:_credits,...fields}=editor.value;let stems=fields.stems;const stashed=stems?.sourceUrl;
 if(stashed){
  // The split waited in this browser; it moves to the recording's own storage now.
  const found=await getStems(stashed);if(!found)throw Error('The channels are no longer stored in this browser. Split the recording again.');
  const channels=[];
  for(const [name,blob] of Object.entries(found.files)){
   setNotice(`Uploading the ${name} channel…`);
   const form=new FormData();form.append('file',new File([blob],`${name}.flac`,{type:'audio/flac'}));
   const response=await fetch(`${apiBaseUrl}/admin/music-archive/upload`,{method:'POST',headers:{Authorization:`Bearer ${token}`},body:form}),data=await response.json().catch(()=>({}));
   if(!response.ok||!data.url)throw Error(data.message||`The ${name} channel could not be uploaded. The split is still kept in this browser.`);
   channels.push({name,url:data.url,storedUrl:data.url});
  }
  stems={channels,duration:stems.duration??null,splitAt:stems.splitAt};
 }const body={...fields,...recordingSaveState(publish,editor.id?(closeAfterSave||snap(editor.value)===baseline.current?editor.value.status:'DRAFT'):''),stems:stems?{...stems,channels:stems.channels.map(({name,url,storedUrl})=>({name,url:storedUrl||url}))}:null,atoms:recordingItems.map(item=>{const limit=fields.durationSeconds==null?null:Math.floor(fields.durationSeconds*100)/100;return item.audioRange&&limit!=null&&item.audioRange.endSec>limit?{...item,audioRange:{...item.audioRange,endSec:limit}}:{...item};}),workId:'',durationMinutes:fields.durationSeconds==null?null:fields.durationSeconds/60};if(audioDraft.current?.url===body.audioUrl){const draft=audioDraft.current;

 const uploaded=await uploadAudioDraft(draft);body.audioUrl=uploaded.url;body.audioMetadata=uploaded.audioMetadata;}const {item}=await apiRequest(`${ontologyPath}/recordings${editor.id?`/${encodeURIComponent(editor.id)}`:''}`,{token,method:editor.id?'PUT':'POST',body});if(!item?.id)throw Error('The API did not confirm the saved recording. Your browser draft has been kept.');
 let collectionProblem='';try{await syncCollections(item,editor.collectionId);}catch(problem){collectionProblem=problem.message||'The collection could not be updated.';}
 if(!automatic&&!closeAfterSave)setFilters(current=>({...current,status:item.status,...(typeId&&item.workType!==typeId?{workType:item.workType||''}:{})}));
 if(closeAfterSave)setCollectionId('');
 setItems(current=>[item,...current.filter(row=>row.id!==item.id)]);setAllItems(current=>[item,...current.filter(row=>row.id!==item.id)]);
 if(!automatic){if(stashed)deleteStems(stashed).catch(()=>{});setSelected(item.id);}
 const oldKey=draftKey.current,nextKey=`${draftOwner}:${item.id}`;
 if(automatic){
  // A response belongs to its editor session, and must never replace edits made since the request began.
  const current=liveEditor.current;
  if(session!==editorSession.current||!current)return;
  const acknowledged=acknowledgeRecordingAutosave(current,editor,item);
  baseline.current=acknowledged.baseline;savedCollection.current=editor.collectionId===undefined?savedCollection.current:editor.collectionId;
  autosaveAttempt.current=snap({id:item.id,value:{...editor.value,revision:item.revision??editor.value.revision??0,status:item.status||editor.value.status},collection:editor.collectionId});
  liveEditor.current=acknowledged.editor;setEditor(acknowledged.editor);draftKey.current=nextKey;setHasDraft(false);
  // Keep a recoverable copy of the newest edits, including edits made during the network request.
  await saveRecordingDraft(nextKey,{editor:acknowledged.editor,step,serverBaseline:baseline.current},audioDraft.current);
  if(oldKey!==nextKey)await deleteRecordingDraft(oldKey);
 }else{
 ++draftWrite.current;
 try{await deleteRecordingDraft(oldKey);if(nextKey!==oldKey)await deleteRecordingDraft(nextKey);setDraftError('');}catch{setDraftError('The recording was saved, but its browser draft could not be cleared.');}
 const savedEditor={id:item.id,previewAudio:{storedUrl:item.storedAudioUrl||item.audioUrl,url:item.audioUrl},value:{...editableRecording(item),atoms:editableRecordingItems(item),durationSeconds:body.durationSeconds},...(pickedCollection===undefined?{}:{collectionId:pickedCollection}),...(editor.socialSettings?{socialSettings:editor.socialSettings}:{})};
 draftKey.current=nextKey;savedDrafts.current.set(nextKey,JSON.stringify(savedEditor));setHasDraft(false);baseline.current=snap(savedEditor.value);autosaveAttempt.current=snap({id:savedEditor.id,value:savedEditor.value,collection:savedEditor.collectionId});setEditor(closeAfterSave?null:savedEditor);setArtworkPreview(item.coverImage||'');setDraftStatus('');

  savedCollection.current=editor.collectionId===undefined?savedCollection.current:editor.collectionId;
 }
 if(!closeAfterSave){const url=new URL(window.location.href);url.searchParams.set('recording',item.id);window.history.replaceState(window.history.state,'',url);}
 if(collectionProblem)collectionWarning=`The recording was ${publish?'published':'saved'}, but its collection was not updated. ${collectionProblem} Save again to retry.`;
 },publish?'Recording published.':unpublishes?'Changes saved. This recording is a Draft until you click Publish.':'Recording saved privately in the archive.',{quiet:automatic});setSavingAction('');saveInFlight.current=false;if(collectionWarning)setError(collectionWarning);if(succeeded){const current=liveEditor.current;const moreEdits=automatic&&current&&(snap(current.value)!==baseline.current||(current.collectionId!==undefined&&current.collectionId!==savedCollection.current));setAutosaveState(collectionWarning?'error':moreEdits?'pending':'saved');}else if(automatic)setAutosaveState('error');if(automatic&&succeeded)setNotice('');return succeeded;};
 saveLatest.current=saveRecording;
 const saveWork=()=>task(async()=>{const body={...workEditor.value,lyrics:workEditor.value.type==='SONG'?workEditor.value.lyrics:null};const {item}=await apiRequest(`${ontologyPath}/works${workEditor.id?`/${encodeURIComponent(workEditor.id)}`:''}`,{token,method:workEditor.id?'PUT':'POST',body});setWorkEditor(null);});
 const saveVocab=()=>task(async()=>{const {item}=await apiRequest(`${ontologyPath}/vocabulary${vocabEditor.id?`/${encodeURIComponent(vocabEditor.id)}`:''}`,{token,method:vocabEditor.id?'PUT':'POST',body:(({firstName:_first,lastName:_last,...rest})=>rest)(vocabEditor.value)});setVocabulary(rows=>[...rows.filter(row=>row.id!==item.id),item].sort((a,b)=>a.name.localeCompare(b.name)));if(item.kind===pendingReference.current?.kind)pendingReference.current.onSelect(item.id,item);pendingReference.current=null;setVocabEditor(null);notifyWorkElementsChanged();});
 const deleteRecording=row=>task(async()=>{const result=await apiRequest(`${ontologyPath}/recordings/${encodeURIComponent(row.id)}`,{token,method:'DELETE',body:{revision:row.revision,permanent:true}});if(result.ok!==true||result.deleted!==true||result.id!==row.id)throw Error('Permanent deletion was not confirmed. The server may need updating.');setItems(current=>current.filter(item=>item.id!==row.id));setAllItems(current=>current.filter(item=>item.id!==row.id));setSelected(null);setContentSelection(null);setEditor(null);if(draftOwner)deleteRecordingDraft(`${draftOwner}:${row.id}`).catch(()=>{});},'Recording deleted.');
 const selectedType=workTypes.find(type=>type.id===typeId);
 const visibleRecordings=browserDraft&&['ALL','DRAFT'].includes(filters.status||'ALL')?[browserDraft,...items]:items;// an audio-only draft saved in this browser is listed right away, as "No info set" until it has details
 const typeCollections=collections.filter(c=>c.workTypeId===typeId),pickedCollectionRow=collections.find(c=>c.id===collectionId),inCollection=pickedCollectionRow?new Set(pickedCollectionRow.recordingIds||[]):null;
 // Text search by recording NAME only.
 const needle=(filters.q||'').trim().toLowerCase();
 // Several values per filter are matched in the page: a recording passes a filter when any of its atoms has any of the chosen values; different filters all have to pass.
 // BPM of the atoms: the range bar spans the lowest to the highest BPM found; a recording passes when one of its atoms is inside the chosen range.
 const allBpms=allItems.flatMap(row=>(row.atoms||[]).map(atom=>atom.sound?.bpm)).filter(Number.isFinite);
 const bpmBounds=allBpms.length?[Math.floor(Math.min(...allBpms)),Math.max(Math.ceil(Math.max(...allBpms)),Math.floor(Math.min(...allBpms))+1)]:[60,200];
 const hasBpm=filters.bpmMin!==''&&filters.bpmMin!=null||filters.bpmMax!==''&&filters.bpmMax!=null;
 const matchesBpm=row=>!hasBpm||(row.atoms||[]).some(atom=>{const bpm=atom.sound?.bpm;return Number.isFinite(bpm)&&bpm>=Number(filters.bpmMin??-Infinity)-.01&&bpm<=Number(filters.bpmMax??Infinity)+.01;});
 const list=value=>Array.isArray(value)?value:value?[value]:[];
 const matchesAtoms=row=>{
  const rhythms=list(filters.rhythm),keys=list(filters.key),genres=list(filters.genre),instruments=list(filters.instrument),musicians=list(filters.musician);
  const credits=atom=>atom.sound?.musicianCredits||[];
  const checks=[[rhythms,atom=>(atom.sound?.rhythmIds||[]).some(id=>rhythms.includes(id))],[keys,atom=>keys.includes(atom.sound?.key)],[genres,atom=>(atom.sound?.genreIds||[]).some(id=>genres.includes(id))],
   [instruments,atom=>credits(atom).some(credit=>instruments.includes(credit.instrumentId))],[musicians,atom=>credits(atom).some(credit=>musicians.includes(credit.artistId))]];
  return checks.every(([chosen,test])=>!chosen.length||(row.atoms||[]).some(test));
 };
 const matchesText=row=>!needle||String(row.name||'').toLowerCase().includes(needle);
 
 // Duration range (minutes) from the Filters column; recordings with no known length are left out only while a range is set.
 const minutesOf=row=>{const seconds=row.durationSeconds??row.audio?.durationSeconds??(Number.isFinite(row.durationMinutes)?row.durationMinutes*60:null);return Number.isFinite(seconds)?seconds/60:null;};
 const durationMax=Math.max(5,Math.ceil(Math.max(0,...allItems.map(row=>minutesOf(row)||0))));
 const hasRange=filters.durationMin!==''&&filters.durationMin!=null||filters.durationMax!==''&&filters.durationMax!=null;
 const matchesDuration=row=>{if(!hasRange)return true;const minutes=minutesOf(row);if(minutes==null)return false;return minutes>=Number(filters.durationMin||0)-.01&&minutes<=Number(filters.durationMax??Infinity)+.01;};
 const typeRecordings=(typeId?visibleRecordings.filter(row=>row.workType===typeId):visibleRecordings).filter(row=>!inCollection||inCollection.has(row.id)).filter(row=>matchesText(row)).filter(matchesAtoms).filter(matchesBpm).filter(matchesDuration);
 const currentCollectionId=collections.find(c=>(c.recordingIds||[]).includes(editor?.id))?.id||'',editorCollectionId=pickedCollection===undefined?currentCollectionId:pickedCollection;
 const sidebarCollections=typeId?typeCollections:collections;
 const pickCollection=collection=>{if(collection&&collection.workTypeId&&collection.workTypeId!==typeId)setFilters(current=>({...current,workType:collection.workTypeId}));setCollectionId(collection?collection.id:'');setSelected(null);setContentSelection(null);};
 const createCollection=event=>{event.preventDefault();const title=(newCollection||'').trim(),workTypeId=typeId||newCollectionType;if(!title||!workTypeId)return;task(async()=>{const {item}=await apiRequest('/admin/music-archive/collections',{token,method:'POST',body:{title,workTypeId,published:false,recordingIds:[]}});setNewCollection(null);if(workTypeId!==typeId)setFilters(current=>({...current,workType:workTypeId}));setCollectionId(item.id);},'Collection created.');};
 const [renaming,setRenaming]=useState(null);
 const renameCollection=event=>{event.preventDefault();const title=(renaming||'').trim();if(!title||!pickedCollectionRow)return;task(async()=>{await apiRequest(`/admin/music-archive/collections/${encodeURIComponent(pickedCollectionRow.id)}`,{token,method:'PATCH',body:{title}});setRenaming(null);},'Collection updated.');};
 const deleteCollection=()=>{if(!pickedCollectionRow)return;task(async()=>{await apiRequest(`/admin/music-archive/collections/${encodeURIComponent(pickedCollectionRow.id)}`,{token,method:'DELETE',deleteMessage:`Delete the collection "${pickedCollectionRow.title}"? Its recordings stay in the archive.`});setCollectionId('');setRenaming(null);},'Collection deleted.');};
 const openNewCollection=()=>{setNewCollectionType(typeId||workTypes[0]?.id||'');setNewCollection('');};
 // After a recording is saved, put it in the collection picked in the form (and out of any other one).
 const syncCollections=async(item,selectedCollection)=>{const chosen=selectedCollection===undefined?currentCollectionId:selectedCollection,patches=collectionPatches(collections,item.id,item.workType,chosen);for(const patch of patches)await apiRequest(`/admin/music-archive/collections/${encodeURIComponent(patch.id)}`,{token,method:'PATCH',body:{recordingIds:patch.recordingIds}});if(patches.length)setCollections(current=>current.map(row=>{const patch=patches.find(patch=>patch.id===row.id);return patch?{...row,recordingIds:patch.recordingIds}:row;}));};
 const at=typeRecordings.findIndex(r=>r.id===selected),step_=d=>typeRecordings[at+d]&&setSelected(typeRecordings[at+d].id);
 const chosen=typeRecordings.find(r=>r.id===selected),value=editor?.value;
 const previewAudioUrl=editor?.previewAudio&&editor.previewAudio.storedUrl===value?.audioUrl?editor.previewAudio.url:value?.audioUrl;
 const saveBlockedReason=!value?'':!value.workType?'Choose a work type to save.':!(value.atoms||[]).length?'Add at least one recording atom using + on the timeline to save.':'';
 // Wait for a pause in editing. One request at a time; a failed snapshot retries only after another edit or reopening.
 const autosaveSnapshot=editor?snap({id:editor.id,value:editor.value,collection:pickedCollection}):'';
 const autosaveDirty=Boolean(editor&&(snap(editor.value)!==baseline.current||(pickedCollection!==undefined&&pickedCollection!==savedCollection.current)));
 autosaveLatest.current=async()=>{
  if(!editor||recordingLocked||saveInFlight.current||backgroundSave.current)return;
  let finish;const completion=new Promise(resolve=>{finish=resolve;});backgroundSave.current=completion;
  const session=editorSession.current;
  autosaveAttempt.current=autosaveSnapshot;setAutosaveState('saving');
  try{
   await saveRecordingDraft(draftKey.current,{editor,step,serverBaseline:baseline.current},audioDraft.current);
   let valid=Boolean(editor.value.workType);
   try{validateRecordingItems(editor.value.atoms);}catch{valid=false;}
   if(session!==editorSession.current)return;
   if(valid)await saveRecording({automatic:true});
   else{setAutosaveState('local');if(!editor.id)setHasDraft(true);}
  }catch(problem){setAutosaveState('error');setDraftError(`Autosave failed: ${problem.message}`);}
  finally{backgroundSave.current=null;finish();setAutosaveVersion(version=>version+1);}
 };
 useEffect(()=>{
  if(!editorOpen){setAutosaveState('');return;}
  if(!autosaveDirty||recordingLocked||workOpen||vocabOpen||backgroundSave.current||saveInFlight.current||autosaveAttempt.current===autosaveSnapshot)return;
  setAutosaveState('pending');
  const timer=setTimeout(()=>void autosaveLatest.current?.(),1200);
  return()=>clearTimeout(timer);
 },[autosaveSnapshot,autosaveDirty,recordingLocked,editorOpen,workOpen,vocabOpen,autosaveVersion]);
 // The audio upload box unmounts once audio is attached, so it can no longer report that its upload finished.
 useEffect(()=>{if(value?.audioUrl)setAudioBusy(false);},[value?.audioUrl]);
 const selectedContent=chosen&&contentSelection&&chosen.id===contentSelection.recordingId?recordingComponents(chosen).find(w=>w.id===contentSelection.workId):null;
 useEffect(()=>{if(contentRef.current)contentRef.current.scrollTop=0;},[chosen?.id,selectedContent?.id]);
 const workFields=workEditor?(<WorkFields simple={false} classificationLocked={Boolean(workEditor.id)||workEditor.attachToRecording} value={workEditor.value} onChange={v=>setWorkEditor(w=>({...w,value:v}))} vocabulary={vocabulary}/>):null;


  const collectionSelect=<div className="rf-field rf-collection"><div className="rf-collection-head"><span>Collection</span><button type="button" className="rf-icon-button" aria-label="New collection" title="New collection" disabled={busy||!workTypes.length||newCollection!==null} onClick={openNewCollection}><Plus size={15} aria-hidden="true"/></button></div>{newCollection!==null&&<form onSubmit={createCollection}>
<input autoFocus value={newCollection} maxLength={240} placeholder="Collection name" aria-label="Collection name" onChange={e=>setNewCollection(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setNewCollection(null);}}/>
{typeId?<p className="ontology-collection-type">Work type: <strong>{selectedType?.name}</strong></p>:<select value={newCollectionType} aria-label="Work type of the collection" onChange={e=>setNewCollectionType(e.target.value)}>{workTypes.map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</select>}
<div className="ontology-collection-actions"><button type="submit" disabled={busy||!newCollection.trim()||!(typeId||newCollectionType)}>Create</button><button type="button" onClick={()=>setNewCollection(null)}>Cancel</button></div>
</form>}<select aria-label="Collection" value={collectionId||''} onChange={event=>pickCollection(sidebarCollections.find(item=>item.id===event.target.value)||null)}><option value="">All collections</option>{sidebarCollections.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></div>;
 const collectionTools=<div className="rf-collections">{pickedCollectionRow&&<footer className="ontology-collection-footer" aria-label="Selected collection">{renaming===null?<><strong title={pickedCollectionRow.title}>{pickedCollectionRow.title}</strong><button type="button" disabled={busy} onClick={()=>setRenaming(pickedCollectionRow.title)}><Pencil size={14} aria-hidden="true"/>Edit</button><button type="button" className="is-danger" disabled={busy} onClick={deleteCollection}><Trash2 size={14} aria-hidden="true"/>Delete</button></>:<form onSubmit={renameCollection}><input autoFocus value={renaming} maxLength={240} aria-label="Collection name" onChange={e=>setRenaming(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setRenaming(null);}}/><button type="submit" disabled={busy||!renaming.trim()}>Save</button><button type="button" onClick={()=>setRenaming(null)}>Cancel</button></form>}</footer>}</div>;
 return <CreateReferenceContext.Provider value={createReference}><section className="ontology-admin ontology-view-recordings" aria-labelledby="ontology-admin-title"><div className="ontology-admin-main" hidden={editorOpen||Boolean(pendingRecording.current)}> <div className="ontology-recording-workspace">

  <section className={`ontology-archive-panel has-filter-column`} aria-labelledby="ontology-admin-title">{draftError&&!editor&&<p role="alert">{draftError}</p>}<header className="ontology-heading"><div className="ontology-recordings-title"><h1 id="ontology-admin-title">Recordings</h1><small className="ontology-recordings-count">{typeRecordings.length} {typeRecordings.length===1?'recording':'recordings'}{selectedType?` · ${selectedType.name}`:''}{pickedCollectionRow?` · ${pickedCollectionRow.title}`:''}</small></div>
<div className="ontology-heading-actions" role="toolbar" aria-label="Recordings toolbar">
<button type="button" className="ontology-add-recording ontology-new-recording" aria-label={hasDraft?'Continue draft recording':'New recording'} title={hasDraft?'Continue draft recording':'New recording'} disabled={unavailable||busy||draftOpening||!draftOwner} onClick={()=>openRecording()}><Plus size={16} aria-hidden="true"/><span>{hasDraft?'Continue draft recording':'New recording'}</span></button></div></header>
 <div className="recording-editor-subheader archive-hint-row">{error&&<SelfDestructHint kind="error" onDone={()=>setError('')}>{error+(unavailable?' The ontology API must be deployed before using the new editor.':'')}</SelfDestructHint>}{notice&&<SelfDestructHint kind="ok" onDone={()=>setNotice('')}>{notice}</SelfDestructHint>}<span id="recording-archive-loading-hints" className="recording-loading-hints"/></div>
 <div className="ontology-recording-columns"><aside id="recording-filter-column" className="ontology-filter-column" aria-label="Recording filters"><header><h2>Filters</h2>{activeFilters>0&&<button type="button" className="ontology-filter-clear" onClick={()=>setFilters({})}>Clear all</button>}</header><RecordingFilters durationMax={durationMax} bpmBounds={bpmBounds} value={filters} onChange={setFilters} vocabulary={vocabulary} workTypes={workTypes} collectionSelect={collectionSelect} collectionTools={collectionTools}/></aside>
 <div className="ontology-recording-content">
 <div className={`ontology-recording-main${loading?' is-loading':''}`}>{loading?<RecordingLoadingHint target="recording-archive-loading-hints" message="Loading archive…"/>:<RecordingsListTable vocabulary={vocabulary} collections={collections} recordings={typeRecordings} selectedId={selected} loading={loading} onSelect={id=>{if(id==='browser-recording-draft'){void openRecording();return;}setSelected(id);setContentSelection(null);void openRecording(typeRecordings.find(item=>item.id===id));}}/>}</div>
 </div></div>
 </section>
 
 </div>
 </div>
{pendingRecording.current&&!editorOpen&&<p className="recording-opening" role="status">Opening recording…</p>}

 {editorOpen&&<section className="ontology-dialog ontology-editor-dialog ontology-editor-page" aria-label="Recording editor">{value&&<>{step===0&&<fieldset disabled={recordingLocked} className="recording-info-column"><RecordingInfoSection collections={collections} collectionId={editorCollectionId} onCollection={setPickedCollection} editor={editor} value={value} allItems={allItems} audioDraft={audioDraft} token={token} vocabulary={vocabulary} workTypes={workTypes} artworkPreview={artworkPreview} recordingLocked={recordingLocked} change={change} setEditor={setEditor} setArtworkBusy={setArtworkBusy} setArtworkPreview={setArtworkPreview}/></fieldset>}<div className={`recording-editor-main${value.audioUrl?' has-recording-audio':''}`}><RecordingLoadingHint message={draftStatus==='Saving browser draft…'?draftStatus:''}/><RecordingEditorBar exporting={downloading} autosave={autosaveState} step={step} locked={recordingLocked} status={draftError||error||notice} statusKind={draftError||error?'error':'ok'} onStatusDone={()=>{setDraftError('');setError('');setNotice('');}} hasAudio={Boolean(value.audioUrl)} onBack={step===0?closeEditor:()=>setStep(0)}
 format={{name:recordingName(value),onExport:downloadAudio,options:EXPORT_FORMATS.map(option=>({id:option.id,label:option.label.replace(' (M4A)',''),size:estimateSizeMB(option.id,value.durationSeconds),title:option.description||`${option.label} · ${option.bitrateKbps} kbps`}))}}
 publish={{visible:Boolean(editor.id)&&recordingStage(editor)!=='PUBLISHED',ready:!saveBlockedReason&&Boolean(value.audioUrl),busy:busy&&savingAction==='publish',onPublish:()=>saveRecording({publish:true})}} onDelete={deleteOpenRecording} busy={busy} saved={Boolean(editor.id)} save={{ready:!saveBlockedReason&&(!editor.id||autosaveDirty),idle:Boolean(editor.id)&&!autosaveDirty,reason:saveBlockedReason,busy:busy&&savingAction==='save',onSave:saveRecording}}/><fieldset disabled={recordingLocked} className="ontology-editor-body">
 {step===0&&<div className="recording-basics-main">{!value.audioUrl&&<div className="recording-timeline-waiting"><div className="recording-waiting-copy" role="status"><h3>Waiting for a recording audio file to add</h3><p>Once the audio is attached, its waveform appears here and you can mark each part of the recording as an atom.</p></div><OntologyMediaUpload token={token} value={value.audioUrl} onBusyChange={setAudioBusy} onSelected={selectDraftAudio} onUploaded={applyUploadedAudio}/></div>}{value.audioUrl&&<section className="recording-detail-player" aria-label="Recording audio and atom segments"><TranscriptionAudioTape key={value.audioUrl} src={previewAudioUrl} onMasterDownload={downloadAudio} onDeleteAudio={recordingLocked?undefined:deleteAudio} lanes={ctx=><StemLanes savedStems={value.stems} onStems={stems=>setEditor(e=>!e?e:!stems?{...e,value:{...e.value,stems:null}}:e.value.audioUrl&&JSON.stringify(e.value.stems?.channels)!==JSON.stringify(stems.channels)||!e.value.stems?{...e,value:{...e.value,stems}}:e)} audioUrl={previewAudioUrl} fingerprint={audioDraft.current?.file?`${audioDraft.current.file.name}:${audioDraft.current.file.size}:${audioDraft.current.file.lastModified}`:''} token={token} ensureUploaded={async()=>{const draft=audioDraft.current;return draft&&draft.url===value.audioUrl?(await uploadAudioDraft(draft)).url:value.audioUrl;}} {...ctx}/>} onTrimApply={trimWaveform} trimDisabled={recordingLocked} metadata={value.audioMetadata} onDuration={updateAudioDuration} seekTo={timelineSeek} onTimeChange={time=>{const atom=value.atoms.find(item=>{const range=atomRange(item);return range&&time>=range.startSec&&time<range.endSec;});if(atom)setFocusedAtomId(atom.id);}} regions={value.atoms.flatMap((atom,index)=>{const range=atomRange(atom);return range?[{id:atom.id,name:atom.name||`Atom ${index+1}`,index,start:range.startSec,end:range.endSec}]:[];})} onRegionSelect={setFocusedAtomId} onRegionChange={changeAtomSegment} onRegionMove={moveAtom}/></section>}</div>}

 



 </fieldset>
 {step===0&&value.audioUrl&&<fieldset disabled={recordingLocked} className="recording-atoms-column"><div className="recording-atoms-card"><header className="recording-atoms-card-title"><h3>Recording atoms</h3><small>{value.atoms.length} {value.atoms.length===1?'atom':'atoms'} · each references a segment of the timeline</small></header><RecordingItemsEditor focusedAtomId={focusedAtomId} onSelect={selectTimelineAtom} items={value.atoms} recording={value} audioUrl={previewAudioUrl} duration={value.durationSeconds} vocabulary={vocabulary} onChange={atoms=>change('atoms',atoms)} /></div></fieldset>}
 {step===0&&value.audioUrl&&<RecordingLevelFooter src={previewAudioUrl}/>}
 </div></>}</section>}
 <dialog ref={workDialog} className="ontology-dialog ontology-editor-dialog ontology-secondary-editor work-content-dialog" onCancel={event=>{if(event.target===event.currentTarget&&busy)event.preventDefault();}} onClose={event=>{if(event.target===event.currentTarget)setWorkEditor(null);}} aria-label="Content editor">{workEditor&&<><header><div className="work-dialog-heading"><span className="work-dialog-icon" aria-hidden="true">{workEditor.value.type==='SONG'?<Layers size={22}/>:<Music2 size={22}/>}</span><div><small>CONTENT LIBRARY</small><h2>{`${workEditor.id?'Edit':'New'} ${workEditor.value.type==='SONG'?'lyrical music':'instrumental entry'}`}</h2><p>{workEditor.value.type==='SONG'?'Bring the words and melody together.':'Capture the sound and the people behind it.'}</p></div></div><button type="button" className="cb-dialog-close" aria-label="Close content editor" disabled={busy} onClick={()=>{setWorkEditor(null);}}><X size={19}/></button></header>{error&&<p role="alert">{error}</p>}<fieldset disabled={busy}>{workFields}</fieldset><footer><span>Shared with recordings that use this entry</span><div className="work-dialog-footer-actions"><button type="button" disabled={busy} onClick={()=>setWorkEditor(null)}>Cancel</button><button type="button" disabled={busy||!workEditor.value.title.trim()} onClick={saveWork}>{busy?'Saving…':workEditor.attachToRecording?'Save & add entry':'Save content'}</button></div></footer></>}</dialog>
 <dialog ref={vocabDialog} className="ontology-dialog ontology-editor-dialog ontology-secondary-editor" onCancel={event=>{if(event.target===event.currentTarget&&busy)event.preventDefault();}} onClose={event=>{if(event.target===event.currentTarget){setVocabEditor(null);pendingReference.current=null;}}} aria-label="Details editor">{vocabEditor&&<><header><h2>{vocabEditor.value.kind==='lyricist'?'Lyricist':vocabEditor.value.kind==='artist'?'Vocalist':vocabEditor.value.kind==='instrument'?'New instrument':vocabEditor.value.kind==='musician'?'Musician':'Detail entry'}</h2><button type="button" disabled={busy} onClick={()=>{setVocabEditor(null);}}>Close</button></header>{error&&<p role="alert">{error}</p>}<fieldset disabled={busy}>{[['kind','Entity kind'],['name',vocabEditor.value.kind==='instrument'?'Instrument name':'Display name'],['isoCode','ISO language code (when available)'],['description','Description']].filter(([key])=>key!=='isoCode'&&(!pendingReference.current||key!=='kind')&&!(['artist','musician'].includes(vocabEditor.value.kind)&&(key==='name'||key==='description'))).map(([key,label])=><label key={key}>{label}{key==='kind'?<select disabled={Boolean(vocabEditor.id)||Boolean(pendingReference.current)} value={vocabEditor.value.kind} onChange={e=>setVocabEditor(v=>({...v,value:{...v.value,kind:e.target.value,parentId:''}}))}>{contract.vocabularyKinds.filter(kind=>kind!=='region').map(k=><option key={k}>{k}</option>)}</select>:<input value={vocabEditor.value[key]} onChange={e=>setVocabEditor(v=>({...v,value:{...v.value,[key]:e.target.value}}))}/>}</label>)}{['artist','musician'].includes(vocabEditor.value.kind)&&(()=>{const split=(vocabEditor.value.name||'').trim().split(/\s+/),first=vocabEditor.value.firstName??(split[0]||''),last=vocabEditor.value.lastName??split.slice(1).join(' '),set=(a,b)=>setVocabEditor(v=>({...v,value:{...v.value,firstName:a,lastName:b,name:`${a} ${b}`.trim()}}));return <><label>First name<input value={first} onChange={e=>set(e.target.value,last)}/></label><label>Last name<input value={last} onChange={e=>set(first,e.target.value)}/></label></>;})()}<WorkElementDependencies value={vocabEditor.value} onChange={value=>setVocabEditor(current=>({...current,value}))} vocabulary={vocabulary}/>{!pendingReference.current&&<label>Source attribution<input value={vocabEditor.value.provenance.source} onChange={e=>setVocabEditor(v=>({...v,value:{...v.value,provenance:{...v.value.provenance,source:e.target.value}}}))}/></label>}<button type="button" disabled={!vocabEditor.value.name.trim()} onClick={saveVocab}>{vocabEditor.value.kind==='artist'?'Save vocalist':vocabEditor.value.kind==='instrument'?'Save & select instrument':vocabEditor.value.kind==='musician'?'Save musician':'Save details'}</button></fieldset></>}</dialog>
</section></CreateReferenceContext.Provider>;

}
