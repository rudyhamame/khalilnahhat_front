import {aiFields,decodePatchValue,validValue,applyOrderPatch,getPath} from './eventOrderCore.mjs';
import {resolveDraftEquipment} from './draftEquipment.js';
import {reconcileEquipmentServices} from './rentalCatalog.js';

export function sameDraftValue(path,left,right){
 const value=rows=>(rows||[]).map(({id,quantity})=>({id,quantity}));
 return JSON.stringify(path==='equipment'?value(left):left)===JSON.stringify(path==='equipment'?value(right):right);
}

// Manual controls and both AI transports commit through the same canonical order.
// The returned order is the exact snapshot to persist, without waiting for a render.
export function prepareBookingDraftEdit(order,patch,{catalog=[],equipment=[]}={}){
 const rejectedFields=[],values=new Map();
 for(const change of Array.isArray(patch)?patch:[]){
  const field=aiFields.find(field=>field.key===change?.path);
  const value=field?decodePatchValue(field,change.value):undefined;
  if(!field||!validValue(field,value)){rejectedFields.push(String(change?.path||'unknown'));continue;}
  if(field.key==='equipment'){
   try{resolveDraftEquipment(value,equipment);}catch{rejectedFields.push(field.key);continue;}
  }
  values.set(field.key,value);
 }
 const accepted=[...values].map(([path,value])=>({path,value}));
 let next=applyOrderPatch(order,accepted);
 const equipmentChanged=values.has('equipment');
 if(equipmentChanged||values.has('services')){
  const asCart=rows=>Object.fromEntries((rows||[]).map(row=>[row.id,row]));
  next={...next,services:reconcileEquipmentServices(next.services||[],asCart(order.equipment),asCart(next.equipment),catalog,equipment)};
 }
 const updatedFields=accepted.filter(({path,value})=>sameDraftValue(path,getPath(next,path),value));
 for(const change of accepted)if(!updatedFields.some(field=>field.path===change.path))rejectedFields.push(change.path);
 return {order:next,updatedFields,rejectedFields:[...new Set(rejectedFields)],equipmentChanged,draftUpdated:updatedFields.length>0};
}

export function createAiTaskWriter(){
 let chain=Promise.resolve();
 return {
  enqueue(tasks,{isCurrent,commit,record,onError=()=>{}}){
   const operation=chain.catch(()=>{}).then(async()=>{
    if(!isCurrent())return {draftUpdated:false,updatedFields:[],rejectedFields:[],saved:false};
    const changes=tasks.flatMap(task=>task.changes);
    let result;
    try{result=await commit(changes);}catch(error){result={draftUpdated:false,updatedFields:[],rejectedFields:changes.map(change=>change.path),saved:false};onError(error);}
    if(!isCurrent())return {...result,saved:false};
    record(tasks.map(({task,changes})=>({...task,autoConfirmed:true,confirmed:result.saved===true&&changes.every(change=>result.updatedFields.some(field=>field.path===change.path))})));
    return result;
   });
   chain=operation;return operation;
  },
  flush:()=>chain,
 };
}
