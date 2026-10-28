import {useCallback,useEffect,useMemo,useState} from 'react';
import {ArrowDown,ArrowUp,Eye,EyeOff,Layers,Plus,Search,Trash2,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {announceMusicArchiveChange} from '../lib/musicOntology';
import OntologyMediaUpload from './OntologyMediaUpload';
import './collectionBuilder.css';

const blank=()=>({id:'',title:'',description:'',published:false,coverImage:'',recordingIds:[]});
const fromApi=c=>({id:c.id,title:c.title||'',description:c.description||'',published:c.published!==false,coverImage:c.storedCoverImage||'',previewCover:c.coverImage||'',recordingIds:c.recordingIds||[]});
const move=(list,i,d)=>{const j=i+d;if(j<0||j>=list.length)return list;const next=[...list];[next[i],next[j]]=[next[j],next[i]];return next;};

// Khalil hand-builds every Collection: pick recordings, order them, add a cover, then publish.
export default function CollectionBuilder({token,recordings}){
 const [collections,setCollections]=useState([]),[draft,setDraft]=useState(null),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const byId=useMemo(()=>new Map(recordings.map(r=>[r.id,r])),[recordings]);
 const load=useCallback(async()=>{const data=await apiRequest('/admin/music-archive',{token});setCollections(data.collections||[]);},[token]);
 useEffect(()=>{load().catch(e=>setError(e.message));},[load]);
 const run=async fn=>{setBusy(true);setError('');setNotice('');try{await fn();await load();announceMusicArchiveChange();}catch(e){setError(e.message);}finally{setBusy(false);}};
 const save=()=>run(async()=>{
  const body={title:draft.title.trim(),description:draft.description,published:draft.published,coverImage:draft.coverImage,recordingIds:draft.recordingIds};
  const {item}=await apiRequest(`/admin/music-archive/collections${draft.id?`/${encodeURIComponent(draft.id)}`:''}`,{token,method:draft.id?'PATCH':'POST',body});
  setDraft(d=>({...d,id:item.id}));setNotice('Collection saved.');});
 const remove=()=>{if(draft.id&&window.confirm(`Delete the collection “${draft.title}”? The recordings themselves are kept.`))run(async()=>{await apiRequest(`/admin/music-archive/collections/${encodeURIComponent(draft.id)}`,{token,method:'DELETE'});setDraft(null);setNotice('Collection deleted.');});};
 const reorder=(i,d)=>{const ids=move(collections.map(c=>c.id),i,d);run(()=>apiRequest('/admin/music-archive/collections/order',{token,method:'PUT',body:{ids}}));};
 const set=(key,value)=>setDraft(d=>({...d,[key]:value}));
 const add=id=>setDraft(d=>d.recordingIds.includes(id)?d:{...d,recordingIds:[...d.recordingIds,id]});
 const q=query.trim().toLocaleLowerCase();
 const pool=draft?recordings.filter(r=>!draft.recordingIds.includes(r.id)&&(!q||[r.title,r.artist,r.work?.title].some(v=>String(v||'').toLocaleLowerCase().includes(q)))):[];
 const row=(r,id,actions)=><li key={id}>{r?.coverImage?<img src={r.coverImage} alt="" loading="lazy"/>:<span className="cb-art" aria-hidden="true">♫</span>}<span><strong>{r?.title||'Missing recording'}</strong><small>{r?.artist||id}</small></span>{actions}</li>;
 return <div className="cb">
  <aside className="cb-list" aria-label="Collections"><header><div><small>{collections.length} {collections.length===1?'collection':'collections'}</small><h2>Collections</h2></div><button type="button" className="cb-icon" aria-label="New collection" title="New collection" disabled={busy} onClick={()=>{setDraft(blank());setError('');setNotice('');}}><Plus size={18}/></button></header>
   <ol>{collections.map((c,i)=><li key={c.id} className={draft?.id===c.id?'is-current':''}><button type="button" className="cb-pick" onClick={()=>{setDraft(fromApi(c));setError('');setNotice('');}}>{c.coverImage?<img src={c.coverImage} alt="" loading="lazy"/>:<span className="cb-art" aria-hidden="true"><Layers size={16}/></span>}<span><strong>{c.title}</strong><small>{c.recordingIds.length} recordings · {c.published?'Published':'Draft'}</small></span></button>
    <span className="cb-move"><button type="button" aria-label={`Move ${c.title} up`} disabled={busy||i===0} onClick={()=>reorder(i,-1)}><ArrowUp size={14}/></button><button type="button" aria-label={`Move ${c.title} down`} disabled={busy||i===collections.length-1} onClick={()=>reorder(i,1)}><ArrowDown size={14}/></button></span></li>)}</ol>
   {!collections.length&&<p className="cb-empty">No collections yet. Press + to build the first one.</p>}
  </aside>
  {!draft?<div className="cb-placeholder"><Layers size={34} aria-hidden="true"/><h2>Collection Builder</h2><p>Select a collection, or press + to hand-pick a new set of recordings.</p></div>:<section className="cb-editor" aria-label="Collection editor">
    <aside className="cb-add" aria-label="Add recordings"><h3>Add recordings <span>{pool.length}</span></h3><label className="cb-search"><Search size={14} aria-hidden="true"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search recordings" aria-label="Search recordings to add"/></label>
     <ol className="cb-tracks">{pool.map(r=>row(r,r.id,<button type="button" className="cb-icon" aria-label={`Add ${r.title}`} onClick={()=>add(r.id)}><Plus size={15}/></button>))}</ol>{!pool.length&&<p className="cb-empty">{q?'No recordings match.':'Every recording is already in this collection.'}</p>}</aside>
   <div className="cb-main">
   <header><div><small>{draft.id?'EDIT COLLECTION':'NEW COLLECTION'}</small><h2>{draft.title||'Untitled collection'}</h2></div>
    <div className="cb-actions"><button type="button" className="cb-toggle" aria-pressed={draft.published} onClick={()=>set('published',!draft.published)}>{draft.published?<Eye size={15}/>:<EyeOff size={15}/>}{draft.published?'Published':'Draft'}</button>{draft.id&&<button type="button" className="cb-icon" aria-label="Delete collection" title="Delete collection" disabled={busy} onClick={remove}><Trash2 size={16}/></button>}<button type="button" className="cb-save" disabled={busy||!draft.title.trim()} onClick={save}>{busy?'Saving…':'Save collection'}</button></div></header>
   {error&&<p role="alert" className="cb-alert">{error}</p>}{notice&&<p role="status" className="cb-notice">{notice}</p>}
   <div className="cb-fields"><label>Title<input value={draft.title} maxLength={240} onChange={e=>set('title',e.target.value)} placeholder="Wedding entrances"/></label><label>Description<textarea rows={2} value={draft.description} maxLength={4000} onChange={e=>set('description',e.target.value)} placeholder="What ties these recordings together?"/></label>
    <div className="cb-cover">{(draft.previewCover||draft.coverImage)&&<img src={draft.previewCover||draft.coverImage} alt="Collection cover"/>}<OntologyMediaUpload artwork token={token} value={draft.coverImage} onUploaded={r=>setDraft(d=>({...d,coverImage:r.url,previewCover:r.previewUrl||r.url}))}/></div></div>
   <div className="cb-columns">
    <div className="cb-pane"><h3>In this collection <span>{draft.recordingIds.length}</span></h3>
     {draft.recordingIds.length?<ol className="cb-tracks">{draft.recordingIds.map((id,i)=>row(byId.get(id),id,<span className="cb-move"><b>{i+1}</b><button type="button" aria-label="Move up" disabled={i===0} onClick={()=>set('recordingIds',move(draft.recordingIds,i,-1))}><ArrowUp size={14}/></button><button type="button" aria-label="Move down" disabled={i===draft.recordingIds.length-1} onClick={()=>set('recordingIds',move(draft.recordingIds,i,1))}><ArrowDown size={14}/></button><button type="button" aria-label="Remove from collection" onClick={()=>set('recordingIds',draft.recordingIds.filter(x=>x!==id))}><X size={14}/></button></span>))}</ol>:<p className="cb-empty">Nothing here yet. Add recordings from the right.</p>}</div>
   </div>
   </div>
  </section>}
 </div>;
}
