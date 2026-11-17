import {equipmentLimit} from '../echo/simulationLayout.js';
export function resolveDraftEquipment(rows,catalog,{previous=[]}={}){
 const seen=new Set();
 if(!Array.isArray(rows)||rows.length>100)throw new Error('Equipment must be a list.');
 // Removing a saved selection must not require every other saved item to
 // still exist in today's catalog or satisfy today's stock constraints.
 const removalOnly=rows.length<previous.length&&rows.every(row=>previous.some(old=>old.id===row.id&&old.quantity===row.quantity));
 return rows.map(row=>{
  const item=catalog.find(item=>item.id===row.id);
  if(seen.has(row.id)||!Number.isSafeInteger(row.quantity)||row.quantity<=0||(!removalOnly&&(!item||row.quantity<(item.minQuantity||1)||row.quantity>equipmentLimit(item))))throw new Error('Review the equipment ID, minimum quantity and available stock.');
  if(removalOnly&&!item){seen.add(row.id);return {...previous.find(old=>old.id===row.id),...row};}
  seen.add(row.id);return {...item,quantity:row.quantity};
 });
}
