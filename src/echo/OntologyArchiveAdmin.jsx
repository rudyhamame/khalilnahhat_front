import {administratorDataChanged} from './administratorChanges';
import SampleTrimmer from './SampleTrimmer';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Layers,Music2,Pencil,Plus,Trash2,X} from 'lucide-react';
import {apiRequest,apiBaseUrl} from '../lib/api';
import {blankRecording,editableRecording,fetchOntologyRecordings,ontologyPath,announceMusicArchiveChange,musicOntologyContract as contract,recordingComponents} from '../lib/musicOntology';
import TranscriptionAudioTape from './TranscriptionAudioTape';
import {atomRange,moveAtomBoundary,moveAtomSegment} from '../lib/recordingAtoms';
import {EXPORT_FORMATS,estimateSizeMB,trimAudioFile} from '../lib/trimAudioFile';
import {recordingDraftOwner,saveRecordingDraft,loadRecordingDraft,hasRecordingDraft,deleteRecordingDraft,restoreRecordingDraft,getStems,deleteStems} from '../lib/recordingDraftStore';
import {zipStore} from '../lib/zipStore';
import StemLanes from './StemLanes';
import RecordingSocialStudio from './RecordingSocialStudio';
import RecordingLevelFooter from './RecordingLevelFooter';
import RecordingInfoSection from './RecordingInfoSection';
import {collectionPatches} from '../lib/recordingCollections';
import './ontologyHierarchy.css';
import {confirmDeletion} from '../lib/confirmDeletion';
import RecordingEditorBar from './RecordingEditorBar';
import RecordingItemsEditor from './RecordingItemsEditor';
import {editableRecordingItems,validateRecordingItems,clearItemTiming,blankItemLyrics} from '../lib/recordingItems';
import RecordingsListTable from './RecordingsListTable';
import OntologyFilters from './OntologyFilters';
import WorkFields from './WorkFields';
import OntologyMediaUpload from './OntologyMediaUpload';
import {CreateReferenceContext} from './CreateReferenceContext';
import WorkElementDependencies from './WorkElementDependencies';
import {notifyWorkElementsChanged,subscribeWorkElementsChanged} from './workElementsCatalog';
import './musicOntology.css';
import {WorkElementsProvider} from './WorkElementsContext';
import {uuid} from '../lib/uuid.js';
const vocabEmpty=()=>({kind:'language',name:'',parentId:'',isoCode:'',description:'',languageIds:[],provenance:{source:'',note:''}});
export default function OntologyArchiveAdmin({token}){return <WorkElementsProvider token={token}><OntologyArchiveWorkspace token={token}/></WorkElementsProvider>;}
function OntologyArchiveWorkspace({token}){
 const [collections,setCollections]=useState([]),[collectionId,setCollectionId]=useState(''),[newCollection,setNewCollection]=useState(null),[newCollectionType,setNewCollectionType]=useState(''),[pickedCollection,setPickedCollection]=useState(undefined);
 const [items,setItems]=useState([]),[allItems,setAllItems]=useState([]),[vocabulary,setVocabulary]=useState([]),[workTypes,setWorkTypes]=useState([]),[filters,setFilters]=useState({}),[selected,setSelected]=useState(null);
 const [error,setError]=useState(''),[notice,setNotice]=useState(''),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[unavailable,setUnavailable]=useState(false);
 const [editor,setEditor]=useState(null),[step,setStep]=useState(0),[workEditor,setWorkEditor]=useState(null),[vocabEditor,setVocabEditor]=useState(null);
 const [contentSelection,setContentSelection]=useState(null);
 const [socialOpen,setSocialOpen]=useState(false),[artworkPreview,setArtworkPreview]=useState(''),[artworkBusy,setArtworkBusy]=useState(false),[audioBusy,setAudioBusy]=useState(false);
 const [focusedAtomId,setFocusedAtomId]=useState(null),[timelineSeek,setTimelineSeek]=useState(null);
 const [draftOwner,setDraftOwner]=useState(''),[draftOpening,setDraftOpening]=useState(true),[draftStatus,setDraftStatus]=useState(''),[draftError,setDraftError]=useState('');
 const recordingLocked=busy||artworkBusy||audioBusy||draftOpening;
 const draftKey=useRef(''),savedDrafts=useRef(new Set()),draftWrite=useRef(0);
 const typeId=filters.recordingType||'',[sampleOpen,setSampleOpen]=useState(false);
 const contentRef=useRef(null),pendingReference=useRef(null);
 const createReference=(kind,onSelect,name='')=>{pendingReference.current={kind,onSelect};setVocabEditor({id:'',value:{...vocabEmpty(),kind,name}});};
 const editorOpen=Boolean(editor),workOpen=Boolean(workEditor),vocabOpen=Boolean(vocabEditor);
 const [chosenFormat,setChosenFormat]=useState(null);
 const formatId=format=>{const f=String(format||'').toLowerCase();return f==='m4a'||f==='aac'?'aac':f==='mp3'?'mp3':f==='wav'?'wav':'';};
 // The format the audio will be saved as: the picked one, otherwise whatever the audio already is.
 const currentSaveFormat=()=>{const draft=audioDraft.current,isDraft=draft&&draft.url===editor?.value?.audioUrl;return chosenFormat||formatId(isDraft?draft.exportFormat:editor?.value?.audioMetadata?.format)||'mp3';};
 const pagePushed=useRef(false),workDialog=useRef(null),vocabDialog=useRef(null),request=useRef(0);
 const reload=useCallback(async()=>{
  const generation=++request.current;
  const results=await Promise.allSettled([fetchOntologyRecordings({...filters,archivalStatus:filters.archivalStatus||'ACTIVE'},{token}),apiRequest(`${ontologyPath}/vocabulary`,{token}),fetchOntologyRecordings({},{token}),apiRequest(`${ontologyPath}/work-types`,{token}),apiRequest('/admin/music-archive',{token})]);
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
  else if(!editorOpen&&has){
   // Back only if this page pushed the entry; a stale ?recording= (reload, shared link) is just cleaned.
   if(pagePushed.current&&window.history.state?.recordingEditor){pagePushed.current=false;window.history.back();}
   else{url.searchParams.delete('recording');window.history.replaceState(window.history.state,'',url);}
  }
 },[editorOpen]);
 useEffect(()=>{
  const onPop=()=>{if(!new URL(window.location.href).searchParams.has('recording'))setEditor(current=>current?null:current);};
  window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);
 },[]);
 useEffect(()=>{if(editorOpen)window.scrollTo?.({top:0});},[editorOpen]);
 useEffect(()=>{const node=workDialog.current;if(workOpen){if(!node.open)node.showModal();}else if(node.open)node.close();},[workOpen]);
 useEffect(()=>{const node=vocabDialog.current;if(vocabOpen){if(!node.open)node.showModal();}else if(node.open)node.close();},[vocabOpen]);

 const task=async(fn,successMessage='Saved.')=>{setBusy(true);setError('');setNotice('');try{await fn();announceMusicArchiveChange();setNotice(successMessage);try{await reload();}catch(e){if(e.cancelled)return;setError('The change was saved, but the list could not refresh. '+e.message);}}catch(e){if(e.cancelled)return;setError(e.message);}finally{setBusy(false);}};
 const restoreDraft=saved=>{
  setTimelineSeek(null);setFocusedAtomId(null);
  const restored=restoreRecordingDraft(saved);audioDraft.current=restored.audio;
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
  if(!draftOwner||draftOpening)return;
  setDraftOpening(true);setWorkEditor(null);setError('');
  const key=`${draftOwner}:${row?.id||'new'}`;
  try{
   const saved=await loadRecordingDraft(key);draftKey.current=key;savedDrafts.current.delete(key);
   if(saved){restoreDraft(saved);return;}
   setArtworkPreview(row?.coverImage||'');setStep(0);setDraftStatus('');
   const value=row?editableRecording(row):{...blankRecording(),...(selectedType?{recordingType:selectedType.id,recordingAmount:selectedType.amount}:{})};
   value.items=editableRecordingItems(row||value);
   setEditor({id:row?.id||'',value});
  }catch(problem){setDraftError(`Could not restore the browser draft: ${problem.message}`);}
  finally{setDraftOpening(false);}
 };
 const audioDraft=useRef(null),[hasDraft,setHasDraft]=useState(false);
 useEffect(()=>{if(editor||!draftOwner)return;let active=true;hasRecordingDraft(`${draftOwner}:new`).then(found=>{if(active)setHasDraft(found);}).catch(()=>{});return()=>{active=false;};},[editor,draftOwner]);
 useEffect(()=>{
  const draft=audioDraft.current;
  if(draft&&draft.url!==editor?.value.audioUrl){URL.revokeObjectURL(draft.url);audioDraft.current=null;}
 },[editor?.value.audioUrl]);
 useEffect(()=>()=>{if(audioDraft.current)URL.revokeObjectURL(audioDraft.current.url);},[]);
 // Download the audio in the "Save as" format (MP3/WAV are converted in the browser; AAC is compressed by the server on save, so it downloads as stored).
 const [downloading,setDownloading]=useState(false);
 const downloadAudio=async()=>{
  const value=editor?.value;if(!value?.audioUrl||downloading)return;
  setDownloading(true);
  try{
   const wanted=currentSaveFormat(),draft=audioDraft.current&&audioDraft.current.url===value.audioUrl?audioDraft.current:null,have=formatId(draft?draft.exportFormat:value.audioMetadata?.format);
   let blob,ext=have||'audio';
   if(wanted!==have&&wanted!=='aac'){const converted=await trimAudioFile({src:value.audioUrl,from:0,to:1e9,exportFormat:wanted});blob=converted.file;ext=wanted;}
   else{const response=await fetch(value.audioUrl);if(!response.ok)throw Error('The audio could not be downloaded.');blob=await response.blob();if(have==='aac')ext='m4a';}
   const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`${(value.title||'recording').trim().replace(/[^\w\- ]+/g,'').replace(/\s+/g,'-').toLowerCase()||'recording'}.${ext}`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),1500);
  }catch(problem){setDraftError(problem.message||'The audio could not be downloaded.');}
  finally{setDownloading(false);}
 };
 // Channel-split audio: the saved split (value.stems) is read back from the worker; one channel as FLAC, or all of them as a ZIP.
 const downloadChannels=async which=>{
  const value=editor?.value;if(!(value?.stems?.sourceUrl||value?.stems?.channels?.[0]?.url)||downloading)return;
  setDownloading(true);
  try{
   const base=apiBaseUrl.replace(/\/api$/,''),saved=value.stems.channels?.[0]?.url,local=!saved&&await getStems(value.stems.sourceUrl).catch(()=>null),status=saved?{status:'ready',channels:value.stems.channels}:local?{status:'ready',channels:Object.keys(local.files).map(name=>({name}))}:await apiRequest(`/admin/stems?url=${encodeURIComponent(value.stems.sourceUrl)}`,{token});
   const wanted=which==='all'?status.channels:status.channels.filter(channel=>channel.name===which);
   if(status.status!=='ready'||!wanted.length)throw Error('These channels are not available on the server any more. Split the recording again.');
   const files=[];
   for(const channel of wanted){if(local){files.push({name:`${channel.name}.flac`,data:new Uint8Array(await local.files[channel.name].arrayBuffer())});continue;}const response=saved?await fetch(channel.url):await fetch(`${base}${channel.url}`,{headers:{Authorization:`Bearer ${token}`}});if(!response.ok)throw Error(`The ${channel.name} channel could not be downloaded.`);files.push({name:`${channel.name}.flac`,data:new Uint8Array(await response.arrayBuffer())});}
   const stem=(value.title||'recording').trim().replace(/[^\w\- ]+/g,'').replace(/\s+/g,'-').toLowerCase()||'recording';
   const blob=which==='all'?zipStore(files.map(file=>({...file,name:`${stem}-${file.name}`}))):new Blob([files[0].data],{type:'audio/flac'});
   const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=which==='all'?`${stem}-channels.zip`:`${stem}-${which}.flac`;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(link.href),1500);
  }catch(problem){setDraftError(problem.message||'The channels could not be downloaded.');}
  finally{setDownloading(false);}
 };
 // Trimming happens on the main waveform: cut the chosen span, encode it in the browser and swap the draft audio.
 const trimWaveform=async({from,to})=>{
  const exportFormat=currentSaveFormat();
  if(exportFormat==='aac'){const data=await apiRequest('/admin/music-archive/export-formats',{token}).catch(()=>null);if(!['mp3','aac'].every(id=>data?.formats?.some(row=>row.id===id)))throw Error('AAC compression is unavailable on the server right now. Choose MP3 or WAV.');}
  const draft=await trimAudioFile({src:editor.value.audioUrl,from,to,exportFormat,alreadyTrimmed:Boolean(editor.value.audioMetadata?.trimmed)});
  applyTrimmedAudio(draft);
 };
 const applyTrimmedAudio=draft=>{
  if(audioDraft.current)URL.revokeObjectURL(audioDraft.current.url);
  const url=URL.createObjectURL(draft.file);audioDraft.current={...draft,version:uuid(),url};
  
  applyUploadedAudio({...draft,url});
 };
 const selectDraftAudio=async file=>{
  const format=file.name.match(/\.(mp3|m4a|mp4|aac|wav|ogg|flac|webm|mpeg|mpga)$/i)?.[1]?.toLowerCase()||({'audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav','audio/mp4':'m4a','audio/aac':'aac','audio/ogg':'ogg','audio/flac':'flac','audio/webm':'webm'}[file.type]||'');
  applyTrimmedAudio({file,exportFormat:format,audioMetadata:{format,sizeBytes:file.size,trimmed:false},durationSeconds:null});
 };
 useEffect(()=>{
  const key=draftKey.current;if(!editor||!key||savedDrafts.current.has(key))return;
  const version=++draftWrite.current;setDraftStatus('Saving browser draft…');
  saveRecordingDraft(key,{editor,step},audioDraft.current).then(()=>{if(version===draftWrite.current){setDraftStatus('Draft saved in this browser');setDraftError('');}}).catch(problem=>{if(version===draftWrite.current){setDraftStatus('');setDraftError(`Browser draft could not be saved: ${problem.message||'Check available browser storage.'}`);}});
 },[editor,step]);
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
  await saveRecordingDraft(draftKey.current,{editor,step},draft).catch(problem=>setDraftError(`Browser draft could not be updated: ${problem.message}`));
  return draft.uploaded;
 };
 const applyUploadedAudio=r=>{setTimelineSeek(null);setFocusedAtomId(null);const duration=Number.isFinite(r.durationSeconds)?r.durationSeconds:r.duration?String(r.duration).split(':').reduce((a,b)=>a*60+Number(b),0):null;setChosenFormat(null);setEditor(e=>({...e,value:{...e.value,stems:null,audioUrl:r.url,audioMetadata:r.audioMetadata||null,durationSeconds:duration,items:!e.id&&!r.audioMetadata?.trimmed?[]:clearItemTiming(e.value.items)}}));};
 const selectTimelineAtom=id=>{
  setFocusedAtomId(id);const item=editor?.value.items.find(item=>item.id===id),range=item&&atomRange(item);
  if(range)setTimelineSeek({time:range.startSec});
 };
 const moveAtom=(id,startSec)=>setEditor(current=>current?{...current,value:{...current.value,items:moveAtomSegment(current.value.items,id,startSec,current.value.durationSeconds||86400)}}:current);
 const changeAtomSegment=(id,range)=>setEditor(current=>{
  if(!current)return current;
  const items=moveAtomBoundary(current.value.items,id,range,current.value.durationSeconds||86400);
  return {...current,value:{...current.value,items}};
 });

 const change=(key,value)=>setEditor(e=>({...e,value:{...e.value,[key]:value,...(key==='title'&&e.value.recordingAmount==='INDIVIDUAL'&&e.value.items?.length===1&&(!e.value.items[0].name||e.value.items[0].name===e.value.title)?{items:[{...e.value.items[0],name:value}]}:{})}}));
 const deleteOpenRecording=async()=>{
  if(editor?.id){const row=allItems.find(item=>item.id===editor.id)||items.find(item=>item.id===editor.id);if(!row){setError('This recording is not in the list yet. Go back and try again.');return;}deleteRecording(row);return;}
  // An unsaved new recording only exists as a browser draft.
  if(!await confirmDeletion('Delete this unsaved draft and its audio?',{title:'Delete draft?',confirmLabel:'Delete draft'}))return;
  try{if(draftKey.current)await deleteRecordingDraft(draftKey.current);}catch{/* the draft may already be gone */}
  setHasDraft(false);setEditor(null);
 };
 const closeEditor=()=>{if(recordingLocked)return;setEditor(null);};
 const saveRecording=()=>task(async()=>{const recordingItems=editor.value.items.map(item=>!item.name.trim()&&editor.value.items.length===1?{...item,name:editor.value.title}:item);const recordingAmount=recordingItems.length>1?'MULTIPLE':'INDIVIDUAL';validateRecordingItems(recordingItems,recordingAmount);const {recordingMetadata:_metadata,credits:_credits,...fields}=editor.value;let stems=fields.stems;const stashed=stems?.sourceUrl;
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
 }const body={...fields,stems:stems?{...stems,channels:stems.channels.map(({name,url,storedUrl})=>({name,url:storedUrl||url}))}:null,recordingAmount,items:recordingItems.map(item=>({...item,lyrics:item.hasLyrics?item.lyrics:null})),workId:'',componentWorkIds:[]};if(audioDraft.current?.url===body.audioUrl){const draft=audioDraft.current;
 if(chosenFormat&&!draft.uploaded&&chosenFormat!==formatId(draft.exportFormat)){const converted=await trimAudioFile({src:draft.url,from:0,to:1e9,exportFormat:chosenFormat,alreadyTrimmed:Boolean(draft.audioMetadata?.trimmed)});Object.assign(draft,{file:converted.file,exportFormat:chosenFormat,audioMetadata:converted.audioMetadata});}
 const uploaded=await uploadAudioDraft(draft);body.audioUrl=uploaded.url;body.audioMetadata=uploaded.audioMetadata;}const {item}=await apiRequest(`${ontologyPath}/recordings${editor.id?`/${encodeURIComponent(editor.id)}`:''}`,{token,method:editor.id?'PUT':'POST',body});if(!item?.id)throw Error('The API did not confirm the saved recording. Your browser draft has been kept.');let collectionProblem='';try{await syncCollections(item);}catch(problem){collectionProblem=problem.message||'The collection could not be updated.';}if(typeId&&item.recordingType!==typeId)setFilters(current=>({...current,recordingType:item.recordingType||'',recordingAmount:''}));if(stashed)deleteStems(stashed).catch(()=>{});setSelected(item.id);const key=draftKey.current;savedDrafts.current.add(key);++draftWrite.current;try{await deleteRecordingDraft(key);setDraftError('');}catch{setDraftError('The recording was saved, but its browser draft could not be cleared.');}setEditor(null);setDraftStatus('');if(collectionProblem)setError(`The recording was saved, but its collection was not updated. ${collectionProblem}`);});
 const saveWork=()=>task(async()=>{const body={...workEditor.value,lyrics:workEditor.value.type==='SONG'?workEditor.value.lyrics:null};const {item}=await apiRequest(`${ontologyPath}/works${workEditor.id?`/${encodeURIComponent(workEditor.id)}`:''}`,{token,method:workEditor.id?'PUT':'POST',body});setWorkEditor(null);});
 const saveVocab=()=>task(async()=>{const {item}=await apiRequest(`${ontologyPath}/vocabulary${vocabEditor.id?`/${encodeURIComponent(vocabEditor.id)}`:''}`,{token,method:vocabEditor.id?'PUT':'POST',body:(({firstName:_first,lastName:_last,...rest})=>rest)(vocabEditor.value)});setVocabulary(rows=>[...rows.filter(row=>row.id!==item.id),item].sort((a,b)=>a.name.localeCompare(b.name)));if(item.kind===pendingReference.current?.kind)pendingReference.current.onSelect(item.id,item);pendingReference.current=null;setVocabEditor(null);notifyWorkElementsChanged();});
 const deleteRecording=row=>task(async()=>{const result=await apiRequest(`${ontologyPath}/recordings/${encodeURIComponent(row.id)}`,{token,method:'DELETE',body:{revision:row.revision,permanent:true}});if(result.ok!==true||result.deleted!==true||result.id!==row.id)throw Error('Permanent deletion was not confirmed. The server may need updating.');setItems(current=>current.filter(item=>item.id!==row.id));setAllItems(current=>current.filter(item=>item.id!==row.id));setSelected(null);setContentSelection(null);setEditor(null);if(draftOwner)deleteRecordingDraft(`${draftOwner}:${row.id}`).catch(()=>{});},'Recording deleted.');
 const selectedType=workTypes.find(type=>type.id===typeId);
 const visibleRecordings=filters.archivalStatus==='ARCHIVED'?items:items.filter(item=>item.archivalStatus!=='ARCHIVED');
 const typeCollections=collections.filter(c=>c.workTypeId===typeId),pickedCollectionRow=collections.find(c=>c.id===collectionId),inCollection=pickedCollectionRow?new Set(pickedCollectionRow.recordingIds||[]):null;
 const typeRecordings=(typeId?visibleRecordings.filter(row=>row.recordingType===typeId):visibleRecordings).filter(row=>!inCollection||inCollection.has(row.id));
 const currentCollectionId=collections.find(c=>(c.recordingIds||[]).includes(editor?.id))?.id||'',editorCollectionId=pickedCollection===undefined?currentCollectionId:pickedCollection;
 useEffect(()=>{setPickedCollection(undefined);},[editor?.id,editorOpen]);
 const sidebarCollections=typeId?typeCollections:collections;
 const activeCount=ids=>(ids||[]).filter(id=>allItems.some(row=>row.id===id&&row.archivalStatus===(filters.archivalStatus||'ACTIVE'))).length;
 const pickCollection=collection=>{if(collection&&collection.workTypeId&&collection.workTypeId!==typeId)setFilters(current=>({...current,recordingType:collection.workTypeId,recordingAmount:''}));setCollectionId(collection?collection.id:'');setSelected(null);setContentSelection(null);};
 const createCollection=event=>{event.preventDefault();const title=(newCollection||'').trim(),workTypeId=typeId||newCollectionType;if(!title||!workTypeId)return;task(async()=>{const {item}=await apiRequest('/admin/music-archive/collections',{token,method:'POST',body:{title,workTypeId,published:false,recordingIds:[]}});setNewCollection(null);if(workTypeId!==typeId)setFilters(current=>({...current,recordingType:workTypeId,recordingAmount:''}));setCollectionId(item.id);},'Collection created.');};
 const [renaming,setRenaming]=useState(null);
 const renameCollection=event=>{event.preventDefault();const title=(renaming||'').trim();if(!title||!pickedCollectionRow)return;task(async()=>{await apiRequest(`/admin/music-archive/collections/${encodeURIComponent(pickedCollectionRow.id)}`,{token,method:'PATCH',body:{title}});setRenaming(null);},'Collection updated.');};
 const deleteCollection=()=>{if(!pickedCollectionRow)return;task(async()=>{await apiRequest(`/admin/music-archive/collections/${encodeURIComponent(pickedCollectionRow.id)}`,{token,method:'DELETE',deleteMessage:`Delete the collection "${pickedCollectionRow.title}"? Its recordings stay in the archive.`});setCollectionId('');setRenaming(null);},'Collection deleted.');};
 const openNewCollection=()=>{setNewCollectionType(typeId||workTypes[0]?.id||'');setNewCollection('');};
 // After a recording is saved, put it in the collection picked in the form (and out of any other one).
 const syncCollections=async item=>{const chosen=pickedCollection===undefined?currentCollectionId:pickedCollection;for(const patch of collectionPatches(collections,item.id,item.recordingType,chosen))await apiRequest(`/admin/music-archive/collections/${encodeURIComponent(patch.id)}`,{token,method:'PATCH',body:{recordingIds:patch.recordingIds}});};
 const at=typeRecordings.findIndex(r=>r.id===selected),step_=d=>typeRecordings[at+d]&&setSelected(typeRecordings[at+d].id);
 const chosen=typeRecordings.find(r=>r.id===selected),value=editor?.value;
 // The audio upload box unmounts once audio is attached, so it can no longer report that its upload finished.
 useEffect(()=>{if(value?.audioUrl)setAudioBusy(false);},[value?.audioUrl]);
 const chooseType=id=>{setCollectionId('');setFilters(current=>({...current,recordingType:id,recordingAmount:''}));setSelected(null);setContentSelection(null);};
 const selectedContent=chosen&&contentSelection&&chosen.id===contentSelection.recordingId?recordingComponents(chosen).find(w=>w.id===contentSelection.workId):null;
 useEffect(()=>{if(contentRef.current)contentRef.current.scrollTop=0;},[chosen?.id,selectedContent?.id]);
 const workFields=workEditor?(<WorkFields simple={false} classificationLocked={Boolean(workEditor.id)||workEditor.attachToRecording} value={workEditor.value} onChange={v=>setWorkEditor(w=>({...w,value:v}))} vocabulary={vocabulary}/>):null;


 return <CreateReferenceContext.Provider value={createReference}><section className="ontology-admin ontology-view-recordings" aria-labelledby="ontology-admin-title"><div className="ontology-admin-main" hidden={editorOpen}> <div className="ontology-recording-workspace">
 <aside className="ontology-recording-sidebar" aria-label="Collections"><header><div className="ontology-recordings-title"><h2>Collections</h2></div><button type="button" className="ontology-all-types" aria-pressed={!collectionId} title="Show every recording of the chosen work type" onClick={()=>pickCollection(null)}>All<b>{(typeId?visibleRecordings.filter(row=>row.recordingType===typeId):visibleRecordings).length}</b></button></header>
