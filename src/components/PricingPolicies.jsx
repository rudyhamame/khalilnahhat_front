import {Fragment,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Pencil,Search,Trash2,X} from 'lucide-react';
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
const blankUnit=mode=>({type:'',amount:'',modeId:mode?.id||'',currency:'CAD',includedQuantity:'',factors:[]});
const blank=(offeringId)=>({offeringId,units:[],conditions:[]});
const blankOffer=()=>({offeringId:'',units:[],conditions:[],offer:{id:null,name:'',components:[]}});
const fromPolicy=(p)=>({offeringId:p.offeringId,units:(p.pricingUnits||[]).map(unit=>({type:unit.type,amount:unit.amountCents?String(unit.amountCents/100):'0',modeId:unit.modeId||p.modeId||'',currency:unit.currency||p?.currency||'CAD',includedQuantity:unit.includedQuantity??p.includedQuantity??'',factors:unit.factors||[]})),conditions:p.conditions||[]});
// Each priced data atom has one record: a base amount plus any number of fee categories, each holding its own price. The record is stored as an always-active policy named after the atom.
const toBody=(f,atomName)=>{
  const units=f.units.filter(unit=>unit.type),first=units[0];
  return {offeringId:f.offeringId,name:atomName,pricingMode:'fixed',...(first?.modeId?{modeId:first.modeId}:{}),currency:first?.currency||'CAD',baseAmountCents:0,
    effectiveFrom:'',effectiveUntil:'',priority:0,status:'active',tiers:[],
    pricingUnits:units.map(unit=>({type:unit.type,amountCents:toCents(unit.amount),...(unit.modeId?{modeId:unit.modeId}:{}),currency:unit.currency||'CAD',...(unit.includedQuantity!==''?{includedQuantity:Number(unit.includedQuantity)}:{}),factors:unit.factors||[]})),conditions:f.conditions};
};

