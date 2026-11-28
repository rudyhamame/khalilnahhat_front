// The services tree: the buffer (memory) between the catalogue tables (services and equipments) and the Booking page.
// This is the ONLY booking-side reader of the catalogue. Steps, sections and data atoms read the tree; nothing in the booking
// talks to the catalogue directly. The tree is rebuilt whenever the catalogue loads or changes, and it is keyed by ids:
//  - a step or section exists only while its service id is in the tree (dj -> step 3, any rental service -> the Rental step),
//  - names and descriptions come from the tree, never from the page,
//  - equipment belongs to a service through its `equipmentCategoryId` (see rentalCatalog.js).
import {useEffect,useSyncExternalStore} from 'react';
import {apiRequest,fetchEquipment} from './api.js';
import {setTreeData,setTreeSteps,stepsOf,treeSteps,withEquipmentCategoryIds} from './treeCore.js';

let tree={catalog:[],equipment:[],loading:true,failed:false,steps:treeSteps()},inFlight=null,queued=false;
const listeners=new Set();

const publish=next=>{tree=next;setTreeSteps(next.steps);setTreeData(next);listeners.forEach(listener=>listener());};

// The server builds the tree (GET /api/tree: catalogue and equipment joined by id, with the steps that exist); this is the only place the
// booking fetches it. ponytail: the fallback below rebuilds the tree in the browser for a server that has no /tree yet; delete it once the
// backend that serves /tree is deployed everywhere.
async function fetchTree(){
 try{
  const data=await apiRequest('/tree');
  if(Array.isArray(data.catalog)&&Array.isArray(data.equipment)&&data.steps)return {catalog:data.catalog,equipment:data.equipment,steps:{mc:stepsOf(data.catalog).mc,...data.steps}}; // the server's steps carry no `mc` yet
 }catch{/* an older server: build the tree here */}
 const [catalog,equipment]=await Promise.all([apiRequest('/setup-catalog'),fetchEquipment()]);
 if(!Array.isArray(catalog.items)||!Array.isArray(equipment.items))throw new Error('Invalid rental catalog response');
 return {catalog:catalog.items,equipment:withEquipmentCategoryIds(catalog.items,equipment.items),steps:stepsOf(catalog.items)};
}
export function refreshTree(){
 if(inFlight){queued=true;return inFlight;}
 inFlight=fetchTree().then(next=>publish({...next,loading:false,failed:false})).catch(()=>publish({...tree,loading:false,failed:true})).finally(()=>{inFlight=null;if(queued){queued=false;refreshTree();}});
 return inFlight;
}
const refresh=()=>{refreshTree();};
const storage=event=>{if(event.key==='echo:catalog-revision')refresh();};
function subscribe(listener){
 if(!listeners.size){window.addEventListener('focus',refresh);window.addEventListener('echo:setup-catalog-changed',refresh);window.addEventListener('storage',storage);}
 listeners.add(listener);
 return()=>{listeners.delete(listener);if(!listeners.size){window.removeEventListener('focus',refresh);window.removeEventListener('echo:setup-catalog-changed',refresh);window.removeEventListener('storage',storage);}};
}

export {treeSteps};

export function useTree(){
 const state=useSyncExternalStore(subscribe,()=>tree,()=>tree);
 useEffect(()=>{if(!inFlight)refreshTree();},[]);
 return state;
}

// The name and description of one service node (matched by id) in the page language. `exists` is false while the tree loads or when
// the id is not in it; name and description are then empty.
export function useTreeService(id,ar=false){
 const {catalog}=useTree(),row=catalog.find(item=>item.kind==='service'&&item.id===id);
 return {exists:Boolean(row),name:(ar&&row?.nameAr)||row?.name||'',description:(ar&&row?.descriptionAr)||row?.description||''};
}

// Which booking steps exist. Neither is mounted until the tree has loaded and confirms its service.
export function useTreeSteps(){
 const {loading,steps}=useTree();
 return {dj:!loading&&steps.dj,mc:!loading&&steps.mc,rental:!loading&&steps.rental};
}