<section className="ontology-collection-add" aria-label="Add a collection">{newCollection===null?<button type="button" className="ontology-new-collection" disabled={busy||!workTypes.length} onClick={openNewCollection}><Plus size={15} aria-hidden="true"/>New collection</button>:<form onSubmit={createCollection}>
<input autoFocus value={newCollection} maxLength={240} placeholder="Collection name" aria-label="Collection name" onChange={e=>setNewCollection(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setNewCollection(null);}}/>
{typeId?<p className="ontology-collection-type">Work type: <strong>{selectedType?.name}</strong></p>:<select value={newCollectionType} aria-label="Work type of the collection" onChange={e=>setNewCollectionType(e.target.value)}>{workTypes.map(type=><option key={type.id} value={type.id}>{type.name}</option>)}</select>}
<div className="ontology-collection-actions"><button type="submit" disabled={busy||!newCollection.trim()||!(typeId||newCollectionType)}>Create</button><button type="button" onClick={()=>setNewCollection(null)}>Cancel</button></div>
</form>}</section>
<nav aria-label="Choose a collection" className="ontology-recording-list">{sidebarCollections.map(collection=><button key={collection.id} type="button" aria-current={collectionId===collection.id?'true':undefined} onClick={()=>pickCollection(collectionId===collection.id?null:collection)}><span className="ontology-recording-icon" aria-hidden="true"><Layers size={18}/></span><span><strong>{collection.title}</strong>{!typeId&&collection.workTypeId&&<small>{workTypes.find(type=>type.id===collection.workTypeId)?.name||collection.workTypeId}</small>}</span><b className="ontology-recording-count">{activeCount(collection.recordingIds)}</b></button>)}</nav>{!loading&&!sidebarCollections.length&&<div className="ontology-aside-empty" role="status"><Layers size={26} strokeWidth={1.4} aria-hidden="true"/><strong>{typeId?'No collections for this work type yet':'No collections yet'}</strong><span>Use New collection above to group its recordings.</span></div>}
{pickedCollectionRow&&<footer className="ontology-collection-footer" aria-label="Selected collection">{renaming===null?<><strong title={pickedCollectionRow.title}>{pickedCollectionRow.title}</strong><button type="button" disabled={busy} onClick={()=>setRenaming(pickedCollectionRow.title)}><Pencil size={14} aria-hidden="true"/>Edit</button><button type="button" className="is-danger" disabled={busy} onClick={deleteCollection}><Trash2 size={14} aria-hidden="true"/>Delete</button></>:<form onSubmit={renameCollection}><input autoFocus value={renaming} maxLength={240} aria-label="Collection name" onChange={e=>setRenaming(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setRenaming(null);}}/><button type="submit" disabled={busy||!renaming.trim()}>Save</button><button type="button" onClick={()=>setRenaming(null)}>Cancel</button></form>}</footer>}
</aside>
  <section className="ontology-archive-panel" aria-labelledby="ontology-admin-title">{draftError&&!editor&&<p role="alert">{draftError}</p>}<header className="ontology-heading"><div className="ontology-recordings-title"><h1 id="ontology-admin-title">Recordings</h1></div><nav className="ontology-type-tabs" role="tablist" aria-label="Work type">
