import {useCallback,useEffect,useState} from 'react';
import {Check,ChevronDown,ChevronUp,Pencil,Plus,Trash2,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {adminToast} from './adminToast';
// The cards look and behave like the Work Elements cards, so they share that tab's styles.
import '../echo/workElementsAdmin.css';
import '../echo/workElementsCardDesign.css';

const base='/admin/pricing/lists';

// One card: add / edit (name; pricing modes also pick what they price by; pricing factors pick the fee categories they affect) and delete.
function ListCard({title,hint,list,items,fees,busy,onSave,onRemove,onMove}){
  const [editing,setEditing]=useState(null),[name,setName]=useState(''),[affects,setAffects]=useState([]);
  const clear=()=>{setEditing(null);setName('');setAffects([]);};
  const edit=item=>{setEditing(item);setName(item.name);setAffects(item.affects||[]);};
  const submit=async event=>{
    event.preventDefault();
    const body={name:name.trim(),...(list==='pricingFactors'?{affects}:{})};
    if(body.name&&await onSave(list,editing?.id||null,body))clear();
  };
  return <article className="work-element-card" aria-labelledby={`pricing-${list}`}>
    <header><h2 id={`pricing-${list}`}>{title}</h2><span>{items.length}</span></header>
    <form onSubmit={submit}>
      <div className="work-element-entry">
        <input value={name} onChange={event=>setName(event.target.value)} aria-label={`${title} name`} placeholder={`${title} name`} maxLength={120} disabled={busy}/>
        <button type="submit" className="work-element-action work-element-submit" disabled={busy||!name.trim()} aria-label={editing?`Save ${title}`:`Add to ${title}`} title={editing?'Save':'Add'}>{editing?<Check size={18} strokeWidth={2.2}/>:<Plus size={18} strokeWidth={2.2}/>}<span>{editing?'Save':'Add'}</span></button>
        {editing&&<button type="button" className="work-element-action" title="Cancel editing" aria-label={`Cancel editing ${title}`} onClick={clear} disabled={busy}><X size={18} strokeWidth={2.2}/></button>}
      </div>
      {list==='pricingFactors'&&<>
        <label className="work-element-language-select"><span>Affects</span><select aria-label="Fee category affected" value="" disabled={busy||!fees.length} onChange={event=>{const id=event.target.value;if(id)setAffects(ids=>ids.includes(id)?ids:[...ids,id]);}}><option value="">{fees.length?'Choose fee category':'Add options in the Fee categories card first'}</option>{fees.filter(fee=>!affects.includes(fee.id)).map(fee=><option key={fee.id} value={fee.id}>{fee.name}</option>)}</select></label>
        {affects.length>0&&<div className="work-element-selected-languages" aria-label="Selected fee categories">{affects.map(id=>{const fee=fees.find(row=>row.id===id);return <button key={id} type="button" className="work-element-language-chip" disabled={busy} aria-label={`Remove ${fee?.name||id}`} onClick={()=>setAffects(ids=>ids.filter(value=>value!==id))}><span>{fee?.name||id}</span><X size={12}/></button>;})}</div>}
      </>}
    </form>
    <p className="work-element-source">{hint}</p>
    <ul>{items.map((item,index)=><li key={item.id} className={editing?.id===item.id?'is-editing':undefined}>
      <span><strong>{item.name}</strong>
        {list==='pricingFactors'&&item.affects?.length>0&&<span className="work-element-language-tags">{item.affects.map(id=><small key={id}>{fees.find(fee=>fee.id===id)?.name||id}</small>)}</span>}
      </span>
      <div><button type="button" className="work-element-action" title="Move up" aria-label={`Move ${item.name} up`} disabled={busy||index===0} onClick={()=>onMove(list,index,-1)}><ChevronUp size={16}/></button>
        <button type="button" className="work-element-action" title="Move down" aria-label={`Move ${item.name} down`} disabled={busy||index===items.length-1} onClick={()=>onMove(list,index,1)}><ChevronDown size={16}/></button>
        <button type="button" className="work-element-action is-edit" title={`Edit ${item.name}`} aria-label={`Edit ${item.name}`} disabled={busy} onClick={()=>edit(item)}><Pencil size={16}/></button>
        <button type="button" className="work-element-action is-delete" title={`Delete ${item.name}`} aria-label={`Delete ${item.name}`} disabled={busy} onClick={()=>onRemove(list,item)}><Trash2 size={16}/></button></div>
    </li>)}</ul>
    {!items.length&&<p className="work-element-empty">No options yet. Add one above.</p>}
  </article>;
}

export default function PricingSettings({token}) {
  const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const run=useCallback(async(path,options)=>{setBusy(true);try{setData(await apiRequest(path,{token,...options}));setError('');return true;}catch(e){adminToast(e.message||'Could not save.',true);if(!options)setError(e.message||'Could not load.');return false;}finally{setBusy(false);}},[token]);
  useEffect(()=>{run(base);},[run]);
  const save=(list,id,body)=>run(id?`${base}/${list}/${id}`:`${base}/${list}`,{method:id?'PUT':'POST',body});
  const remove=(list,item)=>{if(window.confirm(`Delete “${item.name}”?${list==='feeCategories'?' Pricing factors will stop affecting it.':''}`))return run(`${base}/${list}/${item.id}`,{method:'DELETE'});};
  const move=(list,index,delta)=>{const ids=data[list].map(item=>item.id);[ids[index],ids[index+delta]]=[ids[index+delta],ids[index]];return run(`${base}/${list}/order`,{method:'PUT',body:{ids}});};
  const common={fees:data?.feeCategories||[],busy,onSave:save,onRemove:remove,onMove:move};
  return <div className="work-elements-admin pe-settings" aria-label="Pricing settings">
    {error&&<p className="work-elements-error" role="alert">{error}</p>}
    {data&&<div className="work-elements-grid">
      <ListCard title="Fee categories" hint="The things we charge for, such as the rental fee." list="feeCategories" items={data.feeCategories} {...common}/>
      <ListCard title="Mode" hint="The pricing modes you can choose when setting a price." list="pricingModes" items={data.pricingModes||[]} {...common}/>
      <ListCard title="Pricing factors" hint="What changes the fee categories. Pick the fees each factor affects." list="pricingFactors" items={data.pricingFactors} {...common}/>
    </div>}
  </div>;
}
