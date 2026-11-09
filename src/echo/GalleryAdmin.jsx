import {useCallback,useEffect,useRef,useState} from 'react';
import {Film,Images,Image as ImageIcon,Play,Trash2,Upload,X,FolderOpen,FolderPlus,Pencil,Plus,Minus} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {addToGallery,fetchGallery,fetchGalleryAlbums,saveGalleryAlbum,deleteGalleryAlbum,addGalleryAlbumItems,removeGalleryAlbumItem,galleryItemsForAlbum,GALLERY_MAX_BYTES} from '../lib/galleryApi';
import {GalleryAlbumEditor,GalleryAssetEditor,GalleryExistingAssets} from './GalleryDialogs';
import './galleryAdmin.css';

const PLAYABLE=/\.(mp4|webm|mov|m4v|ogv)(\?|$)/i;
const isPlayable=url=>PLAYABLE.test(url)||/res\.cloudinary\.com\/[^/]+\/video\/upload/.test(url);
const clock=seconds=>seconds>0?`${Math.floor(seconds/60)}:${String(Math.round(seconds%60)).padStart(2,'0')}`:'';
const addInBatches=async(albumId,ids,token)=>{for(let start=0;start<ids.length;start+=500)await addGalleryAlbumItems(albumId,ids.slice(start,start+500),token);};

