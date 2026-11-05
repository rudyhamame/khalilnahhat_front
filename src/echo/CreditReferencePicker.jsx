import {useState} from 'react';
import {Check} from 'lucide-react';
import './creditReferencePicker.css';
import ReferenceSearchInput,{normalizeReference} from './ReferenceSearchInput';

export default function CreditReferencePicker({label,value,rows,onChange,onCreate}){
 const [query,setQuery]=useState('');
 const normalized=normalizeReference(query);
 const matches=rows.filter(row=>normalizeReference(row.name).includes(normalized));
 return <div className="credit-reference-picker">
  <div className="credit-reference-heading"><span>{label}</span>{value&&<button type="button" aria-label={`Clear ${label.toLowerCase()}`} onClick={()=>onChange('')}>Clear</button>}</div>
  <div className="credit-reference-menu">
   <ReferenceSearchInput label={label} query={query} onQueryChange={setQuery} rows={rows} onCreate={onCreate}/>
   <div className="credit-reference-options" role="listbox" aria-label={`Stored ${label.toLowerCase()}`}>
    {matches.map(row=><button type="button" role="option" key={row.id} aria-selected={row.id===value} onClick={()=>onChange(row.id)}><span>{row.name}</span>{row.id===value&&<Check size={13}/>}</button>)}
   </div>
   {!matches.length&&<p className="credit-reference-empty">{rows.length?'No matches found.':'No entries saved yet.'}</p>}

  </div>
 </div>;
}
