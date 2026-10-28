import {useEffect,useRef,useState} from 'react';
import {TreePine,Save,RefreshCw,Music2} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {fetchMusicArchiveCatalog} from '../lib/musicArchiveCatalog';
import {announceSeasonalTheme} from './seasonalTheme';
import {DEFAULT_SEASONAL_AUDIO} from './seasonalMusic';
import SeasonalTree from './SeasonalTree';
import './seasonalThemeAdmin.css';
export default function SeasonalThemeAdmin({token}){
 const [saved,setSaved]=useState(null),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [recordings,setRecordings]=useState([]),[archiveError,setArchiveError]=useState(''),[query,setQuery]=useState('');
 const preview=useRef(null),previewGeneration=useRef(0);
 const [previewState,setPreviewState]=useState({track:null,playing:false,enabled:true,error:''});
 const loadArchive=()=>{setArchiveError('');return fetchMusicArchiveCatalog({refresh:true}).then(({songs})=>setRecordings(songs.filter(song=>song.audioUrl&&song.published!==false))).catch(()=>setArchiveError('Could not load the Music Archive. Try refreshing the list.'));};
 useEffect(()=>{let alive=true;const element=preview.current;fetchMusicArchiveCatalog().then(({songs})=>{if(alive)setRecordings(songs.filter(song=>song.audioUrl&&song.published!==false));}).catch(()=>{if(alive)setArchiveError('Could not load the Music Archive. Try refreshing the list.');});return()=>{alive=false;element?.pause();};},[]);
 const playPreview=track=>{const element=preview.current;if(!element)return;const generation=++previewGeneration.current;if(previewState.track?.id===track.id&&!element.paused){element.pause();return;}if(previewState.track?.id!==track.id)element.src=track.audioUrl;setPreviewState({track,playing:false,enabled:true,error:''});element.play().catch(()=>{if(previewGeneration.current===generation)setPreviewState(current=>({...current,playing:false,error:'Could not play this recording. Try another track.'}));});};
 const normalize=item=>({...item,audio:{...DEFAULT_SEASONAL_AUDIO,...item.audio}});
 const load=()=>{setBusy(true);setError('');setNotice('');return apiRequest('/seasonal-theme').then(({item})=>{setSaved(normalize(item));setDraft(normalize(item));}).catch(e=>setError(e.message)).finally(()=>setBusy(false));};
 useEffect(()=>{let alive=true;apiRequest('/seasonal-theme').then(({item})=>{if(alive){setSaved(normalize(item));setDraft(normalize(item));}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
 const save=async event=>{event.preventDefault();setBusy(true);setError('');setNotice('');try{const {item}=await apiRequest('/seasonal-theme',{method:'PUT',token,body:draft});setSaved(normalize(item));setDraft(normalize(item));announceSeasonalTheme(item);setNotice(item.enabled?'Christmas theme saved. Visitors see the memory tree in VP1.':'Regular theme restored. Visitors see the review and photo carousels.');}catch(e){setError(e.message);}finally{setBusy(false);}};
 const change=(key,value)=>{setNotice('');setDraft(current=>({...current,[key]:value}));};
 const changeAudio=(key,value)=>{setNotice('');setDraft(current=>({...current,audio:{...current.audio,[key]:value}}));preview.current?.pause();};
 const selectedIds=draft?.audio?.archiveIds||[];
 const validSelection=Boolean(!draft?.audio?.enabled||selectedIds.length);
 const dirty=draft&&JSON.stringify(saved)!==JSON.stringify(draft);
 return <section className="seasonal-admin" aria-labelledby="seasonal-admin-title">
  <header><span><TreePine size={20}/>WEBSITE / SEASONS</span><h1 id="seasonal-admin-title">A little seasonal magic.</h1><p>Turn VP1 into a Christmas memory tree. Your reviews and gallery photos become clickable decorations.</p></header>
  {error&&<p role="alert" className="seasonal-admin-error">{error} <button type="button" onClick={load} disabled={busy}><RefreshCw size={14}/>Reload settings</button></p>}
  {notice&&<p role="status" className="seasonal-admin-success">{notice}</p>}
  {!draft&&!error&&<p role="status">Loading seasonal theme…</p>}
  {draft&&<div className="seasonal-admin-grid"><form onSubmit={save}>
   <fieldset disabled={busy}><legend>Christmas memory tree</legend><label className="seasonal-admin-toggle"><span><strong>Enable Christmas theme</strong><small>Replaces the two VP1 carousels with the tree. Turning it off restores them.</small></span><input type="checkbox" checked={draft.enabled} onChange={e=>change('enabled',e.target.checked)}/></label>
   <label className="seasonal-admin-toggle"><span><strong>Warm fairy lights</strong><small>Soft gold lights among the branches.</small></span><input type="checkbox" checked={draft.lights} onChange={e=>change('lights',e.target.checked)}/></label>
   <label className="seasonal-admin-toggle"><span><strong>Global snowfall</strong><small>Snow across every page while the Christmas theme is enabled. Applies after saving and respects reduced-motion settings.</small></span><input type="checkbox" checked={draft.snow} onChange={e=>change('snow',e.target.checked)}/></label></fieldset>
   <fieldset className="seasonal-audio-settings" disabled={busy}><legend><Music2 size={18}/> Christmas audio</legend>
    <label className="seasonal-admin-toggle"><span><strong>Music buttons on the tree</strong><small>Visitors click a decoration to play or pause. Audio never starts automatically.</small></span><input type="checkbox" checked={draft.audio.enabled} onChange={e=>changeAudio('enabled',e.target.checked)}/></label>
    <div className="seasonal-archive-heading"><strong>Choose recordings · {selectedIds.length} / 3</strong><button type="button" onClick={loadArchive}><RefreshCw size={14}/>Refresh archive</button></div>
    <label className="seasonal-archive-search">Search the Music Archive<input type="search" placeholder="Title or artist…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
    {archiveError&&<p role="alert">{archiveError}</p>}
    <div className="seasonal-archive-list">{recordings.filter(track=>`${track.title} ${track.artist||''}`.toLowerCase().includes(query.toLowerCase())).map(track=><label key={track.id}><input type="checkbox" checked={selectedIds.includes(track.id)} disabled={!selectedIds.includes(track.id)&&selectedIds.length>=3} onChange={e=>changeAudio('archiveIds',e.target.checked?[...selectedIds,track.id]:selectedIds.filter(id=>id!==track.id))}/><span><strong>{track.title}</strong><small>{track.artist||'DJ Khalil'}{track.duration?` · ${track.duration}`:''}</small></span><button type="button" onClick={e=>{e.preventDefault();playPreview(track);}} aria-label={`Preview ${track.title}`}>{previewState.track?.id===track.id&&previewState.playing?'Pause':'Listen'}</button></label>)}</div>
    {!recordings.length&&!archiveError&&<p>No published audio recordings yet. Publish a recording in <a href="/admin/archive">Music Archive</a> to use it here.</p>}
    {selectedIds.filter(id=>!recordings.some(track=>track.id===id)).map(id=><p key={id}>A selected recording is no longer published. <button type="button" onClick={()=>changeAudio('archiveIds',selectedIds.filter(value=>value!==id))}>Remove unavailable recording</button></p>)}
    {!validSelection&&<p role="status">Choose at least one recording before enabling Christmas audio.</p>}
    <audio ref={preview} preload="none" onTimeUpdate={event=>setPreviewState(current=>({...current,position:event.currentTarget.currentTime}))} onLoadedMetadata={event=>setPreviewState(current=>({...current,duration:event.currentTarget.duration}))} onPlaying={()=>setPreviewState(current=>({...current,playing:true,error:''}))} onPause={()=>setPreviewState(current=>({...current,playing:false}))} onEnded={()=>setPreviewState(current=>({...current,playing:false}))} onError={()=>setPreviewState(current=>({...current,playing:false,error:'This recording could not be played.'}))}/>
    {previewState.error&&<p role="status">{previewState.error}</p>}
   </fieldset>
   <p className="seasonal-admin-note">Decorations use published Testimonials and Media library photos. Preview examples stay labelled as examples.</p>
   <button type="submit" className="seasonal-admin-save" disabled={busy||!dirty||!validSelection}><Save size={17}/>{busy?'Saving…':'Save theme'}</button>
  </form><aside className="seasonal-admin-preview"><header><strong>Tree preview</strong><span>{dirty?'Unsaved preview':'Saved settings'}</span></header><SeasonalTree lights={draft.lights} audio={draft.audio} audioState={previewState} onAudioPlay={playPreview} onAudioSeek={value=>{if(preview.current)preview.current.currentTime=value;}}/></aside></div>}
 </section>;
}
