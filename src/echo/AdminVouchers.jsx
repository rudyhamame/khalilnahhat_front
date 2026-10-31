import {Fragment,useCallback,useEffect,useState} from 'react';
import {Pencil,Plus,Trash2,Users} from 'lucide-react';
import {apiRequest} from '../lib/api';
import './adminVouchers.css';

const money=cents=>`$${(cents/100).toFixed(2)}`;
const discount=v=>v.kind==='percent'?`${v.percent}% off`:`${money(v.amountCents)} off`;
const day=value=>value?new Date(value).toLocaleDateString('en-CA',{timeZone:'America/Toronto',year:'numeric',month:'short',day:'numeric'}):'';
const blank={code:'',title:'',description:'',kind:'amount',value:'',startsAt:'',endsAt:'',maxRedemptions:'0',perClientLimit:'1',announce:false};

// Billing: create vouchers, set the discount, and see which clients redeemed them.
export default function AdminVouchers({token}){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [draft,setDraft]=useState(blank),[open,setOpen]=useState(false),[busy,setBusy]=useState(false),[editing,setEditing]=useState(null);
 const isoDay=value=>value?new Date(value).toLocaleDateString('en-CA',{timeZone:'America/Toronto'}):'';
 const edit=item=>{setEditing(item);setDraft({code:item.code,title:item.title||'',description:item.description||'',kind:item.kind,value:String(item.kind==='percent'?item.percent:item.amountCents/100),startsAt:isoDay(item.startsAt),endsAt:isoDay(item.endsAt),maxRedemptions:String(item.maxRedemptions||0),perClientLimit:String(item.perClientLimit||1),announce:item.announce});setOpen(true);setError('');setNotice('');window.scrollTo({top:0,behavior:'smooth'});};
 const closeForm=()=>{setOpen(false);setEditing(null);setDraft(blank);};
 const [expanded,setExpanded]=useState(null),[uses,setUses]=useState({});
 const load=useCallback(async()=>{setLoading(true);try{setItems((await apiRequest('/admin/vouchers',{token})).items);setError('');}catch(e){setError(e.message||'Vouchers could not be loaded.');}finally{setLoading(false);}},[token]);
 useEffect(()=>{load();},[load]);
 const set=(key,value)=>setDraft(current=>({...current,[key]:value}));
 const create=async event=>{
  event.preventDefault();if(busy)return;
  const number=Number(draft.value);
  const body={title:draft.title,description:draft.description,kind:draft.kind,
   ...(draft.kind==='amount'?{amountCents:Math.round(number*100),percent:0}:{percent:number,amountCents:0}),
   startsAt:draft.startsAt?`${draft.startsAt}T00:00:00-05:00`:null,endsAt:draft.endsAt?`${draft.endsAt}T23:59:59-05:00`:null,
   maxRedemptions:Number(draft.maxRedemptions)||0,perClientLimit:Number(draft.perClientLimit)||1,announce:draft.announce};
  setBusy(true);setError('');setNotice('');
  try{
   if(editing){
    const result=await apiRequest(`/admin/vouchers/${editing.id}`,{token,method:'PATCH',body:{...body,...(editing.redeemed?{}:{code:draft.code})}});
    setItems(list=>list.map(row=>row.id===editing.id?result.item:row));setNotice(`Voucher ${result.item.code} updated.`);closeForm();
   }else{
    await apiRequest('/admin/vouchers',{token,method:'POST',body:{code:draft.code,...body}});
    setNotice(`Voucher ${draft.code.toUpperCase()} created.`);closeForm();await load();
   }
  }catch(e){setError(e.message);}finally{setBusy(false);}
 };
 const patch=async(item,body)=>{
  setError('');setNotice('');
  try{const result=await apiRequest(`/admin/vouchers/${item.id}`,{token,method:'PATCH',body});setItems(list=>list.map(row=>row.id===item.id?result.item:row));}
  catch(e){setError(e.message);}
 };
 const remove=async item=>{
  if(!window.confirm(`Delete voucher ${item.code}?`))return;
  setError('');setNotice('');
  try{await apiRequest(`/admin/vouchers/${item.id}`,{token,method:'DELETE'});setNotice(`Voucher ${item.code} deleted.`);await load();}
  catch(e){setError(e.message);}
 };
 const toggleUses=async item=>{
  if(expanded===item.id){setExpanded(null);return;}
  setExpanded(item.id);
  if(!uses[item.id]){try{const result=await apiRequest(`/admin/vouchers/${item.id}/redemptions`,{token});setUses(current=>({...current,[item.id]:result.items}));}catch(e){setError(e.message);}}
 };
 return <section className="admin-vouchers" aria-label="Vouchers">
  <header className="avo-bar"><button type="button" className="avo-primary" onClick={()=>{if(open)closeForm();else{setEditing(null);setDraft(blank);setOpen(true);}}}><Plus size={15}/> New voucher</button></header>
  {open&&<form className="avo-form" onSubmit={create}>
   {editing&&<p className="avo-editing">Editing {editing.code}{editing.redeemed?` · used ${editing.redeemed} time${editing.redeemed===1?'':'s'}`:''}</p>}
   <label>Code<input required maxLength={24} disabled={Boolean(editing&&editing.redeemed)} title={editing&&editing.redeemed?'A used voucher keeps its code.':undefined} value={draft.code} onChange={event=>set('code',event.target.value.toUpperCase())} placeholder="WELCOME50"/></label>
   <label>Title (shown in the announcement)<input maxLength={80} value={draft.title} onChange={event=>set('title',event.target.value)} placeholder="$50 off your first online booking"/></label>
   <label>Discount type<select value={draft.kind} onChange={event=>set('kind',event.target.value)}><option value="amount">Fixed amount (CAD)</option><option value="percent">Percentage</option></select></label>
   <label>{draft.kind==='amount'?'Amount (CAD)':'Percent'}<input required type="number" min="0.01" max={draft.kind==='percent'?100:100000} step={draft.kind==='percent'?1:0.01} value={draft.value} onChange={event=>set('value',event.target.value)}/></label>
   <label>Valid from (optional)<input type="date" value={draft.startsAt} onChange={event=>set('startsAt',event.target.value)}/></label>
   <label>Valid until (optional)<input type="date" value={draft.endsAt} onChange={event=>set('endsAt',event.target.value)}/></label>
   <label>Total uses (0 = unlimited)<input type="number" min="0" step="1" value={draft.maxRedemptions} onChange={event=>set('maxRedemptions',event.target.value)}/></label>
   <label>Uses per client<input type="number" min="1" step="1" value={draft.perClientLimit} onChange={event=>set('perClientLimit',event.target.value)}/></label>
   <label className="avo-wide">Details (optional)<input maxLength={200} value={draft.description} onChange={event=>set('description',event.target.value)}/></label>
   <label className="avo-check"><input type="checkbox" checked={draft.announce} onChange={event=>set('announce',event.target.checked)}/> Announce on the home page</label>
   <div className="avo-actions"><button type="submit" className="avo-primary" disabled={busy}>{busy?'Saving…':editing?'Save changes':'Create voucher'}</button><button type="button" onClick={closeForm}>Cancel</button></div>
  </form>}
  {error&&<p className="avo-error" role="alert">{error}</p>}{notice&&<p className="avo-notice" role="status">{notice}</p>}
  <div className="avo-scroll"><table className="avo-table"><thead><tr><th>Code</th><th>Discount</th><th>Valid</th><th className="n">Used</th><th>Active</th><th>Announce</th><th/></tr></thead><tbody>
   {items.map(item=><Fragment key={item.id}><tr className={item.active?'':'is-off'}>
    <td><strong>{item.code}</strong>{item.title&&<small>{item.title}</small>}</td>
    <td>{discount(item)}</td>
    <td>{item.startsAt||item.endsAt?`${day(item.startsAt)||'Now'} – ${day(item.endsAt)||'No end'}`:'Always'}</td>
    <td className="n">{item.redeemed}{item.maxRedemptions?` / ${item.maxRedemptions}`:''}<small>{item.perClientLimit} per client</small></td>
    <td><label className="avo-switch"><input type="checkbox" checked={item.active} onChange={event=>patch(item,{active:event.target.checked})}/><span>{item.active?'On':'Off'}</span></label></td>
    <td><label className="avo-switch"><input type="checkbox" checked={item.announce} onChange={event=>patch(item,{announce:event.target.checked})}/><span>{item.announce?'Shown':'Hidden'}</span></label></td>
    <td className="avo-row-actions"><button type="button" onClick={()=>edit(item)}><Pencil size={14}/> Edit</button><button type="button" onClick={()=>toggleUses(item)} aria-expanded={expanded===item.id}><Users size={14}/> Clients</button><button type="button" aria-label={`Delete ${item.code}`} onClick={()=>remove(item)}><Trash2 size={14}/></button></td>
   </tr>
   {expanded===item.id&&<tr className="avo-uses"><td colSpan={7}>{uses[item.id]?(uses[item.id].length?<table><thead><tr><th>Client</th><th>Email</th><th>Booking</th><th>Voucher</th><th>Used</th></tr></thead><tbody>{uses[item.id].map(row=><tr key={row.id}><td>{row.customerName||'—'}</td><td>{row.customerEmail||'—'}</td><td>{row.requestNumber||'—'}</td><td>{row.kind==='percent'?`${row.percent}%`:money(row.amountCents)}</td><td>{day(row.usedAt)}</td></tr>)}</tbody></table>:<p>No client has used this voucher yet.</p>):<p>Loading…</p>}</td></tr>}
   </Fragment>)}
   {!items.length&&<tr><td colSpan={7} className="avo-empty">{loading?'Loading…':'No vouchers yet.'}</td></tr>}
  </tbody></table></div>
 </section>;
}
