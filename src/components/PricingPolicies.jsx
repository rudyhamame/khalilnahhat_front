import {Fragment,useCallback,useEffect,useMemo,useState} from 'react';
import {createPortal} from 'react-dom';
import {Pencil,Search,Trash2} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {adminToast} from './adminToast';

// Names come from the data: the Mode list in Pricing settings, and each priced data atom's own category. Nothing here is a fixed catalogue.
const humanize=key=>key.replace(/_/g,' ').replace(/^./,c=>c.toUpperCase());
const groupOf=atom=>atom.category||atom.type;
// A group is named by its service's `name` (the service whose category it is); a category with no service falls back to the category itself.
const groupLabels=atoms=>new Map(atoms.filter(atom=>atom.type==='service').map(atom=>[groupOf(atom),atom.name]));
const groupNames=atoms=>[...new Set(atoms.map(groupOf))].sort((a,b)=>(atoms.some(x=>groupOf(x)===b&&x.type==='service')-atoms.some(x=>groupOf(x)===a&&x.type==='service'))||a.localeCompare(b));
const money=cents=>`$${(cents/100).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const toCents=text=>Math.round(Number(text||0)*100);
const blank=(offeringId,mode)=>({offeringId,fee:'',modeId:mode?.id||'',currency:'CAD',amount:'',includedQuantity:'',conditions:[]});
const fromPolicy=(p)=>({offeringId:p.offeringId,fee:p.pricingUnits?.[0]?.type||'',modeId:p.modeId||'',currency:p.currency||'CAD',amount:p.baseAmountCents?String(p.baseAmountCents/100):'',includedQuantity:p.includedQuantity??'',
  conditions:p.conditions||[]});
// Each priced data atom has one price. The record is stored as an always-active policy named after the atom.
const toBody=(f,atomName)=>({offeringId:f.offeringId,name:atomName,pricingMode:'fixed',...(f.modeId?{modeId:f.modeId}:{}),currency:f.currency,baseAmountCents:toCents(f.amount),
  ...(f.includedQuantity!==''?{includedQuantity:Number(f.includedQuantity)}:{}),
  effectiveFrom:'',effectiveUntil:'',priority:0,status:'active',
  tiers:[],
  pricingUnits:f.fee?[{type:f.fee,amountCents:0,factors:[]}]:[],conditions:f.conditions});

function Editor({form,setForm,offerings,modes,fees,busy,editing,onSave,onCancel,onAtom}){
  const set=(key,value)=>setForm(old=>({...old,[key]:value}));
  const field=(label,input)=><label className="pp-field"><span>{label}</span>{input}</label>;
  // Equipment / Service tabs choose which kind of priced data atom the price is for (equipment items and packages, or services).
  const isService=atom=>atom.type==='service',current=offerings.find(o=>o.id===form.offeringId),tab=current&&isService(current)?'service':'equipment';
  const visible=offerings.filter(o=>(tab==='service')===isService(o));
  const pickTab=next=>{if(next!==tab)onAtom(offerings.find(o=>(next==='service')===isService(o))?.id||'');};
  return <form className="pp-editor" onSubmit={event=>{event.preventDefault();onSave();}} aria-label={editing?'Edit price':'Set price'}>
    <h3>{editing?'Edit price':'Set price'}</h3>
    <div className="pp-tabs" role="tablist" aria-label="Kind of priced data atom">{[['equipment','Equipment'],['service','Service']].map(([id,label])=><button key={id} type="button" role="tab" aria-selected={tab===id} disabled={editing&&tab!==id} onClick={()=>pickTab(id)}>{label}</button>)}</div>
    <div className="pp-grid">
      {field('Priced data atom',<select value={form.offeringId} onChange={e=>onAtom(e.target.value)} required>{tab==='service'?visible.map(o=><option key={o.id} value={o.id}>{o.name}</option>):groupNames(visible).map(group=><optgroup key={group} label={groupLabels(offerings).get(group)||group}>{visible.filter(o=>groupOf(o)===group).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</optgroup>)}</select>)}
      {field('Fee category',<select value={form.fee} onChange={e=>set('fee',e.target.value)}><option value="">None</option>{[...new Set([...fees.map(f=>f.name),...(form.fee?[form.fee]:[])])].map(name=><option key={name} value={name}>{name}</option>)}</select>)}
      {field('Pricing mode',<select value={form.modeId} required disabled={!modes.length} onChange={e=>{const mode=modes.find(m=>m.id===e.target.value);setForm(old=>({...old,modeId:mode?.id||''}));}}>{modes.length?<option value="" disabled>Choose a mode</option>:<option value="">Add modes in Pricing settings (Mode card)</option>}{modes.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select>)}
      {field('Amount ($)',<input type="number" min="0" step="0.01" value={form.amount} onChange={e=>set('amount',e.target.value)} required/>)}
      {field('Currency',<select value={form.currency} onChange={e=>set('currency',e.target.value)}><option>CAD</option><option>USD</option></select>)}
      {field('Included quantity',<input type="number" min="1" step="1" value={form.includedQuantity} onChange={e=>set('includedQuantity',e.target.value)}/>)}
    </div>
    {form.conditions.length>0&&<p className="pp-note">{form.conditions.length} pricing condition{form.conditions.length>1?'s':''} kept unchanged.</p>}
    <div className="pp-actions"><button type="submit" className="pp-primary" disabled={busy}>{editing?'Save price':'Set price'}</button>{editing&&<button type="button" onClick={onCancel} disabled={busy}>Cancel edit</button>}</div>
  </form>;
}

export default function PricingPolicies({token,headSlot}){
  const [data,setData]=useState(null),[lists,setLists]=useState({feeCategories:[],pricingFactors:[],pricingModes:[]}),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[form,setForm]=useState(null),[editingId,setEditingId]=useState(null);
  const load=useCallback(async()=>{try{const [pricing,lists]=await Promise.all([apiRequest('/admin/pricing',{token}),apiRequest('/admin/pricing/lists',{token})]);setData(pricing);setLists({feeCategories:lists.feeCategories||[],pricingFactors:lists.pricingFactors||[],pricingModes:lists.pricingModes||[]});setError('');}catch(e){setError(e.message||'Could not load prices.');}},[token]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{if(data&&!form)setForm(blank(data.offerings[0]?.id||'',lists.pricingModes[0]));},[data,form,lists.pricingModes]);
  const modeName=price=>lists.pricingModes.find(m=>m.id===price.modeId)?.name||'—';
  // The priced data atoms the admin has set a price for, grouped by their own category (equipment under its service category).
  const groups=useMemo(()=>{
    const needle=query.trim().toLowerCase(),byAtom=new Map();
    for(const p of data?.policies||[])byAtom.set(p.offeringId,[...(byAtom.get(p.offeringId)||[]),p]);
    const map=new Map();
    for(const atom of data?.offerings||[]){
      const price=byAtom.get(atom.id)?.[0],group=groupOf(atom);
      if(!price)continue; // only what the admin has added
      if(needle&&!`${atom.name} ${group}`.toLowerCase().includes(needle))continue;
      map.set(group,[...(map.get(group)||[]),{atom,price}]);
    }
    return [...map.entries()].sort(([a],[b])=>groupNames(data.offerings).indexOf(a)-groupNames(data.offerings).indexOf(b)).map(([name,atoms])=>({name,label:groupLabels(data.offerings).get(name)||name,atoms:atoms.sort((x,y)=>x.atom.name.localeCompare(y.atom.name))}));
  },[data,query]);
  const priceOf=atomId=>data.policies.find(p=>p.offeringId===atomId);
  // Choosing an atom that already has a price loads it for editing; otherwise the form starts blank for that atom.
  const pickAtom=atomId=>{const existing=priceOf(atomId);setEditingId(existing?.id||null);setForm(existing?fromPolicy(existing):blank(atomId,lists.pricingModes[0]));};
  const open=(price)=>price?pickAtom(price.offeringId):pickAtom(data.offerings.find(o=>o.type!=='service')?.id||data.offerings[0]?.id||'');
  const send=async(path,options,done)=>{setBusy(true);try{await apiRequest(path,{token,...options});await load();done?.();return true;}catch(e){adminToast(e.message||'Could not save.',true);return false;}finally{setBusy(false);}};
  const save=()=>send(editingId?`/admin/pricing/policies/${editingId}`:'/admin/pricing/policies',{method:editingId?'PUT':'POST',body:toBody(form,offeringLabel(form.offeringId))},()=>{setEditingId(null);setForm(blank(data.offerings[0]?.id||'',lists.pricingModes[0]));});
  const offeringLabel=id=>data.offerings.find(o=>o.id===id)?.name||id;
  const remove=price=>{if(window.confirm(`Delete the price of “${offeringLabel(price.offeringId)}”?`))send(`/admin/pricing/policies/${price.id}`,{method:'DELETE'});};
  if(error)return <p className="pe-error" role="alert">{error}</p>;
  if(!data)return null;
  const warnings=data.issues?.length||0;
  const head=<div className="pp-head"><div><h2>Prices</h2><p>Each priced data atom has its own price. This is the only place prices are set.{warnings>0&&` ${warnings} data issue${warnings>1?'s':''} to review.`}</p></div>
      <div className="pp-tools"><label className="pp-search"><Search size={15} aria-hidden="true"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search prices…" aria-label="Search prices"/></label></div></div>;
  return <section className="pp" aria-label="Prices">
    {headSlot&&createPortal(head,headSlot)}
    <div className="pp-side">{form&&<Editor form={form} setForm={setForm} offerings={data.offerings} modes={lists.pricingModes} fees={lists.feeCategories} busy={busy} editing={Boolean(editingId)} onSave={save} onCancel={()=>open(null)} onAtom={pickAtom}/>}</div>
    <div className="pp-main">
    <div className="pp-table"><table aria-label="Prices"><thead><tr><th scope="col">Priced data atom</th><th scope="col">Classification</th><th scope="col">Mode</th><th scope="col">Price</th><th scope="col">Fee category</th><th scope="col"><span className="pp-sr">Actions</span></th></tr></thead>
      <tbody>{groups.map(group=><Fragment key={group.name}>
        <tr className="pp-group"><th scope="rowgroup" colSpan={6}>{group.label}<small> · {group.atoms.length}</small></th></tr>
        {group.atoms.map(({atom,price:p})=><tr key={p.id}>
          <th scope="row" className="pp-atom">{atom.name}{atom.isActive===false&&<small> · inactive</small>}</th>
          <td>{humanize(atom.type)}</td><td>{modeName(p)}</td>
          <td>{money(p.baseAmountCents||0)}</td>
          <td>{p.pricingUnits?.[0]?.type||'—'}</td>
          <td className="pp-row-actions"><button type="button" className="pp-icon" aria-label={`Edit the price of ${atom.name}`} title="Edit" onClick={()=>open(p)} disabled={busy}><Pencil size={14} aria-hidden="true"/></button><button type="button" className="pp-icon" aria-label={`Delete the price of ${atom.name}`} title="Delete" onClick={()=>remove(p)} disabled={busy}><Trash2 size={14} aria-hidden="true"/></button></td>
        </tr>)}
      </Fragment>)}</tbody></table>
      {groups.length===0&&<p className="pe-empty">{data.policies.length?'Nothing matches your search.':'No prices yet. Set one with the form.'}</p>}</div>
    </div>
  </section>;
}
