import {useEffect,useSyncExternalStore} from 'react';
import {apiRequest,fetchEquipment} from './api';

let snapshot={catalog:[],equipment:[],loading:true,failed:false},inFlight=null,queued=false;
const listeners=new Set();
const publish=next=>{snapshot=next;listeners.forEach(listener=>listener());};
export function refreshRentalCatalog(){
 if(inFlight){queued=true;return inFlight;}
 inFlight=Promise.all([apiRequest('/setup-catalog'),fetchEquipment()]).then(([catalog,equipment])=>{
  if(!Array.isArray(catalog.items)||!Array.isArray(equipment.items))throw new Error('Invalid rental catalog response');
  publish({catalog:catalog.items,equipment:equipment.items,loading:false,failed:false});
 }).catch(()=>publish({...snapshot,loading:false,failed:true})).finally(()=>{inFlight=null;if(queued){queued=false;refreshRentalCatalog();}});
 return inFlight;
}
const refresh=()=>{refreshRentalCatalog();};
const changed=refresh;
const storage=event=>{if(event.key==='echo:catalog-revision')refresh();};
function subscribe(listener){
 if(!listeners.size){window.addEventListener('focus',refresh);window.addEventListener('echo:setup-catalog-changed',changed);window.addEventListener('storage',storage);}
 listeners.add(listener);
 return()=>{listeners.delete(listener);if(!listeners.size){window.removeEventListener('focus',refresh);window.removeEventListener('echo:setup-catalog-changed',changed);window.removeEventListener('storage',storage);}};
}
export function useRentalCatalog(){
 const state=useSyncExternalStore(subscribe,()=>snapshot,()=>snapshot);
 useEffect(()=>{if(!inFlight)refreshRentalCatalog();},[]);
 return state;
}
