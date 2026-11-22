export function buildEidosTree({eidos,atomBySeed,atoms,sources}){
 const sourceFor=atom=>{
  const source=sources.find(node=>node.branch===atom.branch);
  if(!source)return [{label:atom.branch,note:atom.ref||'Field source',source:atom.branch}];
  const musicGroups={'music.languagePairs':['Languages','Dialects'],'music.genres':['Genres'],'music.favouriteArtists':['Artists / vocalists'],'music.suggestedSongs':['Event moments']};
  const groups=musicGroups[atom.id];
  const children=atom.branch==='music'?(groups?source.children.filter(child=>groups.includes(child.label)):[]):atom.ref?source.children.filter(child=>child.id===atom.ref):source.children;
  return [{...source,note:'Shared source for this Booking atom',children}];
 };
 const atomNode=atom=>({key:atom.id,id:atom.id,label:atom.name,uiLabelOnly:true,note:`Booking · Step ${atom.step} · ${atom.code}`,source:atom.branch,data:atom,children:sourceFor(atom)});
 const atomsById=new Map(atoms.map(atom=>[atom.id,atom]));
 const seedBranches=eidos.filter(item=>item.id!=='booking').map(item=>{
  const link=atomBySeed[item.id],atom=link&&atomsById.get(link.atomId);
  return {branch:'eidos',key:item.id,id:item.id,label:item.id,identityOnly:true,data:{id:item.id,fourthGoal:item.fourthGoal||'',...(link?{bookingAtom:link}:{})},children:atom?[atomNode(atom)]:link?[{key:link.atomId,id:link.atomId,label:link.label,uiLabelOnly:true,note:'Booking atom · source loading',data:{name:link.label,eidosId:item.id}}]:[]};
 });
 const linked=new Set(Object.values(atomBySeed).map(link=>link.atomId));
 const unseeded=atoms.filter(atom=>!linked.has(atom.id));
 return [...seedBranches,...(unseeded.length?[{branch:'booking',label:'Booking atoms without a seed',note:'Add Booking atoms to link these fields to Eidos',children:unseeded.map(atomNode)}]:[]),...sources];
}

// Balance by subtree size, so a large catalogue does not crowd one side of the root.
export function splitMapBranches(nodes,layout='around'){
 const left=[],right=[];let leftWeight=0,rightWeight=0;
 const weight=node=>1+(node.children||[]).reduce((sum,child)=>sum+weight(child),0);
 for(const node of nodes){
  const toLeft=layout==='left'||(layout==='around'&&leftWeight<rightWeight);
  if(toLeft){left.push(node);leftWeight+=weight(node);}else{right.push(node);rightWeight+=weight(node);}
 }
 return {left,right};
}
