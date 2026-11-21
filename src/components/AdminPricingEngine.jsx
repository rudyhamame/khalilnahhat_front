import {useCallback,useEffect,useState} from 'react';
import {Plus,Trash2} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {adminToast} from './adminToast';
import './pricingEngine.css';

const base='/admin/pricing/lists';

// One editable list: add a name, rename in place (saved on blur / Enter), delete. Pricing factors also pick which fee categories they change.
function ListCard({title,hint,list,items,fees,busy,onSave,onRemove}){
  const [draft,setDraft]=useState('');
  const add=async event=>{event.preventDefault();const name=draft.trim();if(!name)return;if(await onSave(list,null,{name}))setDraft('');};
  return <section className="pe-card" aria-label={title}>
    <header><h2>{title}</h2><p>{hint}</p></header>
    <ul>{items.map(item=><li key={item.id}>
      <div className="pe-row">
        <input key={item.name} defaultValue={item.name} aria-label={`${title}: name`} maxLength={120} disabled={busy}
          onBlur={event=>{const name=event.target.value.trim();if(name&&name!==item.name)onSave(list,item.id,{name});else event.target.value=item.name;}}
          onKeyDown={event=>{if(event.key==='Enter')event.currentTarget.blur();}}/>
        <button type="button" className="pe-icon" aria-label={`Delete ${item.name}`} title="Delete" disabled={busy} onClick={()=>onRemove(list,item)}><Trash2 size={15} aria-hidden="true"/></button>
      </div>
      {list==='pricingFactors'&&<div className="pe-chips" role="group" aria-label={`Fee categories affected by ${item.name}`}>
        {fees.length===0?<small>Add fee categories first.</small>:fees.map(fee=>{const on=item.affects?.includes(fee.id);return <button key={fee.id} type="button" aria-pressed={on} disabled={busy}
          onClick={()=>onSave(list,item.id,{name:item.name,affects:on?item.affects.filter(id=>id!==fee.id):[...(item.affects||[]),fee.id]})}>{fee.name}</button>;})}
      </div>}
    </li>)}</ul>
    {items.length===0&&<p className="pe-empty">Nothing here yet.</p>}
    <form className="pe-add" onSubmit={add}><input value={draft} onChange={event=>setDraft(event.target.value)} placeholder={`Add to ${title.toLowerCase()}…`} aria-label={`New ${title.toLowerCase()} name`} maxLength={120} disabled={busy}/><button type="submit" disabled={busy||!draft.trim()}><Plus size={15} aria-hidden="true"/>Add</button></form>
  </section>;
}

export default function AdminPricingEngine({token}) {
  const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const run=useCallback(async(path,options)=>{setBusy(true);try{setData(await apiRequest(path,{token,...options}));setError('');return true;}catch(e){adminToast(e.message||'Could not save.',true);if(!options)setError(e.message||'Could not load.');return false;}finally{setBusy(false);}},[token]);
  useEffect(()=>{run(base);},[run]);
  const save=(list,id,body)=>run(id?`${base}/${list}/${id}`:`${base}/${list}`,{method:id?'PUT':'POST',body});
  const remove=(list,item)=>{if(window.confirm(`Delete “${item.name}”?${list==='feeCategories'?' Pricing factors will stop affecting it.':''}`))return run(`${base}/${list}/${item.id}`,{method:'DELETE'});};
  return <div className="pe" aria-label="Pricing workspace">
    {error&&<p className="pe-error" role="alert">{error}</p>}
    {data&&<div className="pe-grid">
      <ListCard title="Fee categories" hint="The things we charge for, such as the rental fee." list="feeCategories" items={data.feeCategories} fees={data.feeCategories} busy={busy} onSave={save} onRemove={remove}/>
      <ListCard title="Pricing factors" hint="What changes the fee categories. Tap a fee to mark it as affected." list="pricingFactors" items={data.pricingFactors} fees={data.feeCategories} busy={busy} onSave={save} onRemove={remove}/>
    </div>}
  </div>;
}
