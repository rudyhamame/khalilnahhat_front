import {useEffect,useState} from 'react';
import {apiRequest} from '../lib/api';
import './equipmentQuantity.css';
export default function EquipmentQuantityField({equipmentId,name,availableQuantity,token,onSaved}){
 const [value,setValue]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[saved,setSaved]=useState(null);
 useEffect(()=>{setValue(availableQuantity==null?'':String(availableQuantity));setSaved(availableQuantity);},[equipmentId,availableQuantity]);
 const save=async()=>{
  const quantity=value.trim()===''?null:Number(value);
  if(quantity===null||!Number.isSafeInteger(quantity)||quantity<0){setMessage('Enter a whole number of 0 or more.');return;}
  setBusy(true);setMessage('');
  try{const result=await apiRequest(`/equipment/${encodeURIComponent(equipmentId)}`,{method:'PATCH',token,body:{quantityOwned:quantity,stockTracked:true}});setSaved(result.item.availableQuantity);setMessage('Quantity saved.');onSaved?.();}catch(e){setMessage(e.message);}finally{setBusy(false);}
 };
 if(!equipmentId)return <span className="equipment-quantity-na">Not applicable</span>;
 return <div className="equipment-quantity-field"><div><input aria-label={`Available quantity for ${name}`} type="number" min="0" step="1" value={value} placeholder="Not set" onChange={e=>{setValue(e.target.value);setMessage('');}}/><button type="button" disabled={busy||value===''||Number(value)===saved} onClick={save}>{busy?'Saving…':'Save qty'}</button></div><small>{saved==null?'Confirm availability':saved===0?'Unavailable':`${saved} in stock`}</small>{message&&<small role="status">{message}</small>}</div>;
}
