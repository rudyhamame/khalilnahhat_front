// Animate the room envelope while the detailed layout is prepared. Furniture
// keeps its physical size; only its placement follows the changing envelope.
export function createRoomResizePreview({scene,width,depth,movable=()=>[],now=()=>performance.now(),reducedMotion=()=>false,duration=280}){
 let current={width,depth},from=current,target=current,start=0,started=false;
 const scales=new Map(),instances=[];
 const capture=()=>scene.traverse(node=>{if(node.isInstancedMesh)instances.push({mesh:node,matrix:node.instanceMatrix.array.slice(),scale:node.scale.clone()});});
 const apply=()=>{
  const x=current.width/width,z=current.depth/depth;scene.scale.set(x,1,z);
  for(const group of movable()){
   if(!scales.has(group))scales.set(group,group.scale.clone());
   const base=scales.get(group);group.scale.set(base.x/x,base.y,base.z/z);
  }
  for(const {mesh,matrix,scale} of instances){
   mesh.scale.set(scale.x/x,scale.y,scale.z/z);
   mesh.instanceMatrix.array.set(matrix);
   for(let i=0;i<mesh.count;i++){
    const group=mesh.userData.pickGroups?.[i];
    // A table, its chairs and its seated guests remain one rigid assembly.
    mesh.instanceMatrix.array[i*16+12]=group?matrix[i*16+12]+group.position.x*(x-1):matrix[i*16+12]*x;
    mesh.instanceMatrix.array[i*16+14]=group?matrix[i*16+14]+group.position.z*(z-1):matrix[i*16+14]*z;
   }
   mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();
  }
 };
 const tick=(time=now())=>{
  if(!started)return;
  const t=reducedMotion()?1:Math.min(1,Math.max(0,(time-start)/duration)),ease=1-(1-t)**3;
  current={width:from.width+(target.width-from.width)*ease,depth:from.depth+(target.depth-from.depth)*ease};apply();
 };
 return {
  to(next){
   if(!Number.isFinite(next.width)||!Number.isFinite(next.depth)||next.width<=0||next.depth<=0)return;
   tick();if(!started){capture();started=true;}
   from={...current};target={...next};start=now();if(reducedMotion())tick();
  },
  tick,
  get isResizing(){return started;},
 };
}
