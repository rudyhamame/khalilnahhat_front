import {useCallback,useEffect,useState} from 'react';
import {Check,Pencil,Plus,Trash2,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {notifyCatalogChanged} from '../lib/catalogChanges';
import {adminToast} from './adminToast';

// Settings of Services & Equipments: the Rental Equipment categories that group the rental equipment. They feed the "Rental Equipment Category"
// column and the equipment editor. Only DJ Khalil Nahhat and MC host are services; nothing else is added as a service.
export default function RentalCategorySettings({token,onChanged}){
  const [items,setItems]=useState(null),[name,setName]=useState(''),[nameAr,setNameAr]=useState(''),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false);
  const load=useCallback(()=>apiRequest('/admin/rental-categories',{token}).then(data=>setItems(data.items||[])).catch(error=>{if(!error.cancelled)adminToast(error.message||'Could not load the categories.',true);}),[token]);
  useEffect(()=>{load();},[load]);
  const send=async(path,options,done)=>{
    setBusy(true);
    try{const data=await apiRequest(path,{token,...options});setItems(data.items||(await apiRequest('/admin/rental-categories',{token})).items||[]);done?.();notifyCatalogChanged();onChanged?.();return true;}
    catch(error){if(!error.cancelled)adminToast(error.message||'Could not save.',true);return false;}
    finally{setBusy(false);}
  };
  const add=event=>{event.preventDefault();if(name.trim())send('/admin/rental-categories',{method:'POST',body:{name:name.trim(),nameAr:nameAr.trim()}},()=>{setName('');setNameAr('');});};
  const save=item=>send(`/admin/rental-categories/${encodeURIComponent(item.id)}`,{method:'PUT',body:{name:editing.name.trim(),nameAr:editing.nameAr.trim()}},()=>setEditing(null));
  const remove=item=>{if(window.confirm(`Delete the category “${item.name}”?`))send(`/admin/rental-categories/${encodeURIComponent(item.id)}`,{method:'DELETE'});};
  return <section className="cat-settings" aria-label="Settings">
    <article className="cat-settings-card" aria-labelledby="rec-title">
      <header><h3 id="rec-title">Rental Equipment Categories</h3><p>These group the rental equipment. Only DJ Khalil Nahhat and MC host are services; add a category here instead of a service.</p></header>
      <form className="cat-settings-add" onSubmit={add}>
        <input value={name} onChange={event=>setName(event.target.value)} placeholder="Category name" aria-label="Category name" maxLength={160} required/>
        <input value={nameAr} onChange={event=>setNameAr(event.target.value)} placeholder="Arabic name (optional)" aria-label="Arabic name" maxLength={160} dir="rtl"/>
        <button type="submit" className="cat-btn is-primary" disabled={busy||!name.trim()}><Plus size={15}/>Add category</button>
      </form>
      {items===null?<p className="cat-empty">Loading…</p>:items.length===0?<p className="cat-empty">No categories yet.</p>:<ul className="cat-settings-list">{items.map(item=><li key={item.id}>
        {editing?.id===item.id
          ?<><input value={editing.name} onChange={event=>setEditing({...editing,name:event.target.value})} aria-label="Category name" maxLength={160} autoFocus/><input value={editing.nameAr} onChange={event=>setEditing({...editing,nameAr:event.target.value})} aria-label="Arabic name" maxLength={160} dir="rtl"/>
            <span className="cat-settings-actions"><button type="button" className="cat-svc-act" aria-label="Save" title="Save" disabled={busy||!editing.name.trim()} onClick={()=>save(item)}><Check size={15}/></button><button type="button" className="cat-svc-act" aria-label="Cancel" title="Cancel" onClick={()=>setEditing(null)}><X size={15}/></button></span></>
          :<><span className="cat-settings-name"><strong>{item.name}</strong>{item.nameAr&&<small dir="rtl">{item.nameAr}</small>}</span><span className="cat-settings-count">{item.equipmentCount} item{item.equipmentCount===1?'':'s'}</span>
            <span className="cat-settings-actions"><button type="button" className="cat-svc-act" aria-label={`Rename ${item.name}`} title="Rename" disabled={busy} onClick={()=>setEditing({id:item.id,name:item.name,nameAr:item.nameAr})}><Pencil size={15}/></button><button type="button" className="cat-svc-act is-danger" aria-label={`Delete ${item.name}`} title={item.equipmentCount?'Move its equipment first':'Delete'} disabled={busy||item.equipmentCount>0} onClick={()=>remove(item)}><Trash2 size={15}/></button></span></>}
      </li>)}</ul>}
    </article>
  </section>;
}
