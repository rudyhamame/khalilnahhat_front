import {useCallback,useEffect,useState} from 'react';
import {Film,History,Download,Trash2} from 'lucide-react';
import {apiRequest} from '../lib/api';
const size=bytes=>bytes>=1024**3?`${(bytes/1024**3).toFixed(2)} GB`:bytes?`${Math.max(1,Math.round(bytes/1024**2))} MB`:'—';
const length=sec=>sec?`${Math.floor(sec/3600)?Math.floor(sec/3600)+':':''}${String(Math.floor(sec/60)%60).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}`:'—';
const STATUS={recording:['Recording','is-live'],waiting:['Waiting','is-disk'],processing:['Saving','is-disk'],ready:['Ready','is-sent'],partial:['Partial','is-partial'],upload_failed:['Transfer failed','is-failed'],failed:['Failed','is-failed'],not_recorded:['No recording','is-partial']};
// Every recording ever made, newest first: the time dimension of "Record this live".
export default function RecordingHistory({token,active,refreshKey,localFiles=[],blocked=true,onRebuild,onMp4,onPurge}){
  const [items,setItems]=useState(null),[error,setError]=useState('');
  const load=useCallback(async signal=>{
    try{const result=await apiRequest('/admin/live-recordings',{token,signal});setItems(result.items||[]);setError('');}
    catch(e){if(e.name!=='AbortError')setError('History is unavailable right now.');}
  },[token]);
  useEffect(()=>{
    if(!active||!token)return undefined;
    const controller=new AbortController();let timer;
    const poll=async()=>{await load(controller.signal);if(!controller.signal.aborted)timer=setTimeout(poll,items?.some(item=>item.status==='recording'||item.status==='processing')?4000:20000);};
    void poll();return()=>{controller.abort();clearTimeout(timer);};
  },[active,token,load,refreshKey]);// eslint-disable-line react-hooks/exhaustive-deps
  if(error&&!items)return <p className="studio-history-note" role="status">{error}</p>;
  if(!items)return <p className="studio-history-note" role="status">Loading history…</p>;
  const known=new Set(items.map(item=>item.id)),localOnly=localFiles.filter(file=>!known.has(file.id)).map(file=>({id:file.id,title:file.filename,status:'local',partCount:file.count,local:true}));
  const rows=[...localOnly,...items];
  if(!rows.length)return <p className="studio-history-note">No recordings yet. They appear here once you record a live.</p>;
  const when=value=>new Date(value).toLocaleString([],{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
  return <ol className="studio-history" aria-label="Recording history">{rows.map(item=>{const [label,tone]=STATUS[item.retrying?'recording':item.status]||[item.status,'is-disk'],file=localFiles.find(f=>f.id===item.id);
    return <li key={item.id}><span className="studio-local-icon" aria-hidden="true"><Film size={15}/></span>
      <span className="studio-local-info"><strong title={item.title}>{item.title||'Untitled live'}</strong><small><b className={`studio-local-chip ${tone}`}>{label}</b>{item.createdAt?`${when(item.createdAt)} · ${length(item.durationSec)} · ${size(item.bytes)}`:'saved only in your folder'}{item.partCount>1?` · ${item.partCount} parts`:''}{file?' · on this computer':''}</small></span>
      {file&&<span className="studio-local-actions">
        <button type="button" title="Join the saved parts into one video file in your folder" aria-label={`Build video ${file.filename}`} disabled={blocked} onClick={()=>onRebuild?.(file)}><Film size={15}/><span>Build video</span></button>
        {!file.filename.endsWith('.mp4')&&<button type="button" title="Convert to MP4" aria-label={`Save MP4 ${file.filename}`} disabled={blocked} onClick={()=>onMp4?.(file)}><Download size={15}/><span>MP4</span></button>}
        <button type="button" className="studio-local-delete" title="Delete these parts from your folder" aria-label={`Delete parts of ${file.filename}`} disabled={blocked} onClick={()=>onPurge?.(file)}><Trash2 size={15}/></button>
      </span>}</li>;})}
    <li className="studio-history-all"><a href="/admin/echo?tab=live-archive"><History size={13} aria-hidden="true"/> Open all in Live Recordings</a></li></ol>;
}
