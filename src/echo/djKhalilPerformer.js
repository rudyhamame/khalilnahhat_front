// Photorealistic stage performer for the room. The booth remains real 3D
// geometry, so it naturally hides the lower body and keeps the controller in
// front of Khalil from the audience view.
export function configureDjKhalilPerformer(THREE,texture,{depth,own=value=>value}={}){
 texture.colorSpace=THREE.SRGBColorSpace;
 texture.anisotropy=8;
 const material=own(new THREE.MeshBasicMaterial({
  map:texture,transparent:true,alphaTest:.035,depthTest:true,depthWrite:false,
  side:THREE.DoubleSide,toneMapped:false,
 }));
 const geometry=own(new THREE.PlaneGeometry(1.18,1.77));
 const performer=new THREE.Mesh(geometry,material);
 performer.name='DJ Khalil performer';
 performer.position.set(0,.885,-depth/2+1.46);
 performer.visible=false;
 performer.renderOrder=2;
 const base={x:performer.position.x,y:performer.position.y,z:performer.position.z};
 let djAdded=false,party=false;
 const sync=()=>{performer.visible=djAdded&&party;};
 return {
  performer,
  setDjAdded(value){djAdded=Boolean(value);sync();},
  setParty(value){party=Boolean(value);sync();},
  animate(time,camera){
   if(!performer.visible)return;
   performer.position.x=base.x+Math.sin(time*1.35)*.018;
   performer.position.y=base.y+Math.sin(time*2.7)*.009;
   performer.position.z=base.z;
   if(camera)performer.rotation.y=Math.atan2(camera.position.x-performer.position.x,camera.position.z-performer.position.z);
   performer.rotation.z=Math.sin(time*1.35)*.006;
   const breath=1+Math.sin(time*2.7)*.003;
   performer.scale.set(breath,breath,1);
  },
 };
}
