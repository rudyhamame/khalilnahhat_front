import {useCallback,useEffect,useRef,useState} from 'react';
import {Plus,Search,Sparkles,SquarePen,Trash2,Check,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {confirmDeletion} from '../lib/confirmDeletion';

export default function EidosAside({token,items,onItems,selectedId,onSelect,onClear}){
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[query,setQuery]=useState('');
 const [editor,setEditor]=useState(null),[fourthGoal,setFourthGoal]=useState(''),[saveError,setSaveError]=useState('');
 const onItemsRef=useRef(onItems),itemsRef=useRef(items),dialog=useRef(null),field=useRef(null);
 onItemsRef.current=onItems;itemsRef.current=items;
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{const {items}=await apiRequest('/admin/eden/eidos',{token});onItemsRef.current(items||[]);}
  catch(failure){setError(failure.message||'Eidos could not be loaded.');}
  finally{setLoading(false);}
 },[token]);
 useEffect(()=>{load();},[load]);
 useEffect(()=>{
  if(editor){if(!dialog.current.open)dialog.current.showModal();field.current?.focus();}
  else if(dialog.current.open)dialog.current.close();
 },[editor]);
 const openEditor=item=>{setFourthGoal(item?.fourthGoal||'');setSaveError('');setEditor(item?{item}:{item:null});};
 const save=async event=>{
  event.preventDefault();if(busy||!editor)return;
  setBusy(true);setSaveError('');
  try{
   const existing=editor.item;
   const {item}=await apiRequest(`/admin/eden/eidos${existing?`/${encodeURIComponent(existing.id)}`:''}`,{method:existing?'PUT':'POST',token,body:{fourthGoal:fourthGoal.trim(),...(existing?{previousFourthGoal:existing.fourthGoal||''}:{})}});
   const current=itemsRef.current;
   onItemsRef.current(existing?current.map(row=>row.id===item.id?item:row):[...current.filter(row=>row.id!==item.id),item]);
   onSelect(item);setEditor(null);
  }catch(failure){setSaveError(failure.message||'Eidos could not be saved.');}
  finally{setBusy(false);}
 };
 const remove=async item=>{
  if(busy)return;setBusy(true);setError('');
  try{
   if(!await confirmDeletion('Permanently delete this Eidos, its seed ID, and its fourth goal?',{title:'Permanently delete Eidos?',confirmLabel:'Delete permanently'}))return;
   await apiRequest(`/admin/eden/eidos/${encodeURIComponent(item.id)}`,{method:'DELETE',token,confirmedDelete:true,body:{permanent:true,previousFourthGoal:item.fourthGoal||''}});
   onItemsRef.current(itemsRef.current.filter(row=>row.id!==item.id));
   if(selectedId===item.id)onClear?.();
  }catch(failure){if(!failure.cancelled)setError(failure.message||'The item could not be deleted.');}
  finally{setBusy(false);}
 };
 const shown=items.filter(item=>`${item.id} ${item.fourthGoal||''}`.toLowerCase().includes(query.trim().toLowerCase()));
 return <aside className="tot-eidos-aside" aria-label="Eidos identity seeds">
  <header><span><Sparkles size={15}/>Eidos</span><b>{items.length}</b></header>
  <div className="tot-eidos-actions"><span className="tot-eidos-scope">Identity seeds</span><button type="button" className="tot-eidos-add" disabled={loading||busy||(!items.length&&Boolean(error))} onClick={()=>openEditor(null)}><Plus size={16}/>Add Eidos</button></div>
  {error&&<div className="tot-eidos-error" role="alert"><p>{error}</p><button type="button" onClick={load} disabled={loading||busy}>Retry</button></div>}
  <label className="tot-eidos-search"><Search size={14}/><input type="search" aria-label="Search identity seeds" placeholder="Search seeds" value={query} onChange={event=>setQuery(event.target.value)}/></label>
  <nav className="tot-eidos-list" aria-label="Identity seeds">{loading?<p role="status">Loading Eidos…</p>:shown.map(item=><article className={`tot-eidos-entry${selectedId===item.id?' is-selected':''}`} key={item.id}><button type="button" className="tot-eidos-select" aria-current={selectedId===item.id?'true':undefined} onClick={()=>onSelect(item)} title={item.id}><code>{item.id}</code><small>fourth goal</small><span>{item.fourthGoal||'Not set'}</span></button>
   <div className="tot-eidos-item-actions"><button type="button" aria-label={`Edit fourth goal for ${item.id}`} title="Edit fourth goal" disabled={busy} onClick={()=>openEditor(item)}><SquarePen size={16}/></button><button type="button" aria-label={`Permanently delete ${item.id}`} title="Delete item" disabled={busy} onClick={()=>remove(item)}><Trash2 size={16}/></button></div>
  </article>)}{!loading&&!error&&!shown.length&&<p>{query?'No seeds match.':'No seeds yet.'}</p>}</nav>
  <footer>Deleting an Eidos permanently removes its ID and fourth goal.</footer>
  <dialog ref={dialog} className="tot-eidos-dialog" aria-labelledby="tot-eidos-dialog-title" onCancel={event=>{if(busy)event.preventDefault();else setEditor(null);}} onClose={()=>setEditor(null)}>
   {editor&&<form onSubmit={save}><header><h2 id="tot-eidos-dialog-title">{editor.item?'Edit fourth goal':'Add Eidos'}</h2><button type="button" aria-label="Close Eidos popup" disabled={busy} onClick={()=>setEditor(null)}><X size={18}/></button></header>
    {editor.item?<code className="tot-eidos-dialog-id">{editor.item.id}</code>:<p>A unique seed ID will be generated when you create this Eidos.</p>}
    <label>fourth goal<textarea ref={field} rows={4} maxLength={2000} value={fourthGoal} onChange={event=>setFourthGoal(event.target.value)} disabled={busy} placeholder="Enter fourth goal"/></label>
    {saveError&&<p className="tot-eidos-save-error" role="alert">{saveError}</p>}
    <footer><button type="button" disabled={busy} onClick={()=>setEditor(null)}>Cancel</button><button type="submit" disabled={busy}>{editor.item?<Check size={16}/>:<Plus size={16}/>}<span>{busy?'Saving…':editor.item?'Save fourth goal':'Create Eidos'}</span></button></footer>
   </form>}
  </dialog>
 </aside>;
}
