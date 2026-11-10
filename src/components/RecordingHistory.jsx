import {useCallback,useEffect,useState} from 'react';
import {Film,History,Download,Trash2,Clock,HardDrive,Layers,Monitor,Server,Cloud} from 'lucide-react';
import {apiRequest} from '../lib/api';
const size=bytes=>bytes>=1024**3?`${(bytes/1024**3).toFixed(2)} GB`:bytes?`${Math.max(1,Math.round(bytes/1024**2))} MB`:'';
const length=sec=>sec?`${Math.floor(sec/3600)?Math.floor(sec/3600)+':':''}${String(Math.floor(sec/60)%60).padStart(2,'0')}:${String(Math.floor(sec%60)).padStart(2,'0')}`:'';
const STATUS={recording:['Recording','is-live'],waiting:['Waiting','is-disk'],processing:['Saving','is-disk'],ready:['Ready','is-sent'],partial:['Partial','is-partial'],upload_failed:['Archive failed','is-failed'],failed:['Failed','is-failed'],not_recorded:['No recording','is-partial'],local:['On computer','is-disk']};
const dayLabel=value=>{const day=new Date(value),today=new Date(),diff=Math.round((new Date(today.getFullYear(),today.getMonth(),today.getDate())-new Date(day.getFullYear(),day.getMonth(),day.getDate()))/864e5);return diff===0?'Today':diff===1?'Yesterday':day.toLocaleDateString([],{weekday:'short',month:'short',day:'numeric'});};
const clock=value=>new Date(value).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
// Every recording ever made, newest first, grouped by day, with where each copy lives: computer, OVH, Cloudinary.
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
  const known=new Set(items.map(item=>item.id)),localOnly=localFiles.filter(file=>!known.has(file.id)).map(file=>({id:file.id,title:file.filename,status:'local',partCount:0,localParts:file.count}));
  const rows=[...localOnly,...items];
  if(!rows.length)return <p className="studio-history-note">No recordings yet. They appear here once you record a live.</p>;
  const groups=[];for(const item of rows){const label=item.createdAt?dayLabel(item.createdAt):'On this computer only';let group=groups.find(entry=>entry.label===label);if(!group){group={label,items:[]};groups.push(group);}group.items.push(item);}
  return <div className="rh" aria-label="Recording history">
    {groups.map(group=><section key={group.label} className="rh-day"><h5>{group.label}</h5>
      {group.items.map(item=>{
        const [label,tone]=STATUS[item.retrying?'recording':item.status]||[item.status,'is-disk'],file=localFiles.find(f=>f.id===item.id);
        const inCloud=item.partCount>0,onOvh=item.status!=='local'&&(!inCloud||item.cleanupPending),onComputer=Boolean(file)||item.status==='local';
        const parts=item.localParts||file?.count||item.partCount;
        const meta=[item.createdAt&&[Clock,clock(item.createdAt)],length(item.durationSec)&&[Film,length(item.durationSec)],size(item.bytes)&&[HardDrive,size(item.bytes)],parts>1&&[Layers,`${parts} parts`]].filter(Boolean);
        return <article key={item.id} className="rh-item">
          <header><strong title={item.title}>{item.title||'Untitled live'}</strong><b className={`studio-local-chip ${tone}`}>{label}</b></header>
          {meta.length>0&&<p className="rh-meta">{meta.map(([Icon,text],i)=><span key={i}><Icon size={12} aria-hidden="true"/>{text}</span>)}</p>}
          <footer>
            <span className="rh-where" aria-label="Where copies are stored">{[['Computer',Monitor,onComputer],['OVH',Server,onOvh],['Cloudinary',Cloud,inCloud]].map(([name,Icon,on])=><span key={name} className={on?'is-on':''} title={on?`Stored on ${name}`:`Not on ${name}`}><Icon size={12} aria-hidden="true"/>{name}</span>)}</span>
            {file&&<span className="studio-local-actions">
              <button type="button" title="Join the saved parts into one video file in your folder" aria-label={`Build video ${file.filename}`} disabled={blocked} onClick={()=>onRebuild?.(file)}><Film size={14}/><span>Build video</span></button>
              {!file.filename.endsWith('.mp4')&&<button type="button" title="Convert to MP4" aria-label={`Save MP4 ${file.filename}`} disabled={blocked} onClick={()=>onMp4?.(file)}><Download size={14}/><span>MP4</span></button>}
              <button type="button" className="studio-local-delete" title="Delete these parts from your folder" aria-label={`Delete parts of ${file.filename}`} disabled={blocked} onClick={()=>onPurge?.(file)}><Trash2 size={14}/></button>
            </span>}
          </footer>
        </article>;})}
    </section>)}
    <a className="studio-history-all" href="/admin/echo?tab=live-archive"><History size={13} aria-hidden="true"/> Open all in Live Recordings</a>
  </div>;
}
