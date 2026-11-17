// Which equipment items and services a change added or re-quantified, so the map and the review can highlight exactly those rows (not the whole list).
export function equipmentChanges(previous,next){
 const quantities=list=>new Map((list||[]).map(item=>[item.id,item.quantity]));
 const before=quantities(previous?.equipment),after=quantities(next?.equipment);
 const items=new Set([...after].filter(([id,quantity])=>before.get(id)!==quantity).map(([id])=>id));
 const services=new Set((next?.services||[]).filter(id=>!(previous?.services||[]).includes(id)));
 return {items,services};
}
// A row is a target when it is the changed path itself, or an item/service row that the change touched.
export function isChangeTarget(field,paths,changes){
 if(!field)return false;
 const equipmentPath=paths.some(path=>path==='equipment'||path==='services'||path.startsWith('equipment'));
 if(paths.includes(field))return true;
 if(!equipmentPath)return false;
 if(field==='equipment')return true;
 if(field.startsWith('equipment:'))return changes.items.has(field.split(':')[2]);
 if(field.startsWith('service:'))return changes.services.has(field.slice(8));
 return false;
}
