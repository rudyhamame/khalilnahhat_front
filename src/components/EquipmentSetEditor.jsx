import {notifyCatalogChanged} from '../lib/catalogChanges';
import {useEffect,useMemo,useState} from 'react';
import {Check,Layers,Search,Trash2,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {GalleryImageField} from '../echo/GalleryPicker';
import {buildSetModelParts,isEquipmentSet,setMembersFromItem} from './equipmentSets';
import './equipmentSetEditor.css';

export default function EquipmentSetEditor({item,equipment,services,category,token,onDraft,onSaved,onCancel,report}){
 const [value,setValue]=useState(()=>({name:item?.name||'',category:item?.category||'sets',price:((item?.priceCents||0)/100).toFixed(2),quantityOwned:String(item?.quantityOwned??1),description:item?.description||'',imageUrl:item?.imageUrl||'',isActive:item?.isActive!==false,members:setMembersFromItem(item,equipment)}));
 const [query,setQuery]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const set=(key,value)=>setValue(current=>({...current,[key]:value}));
 const choices=equipment.filter(row=>row.id!==item?.id&&!isEquipmentSet(row));
 const parts=useMemo(()=>{
  if(!item?.setItems?.length&&item?.modelParts?.length&&JSON.stringify(value.members)===JSON.stringify(setMembersFromItem(item,equipment)))return item.modelParts;
  const resolved=new Set(setMembersFromItem(item,equipment).map(member=>member.equipmentId));
  const legacy=(item?.modelParts||[]).filter(part=>!equipment.some(row=>resolved.has(row.id)&&row.modelUrl===part.src));
  return [...buildSetModelParts(value.members,equipment),...legacy];
 },[value.members,equipment,item]);
 const pieceCount=value.members.reduce((total,member)=>total+member.quantity,0);
 const missingModels=value.members.filter(member=>!equipment.find(row=>row.id===member.equipmentId)?.modelUrl);
 useEffect(()=>{onDraft({...value,id:item?.id||'__new',slug:item?.id||'__new-set',price:value.price,isSet:true,setItems:value.members,modelParts:parts,stockTracked:true,minQuantity:1});},[value,parts,item,onDraft]);
 useEffect(()=>()=>onDraft(null),[onDraft]);
 const toggle=row=>set('members',value.members.some(member=>member.equipmentId===row.id)?value.members.filter(member=>member.equipmentId!==row.id):[...value.members,{equipmentId:row.id,quantity:1,x:value.members.length*1.5,y:0,z:0,rotation:0}]);
 const patchMember=(id,key,next)=>set('members',value.members.map(member=>member.equipmentId===id?{...member,[key]:next}:member));
 const save=async event=>{
  event.preventDefault();setError('');
  const priceCents=Math.round(Number(value.price)*100),quantityOwned=Number(value.quantityOwned);
  if(!value.name.trim()){setError('Enter a set name.');return;}
  if(!Number.isFinite(priceCents)||priceCents<0||!Number.isSafeInteger(quantityOwned)||quantityOwned<0){setError('Enter a valid price and available set quantity.');return;}
  if(pieceCount<2&&parts.length<2){setError('Include at least two pieces. You can select one equipment type with a quantity of two.');return;}
  if(parts.some(part=>Math.abs(part.x)>100||Math.abs(part.z)>100)){setError('Keep all 3D pieces within 100 metres of the center.');return;}
  if(pieceCount>32||parts.length>32){setError('A set can contain up to 32 pieces.');return;}
  if(value.members.some(member=>!equipment.some(row=>row.id===member.equipmentId))){setError('Remove unavailable equipment from this set before saving.');return;}
  const body={name:value.name.trim(),category:value.category,description:value.description.trim(),imageUrl:value.imageUrl,priceCents,quantityOwned,stockTracked:true,isActive:value.isActive,isSet:true,setItems:value.members,modelParts:parts};
  setBusy(true);
  try{
   const slug=(value.name.toLowerCase().trim().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,60)||'equipment')+'-set-'+Date.now().toString(36);
   const result=await apiRequest(item?`/equipment/${item.id}`:'/equipment',{method:item?'PATCH':'POST',token,body:item?body:{slug,minQuantity:1,...body}});
   await onSaved(result.item.id);report(`${body.name} saved.`);notifyCatalogChanged();
  }catch(error){setError(error.message||'The set could not be saved.');}finally{setBusy(false);}
 };
 return <aside className="catalog-entry-dialog catalog-event-editor equipment-editor equipment-set-editor" aria-label="Set editor"><form onSubmit={save} onInvalid={event=>event.target.closest('details')?.setAttribute('open','')}>
  <header className="equipment-editor-header"><span className="equipment-editor-icon"><Layers size={21}/></span><div><small>EQUIPMENT SET</small><h3>{item?'Edit set':'New set'}</h3></div><button type="button" aria-label="Close set form" onClick={onCancel} disabled={busy}><X size={17}/></button></header>
  <fieldset className="equipment-editor-body" disabled={busy}>
   {error&&<p className="set-form-error" role="alert">{error}</p>}
   <section className="equipment-editor-section"><h4><span>01</span>Set details</h4>
    <label>Set name<input autoFocus required maxLength={160} value={value.name} placeholder="Name your equipment set" onChange={event=>set('name',event.target.value)}/></label>
    <div className="equipment-editor-pair"><label>Set price (CAD)<input required type="number" min="0" step="0.01" value={value.price} onChange={event=>set('price',event.target.value)}/></label><label>Available sets<input required type="number" min="0" step="1" value={value.quantityOwned} onChange={event=>set('quantityOwned',event.target.value)}/></label></div>
    <label>Description<textarea rows={2} maxLength={2000} value={value.description} onChange={event=>set('description',event.target.value)} placeholder="What is included in this set?"/></label>
   </section>
   <section className="equipment-editor-section"><h4><span>02</span>Included equipment <small>{pieceCount} pieces</small></h4>
    <label className="set-equipment-search"><Search size={14}/><input type="search" aria-label="Find equipment for set" placeholder="Find equipment" value={query} onChange={event=>setQuery(event.target.value)}/></label>
    <div className="set-equipment-picker">{choices.filter(row=>`${row.name} ${row.brandModel||''}`.toLowerCase().includes(query.toLowerCase())).map(row=>{const selected=value.members.find(member=>member.equipmentId===row.id);return <div className={`set-equipment-choice${selected?' is-selected':''}`} key={row.id}>
     <label><input type="checkbox" checked={Boolean(selected)} onChange={()=>toggle(row)}/>{row.imageUrl&&<img className="set-equipment-thumb" src={row.imageUrl} alt="" loading="lazy"/>}<span>{row.name}<small>{row.modelUrl?'3D model available':'No 3D model yet'}</small></span></label>
     {selected&&<input type="number" min="1" max="32" step="1" aria-label={`Quantity of ${row.name} in set`} value={selected.quantity} onChange={event=>patchMember(row.id,'quantity',Math.max(1,Math.min(32,Math.floor(Number(event.target.value))||1)))}/>}
    </div>;})}{!choices.length&&<p>Add equipment to the catalog first.</p>}</div>
    {missingModels.length>0&&<p className="set-form-note">{missingModels.length} selected equipment {missingModels.length===1?'type has':'types have'} no 3D model. They remain in the set and will not appear in its 3D preview.</p>}
   </section>
   {value.members.length>0&&<details className="equipment-editor-optional"><summary><span>3D placement<small>Position each equipment type within the set</small></span></summary><div className="equipment-editor-details-body">{value.members.map(member=><div className="set-placement" key={member.equipmentId}><strong>{equipment.find(row=>row.id===member.equipmentId)?.name||'Equipment no longer available'}</strong>{[['x','Left / right (m)',-100,100],['y','Height above floor (m)',0,100],['z','Front / back (m)',-100,100],['rotation','Rotation (°)',-360,360]].map(([key,label,min,max])=><label key={key}>{label}<input type="number" required min={min} max={max} step="any" value={member[key]??0} onChange={event=>patchMember(member.equipmentId,key,Number(event.target.value))}/></label>)}<button type="button" onClick={()=>set('members',value.members.filter(row=>row.equipmentId!==member.equipmentId))}><Trash2 size={13}/>Remove from set</button></div>)}</div></details>}
   <section className="equipment-editor-section"><h4><span>03</span>Set cover</h4><GalleryImageField token={token} label="Set photo" previewPicks value={value.imageUrl} onChange={url=>set('imageUrl',url)}/></section>
  </fieldset>
  <footer><label className="cat-switch set-active-toggle"><input type="checkbox" checked={value.isActive} disabled={busy} onChange={event=>set('isActive',event.target.checked)}/><i aria-hidden="true"/><span>{value.isActive?'Available':'Unavailable'}</span></label><button type="submit" className="catalog-save" disabled={busy}><Check size={16}/>{busy?'Saving…':item?'Save set':'Create set'}</button></footer>
 </form></aside>;
}
