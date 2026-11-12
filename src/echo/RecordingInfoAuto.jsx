import {useEffect,useRef,useState} from 'react';
import {Wand2} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {readId3} from '../lib/id3';
import './recordingInfoAuto.css';

// Fills the plain facts (name, work type, release year) with the free text model from Echo AI Configuration. Empty fields are filled; fields you already set are only suggested.
export default function RecordingInfoAuto({token,file,filename,value,workTypes,vocabulary,onApply}){
 const [state,setState]=useState('idle'),[note,setNote]=useState(null),autoId=useRef('');
 const names=ids=>(ids||[]).map(id=>vocabulary.find(row=>row.id===id)?.name).filter(Boolean);
 const run=async()=>{
  if(state==='running')return;setState('running');setNote(null);
  try{
   const tags=file?await readId3(file):{},name=file?.name||filename||'';
   const analysis={durationSeconds:value.durationSeconds??null,bpms:(value.musical?.bpms||[]).slice(0,10),keys:(value.musical?.keys||[]).slice(0,12),languages:names(value.languages?.languageIds),dialects:names(value.languages?.dialectIds)};
   const result=await apiRequest('/admin/music-archive/ai-info',{method:'POST',token,body:{filename:name,tags,analysis,workTypes:workTypes.map(type=>({id:type.id,name:type.name}))},timeoutMs:90000});
   const patch={},suggested=[];
   if(result.title){if(!value.title.trim())patch.title=result.title;else if(result.title!==value.title)suggested.push({field:'title',label:'Name',text:result.title});}
   if(result.workTypeId){if(!value.recordingType)patch.recordingType=result.workTypeId;else if(result.workTypeId!==value.recordingType)suggested.push({field:'recordingType',label:'Work type',text:workTypes.find(type=>type.id===result.workTypeId)?.name||result.workTypeId,value:result.workTypeId});}
   if(result.releaseYear&&!value.releaseDate)patch.releaseYearHint=result.releaseYear;
   if(Object.keys(patch).some(key=>key!=='releaseYearHint'))onApply(patch);
   setNote({result,suggested,filled:Object.keys(patch).filter(key=>key!=='releaseYearHint')});setState('done');
  }catch(error){setNote({error:error?.message||'The AI could not fill this in.'});setState('error');}
 };
 // Automatic once per audio file, when the name is still empty.
 useEffect(()=>{
  if(!value.audioUrl||value.title.trim())return undefined;
  if(autoId.current===value.audioUrl)return undefined;
  const timer=setTimeout(()=>{autoId.current=value.audioUrl;run();},2500);
  return()=>clearTimeout(timer);
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[value.audioUrl,value.title]);
 if(!value.audioUrl)return null;
 const label={title:'name',recordingType:'work type'};
 return <div className="recording-info-auto">
  <button type="button" disabled={state==='running'} onClick={run}><Wand2 size={13}/>{state==='running'?'Reading the file…':'Fill name and type with AI'}</button>
  {note?.error&&<p className="is-error" role="alert">{note.error}</p>}
  {note&&!note.error&&<div className="recording-info-note" role="status">
   {note.filled.length>0&&<p className="is-single"><strong>Filled: </strong>{note.filled.map(field=>label[field]).join(' and ')} ({note.result.confidence} confidence). {note.result.reason}</p>}
   {note.suggested.map(item=><p key={item.field} className="is-info">Suggested {item.label.toLowerCase()}: <b>{item.text}</b> <button type="button" onClick={()=>{onApply({[item.field]:item.value??item.text});setNote(current=>({...current,suggested:current.suggested.filter(other=>other.field!==item.field)}));}}>Use</button></p>)}
   {note.result.releaseYear&&!value.releaseDate&&<p className="is-info">The file points to the year {note.result.releaseYear}. The full release date is left for you to set.</p>}
   {!note.filled.length&&!note.suggested.length&&<p className="is-info">Name and work type were already set; nothing to change.</p>}
  </div>}
 </div>;
}