function Editor({form,setForm,offerings,modes,fees,busy,editing,fromTable,onSave,onCancel,onAtom}){
  const set=(key,value)=>setForm(old=>({...old,[key]:value}));
  const setUnit=(index,patch)=>set('units',form.units.map((unit,at)=>at===index?{...unit,...patch}:unit));
  const field=(label,input)=><label className="pp-field"><span>{label}</span>{input}</label>;
  // The Priced data atom type select chooses which kind of priced data atom the price is for (equipment items and packages, or services).
  const isService=atom=>atom.type==='service',current=offerings.find(o=>o.id===form.offeringId),tab=current&&isService(current)?'service':'equipment';
  const visible=offerings.filter(o=>!o.offer&&(tab==='service')===isService(o));
  const pickTab=next=>{if(next!==tab)onAtom(offerings.find(o=>(next==='service')===isService(o))?.id||'');};
  const offer=form.offer,noun=offer?'offer':'price',setOffer=patch=>set('offer',{...offer,...patch}),setPart=(index,patch)=>setOffer({components:offer.components.map((part,at)=>at===index?{...part,...patch}:part)});
  const bundleAtoms=offerings.filter(o=>!o.offer);
  return <form className="pp-editor" onSubmit={event=>{event.preventDefault();onSave();}} aria-label={`${editing||offer?.id?'Edit':'Add'} ${noun}`}>
    <header className="pp-editor-head"><div><h3>{editing||offer?.id?'Edit':'Add'} {noun}</h3><p>{offer?'Bundle more than one data atom, services and equipment, into one offer and give it a price.':editing?'Change this priced data atom’s price.':'Choose a priced data atom and give it a price.'}</p></div><button type="button" className="pp-close" onClick={onCancel} disabled={busy} aria-label="Close" title="Close"><X size={18} aria-hidden="true"/></button></header>
    {offer?<>
      <div className="pp-grid">{field('Offer name',<input value={offer.name} onChange={e=>setOffer({name:e.target.value})} maxLength={120} placeholder="e.g. Wedding package" required/>)}</div>
      <fieldset className="pp-fees pp-bundle"><legend>Data atoms <small>services and equipment in this offer</small></legend>
        {offer.components.map((part,index)=><div className="pp-bundle-row" key={index}>
          <select aria-label="Data atom" value={part.offeringId} onChange={e=>setPart(index,{offeringId:e.target.value})} required><option value="" disabled>Choose a service or equipment</option>{['service','equipment'].map(kind=><optgroup key={kind} label={kind==='service'?'Services':'Equipment'}>{bundleAtoms.filter(o=>(o.type==='service')===(kind==='service')&&(o.id===part.offeringId||!offer.components.some(other=>other.offeringId===o.id))).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</optgroup>)}</select>
          <input aria-label="Quantity" type="number" min="1" step="1" value={part.quantity} onChange={e=>setPart(index,{quantity:Math.max(1,Number(e.target.value)||1)})}/>
          <button type="button" className="pp-fee-remove" aria-label="Remove data atom" title="Remove" onClick={()=>setOffer({components:offer.components.filter((_,at)=>at!==index)})}><X size={15} aria-hidden="true"/></button>
        </div>)}
        <button type="button" className="pp-fee-add" onClick={()=>setOffer({components:[...offer.components,{offeringId:'',quantity:1}]})}>+ Add data atom</button>
      </fieldset>
    </>:(
    <div className="pp-grid">
      {!fromTable&&field('Priced data atom type',<select value={tab} onChange={e=>pickTab(e.target.value)}><option value="equipment">Equipment</option><option value="service">Service</option></select>)}
      {field('Priced data atom',<select value={form.offeringId} onChange={e=>onAtom(e.target.value)} required>{tab==='service'?visible.map(o=><option key={o.id} value={o.id}>{o.name}</option>):groupNames(visible).map(group=><optgroup key={group} label={groupLabels(offerings).get(group)||group}>{visible.filter(o=>groupOf(o)===group).map(o=><option key={o.id} value={o.id}>{o.name}</option>)}</optgroup>)}</select>)}
    </div>)}
    <fieldset className="pp-fees"><legend>Fee categories <small>each holds its own mode, currency, amount and quantity</small></legend>
      {form.units.map((unit,index)=><div className="pp-fee-row" key={index}>
        <div className="pp-fee-top">
          <select aria-label="Fee category" value={unit.type} onChange={e=>setUnit(index,{type:e.target.value})} required><option value="" disabled>Choose a category</option>{[...new Set([...fees.map(f=>f.name),unit.type].filter(Boolean))].filter(name=>name===unit.type||!form.units.some(other=>other.type===name)).map(name=><option key={name} value={name}>{name}</option>)}</select>
          <button type="button" className="pp-fee-remove" aria-label={`Remove ${unit.type||'category'}`} title="Remove" onClick={()=>set('units',form.units.filter((_,at)=>at!==index))}><X size={15} aria-hidden="true"/></button>
        </div>
        <div className="pp-fee-fields">
          <label><span>Pricing mode</span><select value={unit.modeId} required disabled={!modes.length} onChange={e=>setUnit(index,{modeId:e.target.value})}>{modes.length?<option value="" disabled>Choose a mode</option>:<option value="">Add modes in Pricing settings (Mode card)</option>}{modes.map(m=><option key={m.id} value={m.id}>{m.name}</option>)}</select></label>
          <label><span>Currency</span><select value={unit.currency} onChange={e=>setUnit(index,{currency:e.target.value})}><option>CAD</option><option>USD</option></select></label>
          <label><span>Amount ($)</span><input type="number" min="0" step="0.01" placeholder="0.00" value={unit.amount} onChange={e=>setUnit(index,{amount:e.target.value})} required/></label>
          <label><span>Quantity</span><input type="number" min="1" step="1" placeholder="1" value={unit.includedQuantity} onChange={e=>setUnit(index,{includedQuantity:e.target.value})}/></label>
        </div>
      </div>)}
      {form.units.length<fees.length&&<button type="button" className="pp-fee-add" onClick={()=>set('units',[...form.units,blankUnit(modes[0])])}>+ Add fee category</button>}
      {fees.length===0&&<p className="pp-note">Add fee categories in Pricing settings first.</p>}
    </fieldset>
        {form.conditions.length>0&&<p className="pp-note">{form.conditions.length} pricing condition{form.conditions.length>1?'s':''} kept unchanged.</p>}
    <div className="pp-actions"><button type="submit" className="pp-primary" disabled={busy}>{editing?'Save price':'Add price'}</button><button type="button" onClick={onCancel} disabled={busy}>Cancel</button></div>
  </form>;
}

export default function PricingPolicies({token,headSlot,view='prices'}){
  const [data,setData]=useState(null),[lists,setLists]=useState({feeCategories:[],pricingFactors:[],pricingModes:[]}),[query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[form,setForm]=useState(null),[editingId,setEditingId]=useState(null),[dialogOpen,setDialogOpen]=useState(false),[fromTable,setFromTable]=useState(false),dialog=useRef(null);
  useEffect(()=>{const el=dialog.current;if(!el)return;if(dialogOpen&&!el.open)el.showModal();else if(!dialogOpen&&el.open)el.close();});
  const load=useCallback(async()=>{try{const [pricing,lists]=await Promise.all([apiRequest('/admin/pricing',{token}),apiRequest('/admin/pricing/lists',{token})]);setData(pricing);setLists({feeCategories:lists.feeCategories||[],pricingFactors:lists.pricingFactors||[],pricingModes:lists.pricingModes||[]});setError('');}catch(e){setError(e.message||'Could not load prices.');}},[token]);
  useEffect(()=>{load();},[load]);
  useEffect(()=>{setForm(null);setEditingId(null);setDialogOpen(false);},[view]);
  useEffect(()=>{if(data&&!form)setForm(blank(data.offerings[0]?.id||'',lists.pricingModes[0]));},[data,form,lists.pricingModes]);
  const modeName=unit=>lists.pricingModes.find(m=>m.id===unit.modeId)?.name||'—';
  // The priced data atoms the admin has set a price for, grouped by their own category (equipment under its service category).
  const groups=useMemo(()=>{
    const needle=query.trim().toLowerCase(),byAtom=new Map();
    for(const p of data?.policies||[])byAtom.set(p.offeringId,[...(byAtom.get(p.offeringId)||[]),p]);
    const map=new Map();
    for(const atom of data?.offerings||[]){
      const price=byAtom.get(atom.id)?.[0],group=atom.offer?'offers':groupOf(atom);
      if(Boolean(atom.offer)!==(view==='offers'))continue; // Prices lists data atoms, Offers lists the bundles
      if(!price&&!atom.offer)continue; // only what the admin has added
      if(needle&&!`${atom.name} ${group}`.toLowerCase().includes(needle))continue;
      map.set(group,[...(map.get(group)||[]),{atom,price}]);
    }
    return [...map.entries()].sort(([a],[b])=>groupNames(data.offerings).indexOf(a)-groupNames(data.offerings).indexOf(b)).map(([name,atoms])=>({name,label:name==='offers'?'Offers':groupLabels(data.offerings).get(name)||name,atoms:atoms.sort((x,y)=>x.atom.name.localeCompare(y.atom.name))}));
  },[data,query,view]);
  const priceOf=atomId=>data.policies.find(p=>p.offeringId===atomId);
  // Choosing an atom that already has a price loads it for editing; otherwise the form starts blank for that atom.
  const pickAtom=atomId=>{const existing=priceOf(atomId);setEditingId(existing?.id||null);setForm(existing?fromPolicy(existing):blank(atomId,lists.pricingModes[0]));};
  // Adding starts on a priced data atom that has no price yet, as a new record (never as an edit of an existing one).
  const addPrice=()=>{const plain=data.offerings.filter(o=>!o.offer),free=plain.find(o=>o.type!=='service'&&!priceOf(o.id))||plain.find(o=>!priceOf(o.id))||plain[0];setEditingId(null);setForm(blank(free?.id||'',lists.pricingModes[0]));setFromTable(false);setDialogOpen(true);};
  const addOffer=()=>{setEditingId(null);setForm(blankOffer());setFromTable(false);setDialogOpen(true);};
  const openOffer=(atom,price)=>{setEditingId(price?.id||null);setForm({...(price?fromPolicy(price):{units:[],conditions:[]}),offeringId:atom.id,offer:{id:atom.id,name:atom.name,components:(atom.components||[]).map(c=>({offeringId:c.offeringId,quantity:c.quantity}))}});setFromTable(true);setDialogOpen(true);};
  const removeOffer=atom=>{if(window.confirm(`Delete the offer “${atom.name}” and its price?`))send(`/admin/pricing/offers/${encodeURIComponent(atom.id)}`,{method:'DELETE'});};
  const open=(price)=>price?pickAtom(price.offeringId):pickAtom(data.offerings.find(o=>o.type!=='service')?.id||data.offerings[0]?.id||'');
  const send=async(path,options,done)=>{setBusy(true);try{await apiRequest(path,{token,...options});await load();done?.();return true;}catch(e){adminToast(e.message||'Could not save.',true);return false;}finally{setBusy(false);}};
  const resetForm=()=>{setEditingId(null);setForm(view==='offers'?blankOffer():blank(data.offerings.find(o=>!o.offer)?.id||''));setDialogOpen(false);};
  const save=async()=>{
    if(form.offer){
      setBusy(true);
      try{
        const body={name:form.offer.name.trim(),components:form.offer.components.filter(part=>part.offeringId)};
        const {offer}=await apiRequest(form.offer.id?`/admin/pricing/offers/${encodeURIComponent(form.offer.id)}`:'/admin/pricing/offers',{token,method:form.offer.id?'PUT':'POST',body});
        const hasPrice=form.units.some(unit=>unit.type);
        if(hasPrice)await apiRequest(editingId?`/admin/pricing/policies/${editingId}`:'/admin/pricing/policies',{token,method:editingId?'PUT':'POST',body:toBody({...form,offeringId:offer.id},offer.name)});
        await load();resetForm();
      }catch(e){adminToast(e.message||'Could not save.',true);}finally{setBusy(false);}
      return;
    }
    return send(editingId?`/admin/pricing/policies/${editingId}`:'/admin/pricing/policies',{method:editingId?'PUT':'POST',body:toBody(form,offeringLabel(form.offeringId))},resetForm);
  };
  const offeringLabel=id=>data.offerings.find(o=>o.id===id)?.name||id;
  const remove=price=>{if(window.confirm(`Delete the price of “${offeringLabel(price.offeringId)}”?`))send(`/admin/pricing/policies/${price.id}`,{method:'DELETE'});};
  if(error)return <p className="pe-error" role="alert">{error}</p>;
  if(!data)return null;
  const warnings=data.issues?.length||0;
  const head=<div className="pp-head"><div><h2>{view==='offers'?'Offers':'Prices'}</h2><p>{view==='offers'?'An offer bundles more than one data atom, services and equipment, under one price.':'Each priced data atom has its own price. This is the only place prices are set.'}{warnings>0&&` ${warnings} data issue${warnings>1?'s':''} to review.`}</p></div>
      <div className="pp-tools"><label className="pp-search"><Search size={15} aria-hidden="true"/><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder={view==='offers'?'Search offers…':'Search prices…'} aria-label={view==='offers'?'Search offers':'Search prices'}/></label><button type="button" className="pp-primary" onClick={view==='offers'?addOffer:addPrice}>{view==='offers'?'Add offer':'Add price'}</button></div></div>;
  return <section className="pp" aria-label="Prices">
    {headSlot&&createPortal(head,headSlot)}
    <dialog ref={dialog} className="pp-dialog" aria-label={form?.offer?'Offer':editingId?'Edit price':'Add price'} onClose={()=>setDialogOpen(false)} onClick={event=>{if(event.target===dialog.current)setDialogOpen(false);}}>{form&&<Editor form={form} setForm={setForm} offerings={data.offerings} modes={lists.pricingModes} fees={lists.feeCategories} busy={busy} editing={Boolean(editingId)} fromTable={fromTable} onSave={save} onCancel={()=>{open(null);setDialogOpen(false);}} onAtom={pickAtom}/>}</dialog>
    <div className="pp-main">
    <div className="pp-table"><table aria-label={view==='offers'?'Offers':'Prices'}><thead><tr><th scope="col">{view==='offers'?'Offer':'Priced data atom'}</th><th scope="col">Classification</th><th scope="col" className="pp-fee-head"><span>Fee category and sub-price</span><span className="pp-fee-subhead"><i>Fee category</i><i>Sub-price</i></span></th><th scope="col">Total Price</th><th scope="col"><span className="pp-sr">Actions</span></th></tr></thead>
      <tbody>{groups.map(group=><Fragment key={group.name}>
        <tr className="pp-group"><th scope="rowgroup" colSpan={5}>{group.label}<small> · {group.atoms.length}</small></th></tr>
        {group.atoms.map(({atom,price:p})=><tr key={atom.id}>
          <th scope="row" className="pp-atom">{atom.name}{atom.isActive===false&&<small> · inactive</small>}{atom.offer&&<small className="pp-offer-atoms">{(atom.components||[]).map(c=>`${data.offerings.find(o=>o.id===c.offeringId)?.name||c.offeringId}${c.quantity>1?` × ${c.quantity}`:''}`).join(' · ')}</small>}</th>
          <td>{atom.offer?'Offer':humanize(atom.type)}</td>
          <td className="pp-fee-cell">{p?.pricingUnits?.length?p.pricingUnits.map(unit=><div className="pp-fee-sub" key={unit.type} title={`${modeName(unit)} · ${unit.currency||p?.currency||'CAD'}${unit.includedQuantity?` · qty ${unit.includedQuantity}`:''}`}><span>{unit.type}<small>{modeName(unit)}{unit.includedQuantity?` · qty ${unit.includedQuantity}`:''}{(unit.currency||p?.currency)&&(unit.currency||p?.currency)!=='CAD'?` · ${unit.currency||p?.currency}`:''}</small></span><b>{money(unit.amountCents||0)}</b></div>):'—'}</td>
          <td className="pp-total">{p?money((p.baseAmountCents||0)+(p.pricingUnits||[]).reduce((sum,unit)=>sum+(unit.amountCents||0),0)):'—'}</td>
          <td className="pp-row-actions"><button type="button" className="pp-icon" aria-label={`Edit ${atom.offer?'the offer':'the price of'} ${atom.name}`} title="Edit" onClick={()=>{if(atom.offer)openOffer(atom,p);else{open(p);setFromTable(true);setDialogOpen(true);}}} disabled={busy}><Pencil size={14} aria-hidden="true"/></button><button type="button" className="pp-icon" aria-label={`Delete ${atom.offer?'the offer':'the price of'} ${atom.name}`} title="Delete" onClick={()=>atom.offer?removeOffer(atom):remove(p)} disabled={busy}><Trash2 size={14} aria-hidden="true"/></button></td>
        </tr>)}
      </Fragment>)}</tbody></table>
      {groups.length===0&&<p className="pe-empty">{query?'Nothing matches your search.':view==='offers'?'No offers yet. Add one with the button above.':'No prices yet. Set one with the form.'}</p>}</div>
    </div>
  </section>;
}
