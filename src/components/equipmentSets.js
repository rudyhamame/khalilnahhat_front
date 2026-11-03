import {isCatalogSet} from '../lib/rentalCatalog.js';
// Existing set pieces store their model source and display name. Resolve only
// unambiguous matches, so shared models never assign an unrelated set price.
export function equipmentSetMemberships(equipment){
  const membership=new Map(equipment.map(item=>[item.id,[]]));
  const bySource=new Map();
  for(const item of equipment)if(item.modelUrl){
    const rows=bySource.get(item.modelUrl)||[];rows.push(item);bySource.set(item.modelUrl,rows);
  }
  for(const set of equipment.filter(item=>item.isSet||item.setItems?.length||item.modelParts?.length)){
    const ids=new Set([set.id]);
    for(const member of set.setItems||[])if(membership.has(member.equipmentId))ids.add(member.equipmentId);
    for(const part of set.modelParts||[]){
      if(part.equipmentId&&membership.has(part.equipmentId)){ids.add(part.equipmentId);continue;}
      if(!part.src)continue;
      const candidates=bySource.get(part.src)||[];
      const named=candidates.filter(item=>item.name===part.name);
      const matched=candidates.length===1?candidates[0]:named.length===1?named[0]:null;
      if(matched)ids.add(matched.id);
    }
    for(const id of ids)membership.get(id)?.push(set);
  }
  return membership;
}

export const isEquipmentSet=isCatalogSet;

export function setMembersFromItem(item,equipment){
  if(item?.setItems?.length)return item.setItems.map(member=>({x:0,y:0,z:0,rotation:0,...member}));
  const members=[];
  for(const part of item?.modelParts||[]){
    const candidates=equipment.filter(row=>!isEquipmentSet(row)&&row.modelUrl&&row.modelUrl===part.src);
    const match=candidates.length===1?candidates[0]:candidates.find(row=>row.name===part.name);
    if(!match)continue;
    const member=members.find(row=>row.equipmentId===match.id);
    if(member)member.quantity++;else members.push({equipmentId:match.id,quantity:1,x:part.x||0,y:part.y||0,z:part.z||0,rotation:part.rotation||0});
  }
  return members;
}

export function buildSetModelParts(members,equipment){
  const byId=new Map(equipment.map(item=>[item.id,item]));
  return members.flatMap(member=>{
    const row=byId.get(member.equipmentId);
    if(!row?.modelUrl)return [];
    return Array.from({length:member.quantity},(_,index)=>({name:row.name,nameAr:row.nameAr||'',src:row.modelUrl,x:(member.x||0)+index*.75,y:member.y||0,z:member.z||0,rotation:member.rotation||0}));
  });
}
