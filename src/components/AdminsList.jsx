import {useEffect,useState} from 'react';
import {MapPin,Pencil,Plus,RefreshCw,Search,ShieldCheck} from 'lucide-react';
import {apiRequest} from '../lib/api';
import './adminsList.css';

const date=value=>value?new Date(value).toLocaleString(): '—';
export default function AdminsList({token}){
  const [editing,setEditing]=useState(''),[draft,setDraft]=useState(''),[saving,setSaving]=useState(false),[rowError,setRowError]=useState('');
  const [picked,setPicked]=useState(null),[places,setPlaces]=useState([]),[searching,setSearching]=useState(false);
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
  // Home address of an administrator: looked up on the map when saved, then used for the distance to every venue.
  const startEdit=item=>{setEditing(item.id);setDraft(item.homeAddress||'');setRowError('');setPicked(null);setPlaces([]);};
  // Find by search: while the address is typed, matching places from the map are offered; picking one carries its map point.
  useEffect(()=>{
    if(!editing||picked||draft.trim().length<3){setPlaces([]);return undefined;}
    let current=true;setSearching(true);
    const timer=setTimeout(()=>{
      apiRequest('/admin/places/search?'+new URLSearchParams({q:draft.trim()}),{token})
        .then(result=>{if(current)setPlaces(result.items||[]);})
        .catch(()=>{if(current)setPlaces([]);})
        .finally(()=>{if(current)setSearching(false);});
    },500);
    return()=>{current=false;clearTimeout(timer);setSearching(false);};
  },[draft,editing,picked,token]);
  const saveAddress=async item=>{
    setSaving(true);setRowError('');
    try{
      const result=await apiRequest(`/admin/admins/${encodeURIComponent(item.id)}/address`,{method:'PATCH',token,body:{address:draft.trim(),...(picked&&picked.label===draft.trim()?{latitude:picked.latitude,longitude:picked.longitude}:{})}});
      setItems(current=>current.map(row=>row.id===item.id?{...row,homeAddress:result.item.homeAddress}:row));setEditing('');
    }catch(failure){setRowError(failure.message||'Could not save the address.');}
    finally{setSaving(false);}
  };
  return <section className="admin-panel admins-list" aria-labelledby="admins-list-title">
    <header><div><h1 id="admins-list-title"><ShieldCheck size={19}/>Admins</h1><p>Accounts with administrator access to the dashboard.</p></div><button type="button" aria-label="Refresh admins" title="Refresh admins" disabled={loading} onClick={()=>setRevision(value=>value+1)}><RefreshCw size={16}/></button></header>
    <label className="admins-list-search"><Search size={15}/><span className="sr-only">Search administrators</span><input type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search name, email or username"/></label>
    {error&&<p role="alert">{error}</p>}
    {loading?<p role="status" className="admin-loading">Loading admins…</p>:!error&&<><p className="admins-list-count">{items.length} {items.length===1?'admin':'admins'}</p><div className="admins-list-table"><table aria-label="Administrators"><thead><tr>{['Name','Email','Username','Address','Role','Access','Access granted','Last login'].map(label=><th key={label} scope="col">{label}</th>)}</tr></thead><tbody>{items.map(item=><tr key={item.id}><th scope="row">{item.name||item.username}</th><td>{item.email||'—'}</td><td>{item.username}</td><td className="admins-address">{editing===item.id?<form onSubmit={event=>{event.preventDefault();saveAddress(item);}}><input value={draft} onChange={event=>{setDraft(event.target.value);setPicked(null);}} placeholder="Search an address or place" aria-label={`Home address of ${item.name||item.username}`} autoFocus maxLength={300}/><button type="submit" disabled={saving}>{saving?'Saving…':'Save'}</button><button type="button" disabled={saving} onClick={()=>setEditing('')}>Cancel</button>{searching&&<small className="admins-address-hint" role="status">Searching the map…</small>}{!!places.length&&<ul className="admins-address-results" role="listbox" aria-label="Matching places">{places.map(place=><li key={`${place.latitude},${place.longitude}`}><button type="button" role="option" aria-selected={false} onClick={()=>{setDraft(place.label);setPicked(place);setPlaces([]);}}><MapPin size={13} aria-hidden="true"/><span>{place.label}</span></button></li>)}</ul>}{rowError&&<small role="alert">{rowError}</small>}</form>:<span className="admins-address-view">{item.homeAddress?<><MapPin size={13} aria-hidden="true"/><span title={item.homeAddress}>{item.homeAddress}</span><button type="button" onClick={()=>startEdit(item)} aria-label={`Edit home address of ${item.name||item.username}`} title="Edit address"><Pencil size={13}/></button></>:<button type="button" className="admins-address-add" onClick={()=>startEdit(item)}><Plus size={13} aria-hidden="true"/>Add address</button>}</span>}</td><td>{item.role}</td><td><span className={item.isBlocked?'is-blocked':'is-active'}>{item.isBlocked?'Blocked':'Active'}</span></td><td>{date(item.grantedAt)}</td><td>{date(item.lastLoginAt)}</td></tr>)}{!items.length&&<tr><td colSpan={8}>No administrators match your search.</td></tr>}</tbody></table></div></>}
  </section>;
}
