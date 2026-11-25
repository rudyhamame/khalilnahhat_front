// The pure part of the services tree (no React, no network). It is the one place that knows the special ids, how equipment links to a
// service, which booking steps exist, and how the tree is laid out. Plain modules (next-step logic, section lists) and the admin read it
// here; lib/tree.js feeds it whenever the catalogue loads or changes.
import {contract} from './eventOrderCore.mjs';
import {ATOM_KEYS,fieldCode,bookingTreeSource,bookingTreeAtomMounted,bookingTreeStepMounted} from './bookingAtoms.mjs';

// The ids the booking logic recognises: DJ and MC have their own steps; every other service is a plain rental.
export const DJ_ID='dj',MC_ID='mc';
// Ids the admin can pick for a new service (the others are made from the name).
export const KNOWN_SERVICE_IDS=Object.freeze([DJ_ID,MC_ID,'sound','lighting','video','effects']);
// The service keys the saved booking (the order contract) accepts. A catalogue service whose id is one of them keeps it; the rest save as 'rental'.
export const BOOKING_SERVICE_KEYS=Object.freeze(contract.sections.flatMap(section=>section.fields).find(field=>field.key==='services').options);

// Equipment belongs to the equipment category it points at (equipmentCategoryId; serviceId is its legacy name, still sent by the server).
// Items saved before either existed are matched once here, by their old category or the category's equipment list, so nothing else has to know.
export const categoryIdOf=row=>row.equipmentCategoryId||row.serviceId||'';
export function withEquipmentCategoryIds(catalog,equipment){
 const services=catalog.filter(row=>row.kind==='service');
 return equipment.map(row=>categoryIdOf(row)?{...row,equipmentCategoryId:categoryIdOf(row)}:{...row,equipmentCategoryId:services.find(service=>service.category===row.category||(service.equipmentIds||[]).includes(row.id))?.id||''});
}
export const equipmentInService=(row,service)=>categoryIdOf(row)===service.id;

// The tree as the admin aside shows it: live services in order with their equipment, removed services where they were, removed equipment
// under their service, plus ids that belong to nothing.
export function buildTreeNodes({services,equipment,removed={items:[],equipment:[]},otherId='other'}){
 const liveIds=new Set(services.map(service=>service.id));
 const nodes=[
  ...services.map(service=>({id:service.id,name:service.name,removed:false,order:service.id===otherId?1e9:(service.sortOrder??1e6),items:service.items??equipment.filter(row=>equipmentInService(row,service)),removedItems:removed.equipment.filter(row=>categoryIdOf(row)===service.id)})),
  ...removed.items.filter(row=>!liveIds.has(row.id)).map(row=>({id:row.id,name:'',removed:true,order:row.sortOrder??1e6+1,items:[],removedItems:removed.equipment.filter(item=>categoryIdOf(item)===row.id)})),
 ];
 const orphans=removed.equipment.filter(row=>!liveIds.has(categoryIdOf(row))&&!removed.items.some(item=>item.id===categoryIdOf(row)));
 return {nodes:nodes.map((node,at)=>({node,at})).sort((a,b)=>a.node.order-b.node.order||a.at-b.at).map(({node})=>node),orphans};
}
const EMPTY={dj:true,mc:true,rental:true,djName:'',djNameAr:''};
let steps=EMPTY;
export const treeSteps=()=>steps;
export function stepsOf(catalog){
 const services=catalog.filter(row=>row.kind==='service'&&row.isActive!==false),dj=services.find(row=>row.id===DJ_ID);
 return {dj:Boolean(dj),mc:services.some(row=>row.id===MC_ID),rental:services.some(row=>row.id!==DJ_ID&&row.id!==MC_ID&&!row.selectionField),djName:dj?.name||'',djNameAr:dj?.nameAr||''};
}
export function setTreeSteps(next){steps=next;}

// ---- Data atoms: every atom of the booking is a node of the tree, identified by its id (the field path), with the step it lives in
// and the branch of the tree that feeds it. The booking and the admin map both read the atoms from here.
const ATOM_SKIP=new Set(['event.venue.latitude','event.venue.longitude','event.venue.source','event.venue.sourceId','event.venue.sourceAttribution']);
// Where an atom's values come from: a branch of the tree ('services', 'events', 'music'), or the client / account when nothing is catalogued.
export const atomSource=bookingTreeSource;
const stepOfAtom=key=>parseInt(fieldCode(key).slice(0,2),10);
// A step is mounted only while its service id is in the tree; its atoms exist only then.
export const stepMounted=bookingTreeStepMounted;
export const atomMounted=bookingTreeAtomMounted;
export function treeAtoms(steps=treeSteps(),{includeMetadata=false}={}){
 return ATOM_KEYS.filter(key=>includeMetadata||!ATOM_SKIP.has(key)).map(key=>{
  const code=fieldCode(key),step=stepOfAtom(key);
  return {id:key,code,step,section:code.split('.').slice(0,2).join('.'),...atomSource(key),mounted:atomMounted(code,steps)};
 });
}
