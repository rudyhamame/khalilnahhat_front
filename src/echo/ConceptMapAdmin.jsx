import {useEffect,useState} from 'react';
import {Network,Save} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {MAP_FALLBACK,MAP_OPTIONS,setCachedConceptMapDefaults} from './conceptMapDefaults';
import './seasonalThemeAdmin.css';

// Sets the concept map toolbar that visitors see first on Echo AI. A visitor's own choice still wins.
export default function ConceptMapAdmin({token}){
 const [saved,setSaved]=useState(null),[draft,setDraft]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 useEffect(()=>{let alive=true;apiRequest('/concept-map').then(({item})=>{if(alive){const value={...MAP_FALLBACK,...item};setSaved(value);setDraft(value);}}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[]);
 const save=async event=>{event.preventDefault();setBusy(true);setError('');setNotice('');try{const {item}=await apiRequest('/concept-map',{method:'PUT',token,body:draft});setSaved(item);setDraft(item);setCachedConceptMapDefaults(item);setNotice('Saved. Visitors who have not picked their own options see these.');}catch(e){setError(e.message);}finally{setBusy(false);}};
 const dirty=draft&&JSON.stringify(saved)!==JSON.stringify(draft);
 return <section className="seasonal-admin" aria-labelledby="concept-map-admin-title">
  <header><span><Network size={20}/>ECHO AI / CONCEPT MAP</span><h1 id="concept-map-admin-title">Concept map toolbar</h1><p>Choose how the concept map on the Echo AI page is arranged by default. Visitors can still change it for themselves.</p></header>
  {error&&<p role="alert" className="seasonal-admin-error">{error}</p>}
  {notice&&<p role="status" className="seasonal-admin-success">{notice}</p>}
  {!draft&&!error&&<p role="status" className="admin-loading">Loading concept map settings…</p>}
  {draft&&<form onSubmit={save}><fieldset disabled={busy}><legend>Default toolbar</legend>
   {Object.entries(MAP_OPTIONS).map(([key,{label,values}])=><label key={key} className="seasonal-admin-toggle"><span><strong>{label[0]}</strong></span><select value={draft[key]} onChange={event=>{setNotice('');setDraft(current=>({...current,[key]:event.target.value}));}}>{values.map(([value,en])=><option key={value} value={value}>{en}</option>)}</select></label>)}
  </fieldset><button type="submit" disabled={busy||!dirty}><Save size={14}/>Save default</button></form>}
 </section>;
}
