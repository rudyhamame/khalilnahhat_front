import {useEffect,useRef,useState} from 'react';
import {X,Film} from 'lucide-react';

function GalleryDialog({title,onClose,busy,children}) {
  const ref=useRef(null);
  useEffect(()=>{const node=ref.current;const previous=document.activeElement;node.showModal();return()=>{node.close();previous?.focus();};},[]);
  return <dialog ref={ref} className="gallery-editor" aria-label={title}
    onCancel={event=>{event.preventDefault();if(!busy)onClose();}}
    onClick={event=>{if(event.target===ref.current&&!busy)onClose();}}>
    <header><h3>{title}</h3><button type="button" disabled={busy} onClick={onClose} aria-label="Close"><X size={18}/></button></header>{children}
  </dialog>;
}

export function GalleryAlbumEditor({album,onSave,onClose}) {
  const [draft,setDraft]=useState({name:album?.name||'',nameAr:album?.nameAr||'',description:album?.description||''});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const submit=async event=>{event.preventDefault();setBusy(true);setError('');try{await onSave({...draft,id:album?.id});}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <GalleryDialog title={album?'Edit album':'New album'} onClose={onClose} busy={busy}>
    <form onSubmit={submit}>{error&&<p className="gallery-error" role="alert">{error}</p>}<fieldset disabled={busy}>
      <label>Album name<input autoFocus required maxLength={100} value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})}/></label>
      <label>Arabic name · optional<input dir="auto" maxLength={100} value={draft.nameAr} onChange={e=>setDraft({...draft,nameAr:e.target.value})}/></label>
      <label>Description<textarea rows={3} maxLength={1000} value={draft.description} onChange={e=>setDraft({...draft,description:e.target.value})}/></label>
    </fieldset><footer><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" disabled={busy||!draft.name.trim()}>{busy?'Saving…':'Save album'}</button></footer></form>
  </GalleryDialog>;
}

export function GalleryAssetEditor({item,albums,onSave,onClose}) {
  const [draft,setDraft]=useState({title:item.title,titleAr:item.titleAr||'',isPublished:item.isPublished!==false,
    albumIds:albums.filter(album=>album.itemIds.includes(item.id)).map(album=>album.id)});
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const submit=async event=>{event.preventDefault();setBusy(true);setError('');try{await onSave(item,draft);}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <GalleryDialog title="Edit Gallery asset" onClose={onClose} busy={busy}>
    <form className="gae" onSubmit={submit}>{error&&<p className="gallery-error" role="alert">{error}</p>}<fieldset disabled={busy}>
      <div className="gae-body">
        <figure className="gae-preview">{item.kind==='photo'?<img src={item.mediaUrl} alt=""/>:<Film size={34} aria-hidden="true"/>}<figcaption>{item.kind==='photo'?'Image':'Video'}</figcaption></figure>
        <div className="gae-fields">
          <label className="gae-field"><span>Title</span><input autoFocus required maxLength={160} value={draft.title} onChange={e=>setDraft({...draft,title:e.target.value})}/></label>
          <label className="gae-field"><span>Arabic title <em>optional</em></span><input dir="auto" maxLength={160} value={draft.titleAr} onChange={e=>setDraft({...draft,titleAr:e.target.value})}/></label>
          <label className="gae-switch"><span><b>Visible in the public Gallery</b><small>{draft.isPublished?'Clients can see this asset.':'Hidden: only you see it here.'}</small></span><input type="checkbox" role="switch" checked={draft.isPublished} onChange={e=>setDraft({...draft,isPublished:e.target.checked})}/><i aria-hidden="true"/></label>
        </div>
      </div>
      <section className="gae-albums" aria-label="Albums"><h4>Albums</h4>{albums.length?<div className="gae-chips">{albums.map(album=><label className="gae-chip" key={album.id}><input type="checkbox" checked={draft.albumIds.includes(album.id)} onChange={e=>setDraft({...draft,albumIds:e.target.checked?[...draft.albumIds,album.id]:draft.albumIds.filter(id=>id!==album.id)})}/><span>{album.name}</span></label>)}</div>:<p>No albums yet. Create one in Gallery.</p>}</section>
    </fieldset><footer><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" disabled={busy||!draft.title.trim()}>{busy?'Saving…':'Save asset'}</button></footer></form>
  </GalleryDialog>;
}

export function GalleryExistingAssets({album,items,onSave,onClose}) {
  const [selected,setSelected]=useState([]),[search,setSearch]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const available=items.filter(item=>!album.itemIds.includes(item.id)&&String(item.title||'').toLowerCase().includes(search.toLowerCase()));
  const submit=async event=>{event.preventDefault();setBusy(true);setError('');try{await onSave(selected);}catch(e){setError(e.message);}finally{setBusy(false);}};
  return <GalleryDialog title={'Add existing assets to '+album.name} busy={busy} onClose={onClose}>
    <form onSubmit={submit}>{error&&<p className="gallery-error" role="alert">{error}</p>}<fieldset disabled={busy}>
      <label>Find an asset<input autoFocus type="search" value={search} onChange={e=>setSearch(e.target.value)}/></label>
      <div className="gallery-existing-grid">{available.map(item=><label key={item.id} className={selected.includes(item.id)?'is-selected':''}><input type="checkbox" checked={selected.includes(item.id)} onChange={e=>setSelected(e.target.checked?[...selected,item.id]:selected.filter(id=>id!==item.id))}/>{item.kind==='photo'?<img src={item.mediaUrl} alt="" loading="lazy"/>:<Film size={26}/>}<span>{item.title}</span></label>)}{!available.length&&<p>No matching assets to add.</p>}</div>
    </fieldset><footer><button type="button" disabled={busy} onClick={onClose}>Cancel</button><button type="submit" disabled={busy||!selected.length}>{busy?'Adding…':`Add ${selected.length} selected`}</button></footer></form>
  </GalleryDialog>;
}
