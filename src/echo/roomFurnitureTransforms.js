// Table parts and seated guests share instanced meshes. Move only this table's
// instances, keeping the draw-call savings and refreshing bounds for picking.
export function moveFurnitureInstances(THREE,group,previousPosition,previousRotation,previousScale){
 group.updateMatrix();
 const previous=new THREE.Matrix4().compose(previousPosition,new THREE.Quaternion().setFromEuler(previousRotation),previousScale);
 const delta=group.matrix.clone().multiply(previous.invert()),matrix=new THREE.Matrix4(),changed=new Set();
 for(const {mesh,index} of group.userData.instances||[]){
  mesh.getMatrixAt(index,matrix);matrix.premultiply(delta);mesh.setMatrixAt(index,matrix);changed.add(mesh);
 }
 for(const mesh of changed){mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingBox();mesh.computeBoundingSphere();}
}