<button type="button" role="tab" aria-selected={!typeId} onClick={()=>chooseType('')}>All<b>{allItems.filter(row=>row.archivalStatus===(filters.archivalStatus||'ACTIVE')).length}</b></button>{workTypes.map(type=><button key={type.id} type="button" role="tab" aria-selected={typeId===type.id} onClick={()=>chooseType(typeId===type.id?'':type.id)}>{type.name}<b>{allItems.filter(row=>row.recordingType===type.id&&row.archivalStatus===(filters.archivalStatus||'ACTIVE')).length}</b></button>)}
</nav>
<div className="ontology-heading-actions" role="toolbar" aria-label="Recordings toolbar">
<button type="button" className="ontology-add-recording ontology-new-recording" aria-label={hasDraft?'Continue draft recording':'New recording'} title={hasDraft?'Continue draft recording':'New recording'} disabled={unavailable||busy||draftOpening||!draftOwner} onClick={()=>openRecording()}><Plus size={16} aria-hidden="true"/><span>{hasDraft?'Continue draft recording':'New recording'}</span></button><OntologyFilters admin popup value={filters} onChange={setFilters} vocabulary={vocabulary} workTypes={workTypes}/></div></header>
 {error&&<p role="alert" className="ontology-alert">{error}{unavailable&&' The ontology API must be deployed before using the new editor.'}</p>}{notice&&<p role="status">{notice}</p>}
 <div className={`ontology-recording-main${loading?' is-loading':''}`}>{loading?<p role="status" className="ontology-archive-loading">Loading archive…</p>:<RecordingsListTable vocabulary={vocabulary} collections={collections} recordings={typeRecordings} selectedId={selected} loading={loading} onSelect={id=>{const row=typeRecordings.find(item=>item.id===id);setSelected(id);setContentSelection(null);if(row)openRecording(row);}}/>}</div>
 <footer className="ontology-recordings-footer"><small>{typeRecordings.length} {typeRecordings.length===1?'recording':'recordings'}{selectedType?` · ${selectedType.name}`:''}{pickedCollectionRow?` · ${pickedCollectionRow.title}`:''}</small></footer>
 </section>
 
 </div>
 </div>


 {editorOpen&&<section className="ontology-dialog ontology-editor-dialog ontology-editor-page" aria-label="Recording editor">{value&&<><RecordingEditorBar step={step} locked={recordingLocked} status={draftError} hasAudio={Boolean(value.audioUrl)} onBack={step===0?closeEditor:()=>setStep(0)}
 format={(()=>{const draftNow=Boolean(audioDraft.current&&audioDraft.current.url===value.audioUrl&&!audioDraft.current.uploaded);return {active:currentSaveFormat(),editable:draftNow,onPick:setChosenFormat,options:EXPORT_FORMATS.map(option=>({id:option.id,label:option.label.replace(' (M4A)',''),size:estimateSizeMB(option.id,value.durationSeconds),title:option.description||`${option.label} · ${option.bitrateKbps} kbps`}))};})()}
 downloadMenu={{busy:downloading,channels:value.stems?.channels||[],info:(()=>{const f=currentSaveFormat(),size=estimateSizeMB(f,value.durationSeconds);return `${f.toUpperCase()}${size?` · ≈ ${size}`:''}`;})(),onMerged:downloadAudio,onChannel:downloadChannels}}
 more={{canSample:Boolean(editor.id&&chosen),sampleReady:Boolean(workTypes.find(type=>type.id===value.recordingType)&&value.audioUrl),onSample:()=>setSampleOpen(true),socialReady:Boolean(editor.id),onSocial:()=>setSocialOpen(true)}}
 onDelete={deleteOpenRecording} busy={busy} saved={Boolean(editor.id)} save={{ready:Boolean(value.title.trim()&&value.recordingType&&value.items.length),busy,onSave:saveRecording}}/>{socialOpen&&editor.id&&<RecordingSocialStudio id={editor.id} value={value} vocabulary={vocabulary} typeName={workTypes.find(type=>type.id===value.recordingType)?.name||''} cover={artworkPreview||value.coverImage} onClose={()=>setSocialOpen(false)}/>}{error&&<p role="alert">{error}</p>}<fieldset disabled={recordingLocked} className="ontology-editor-body">
 {step===0&&<div className="recording-basics recording-basics--items"><div className="recording-basics-main">{!value.audioUrl&&<div className="recording-timeline-waiting"><div className="recording-waiting-copy" role="status"><h3>Waiting for a recording audio file to add</h3><p>Once the audio is attached, its waveform appears here and you can mark each part of the recording as an atom.</p></div><OntologyMediaUpload token={token} value={value.audioUrl} onBusyChange={setAudioBusy} onSelected={selectDraftAudio} onUploaded={applyUploadedAudio}/></div>}{value.audioUrl&&<section className="recording-detail-player" aria-label="Recording audio and atom segments"><TranscriptionAudioTape key={value.audioUrl} src={value.audioUrl} onMasterDownload={downloadAudio} onDeleteAudio={recordingLocked?undefined:()=>setEditor(e=>({...e,value:{...e.value,stems:null,audioUrl:'',audioMetadata:null,durationSeconds:null,items:clearItemTiming(e.value.items)}}))} lanes={ctx=><StemLanes savedStems={value.stems} onStems={stems=>setEditor(e=>!e?e:!stems?{...e,value:{...e.value,stems:null}}:e.value.audioUrl&&JSON.stringify(e.value.stems?.channels)!==JSON.stringify(stems.channels)||!e.value.stems?{...e,value:{...e.value,stems}}:e)} audioUrl={value.audioUrl} fingerprint={audioDraft.current?.file?`${audioDraft.current.file.name}:${audioDraft.current.file.size}:${audioDraft.current.file.lastModified}`:''} token={token} ensureUploaded={async()=>{const draft=audioDraft.current;return draft&&draft.url===value.audioUrl?(await uploadAudioDraft(draft)).url:value.audioUrl;}} {...ctx}/>} onTrimApply={trimWaveform} trimDisabled={recordingLocked} metadata={value.audioMetadata} onDuration={updateAudioDuration} seekTo={timelineSeek} onTimeChange={time=>{const atom=value.items.find(item=>{const range=atomRange(item);return range&&time>=range.startSec&&time<range.endSec;});if(atom)setFocusedAtomId(atom.id);}} regions={value.items.flatMap((atom,index)=>{const range=atomRange(atom);return range?[{id:atom.id,name:atom.name||`Atom ${index+1}`,index,start:range.startSec,end:range.endSec}]:[];})} onRegionSelect={setFocusedAtomId} onRegionChange={changeAtomSegment} onRegionMove={moveAtom}/>{<div className="recording-atoms-card"><header className="recording-atoms-card-title"><h3>Recording atoms</h3><small>{value.items.length} {value.items.length===1?'atom':'atoms'} · each references a segment of the timeline</small></header><RecordingItemsEditor focusedAtomId={focusedAtomId} onSelect={selectTimelineAtom} key={editor.id||'new'} items={value.items} amount="MULTIPLE" audioUrl={value.audioUrl} duration={value.durationSeconds} vocabulary={vocabulary} onChange={items=>change('items',items)} /></div>}</section>}<RecordingInfoSection collections={collections} collectionId={editorCollectionId} onCollection={setPickedCollection} editor={editor} value={value} allItems={allItems} audioDraft={audioDraft} token={token} vocabulary={vocabulary} workTypes={workTypes} artworkPreview={artworkPreview} recordingLocked={recordingLocked} change={change} setEditor={setEditor} setArtworkBusy={setArtworkBusy} setArtworkPreview={setArtworkPreview}/></div></div>}

 


{step===0&&value.audioUrl&&<RecordingLevelFooter src={value.audioUrl}/>}
 </fieldset></>}</section>}
 <dialog ref={workDialog} className="ontology-dialog ontology-editor-dialog ontology-secondary-editor work-content-dialog" onCancel={event=>{if(event.target===event.currentTarget&&busy)event.preventDefault();}} onClose={event=>{if(event.target===event.currentTarget)setWorkEditor(null);}} aria-label="Content editor">{workEditor&&<><header><div className="work-dialog-heading"><span className="work-dialog-icon" aria-hidden="true">{workEditor.value.type==='SONG'?<Layers size={22}/>:<Music2 size={22}/>}</span><div><small>CONTENT LIBRARY</small><h2>{`${workEditor.id?'Edit':'New'} ${workEditor.value.type==='SONG'?'lyrical music':'instrumental entry'}`}</h2><p>{workEditor.value.type==='SONG'?'Bring the words and melody together.':'Capture the sound and the people behind it.'}</p></div></div><button type="button" className="cb-dialog-close" aria-label="Close content editor" disabled={busy} onClick={()=>{setWorkEditor(null);}}><X size={19}/></button></header>{error&&<p role="alert">{error}</p>}<fieldset disabled={busy}>{workFields}</fieldset><footer><span>Shared with recordings that use this entry</span><div className="work-dialog-footer-actions"><button type="button" disabled={busy} onClick={()=>setWorkEditor(null)}>Cancel</button><button type="button" disabled={busy||!workEditor.value.title.trim()} onClick={saveWork}>{busy?'Saving…':workEditor.attachToRecording?'Save & add entry':'Save content'}</button></div></footer></>}</dialog>
 <dialog ref={vocabDialog} className="ontology-dialog ontology-editor-dialog ontology-secondary-editor" onCancel={event=>{if(event.target===event.currentTarget&&busy)event.preventDefault();}} onClose={event=>{if(event.target===event.currentTarget){setVocabEditor(null);pendingReference.current=null;}}} aria-label="Details editor">{vocabEditor&&<><header><h2>{vocabEditor.value.kind==='lyricist'?'Lyricist':vocabEditor.value.kind==='artist'?'Vocalist':vocabEditor.value.kind==='instrument'?'New instrument':vocabEditor.value.kind==='musician'?'Musician':'Detail entry'}</h2><button type="button" disabled={busy} onClick={()=>{setVocabEditor(null);}}>Close</button></header>{error&&<p role="alert">{error}</p>}<fieldset disabled={busy}>{[['kind','Entity kind'],['name',vocabEditor.value.kind==='instrument'?'Instrument name':'Display name'],['isoCode','ISO language code (when available)'],['description','Description']].filter(([key])=>key!=='isoCode'&&(!pendingReference.current||key!=='kind')&&!(['artist','musician'].includes(vocabEditor.value.kind)&&(key==='name'||key==='description'))).map(([key,label])=><label key={key}>{label}{key==='kind'?<select disabled={Boolean(vocabEditor.id)||Boolean(pendingReference.current)} value={vocabEditor.value.kind} onChange={e=>setVocabEditor(v=>({...v,value:{...v.value,kind:e.target.value,parentId:''}}))}>{contract.vocabularyKinds.filter(kind=>kind!=='region').map(k=><option key={k}>{k}</option>)}</select>:<input value={vocabEditor.value[key]} onChange={e=>setVocabEditor(v=>({...v,value:{...v.value,[key]:e.target.value}}))}/>}</label>)}{['artist','musician'].includes(vocabEditor.value.kind)&&(()=>{const split=(vocabEditor.value.name||'').trim().split(/\s+/),first=vocabEditor.value.firstName??(split[0]||''),last=vocabEditor.value.lastName??split.slice(1).join(' '),set=(a,b)=>setVocabEditor(v=>({...v,value:{...v.value,firstName:a,lastName:b,name:`${a} ${b}`.trim()}}));return <><label>First name<input value={first} onChange={e=>set(e.target.value,last)}/></label><label>Last name<input value={last} onChange={e=>set(first,e.target.value)}/></label></>;})()}<WorkElementDependencies value={vocabEditor.value} onChange={value=>setVocabEditor(current=>({...current,value}))} vocabulary={vocabulary}/>{!pendingReference.current&&<label>Source attribution<input value={vocabEditor.value.provenance.source} onChange={e=>setVocabEditor(v=>({...v,value:{...v.value,provenance:{...v.value.provenance,source:e.target.value}}}))}/></label>}<button type="button" disabled={!vocabEditor.value.name.trim()} onClick={saveVocab}>{vocabEditor.value.kind==='artist'?'Save vocalist':vocabEditor.value.kind==='instrument'?'Save & select instrument':vocabEditor.value.kind==='musician'?'Save musician':'Save details'}</button></fieldset></>}</dialog>
 {sampleOpen&&chosen&&workTypes.find(item=>item.id===chosen.recordingType)&&<SampleTrimmer key={chosen.id} recording={chosen} workType={workTypes.find(item=>item.id===chosen.recordingType)} token={token} onClose={()=>setSampleOpen(false)} onSaved={()=>{setSampleOpen(false);reload();}}/>}</section></CreateReferenceContext.Provider>;
}
