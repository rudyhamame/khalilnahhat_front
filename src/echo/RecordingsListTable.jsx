import {useEffect,useRef,useState} from 'react';
import {Disc3,Pause,Pencil,Play} from 'lucide-react';
import './recordingsListTable.css';
import './recordingsGrid.css';
import {formatTime} from '../lib/formatTime';
const duration=recording=>{if(recording.duration)return recording.duration;const seconds=recording.durationSeconds??recording.audio?.durationSeconds;return Number.isFinite(seconds)?`${Math.floor(seconds/60)}:${String(Math.round(seconds%60)).padStart(2,'0')}`.replace(/^(\d+):60$/,(_,m)=>`${+m+1}:00`):'';};
const STATUS={PUBLISHED:'Published',DRAFT:'Draft',ARCHIVED:'Archived'};
// A cell with several values lists them one under another (sublines) instead of one long comma-separated string.
const Lines=({items,empty='Not specified'})=>{const list=(items||[]).filter(item=>item!==null&&item!==undefined&&item!=='');return list.length?<ul className="rec-multi">{list.map((item,index)=><li key={`${item}-${index}`}>{item}</li>)}</ul>:<span className="rec-empty">{empty}</span>;};
const Status=({status})=><span className={`rec-pill rec-pill--${status==='PUBLISHED'?'on':'off'}`}>{STATUS[status]||'Not specified'}</span>;

// Left: the recordings as a grid of cards. Selecting one shows its details in the aside on the right.
export default function RecordingsListTable({recordings,selectedId,onSelect,loading}){
 if(!recordings.length)return <p className="recordings-grid-empty" role="status">{loading?'Loading recordings…':'No recordings match this collection and the current filters.'}</p>;
 return <ul className="recordings-grid" aria-label="Recordings">{recordings.map(recording=><li key={recording.id}>
  <button type="button" className="recordings-card" aria-pressed={selectedId===recording.id} onClick={()=>onSelect(recording.id)}>
   <span className="recordings-card-cover">{recording.coverImage?<img src={recording.coverImage} alt="" loading="lazy"/>:<Disc3 size={44} aria-hidden="true"/>}</span>
   <span className="recordings-card-info">
    <strong>{recording.name}</strong>
    <small>{[recording.workTypeDefinition?.name,duration(recording)].filter(Boolean).join(' · ')||'—'}</small>
    <Status status={recording.status}/>
   </span>
  </button></li>)}</ul>;
}

const clock=value=>Number.isFinite(value)&&value>=0?`${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`:'0:00';
// A small player pinned to the bottom of the details aside.
function MiniPlayer({recording}){
 const audio=useRef(null),[playing,setPlaying]=useState(false),[time,setTime]=useState(0),[length,setLength]=useState(0);
 useEffect(()=>{const node=audio.current;return()=>{node?.pause();};},[]);
 const meta=recording.audio?.metadata||{};
 const caption=[meta.format&&meta.format.toUpperCase(),Number.isFinite(meta.sizeBytes)&&`${(meta.sizeBytes/1024/1024).toFixed(2)} MB`].filter(Boolean).join(' · ');
 return <footer className="recording-miniplayer" aria-label="Recording player">
  <audio ref={audio} src={recording.audioUrl} preload="none" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onEnded={()=>setPlaying(false)} onTimeUpdate={event=>setTime(event.currentTarget.currentTime)} onLoadedMetadata={event=>setLength(event.currentTarget.duration)}/>
  <button type="button" className="recording-miniplayer-toggle" aria-label={playing?'Pause':'Play'} onClick={()=>{const node=audio.current;if(!node)return;if(node.paused)node.play().catch(()=>setPlaying(false));else node.pause();}}>{playing?<Pause size={18} fill="currentColor" aria-hidden="true"/>:<Play size={18} fill="currentColor" aria-hidden="true"/>}</button>
  <div className="recording-miniplayer-body">
   <strong title={recording.name}>{recording.name}</strong>
   <input type="range" className="recording-miniplayer-seek" style={{'--played':`${Math.min(100,Math.max(0,(time/(length||recording.audio?.durationSeconds||1))*100))}%`}} min="0" max={length||recording.audio?.durationSeconds||1} step=".1" value={Math.min(time,length||recording.audio?.durationSeconds||1)} aria-label="Seek" onChange={event=>{if(audio.current)audio.current.currentTime=Number(event.target.value);}}/>
   <small><span>{clock(time)} / {clock(length||recording.audio?.durationSeconds)}</span>{caption&&<span>{caption}</span>}</small>
  </div>
 </footer>;
}

// Right aside: the recording's own details. Sound and language belong to the atoms.
export function RecordingDetails({recording,collections=[],onEdit}){
 if(!recording)return <aside className="recording-details-aside is-empty" aria-label="Recording details"><p>Select a recording to see its details.</p></aside>;
 const atoms=recording.atoms||[],stems=(recording.stems?.channels||[]).filter(channel=>channel?.name);
 const inCollections=collections.filter(collection=>(collection.recordingIds||[]).includes(recording.id)).map(collection=>collection.title);
 return <aside className="recording-details-aside" aria-label="Recording details">
  <header><span className="recordings-card-cover">{recording.coverImage?<img src={recording.coverImage} alt=""/>:<Disc3 size={40} aria-hidden="true"/>}</span>
   <div><h2>{recording.name}</h2><Status status={recording.status}/></div></header>
  {onEdit&&<button type="button" className="recording-details-edit" onClick={()=>onEdit(recording)}><Pencil size={15} aria-hidden="true"/>Open recording</button>}
  <dl>
   <dt>Name</dt><dd>{recording.name}</dd>
   <dt>Description</dt><dd>{recording.description||<span className="rec-empty">Not specified</span>}</dd>
   <dt>Work type</dt><dd>{recording.workTypeDefinition?.name||recording.workType||'Not specified'}</dd>
   <dt>Status</dt><dd><Status status={recording.status}/></dd>
   <dt>Collections</dt><dd><Lines empty="No collection" items={inCollections}/></dd>
   <dt>Release date</dt><dd>{recording.releaseDate?formatTime(recording.releaseDate):'Not specified'}</dd>
   <dt>Duration</dt><dd>{duration(recording)||'Unknown'}</dd>
   <dt>Stems</dt><dd>{stems.length?<ul className="rec-multi">{stems.map(stem=><li key={stem.name}>{stem.name}</li>)}</ul>:<span className="rec-empty">Not separated</span>}{recording.stems?.duration?<small className="recording-details-file">{Math.round(recording.stems.duration)} s{recording.stems.splitAt?` · split ${recording.stems.splitAt}`:''}</small>:null}</dd>
   <dt>Recording atoms</dt><dd>{atoms.length?<><span>{recording.atomCount??atoms.length}</span><ol className="recording-details-atoms">{atoms.map(atom=><li key={atom.id}><strong>{atom.name}</strong>{atom.releaseYear?<small>{atom.releaseYear}</small>:null}</li>)}</ol></>:<span className="rec-empty">No atoms</span>}</dd>
  </dl>
  {recording.audioUrl&&<MiniPlayer key={recording.id} recording={recording}/>}
 </aside>;
}
