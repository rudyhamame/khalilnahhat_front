// Catalog display IDs may be custom; the event-order contract uses these stable
// service keys. Custom service equipment is requested through equipment rental.
import {BOOKING_SERVICE_KEYS,MC_ID,equipmentInService as inService} from './treeCore.js';
const bookingServiceIds=new Set(BOOKING_SERVICE_KEYS);
export const isCatalogSet=item=>Boolean(item?.isSet||item?.setItems?.length||item?.modelParts?.length);
export const bookingServiceId=service=>bookingServiceIds.has(service.id)?service.id:'rental';
// Hosting decisions are explicit; their accessories are equipment rental.
export const equipmentBookingServiceId=service=>(service.selectionField||service.id===MC_ID)?'rental':bookingServiceId(service);
// An item belongs to the service it points to (serviceId); the tree fills serviceId for older items (treeCore.withServiceIds).
export const equipmentInService=inService;
export function equipmentBelongsToService(item,service,equipment){
 const direct=row=>equipmentInService(row,service);
 if(direct(item))return true;
 if(!isCatalogSet(item))return false;
 return (item.setItems||[]).some(member=>{const row=equipment.find(row=>row.id===member.equipmentId);return row&&direct(row);});
}
export function reconcileEquipmentServices(current,previous,next,catalog,equipment){
 const result=new Set(current);
 const groups=new Map();
 for(const service of catalog.filter(row=>row.kind==='service'&&row.isActive!==false)){
  const id=equipmentBookingServiceId(service),rows=groups.get(id)||[];rows.push(service);groups.set(id,rows);
 }
 for(const [id,services] of groups){
  const has=cart=>equipment.some(item=>(cart[item.id]?.quantity||0)>0&&services.some(service=>equipmentBelongsToService(item,service,equipment)));
  if(has(next))result.add(id);else if(has(previous))result.delete(id);
 }
 return [...result];
}
