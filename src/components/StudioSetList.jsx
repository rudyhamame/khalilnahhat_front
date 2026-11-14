import {useEffect,useRef,useState} from 'react';
import {Plus,Pencil,Trash2,Play,Check,X,Download,RefreshCw} from 'lucide-react';
import {apiRequest} from '../lib/api';
import './studioSetList.css';
import {audioConversionPending,rawAudioDownloadUrl} from '../lib/rawSetListAudio';
const blank=()=>({track:'',artist:'',duration:'',genre:'',audioUrl:''});
const duration=seconds=>{const value=Math.max(0,Math.round(Number(seconds)||0));return `${Math.floor(value/60)}:${String(value%60).padStart(2,'0')}`;};
export default function StudioSetList({items=[],token,actions={}}){
 const {onAdd,onUpdate,onDelete,archiveItems=[]}=actions;
 const [editor,setEditor]=useState(null),[draft,setDraft]=useState(blank),[mode,setMode]=useState('recordings'),[selected,setSelected]=useState('');
 const [recordings,setRecordings]=useState([]),[loading,setLoading]=useState(false),[loadError,setLoadError]=useState(''),[retry,setRetry]=useState(0);
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const [now,setNow]=useState(Date.now);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),5000);return()=>clearInterval(timer);},[]);const lock=useRef(false);
 const refreshRef=useRef(actions.onRefresh);refreshRef.current=actions.onRefresh;
 const preparing=items.some(song=>audioConversionPending(song,now));
 useEffect(()=>{
  if(!preparing)return;
  const timer=setInterval(()=>{if(!document.hidden)void refreshRef.current?.().catch(()=>{});},2500);
  return()=>clearInterval(timer);
 },[preparing]);
 const planned=items.filter(song=>song.playState!=='played').slice().sort((a,b)=>Number(b.playState==='live')-Number(a.playState==='live')||Number(a.sortOrder||0)-Number(b.sortOrder||0));
 useEffect(()=>{
  if(editor!=='add'||mode!=='recordings'||!token)return;
  const controller=new AbortController();setLoading(true);setLoadError('');
  apiRequest('/admin/live-recordings',{token,signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setRecordings((result.items||[]).filter(item=>item.canPreview));}).catch(failure=>{if(!controller.signal.aborted)setLoadError(failure.message||'Recordings could not be loaded.');}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>controller.abort();
 },[editor,mode,token,retry]);
 const run=async work=>{if(lock.current)return false;lock.current=true;setBusy(true);setError('');try{await work();return true;}catch(failure){if(!failure.cancelled)setError(failure.message||'Could not save the set list.');return false;}finally{lock.current=false;setBusy(false);}};
 const close=()=>{setEditor(null);setError('');};
 const edit=song=>{setEditor(song.id);setDraft({track:song.track||'',artist:song.artist||'',duration:song.duration||'',genre:song.genre||'',audioUrl:song.audioUrl||''});setError('');};
 const add=()=>{setEditor('add');setDraft(blank());setMode('recordings');setSelected('');setError('');};
 const pick=value=>{
  setSelected(value);const [kind,id]=value.split(':');const item=(kind==='live'?recordings:archiveItems).find(item=>String(item.id)===id);
  if(!item){setDraft(blank());return;}
  if(kind==='live'){setDraft({...blank(),track:item.title||'Untitled live',duration:duration(item.whole?.selectedDurationSec??item.durationSec),sourcePlatform:'recording'});return;}
  const {id:_ignoredId,title,image,...metadata}=item;
  setDraft({...blank(),...metadata,track:title||'',coverImage:item.coverImage||image||'',playState:'queued'});
 };
 const save=async event=>{event.preventDefault();if(!draft.track.trim())return;
  const ok=await run(()=>editor==='add'?onAdd({...draft,track:draft.track.trim(),playState:'queued'}):onUpdate(editor,{...draft,track:draft.track.trim()}));if(ok)close();
 };
 const convert=song=>run(async()=>{await apiRequest('/live-requests/'+encodeURIComponent(song.requestExternalId)+'/to-wav',{method:'POST',token});await actions.onRefresh?.();});
 const playing=song=>run(async()=>{
  if(song.playState==='live'){await onUpdate(song.id,{playState:'queued'});return;}
  const previous=items.filter(item=>item.playState==='live'&&item.id!==song.id),changed=[];
  try{for(const item of previous){await onUpdate(item.id,{playState:'queued'});changed.push(item);}await onUpdate(song.id,{playState:'live'});}
  catch(failure){for(const item of changed){try{await onUpdate(item.id,{playState:'live'});}catch{/* The original failure remains visible; persisted changes arrive through the shared queue. */}}throw failure;}
 });
 return <aside className="admin-live-setlist-aside" aria-label="Set list">
  <div className="admin-request-section-head"><h3>Set list <span>{planned.length}</span></h3><button type="button" className="ssl-add" onClick={add} disabled={busy||!onAdd}><Plus size={14}/>Add</button></div>
  {error&&<p className="ssl-error" role="alert">{error}</p>}
  {editor!==null&&<form className="ssl-editor" onSubmit={save} aria-label={editor==='add'?'Add to set list':'Edit set list item'} aria-busy={busy}>
   <header><strong>{editor==='add'?'Add to set list':'Edit song'}</strong><button type="button" aria-label="Close song editor" onClick={close} disabled={busy}><X size={15}/></button></header>
   <fieldset disabled={busy}>
   {editor==='add'&&<><div className="ssl-modes" role="group" aria-label="Add song method"><button type="button" aria-pressed={mode==='recordings'} onClick={()=>{setMode('recordings');setDraft(blank());setSelected('');}}>From recordings</button><button type="button" aria-pressed={mode==='manual'} onClick={()=>{setMode('manual');setDraft(blank());setSelected('');}}>Add manually</button></div>
    {mode==='recordings'&&<><label>Choose a recording<select required value={selected} onChange={event=>pick(event.target.value)}><option value="">{loading?'Loading recordings…':'Choose a recording'}</option><optgroup label="Live recordings">{recordings.map(item=><option key={item.id} value={'live:'+item.id}>{item.title||'Untitled live'}{item.createdAt?' · '+new Date(item.createdAt).toLocaleDateString():''}</option>)}</optgroup><optgroup label="Music library">{archiveItems.map(item=><option key={item.id} value={'archive:'+item.id}>{item.title}{item.artist?' — '+item.artist:''}</option>)}</optgroup></select></label>{loadError&&<p className="ssl-error" role="status">{loadError} <button type="button" onClick={()=>setRetry(value=>value+1)}>Retry</button></p>}{!loading&&!loadError&&!recordings.length&&!archiveItems.length&&<p className="ssl-note">No recordings yet. You can add a song manually.</p>}</>}
   </>}
   <label>Song / title<input required maxLength={240} value={draft.track} onChange={event=>setDraft(value=>({...value,track:event.target.value}))}/></label>
   <label>Artist<input maxLength={240} value={draft.artist} onChange={event=>setDraft(value=>({...value,artist:event.target.value}))}/></label>
   <div className="ssl-fields"><label>Duration<input placeholder="3:45" pattern="[0-9]+:[0-5][0-9](:[0-5][0-9])?" title="Use minutes:seconds or hours:minutes:seconds" value={draft.duration} onChange={event=>setDraft(value=>({...value,duration:event.target.value}))}/></label><label>Genre<input value={draft.genre} onChange={event=>setDraft(value=>({...value,genre:event.target.value}))}/></label></div>
   {(editor!=='add'||mode==='manual')&&<label>Audio URL (optional)<input type="url" value={draft.audioUrl} onChange={event=>setDraft(value=>({...value,audioUrl:event.target.value}))}/></label>}
   <footer><button type="button" onClick={close}>Cancel</button><button type="submit" disabled={!draft.track.trim()||(editor==='add'&&mode==='recordings'&&!selected)}><Check size={14}/>{busy?'Saving…':editor==='add'?'Add to set list':'Save changes'}</button></footer>
   </fieldset>
  </form>}
  {!planned.length?<p className="admin-live-empty">No songs in the set list yet.</p>:<ol className="studio-setlist-songs">{planned.map((song,index)=><li key={song.id} className={song.playState==='live'?'is-current':undefined}>
   <div className="ssl-song"><span className="studio-setlist-position">{song.playState==='live'?'LIVE':String(index+1).padStart(2,'0')}</span><div><strong>{song.track}</strong><small>{song.artist||song.genre||'DJ Khalil'}</small></div>{song.duration&&<time>{song.duration}</time>}</div>
   {song.audioPreparation&&<p className={'ssl-audio-status is-'+song.audioPreparation} role="status">{song.audioPreparation==='raw'&&song.audioUrl?'Raw · Ready to download':audioConversionPending(song,now)?'Converting to raw WAV…':song.audioError||'Conversion interrupted. Retry to prepare the audio.'}</p>}
   <div className="ssl-actions">{rawAudioDownloadUrl(song)&&<a href={rawAudioDownloadUrl(song)} download target="_blank" rel="noopener noreferrer" aria-label={`Download audio: ${song.track}`}><Download size={12}/>{song.audioPreparation==='raw'?'Download raw WAV':'Download audio'}</a>}
   {song.sourcePlatform==='youtube'&&song.requestExternalId&&!song.audioUrl&&<button type="button" disabled={busy||audioConversionPending(song,now)} onClick={()=>void convert(song)}><RefreshCw size={12}/>{audioConversionPending(song,now)?'Converting…':song.audioPreparation?'Retry conversion':'Convert to raw WAV'}</button>}
   <button type="button" disabled={busy||!onUpdate} aria-pressed={song.playState==='live'} onClick={()=>void playing(song)} aria-label={`Is playing: ${song.track}`}><Play size={12}/>{song.playState==='live'?'Playing':'Is playing'}</button><button type="button" disabled={busy||!onUpdate} onClick={()=>edit(song)} aria-label={`Edit ${song.track}`}><Pencil size={12}/>Edit</button><button type="button" disabled={busy||!onDelete} onClick={()=>void run(()=>onDelete(song.id))} aria-label={`Delete ${song.track}`}><Trash2 size={12}/>Delete</button></div>
  </li>)}</ol>}
 </aside>;
}
