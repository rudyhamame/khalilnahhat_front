// Keep the support table available for rented equipment. Only the controller
// and its laptop belong to the DJ service; neither is a rental cart item.
export function configureDjBooth(THREE,root,{djAdded=false,own=value=>value}={}){
 const rig=new THREE.Group();rig.name='DJ service setup';
 for(const child of [...root.children])if(!/^booth[ _]table$/i.test(child.name))rig.add(child);
 const laptop=new THREE.Group();laptop.name='DJ laptop';laptop.position.set(1.1,.93,0);rig.add(laptop);
 const metal=own(new THREE.MeshStandardMaterial({color:'#606873',metalness:.65,roughness:.35}));
 const black=own(new THREE.MeshStandardMaterial({color:'#10151c',roughness:.55}));
 const screen=own(new THREE.MeshStandardMaterial({color:'#172b40',emissive:'#315574',emissiveIntensity:.65,roughness:.5}));
 const ui=own(new THREE.MeshBasicMaterial({color:'#87b9d2'}));
 const block=(name,w,h,d,material,x,y,z,parent=laptop)=>{
  const mesh=new THREE.Mesh(own(new THREE.BoxGeometry(w,h,d)),material);mesh.name=name;mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;
 };
 block('Laptop base',.42,.025,.29,metal,0,.0125,0);
 block('Keyboard',.36,.003,.12,black,0,.027,-.025);
 for(let row=0;row<5;row++)block('Keyboard row',.33,.001,.003,metal,0,.029,-.072+row*.023);
 block('Trackpad',.11,.002,.05,black,0,.027,.085);
 const lid=new THREE.Group();lid.name='Open laptop lid';lid.position.set(0,.025,-.135);lid.rotation.x=-Math.PI/12;laptop.add(lid);
 block('Display frame',.42,.27,.018,black,0,.135,0,lid);
 block('Laptop screen',.38,.23,.004,screen,0,.135,.011,lid);
 block('Display toolbar',.33,.014,.002,ui,0,.224,.014,lid);
 // Two simple audio-track lanes make the display legible at room scale.
 for(const y of [.16,.105]){
  block('Audio track',.31,.025,.002,ui,0,y,.014,lid);
  block('Track divider',.005,.025,.003,black,.035,y,.016,lid);
 }
 root.add(rig);
 const setDjAdded=value=>{rig.visible=Boolean(value);};setDjAdded(djAdded);
 return {rig,laptop,setDjAdded};
}
