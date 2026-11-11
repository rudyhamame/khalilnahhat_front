import {bookingServiceId,isCatalogSet} from './rentalCatalog.js';

const isMc=item=>item.id==='mc'||item.selectionField==='music.mcRequested';
// MC hosting & announcements is always the first service (and so the one selected when the list opens); the others keep their order.
export const rentalServices=catalog=>{const rows=catalog.filter(item=>item.kind==='service'&&item.isActive&&item.id!=='dj');return [...rows.filter(isMc),...rows.filter(item=>!isMc(item))];};
export function rentalServiceEquipment(service,equipment){
 if(service?.selectionField)return equipment.filter(item=>item.category===service.category||(service.equipmentIds||[]).includes(item.id));
 return [...equipment.filter(item=>!isCatalogSet(item)&&service&&(item.category===service.category||(service.equipmentIds||[]).includes(item.id))),...equipment.filter(isCatalogSet)];
}
// This is the same order used by the service list and both equipment tabs.
// Composite tags retain their meaning when switching between Individual/Sets.
export function numberedRentalCatalog(catalog,equipment){
 return rentalServices(catalog).map((service,index)=>({number:index+1,id:service.id,name:service.name,nameAr:service.nameAr,bookingServiceId:bookingServiceId(service),selectionField:service.selectionField||'',equipment:rentalServiceEquipment(service,equipment).map((item,position)=>({number:position+1,tag:`${index+1}.${position+1}`,id:item.id,name:item.name,nameAr:item.nameAr,isSet:isCatalogSet(item)}))}));
}
