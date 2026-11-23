import {bookingServiceId,equipmentInService} from './rentalCatalog.js';
import {MC_ID,DJ_ID} from './treeCore.js';

const isMc=item=>item.id===MC_ID||item.selectionField==='music.mcRequested';
// MC hosting & announcements is always the first service (and so the one selected when the list opens); the others keep their order.
export const rentalServices=catalog=>{const rows=catalog.filter(item=>item.kind==='service'&&item.isActive&&item.id!==DJ_ID);return [...rows.filter(isMc),...rows.filter(item=>!isMc(item))];};
export function rentalServiceEquipment(service,equipment){
 return equipment.filter(item=>service&&equipmentInService(item,service));
}
// This is the same order used by the service list and both equipment tabs.
// Composite tags retain their meaning when switching between Individual/Sets.
export function numberedRentalCatalog(catalog,equipment){
 return rentalServices(catalog).map((service,index)=>({number:index+1,id:service.id,name:service.name,nameAr:service.nameAr,bookingServiceId:bookingServiceId(service),selectionField:service.selectionField||'',equipment:rentalServiceEquipment(service,equipment).map((item,position)=>({number:position+1,tag:`${index+1}.${position+1}`,id:item.id,name:item.name,nameAr:item.nameAr,availableQuantity:item.availableQuantity,availabilityStatus:item.availabilityStatus}))}));
}
