import {useCallback,useEffect,useState} from 'react';
import {Check,Pencil,Plus,Trash2,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {notifyCatalogChanged} from '../lib/catalogChanges';
import {adminToast} from './adminToast';
// The card looks and behaves like the Work Elements and Pricing settings cards, so it shares their styles.
import '../echo/workElementsAdmin.css';

// Settings of Services & Equipments: the Rental Equipment categories that group the rental equipment. They feed the "Rental Equipment Category"
// column and the equipment editor. Only DJ Khalil Nahhat and MC host are services; nothing else is added as a service.
export default function RentalCategorySettings({token,onChanged}){
  const [items,setItems]=useState(null),[name,setName]=useState(''),[editing,setEditing]=useState(null),[busy,setBusy]=useState(false);
  const load=useCallback(()=>apiRequest('/admin/rental-categories',{token}).then(data=>setItems(data.items||[])).catch(error=>{if(!error.cancelled)adminToast(error.message||'Could not load the categories.',true);}),[token]);
  useEffect(()=>{load();},[load]);
  const send=async(path,options)=>{
    setBusy(true);
    try{const data=await apiRequest(path,{token,...options});setItems(data.items||(await apiRequest('/admin/rental-categories',{token})).items||[]);notifyCatalogChanged();onChanged?.();return true;}
    catch(error){if(!error.cancelled)adminToast(error.message||'Could not save.',true);return false;}
    finally{setBusy(false);}
  };
  const clear=()=>{setEditing(null);setName('');};
  const submit=async event=>{
    event.preventDefault();
    const value=name.trim();if(!value)return;
    const done=editing?await send(`/admin/rental-categories/${encodeURIComponent(editing.id)}`,{method:'PUT',body:{name:value,nameAr:editing.nameAr||''}}):await send('/admin/rental-categories',{method:'POST',body:{name:value,nameAr:''}});
    if(done)clear();
  };
  const remove=item=>{if(window.confirm(`Delete the category “${item.name}”?`))send(`/admin/rental-categories/${encodeURIComponent(item.id)}`,{method:'DELETE'});};
  const title='Rental Equipment Category';
  return <div className="work-elements-admin pe-settings" aria-label="Settings">
    <div className="work-elements-grid">
      <article className="work-element-card" aria-labelledby="rental-categories">
        <header><h2 id="rental-categories">Rental Equipment Categories</h2><span>{items?.length??0}</span></header>
        <form onSubmit={submit}>
          <div className="work-element-entry">
            <input value={name} onChange={event=>setName(event.target.value)} aria-label={`${title} name`} placeholder={`${title} name`} maxLength={160} disabled={busy}/>
            <button type="submit" className="work-element-action work-element-submit" disabled={busy||!name.trim()} aria-label={editing?`Save ${title}`:`Add ${title}`} title={editing?'Save':'Add'}>{editing?<Check size={18} strokeWidth={2.2}/>:<Plus size={18} strokeWidth={2.2}/>}<span>{editing?'Save':'Add'}</span></button>
            {editing&&<button type="button" className="work-element-action" title="Cancel editing" aria-label="Cancel editing" onClick={clear} disabled={busy}><X size={18} strokeWidth={2.2}/></button>}
          </div>
        </form>
        <p className="work-element-source">What groups the rental equipment. Only DJ Khalil Nahhat and MC host are services; add a category here instead.</p>
        <ul>{(items||[]).map(item=><li key={item.id} className={editing?.id===item.id?'is-editing':undefined}>
          <span><strong>{item.name}</strong><span className="work-element-language-tags"><small>{item.equipmentCount} item{item.equipmentCount===1?'':'s'}</small></span></span>
          <div><button type="button" className="work-element-action is-edit" title={`Rename ${item.name}`} aria-label={`Rename ${item.name}`} disabled={busy} onClick={()=>{setEditing(item);setName(item.name);}}><Pencil size={16}/></button>
            <button type="button" className="work-element-action is-delete" title={item.equipmentCount?'Move its equipment first':`Delete ${item.name}`} aria-label={`Delete ${item.name}`} disabled={busy||item.equipmentCount>0} onClick={()=>remove(item)}><Trash2 size={16}/></button></div>
        </li>)}</ul>
        {items&&!items.length&&<p className="work-element-empty">No categories yet. Add one above.</p>}
      </article>
    </div>
  </div>;
}
