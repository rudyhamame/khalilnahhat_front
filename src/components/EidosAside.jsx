import {useCallback,useEffect,useRef,useState} from 'react';
import {Plus,Search,Sparkles} from 'lucide-react';
import {apiRequest} from '../lib/api';

export default function EidosAside({token,items,onItems,selectedId,onSelect}){
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false),[query,setQuery]=useState('');
 const onItemsRef=useRef(onItems);onItemsRef.current=onItems;
 const load=useCallback(async()=>{
  setLoading(true);setError('');
  try{const {items}=await apiRequest('/admin/eden/eidos',{token});onItemsRef.current(items||[]);}
  catch(failure){setError(failure.message||'Eidos could not be loaded.');}
  finally{setLoading(false);}
 },[token]);
 useEffect(()=>{load();},[load]);
 const add=async()=>{
  if(busy)return;setBusy(true);setError('');
  try{
   const {item}=await apiRequest('/admin/eden/eidos',{method:'POST',token,body:{}});
   onItemsRef.current([...items.filter(row=>row.id!==item.id),item]);onSelect(item);
  }catch(failure){setError(failure.message||'Eidos could not be saved.');}
  finally{setBusy(false);}
 };
 const shown=items.filter(item=>item.id.toLowerCase().includes(query.trim().toLowerCase()));
 return <aside className="tot-eidos-aside" aria-label="Eidos identity seeds">
  <header><span><Sparkles size={15}/>Eidos</span><b>{items.length}</b></header>
  <div className="tot-eidos-actions"><span className="tot-eidos-scope">Identity seeds</span><button type="button" className="tot-eidos-add" disabled={loading||busy||(!items.length&&Boolean(error))} onClick={add}><Plus size={14}/>{busy?'Creating…':'Add Eidos'}</button></div>
  {error&&<div className="tot-eidos-error" role="alert"><p>{error}</p><button type="button" onClick={load} disabled={loading||busy}>Retry</button></div>}
  <label className="tot-eidos-search"><Search size={14}/><input type="search" aria-label="Search Eidos IDs" placeholder="Search IDs" value={query} onChange={event=>setQuery(event.target.value)}/></label>
  <nav className="tot-eidos-list" aria-label="Eidos IDs">{loading?<p role="status">Loading Eidos…</p>:shown.map(item=><button type="button" key={item.id} aria-current={selectedId===item.id?'true':undefined} onClick={()=>onSelect(item)} title={item.id}><code>{item.id}</code></button>)}{!loading&&!error&&!shown.length&&<p>{query?'No IDs match.':'No seeds yet.'}</p>}</nav>
  <footer>An Eidos is an ID seed. Its identity remains when a view is removed.</footer>
 </aside>;
}
