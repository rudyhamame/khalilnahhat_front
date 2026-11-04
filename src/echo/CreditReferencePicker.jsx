import {useState} from 'react';
import {Check,Plus,Search} from 'lucide-react';
import './creditReferencePicker.css';

export default function CreditReferencePicker({label,value,rows,onChange,onCreate,createLabel}){
 const [query,setQuery]=useState('');
 const normalized=query.normalize('NFKC').trim().toLocaleLowerCase();
 const matches=rows.filter(row=>row.name.normalize('NFKC').toLocaleLowerCase().includes(normalized));
 return <div className="credit-reference-picker">
  <div className="credit-reference-heading"><span>{label}</span>{value&&<button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={()=>onChange('')}>Clear</button>}</div>
  <div className="credit-reference-menu">
   <label className="credit-reference-search"><Search size={14}/><input type="search" aria-label={`Search ${label.toLowerCase()}`} placeholder={`Search ${label.toLowerCase()}…`} value={query} onChange={event=>setQuery(event.target.value)}/></label>
   <div className="credit-reference-options" role="listbox" aria-label={`Stored ${label.toLowerCase()}`}>
    {matches.map(row=><button type="button" role="option" key={row.id} aria-selected={row.id===value} onClick={()=>onChange(row.id)}><span>{row.name}</span>{row.id===value&&<Check size={13}/>}</button>)}
   </div>
   {!matches.length&&<p className="credit-reference-empty">{rows.length?'No matches found.':'No entries saved yet.'}</p>}
   {onCreate&&<button type="button" className="credit-reference-create" onClick={()=>{const name=query.trim();setQuery('');onCreate(name);}}><Plus size={14}/><span>{normalized?`${createLabel}: “${query.trim()}”`:createLabel}</span></button>}
  </div>
 </div>;
}