export default function GalleryAdmin({token}) {
  const [items,setItems]=useState([]),[albums,setAlbums]=useState([]),[albumId,setAlbumId]=useState('all');
  const [loading,setLoading]=useState(true),[error,setError]=useState(''),[albumSupported,setAlbumSupported]=useState(true);
  const [filter,setFilter]=useState('all'),[busy,setBusy]=useState(null),[dragging,setDragging]=useState(false),[preview,setPreview]=useState(null);
  const [albumEditor,setAlbumEditor]=useState(null),[assetEditor,setAssetEditor]=useState(null),[existingAlbum,setExistingAlbum]=useState(null);
  const [selected,setSelected]=useState([]),[targetAlbum,setTargetAlbum]=useState('');
  const picker=useRef(null),dialog=useRef(null),generation=useRef(0);
  const load=useCallback(async()=>{
    const version=++generation.current;
    try {
      const [assetsResult,albumsResult]=await Promise.allSettled([fetchGallery(undefined,{token}),fetchGalleryAlbums({token})]);
      if(version!==generation.current)return;
      if(assetsResult.status==='rejected')throw assetsResult.reason;
      const assets=assetsResult.value;
      setItems(assets);setSelected(ids=>ids.filter(id=>assets.some(item=>item.id===id)));
      setPreview(current=>current?assets.find(item=>item.id===current.id)||null:null);
      if(albumsResult.status==='rejected') {
        if(albumsResult.reason.status!==404)throw albumsResult.reason;
        setAlbums([]);setAlbumSupported(false);setAlbumId('all');
        setError('The backend album update must be deployed to enable albums. Your existing Gallery assets are available below.');
      } else {
        setAlbums(albumsResult.value);setAlbumSupported(true);setError('');
        setAlbumId(current=>['all','unfiled'].includes(current)||albumsResult.value.some(album=>album.id===current)?current:'all');
      }
    } catch(e){if(e.cancelled)return;if(version===generation.current)setError(e.message||'Could not load Gallery.');throw e;}
    finally{if(version===generation.current)setLoading(false);}
  },[token]);
  useEffect(()=>{const counter=generation;load().catch(()=>{});return()=>{counter.current++;};},[load]);
  useEffect(()=>{
    const node=dialog.current;if(!node)return;
    if(preview&&!node.open)node.showModal();else if(!preview&&node.open)node.close();
  },[preview]);
  const activeAlbum=albums.find(album=>album.id===albumId);
  const albumItems=galleryItemsForAlbum(items,albums,albumId);
  const shown=albumItems.filter(item=>filter==='all'||(filter==='images'?item.kind==='photo':item.kind==='video'));
  const unfiled=galleryItemsForAlbum(items,albums,'unfiled').length;
  const chooseAlbum=id=>{setAlbumId(id);setSelected([]);};
  const addFiles=async fileList=>{
    const files=[...fileList],problems=[];
    const ready=files.filter(file=>{
      if(!/^(image|video)\//.test(file.type)){problems.push(file.name+': choose an image or video.');return false;}
      if(file.size>GALLERY_MAX_BYTES){problems.push(file.name+': larger than 200 MB.');return false;}return true;
    });
    if(!ready.length){setError(problems.join(' ')||'Choose files to add.');return;}
    const destination=activeAlbum?.id;
    setBusy({done:0,total:ready.length});setError('');
    for(const [index,file] of ready.entries()) {
      try{await addToGallery(file,token,{albumId:destination});}catch(e){if(e.cancelled)return;problems.push(`${file.name}: ${e.message}`);}
      setBusy({done:index+1,total:ready.length});
    }
    try{await load();}catch(e){if(e.cancelled)return;problems.push(e.message);}
    setBusy(null);if(problems.length)setError(problems.join(' '));
  };
  const remove=async item=>{
    if(busy)return;
    setBusy({operation:'delete'});
    try{await apiRequest('/content/media/'+item.id,{method:'DELETE',token,deleteMessage:`Delete “${item.title}” from Gallery and all albums permanently?`});setPreview(null);await load();}
    catch(e){if(e.cancelled)return;setError(e.message||'Could not delete the asset.');}finally{setBusy(null);}
  };
  const saveAlbum=async draft=>{
    const result=await saveGalleryAlbum(draft,token);setAlbumId(result.item.id);setSelected([]);await load();setAlbumEditor(null);
  };
  const removeAlbum=async()=>{
    if(!activeAlbum||busy)return;
    setBusy({operation:'album-delete'});
    try{await deleteGalleryAlbum(activeAlbum.id,token);chooseAlbum('all');await load();}catch(e){if(e.cancelled)return;setError(e.message);}finally{setBusy(null);}
  };
  const saveAsset=async(item,draft)=>{
    try {
      await apiRequest('/content/media/'+item.id,{method:'PATCH',token,body:{title:draft.title.trim(),titleAr:draft.titleAr.trim(),isPublished:draft.isPublished}});
      for(const album of albums) {
        const before=album.itemIds.includes(item.id),after=draft.albumIds.includes(album.id);
        if(after&&!before)await addGalleryAlbumItems(album.id,[item.id],token);
        if(before&&!after)await removeGalleryAlbumItem(album.id,item.id,token);
      }
      await load();setAssetEditor(null);
    } catch(e){if(e.cancelled)return;await load().catch(()=>{});throw e;}
  };
  const bulkAdd=async()=>{
    if(!targetAlbum||!selected.length||busy)return;setBusy({operation:'assign'});
    try{await addInBatches(targetAlbum,selected,token);setSelected([]);await load();}catch(e){if(e.cancelled)return;setError(e.message);await load().catch(()=>{});setError(e.message);}finally{setBusy(null);}
  };
  const bulkRemove=async()=>{
    if(!activeAlbum||!selected.length||busy)return;setBusy({operation:'unassign'});
    try{for(const id of selected)await removeGalleryAlbumItem(activeAlbum.id,id,token);setSelected([]);await load();}catch(e){if(e.cancelled)return;await load().catch(()=>{});setError(e.message);}finally{setBusy(null);}
  };
  const editAsset=item=>{setPreview(null);setAssetEditor(item);};
  const memberAlbum=albums.find(album=>album.id===existingAlbum);
  return <section className="gallery-admin" aria-label="Gallery">
    <header className="gallery-head"><div className="gallery-actions">
      <div className="gallery-filter" role="group" aria-label="Filter assets">{[['all',`All ${albumItems.length}`],['images',`Images ${albumItems.filter(item=>item.kind==='photo').length}`],['videos',`Videos ${albumItems.filter(item=>item.kind==='video').length}`]].map(([id,label])=><button key={id} type="button" aria-pressed={filter===id} onClick={()=>{setFilter(id);setSelected([]);}}>{label}</button>)}</div>
      <button type="button" className="gallery-add" disabled={Boolean(busy)} onClick={()=>picker.current?.click()}><Upload size={15}/>{busy?.total?`Uploading ${busy.done}/${busy.total}…`:activeAlbum?'Upload to album':'Add assets'}</button>
      <input ref={picker} type="file" accept="image/*,video/*" multiple hidden onChange={event=>{addFiles(event.target.files);event.target.value='';}}/>
    </div></header>
    {error&&<p className="gallery-error" role="alert">{error}</p>}
    {busy?.operation&&<p className="gallery-operation" role="status">Updating Gallery…</p>}
    <div className="gallery-layout"><aside className="gallery-album-sidebar" aria-label="Gallery albums">
      <header><strong>Albums</strong><button type="button" disabled={Boolean(busy)||!albumSupported} onClick={()=>setAlbumEditor({})} aria-label="Create album" title="New album"><FolderPlus size={19}/></button></header>
      <nav>{[{id:'all',name:'All assets',count:items.length},{id:'unfiled',name:'Unfiled',count:unfiled},...albums].map(album=><button key={album.id} type="button" aria-current={albumId===album.id?'page':undefined} disabled={Boolean(busy)} onClick={()=>chooseAlbum(album.id)}>{album.coverUrl?<img src={album.coverUrl} alt=""/>:<FolderOpen size={19}/>}<span>{album.name}</span><b>{album.count}</b></button>)}</nav>
    </aside><div className="gallery-album-content">
      <div className="gallery-album-heading"><div><h2>{activeAlbum?.name||(albumId==='unfiled'?'Unfiled assets':'All assets')}</h2>{activeAlbum?.description&&<p>{activeAlbum.description}</p>}</div>
        {activeAlbum&&<div className="gallery-album-tools"><button type="button" disabled={Boolean(busy)} onClick={()=>setExistingAlbum(activeAlbum.id)}><Plus size={15}/>Add existing</button><button type="button" disabled={Boolean(busy)} onClick={()=>setAlbumEditor(activeAlbum)} aria-label="Edit album"><Pencil size={16}/></button><button type="button" disabled={Boolean(busy)} onClick={removeAlbum} aria-label="Delete album"><Trash2 size={16}/></button></div>}
      </div>
      {shown.length>0&&<div className="gallery-selection"><label className="gallery-check"><input type="checkbox" disabled={Boolean(busy)} checked={shown.every(item=>selected.includes(item.id))} onChange={e=>setSelected(e.target.checked?[...new Set([...selected,...shown.map(item=>item.id)])]:selected.filter(id=>!shown.some(item=>item.id===id)))}/>Select visible</label><span>{selected.length} selected</span>
        {!!selected.length&&<><select aria-label="Destination album" value={targetAlbum} disabled={Boolean(busy)} onChange={e=>setTargetAlbum(e.target.value)}><option value="">Add to album…</option>{albums.map(album=><option key={album.id} value={album.id}>{album.name}</option>)}</select><button type="button" disabled={Boolean(busy)||!albums.some(album=>album.id===targetAlbum)} onClick={bulkAdd}>Add to album</button>{activeAlbum&&<button type="button" disabled={Boolean(busy)} onClick={bulkRemove}><Minus size={14}/>Remove from album</button>}</>}
      </div>}
      <div className={`gallery-drop${dragging?' is-over':''}`} onDragOver={event=>{event.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)} onDrop={event=>{event.preventDefault();setDragging(false);if(event.dataTransfer.files.length&&!busy)addFiles(event.dataTransfer.files);}}>
        {loading?<p className="gallery-empty">Loading Gallery…</p>:shown.length?<ul className="gallery-grid">{shown.map(item=><li key={item.id} className={`gallery-tile${selected.includes(item.id)?' is-selected':''}`}>
          <label className="gallery-select-asset"><input type="checkbox" disabled={Boolean(busy)} aria-label={`Select ${item.title}`} checked={selected.includes(item.id)} onChange={e=>setSelected(e.target.checked?[...selected,item.id]:selected.filter(id=>id!==item.id))}/></label>
          <button type="button" className="gallery-open" onClick={()=>setPreview(item)} aria-label={`View ${item.title}`}>
            {item.kind==='photo'?<img src={item.mediaUrl} alt={item.title} loading="lazy"/>:isPlayable(item.mediaUrl)?<video src={`${item.mediaUrl}#t=0.1`} preload="metadata" muted playsInline/>:<span className="gallery-link-tile"><Film size={26}/></span>}
            {item.kind==='video'&&<span className="gallery-badge"><Play size={11} fill="currentColor"/>{clock(item.durationSec)||'Video'}</span>}
            {item.isPublished===false&&<span className="gallery-draft-badge">Hidden</span>}
          </button>
          <div className="gallery-meta"><span title={item.title}>{item.title}</span><button type="button" className="gallery-edit-asset" disabled={Boolean(busy)} onClick={()=>editAsset(item)} aria-label={`Edit ${item.title}`}><Pencil size={15}/></button><button type="button" className="gallery-delete" disabled={Boolean(busy)} onClick={()=>remove(item)} aria-label={`Delete ${item.title}`}><Trash2 size={14}/></button></div>
        </li>)}</ul>:<div className="gallery-empty"><Images size={34}/><strong>{activeAlbum?'This album is empty':items.length?'Nothing here':'No assets yet'}</strong><p>{activeAlbum?'Upload files or use Add existing to fill this album.':'Drop images or videos here, or use Add assets.'}</p></div>}
        <div className="gallery-drop-hint" aria-hidden="true"><Upload size={22}/>Drop to add</div>
      </div>
    </div></div>
    <dialog ref={dialog} className="gallery-viewer" onClose={()=>setPreview(null)} onClick={event=>{if(event.target===dialog.current)setPreview(null);}} aria-label={preview?.title||'Asset viewer'}>{preview&&<>
      <header><div><strong>{preview.title}</strong><small>{preview.kind==='photo'?'Image':'Video'}</small></div><div><button type="button" disabled={Boolean(busy)} onClick={()=>editAsset(preview)}><Pencil size={15}/>Edit</button><button type="button" className="gallery-delete is-text" disabled={Boolean(busy)} onClick={()=>remove(preview)}><Trash2 size={15}/>Delete</button><button type="button" className="gallery-close" onClick={()=>setPreview(null)} aria-label="Close viewer"><X size={18}/></button></div></header>
      <div className="gallery-stage">{preview.kind==='photo'?<img src={preview.mediaUrl} alt={preview.title}/>:isPlayable(preview.mediaUrl)?<video src={preview.mediaUrl} controls autoPlay playsInline/>:<a className="gallery-external" href={preview.mediaUrl} target="_blank" rel="noopener noreferrer"><ImageIcon size={20}/>Open video link</a>}</div>
    </>}</dialog>
    {albumEditor&&<GalleryAlbumEditor key={albumEditor.id||'new'} album={albumEditor.id?albumEditor:null} onSave={saveAlbum} onClose={()=>setAlbumEditor(null)}/>}
    {assetEditor&&<GalleryAssetEditor key={assetEditor.id} item={assetEditor} albums={albums} onSave={saveAsset} onClose={()=>setAssetEditor(null)}/>}
    {memberAlbum&&<GalleryExistingAssets album={memberAlbum} items={items} onClose={()=>setExistingAlbum(null)} onSave={async ids=>{try{await addInBatches(memberAlbum.id,ids,token);await load();setExistingAlbum(null);}catch(e){if(e.cancelled)return;await load().catch(()=>{});throw e;}}}/>}
  </section>;
}
