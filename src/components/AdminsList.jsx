import {useEffect,useState} from 'react';
import {RefreshCw,Search,ShieldCheck} from 'lucide-react';
import {apiRequest} from '../lib/api';
import './adminsList.css';

const date=value=>value?new Date(value).toLocaleString(): '—';
export default function AdminsList({token}){
  const [items,setItems]=useState([]),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[error,setError]=useState(''),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();let current=true;
    setLoading(true);setError('');
    const timer=setTimeout(()=>{
      apiRequest('/admin/admins?'+new URLSearchParams({q:query.trim()}),{token,signal:controller.signal})
        .then(result=>{if(current)setItems(result.items||[]);})
        .catch(failure=>{if(current&&!controller.signal.aborted)setError(failure.message||'Could not load administrators.');})
        .finally(()=>{if(current)setLoading(false);});
    },180);
    return()=>{current=false;clearTimeout(timer);controller.abort();};
  },[token,query,revision]);
  return <section className="admin-panel admins-list" aria-labelledby="admins-list-title">
    <header><div><h1 id="admins-list-title"><ShieldCheck size={19}/>Admins</h1><p>Accounts with administrator access to the dashboard.</p></div><button type="button" aria-label="Refresh admins" title="Refresh admins" disabled={loading} onClick={()=>setRevision(value=>value+1)}><RefreshCw size={16}/></button></header>
    <label className="admins-list-search"><Search size={15}/><span className="sr-only">Search administrators</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search name, email or username"/></label>
    {error&&<p role="alert">{error}</p>}
    {loading?<p role="status">Loading admins…</p>:!error&&<><p className="admins-list-count">{items.length} {items.length===1?'admin':'admins'}</p><div className="admins-list-table"><table aria-label="Administrators"><thead><tr>{['Name','Email','Username','Role','Access','Access granted','Last login'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{items.map(item=><tr key={item.id}><th scope="row">{item.name||item.username}</th><td>{item.email||'—'}</td><td>{item.username}</td><td>{item.role}</td><td><span className={item.isBlocked?'is-blocked':'is-active'}>{item.isBlocked?'Blocked':'Active'}</span></td><td>{date(item.grantedAt)}</td><td>{date(item.lastLoginAt)}</td></tr>)}{!items.length&&<tr><td colSpan={7}>No administrators match your search.</td></tr>}</tbody></table></div></>}
  </section>;
}
