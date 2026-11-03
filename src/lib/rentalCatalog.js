// Catalog display IDs may be custom; the event-order contract uses these stable
// service keys. Custom service equipment is requested through equipment rental.
const bookingServiceIds=new Set(['dj','sound','lighting','led','fx','rental','corporate']);
export const isCatalogSet=item=>Boolean(item?.isSet||item?.setItems?.length||item?.modelParts?.length);
export const bookingServiceId=service=>bookingServiceIds.has(service.id)?service.id:'rental';
export function equipmentBelongsToService(item,service,equipment){
 const direct=row=>row.category===service.category||(service.equipmentIds||[]).includes(row.id);
 if(direct(item))return true;
 if(!isCatalogSet(item))return false;
 return (item.setItems||[]).some(member=>{const row=equipment.find(row=>row.id===member.equipmentId);return row&&direct(row);});
}
export function reconcileEquipmentServices(current,previous,next,catalog,equipment){
 const result=new Set(current);
 const groups=new Map();
 for(const service of catalog.filter(row=>row.kind==='service'&&row.isActive!==false)){
  const id=bookingServiceId(service),rows=groups.get(id)||[];rows.push(service);groups.set(id,rows);
 }
 for(const [id,services] of groups){
  const has=cart=>equipment.some(item=>(cart[item.id]?.quantity||0)>0&&services.some(service=>equipmentBelongsToService(item,service,equipment)));
  if(has(next))result.add(id);else if(has(previous))result.delete(id);
 }
 return [...result];
}
