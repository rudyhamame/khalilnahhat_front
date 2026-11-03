import {equipmentLimit} from '../echo/simulationLayout.js';
export function resolveDraftEquipment(rows,catalog){
 const seen=new Set();
 if(!Array.isArray(rows)||rows.length>100)throw new Error('Equipment must be a list.');
 return rows.map(row=>{
  const item=catalog.find(item=>item.id===row.id);
  if(!item||seen.has(row.id)||!Number.isSafeInteger(row.quantity)||row.quantity<(item.minQuantity||1)||row.quantity>equipmentLimit(item))throw new Error('Review the equipment ID, minimum quantity and available stock.');
  seen.add(row.id);return {...item,quantity:row.quantity};
 });
}
