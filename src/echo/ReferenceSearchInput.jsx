import {useState} from 'react';
import {Search} from 'lucide-react';
import './referenceSearchInput.css';
export const normalizeReference=value=>value.normalize('NFKC').trim().replace(/\s+/g,' ').toLocaleLowerCase();
export default function ReferenceSearchInput({label,query,onQueryChange,rows,onCreate}){
 const [busy,setBusy]=useState(false),[error,setError]=useState('');
 const name=query.trim(),normalized=normalizeReference(query);
 const canCreate=onCreate&&normalized&&!rows.some(row=>normalizeReference(row.name)===normalized);
 const create=async()=>{if(busy)return;setBusy(true);setError('');try{await onCreate(name);onQueryChange('');}catch(e){setError(e.message||'Could not add this entry.');}finally{setBusy(false);}};
 return <><div className="reference-search-row"><Search size={14} aria-hidden="true"/><input type="search" aria-label={`Search ${label.toLowerCase()}`} placeholder={`Search ${label.toLowerCase()}…`} value={query} onChange={event=>{onQueryChange(event.target.value);setError('');}}/>{canCreate&&<button type="button" className="reference-add-link" disabled={busy} onClick={create}>{busy?'Adding…':`Add ${name}`}</button>}</div>{error&&<p role="alert" className="reference-search-error">{error}</p>}</>;
}
