export function fitModel(node,{preserveOrbit=false}={}){
 const size=node.getDimensions(),center=node.getBoundingBoxCenter();
 const width=node.clientWidth,height=node.clientHeight;
 if(!width||!height)return;
 const orbit=preserveOrbit?node.getCameraOrbit?.():null;
 const theta=Number.isFinite(orbit?.theta)?orbit.theta:-15*Math.PI/180,phi=Number.isFinite(orbit?.phi)?orbit.phi:75*Math.PI/180;
 const tan=Math.tan(node.getFieldOfView()*Math.PI/360),aspect=width/height;
 const insetX=Math.max(.5,(width-48)/width),insetY=Math.max(.5,(height-48)/height);
 let distance=0;
 for(const x of [-size.x/2,size.x/2])for(const y of [-size.y/2,size.y/2])for(const z of [-size.z/2,size.z/2]){
  const horizontal=x*Math.cos(theta)-z*Math.sin(theta);
  const vertical=-x*Math.cos(phi)*Math.sin(theta)+y*Math.sin(phi)-z*Math.cos(phi)*Math.cos(theta);
  const depth=x*Math.sin(phi)*Math.sin(theta)+y*Math.cos(phi)+z*Math.sin(phi)*Math.cos(theta);
  distance=Math.max(distance,depth+Math.abs(horizontal)/(tan*aspect*insetX),depth+Math.abs(vertical)/(tan*insetY));
 }
 node.resetTurntableRotation?.(0);node.cameraTarget=`${center.x}m ${center.y}m ${center.z}m`;
 node.cameraOrbit=`${theta}rad ${phi}rad ${distance}m`;node.jumpCameraToGoal?.();
}
