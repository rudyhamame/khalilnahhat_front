import {useEffect,useState} from 'react';
import {apiRequest} from '../lib/api';
import AdminSelect from './AdminSelect';

export default function LiveSetListPicker({token,value,onChange,disabled=false}){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let alive=true;setLoading(true);setError('');
  apiRequest('/admin/dj-service-builder/set-lists',{token}).then(data=>{if(alive)setItems(data.items||[]);}).catch(e=>{if(alive)setError(e.message||'Could not load set lists.');}).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[token,retry]);
 return <div className="studio-set-list-picker">
  <label className="live-goal-picker"><span>Select set list</span><AdminSelect aria-label="Select set list" value={value} disabled={disabled} onChange={e=>onChange(e.target.value)}>
   <option value="none">No set list</option>
   {items.map(item=><option key={item.id} value={item.id}>{item.title} · {item.trackCount} tracks</option>)}
   {value!=='none'&&!items.some(item=>item.id===value)&&<option value={value}>Selected set list{loading?' — loading…':' — refresh to check availability'}</option>}
  </AdminSelect></label>
  <small>{loading?'Loading saved DJ Builder set lists…':value==='none'?'Play freely without a planned set list.':'The saved running order is copied into this live session. It does not start audio playback.'}</small>
  {error&&<p role="alert">{error} <button type="button" disabled={disabled} onClick={()=>setRetry(n=>n+1)}>Retry</button></p>}
 </div>;
}
