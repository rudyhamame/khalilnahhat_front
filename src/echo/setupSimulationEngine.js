import {createRoomResizePreview} from './roomResizePreview';
import {configureDjBooth} from './djBoothSetup';
import {moveFurnitureInstances} from './roomFurnitureTransforms';
import {guestSkeletonPrefix,makeGuestClipInPlace,retargetGuestClip} from './guestAnimation';
import {configureDjKhalilPerformer} from './djKhalilPerformer';
import {EQUIPMENT_MODELS} from './equipmentModels';
import {layoutEquipment,layoutRoomZones,MODEL_SIZES,placeExtras} from './simulationLayout';
// Equipment is laid out by the stage plan and stays where it is placed. The room page (config.movable) lets visitors drag any piece; the admin placement page (config.movableId) lets one piece be dragged.
// Equipment is drawn larger than life so it reads at room scale; the truss, LED wall and booth keep true size.
const SIZE_BOOST={speaker:1.5,sub:1.5,light:1.5,uplight:1.5,fx:1.5,mixer:1.2,mic:1.2,projector:1.2};
export async function createSetupSimulation(element,config,onSelect,onStatus){
 const [THREE,{OrbitControls},{GLTFLoader},{RoomEnvironment},SkeletonUtils]=await Promise.all([import('three'),import('three/addons/controls/OrbitControls.js'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/environments/RoomEnvironment.js'),import('three/addons/utils/SkeletonUtils.js')]);
 let disposed=false,visible=true,selected=null;const resources=new Set(),models=new Map(),positions=config.positions,objects=[],furniture=[];
 const own=value=>{resources.add(value);return value;};
 const unitLights=[],ledMaterials=[];let lightingMode='day',partyClock=0;
 let booth=null,boothSetup=null,khalilPerformer=null,roomResizePreview=null,unplaced=0;
 let djServiceEnabled=config.djService?.current===true;
 const {width,depth,items}=config;
 const scene=new THREE.Scene();scene.background=config.transparentBackground?null:new THREE.Color('#000000');scene.fog=new THREE.Fog('#000000',Math.max(40,Math.max(width,depth)*2.4),Math.max(90,Math.max(width,depth)*5));
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:Boolean(config.transparentBackground)});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.outputColorSpace=THREE.SRGBColorSpace;element.appendChild(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(43,1,.1,Math.max(80,Math.max(width,depth)*5));
 // Frame the whole room from a corner, whatever its size: farther away and higher up (a steeper view) as the room grows, so a 50 x 50 m hall is not seen at a grazing angle.
 const placeCamera=()=>{const span=Math.max(width,depth),big=Math.max(0,Math.min(1,(span-12)/40)),distance=Math.max(16,span*1.6),elevation=(28+big*24)*Math.PI/180,azimuth=33.5*Math.PI/180;camera.position.set(distance*Math.cos(elevation)*Math.sin(azimuth),.8+distance*Math.sin(elevation),-.3+distance*Math.cos(elevation)*Math.cos(azimuth));};placeCamera();
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.8,-.3);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=Math.max(width,depth)*2.5;controls.maxPolarAngle=Math.PI/2-.06;controls.minPolarAngle=.12;controls.enablePan=true;controls.screenSpacePanning=false;
 const mat=(color,roughness=.7,metalness=0)=>own(new THREE.MeshStandardMaterial({color,roughness,metalness}));const timber=own(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.98})),wall=own(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.92})),black=mat('#171c1d',.45,.25),metal=mat('#939393',.28,.8);
 // Procedural textures (no image files): oak boards and plaster. Colour tints per lighting mode multiply them.
 const rand=seed=>{let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296;};};
 const makeTexture=(size,draw,repeatX=1,repeatY=1)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=size;draw(canvas.getContext('2d'),size);const texture=own(new THREE.CanvasTexture(canvas));texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeatX,repeatY);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture;};
 const woodTexture=(rx,ry)=>makeTexture(1024,(g,size)=>{const r=rand(7),rows=16,rh=size/rows;for(let row=0;row<rows;row++){let x=-r()*300;while(x<size){const len=190+r()*270,tone=.88+r()*.26;g.fillStyle=`hsl(${24+r()*6} ${34+r()*10}% ${Math.round(33*tone)}%)`;g.fillRect(x,row*rh,len,rh);for(let k=0;k<7;k++){g.strokeStyle=`rgba(70,40,16,${.05+r()*.08})`;g.lineWidth=1;g.beginPath();const y=row*rh+r()*rh;g.moveTo(x,y);g.lineTo(x+len,y+(r()-.5)*4);g.stroke();}g.fillStyle='rgba(40,22,8,.5)';g.fillRect(x,row*rh,2,rh);x+=len;}g.fillStyle='rgba(40,22,8,.45)';g.fillRect(0,row*rh,size,2);}},rx,ry);
const carpetTexture=(rx,ry)=>makeTexture(512,(g,size)=>{const r=rand(21);g.fillStyle='#5b1828';g.fillRect(0,0,size,size);
  for(let i=0;i<9000;i++){g.fillStyle=r()>.5?'rgba(255,200,190,.05)':'rgba(20,0,6,.09)';g.fillRect(r()*size,r()*size,1+r()*2,1+r()*2);}                          // wool pile
  g.strokeStyle='rgba(214,176,98,.55)';g.lineWidth=3;for(let k=0;k<2;k++){const o=k*size/2;g.beginPath();g.moveTo(o+size/4,o);g.lineTo(o+size/2,o+size/4);g.lineTo(o+size/4,o+size/2);g.lineTo(o,o+size/4);g.closePath();g.stroke();g.beginPath();g.arc(o+size/4,o+size/4,size/16,0,Math.PI*2);g.stroke();}   // gold lattice
  g.fillStyle='rgba(214,176,98,.4)';for(const [x,y] of [[0,0],[size/2,0],[0,size/2],[size/2,size/2]]){g.beginPath();g.arc(x,y,5,0,Math.PI*2);g.fill();}},rx,ry);
 const brickTexture=(rx,ry)=>makeTexture(512,(g,size)=>{const r=rand(11),rows=16,rh=size/rows,bw=128;g.fillStyle='#b9ada0';g.fillRect(0,0,size,size);for(let row=0;row<rows;row++){const shift=row%2?-bw/2:0;for(let x=shift;x<size;x+=bw){g.fillStyle=`hsl(${9+r()*10} ${42+r()*14}% ${28+r()*13}%)`;g.fillRect(x+2,row*rh+2,bw-4,rh-4);for(let k=0;k<14;k++){g.fillStyle=r()>.5?'rgba(255,230,200,.05)':'rgba(40,12,6,.08)';g.fillRect(x+4+r()*(bw-10),row*rh+3+r()*(rh-8),2+r()*6,1+r()*2);}}}},rx,ry);
 wall.map=null;const wallLeft=wall.clone();own(wallLeft);// smooth off-white plaster
 function box(w,h,d,material,x,y,z,parent=scene){const mesh=new THREE.Mesh(own(new THREE.BoxGeometry(w,h,d)),material);mesh.position.set(x,y+h/2,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function cylinder(radius,height,material,x,y,z,parent=scene){const mesh=new THREE.Mesh(own(new THREE.CylinderGeometry(radius,radius,height,16)),material);mesh.position.set(x,y+height/2,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 // Open-front room with a carpeted floor, a raised performance area and architectural lighting.
 if(config.boundary?.length>=3){
  const shape=new THREE.Shape(config.boundary.map(([x,z])=>new THREE.Vector2(x,-z)));for(const ring of config.holes||[])shape.holes.push(new THREE.Path(ring.map(([x,z])=>new THREE.Vector2(x,-z))));timber.map=carpetTexture(1/2.4,1/2.4);const floor=new THREE.Mesh(own(new THREE.ShapeGeometry(shape)),timber);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const vertices=config.boundary.flatMap(([x,z],i)=>{const next=config.boundary[(i+1)%config.boundary.length];return [x,.025,z,next[0],.025,next[1]];});scene.add(new THREE.LineSegments(own(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3))),own(new THREE.LineBasicMaterial({color:'#d7c58f'}))));
 }else{timber.map=carpetTexture(Math.max(1,width/2.4),Math.max(1,depth/2.4));box(width,.16,depth,timber,0,-.16,0);box(width,3.6,.16,wall,0,0,-depth/2);box(.16,3.6,depth,wallLeft,-width/2,0,0);}
 const seams=own(new THREE.LineBasicMaterial({color:'#bcbcbc',transparent:true,opacity:.55}));const lines=[];for(let x=-width/2;x<=width/2;x+=.45)lines.push(x,.006,-depth/2,x,.006,depth/2);for(let z=-depth/2;z<=depth/2;z+=1.6)lines.push(-width/2,.007,z,width/2,.007,z);const floorLines=new THREE.LineSegments(own(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3))),seams);floorLines.visible=false;scene.add(floorLines);
 const riserMat=mat('#060707',.35);// A DJ stage at a Canadian wedding is a fixed-size riser, about 6.1 m (20 ft) wide, never the width of the room.
 const SW=Math.min(6.1,width-1.2);box(SW,.12,2.7,riserMat,0,0,-depth/2+1.5);
 const strip=own(new THREE.MeshBasicMaterial({color:'#e5c992'}));box(width-.4,.025,.025,strip,0,3.25,-depth/2+.12);box(.025,.025,depth-.4,strip,-width/2+.12,3.25,0);

 // The three spaces, back wall first: DJ stage, dance floor, and the dining area with wooden four-top tables.
 const zones=layoutRoomZones(config.guests,width,depth,config.plan);
 // Luxury-restaurant interior: warm panelled walls, burgundy wainscot with a brass rail, black steel windows, crystal chandeliers over linen-covered oval tables, velvet chairs, warm light.
 const steel=own(new THREE.MeshStandardMaterial({color:'#15181a',roughness:.45,metalness:.7})),wainscot=own(new THREE.MeshStandardMaterial({color:'#3b1823',roughness:.55})),darkWood=own(new THREE.MeshStandardMaterial({color:'#2b1d13',roughness:.5})),tableWood=own(new THREE.MeshStandardMaterial({color:'#f4eee2',roughness:.9})),chairWood=own(new THREE.MeshStandardMaterial({color:'#2e2017',roughness:.55})),leather=own(new THREE.MeshPhysicalMaterial({color:'#4b2416',roughness:.38,clearcoat:.45,clearcoatRoughness:.3,sheen:.2})),winMat=own(new THREE.MeshBasicMaterial({color:'#d4e8ff'})),bulbMat=own(new THREE.MeshStandardMaterial({color:'#ffe9bd',emissive:'#ffc873',emissiveIntensity:1,roughness:.4})),candleMat=own(new THREE.MeshStandardMaterial({color:'#fff1d0',emissive:'#ffb85c',emissiveIntensity:1.6,roughness:.5})),brass=own(new THREE.MeshStandardMaterial({color:'#c9a45c',roughness:.3,metalness:.85})),edgeMat=own(new THREE.MeshBasicMaterial({color:'#e5c992'})),leafMat=own(new THREE.MeshStandardMaterial({color:'#77716a',roughness:.8,flatShading:true})),potMat=own(new THREE.MeshStandardMaterial({color:'#2d2f2e',roughness:.55})),shadeMat=own(new THREE.MeshStandardMaterial({color:'#101214',roughness:.4,metalness:.6,side:THREE.DoubleSide})),danceMat=own(new THREE.MeshStandardMaterial({color:'#141414',roughness:1,metalness:0}));
 const pendantLights=[],labelMaterials=[];
 const makeLabel=(text,w,h,x,y,z)=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*h/w);const g=canvas.getContext('2d');g.fillStyle='rgba(255,244,222,.9)';g.font=`600 ${Math.round(canvas.height*.46)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';if('letterSpacing' in g)g.letterSpacing=`${Math.round(canvas.height*.12)}px`;g.fillText(text,canvas.width/2,canvas.height/2);const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;const material=own(new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.5,depthWrite:false}));const mesh=new THREE.Mesh(own(new THREE.PlaneGeometry(w,h)),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);scene.add(mesh);labelMaterials.push(material);};
 if(!config.boundary?.length){
  const bz=-depth/2+.1,lx=-width/2+.1;
  box(width,.16,.04,darkWood,0,0,bz);box(.04,.16,depth,darkWood,lx,0,0);                         // skirting boards
  box(width,1.0,.014,wainscot,0,.16,-depth/2+.088);box(.014,1.0,depth,wainscot,-width/2+.088,.16,0); // charcoal wainscot below the brick
  box(width,.045,.06,brass,0,1.16,bz+.005);box(.06,.045,depth,brass,lx+.005,1.16,0);               // brass rail on top of the wainscot
  box(width,.16,.16,steel,0,3.4,-depth/2+.16);box(.16,.16,depth,steel,-width/2+.16,3.4,0);         // exposed steel beams
  // Black steel-framed windows along the left wall.
  const z0=-depth/2+1.6,z1=depth/2-(depth>=6?2.4:1),span=z1-z0,count=span>1.6?Math.max(1,Math.min(6,Math.floor(span/2.4))):0;
  for(let i=0;i<count;i++){const z=z0+span/count*(i+.5),x=-width/2+.09;
   box(.02,1.9,1.5,winMat,x,.95,z);
   box(.06,.06,1.62,steel,x+.01,.9,z);box(.06,.06,1.62,steel,x+.01,2.85,z);box(.06,1.99,.06,steel,x+.01,.9,z-.78);box(.06,1.99,.06,steel,x+.01,.9,z+.78);
   for(const dz of [-.26,.26])box(.045,1.9,.025,steel,x+.01,.95,z+dz);for(const dy of [1.45,1.95,2.4])box(.045,.025,1.5,steel,x+.01,dy,z);}
  // Gilded paintings on the left wall, one between each pair of windows.
  {const art=[['#1b3a4b','#e9c46a','#b5543c'],['#3b2a4a','#f2cc8f','#81b29a'],['#26413c','#e8d5b7','#c9784a'],['#4a1f2f','#f4e3c1','#6d8fa6']];
   for(let i=1;i<count;i++){const z=z0+span/count*i,w=1.0+.25*(i%2),h=.75+.25*((i+1)%2),colors=art[i%art.length],r=rand(100+i);
    const texture=makeTexture(256,(g,size)=>{g.fillStyle=colors[0];g.fillRect(0,0,size,size);for(let k=0;k<7;k++){g.fillStyle=colors[1+k%2];g.globalAlpha=.35+r()*.4;g.beginPath();g.ellipse(r()*size,r()*size,30+r()*90,20+r()*70,r()*3,0,Math.PI*2);g.fill();}g.globalAlpha=1;g.fillStyle=colors[2];g.fillRect(0,size*.68,size,size*.32);g.globalAlpha=.5;g.fillStyle=colors[0];g.beginPath();g.arc(size*(.25+r()*.5),size*.68,size*.22,Math.PI,0);g.fill();g.globalAlpha=1;});
    const x=-width/2+.09;box(.05,h+.14,w+.14,brass,x+.02,1.5-.07,z);
    const canvasMesh=new THREE.Mesh(own(new THREE.PlaneGeometry(w,h)),own(new THREE.MeshStandardMaterial({map:texture,roughness:.8})));canvasMesh.rotation.y=Math.PI/2;canvasMesh.position.set(x+.052,1.5+h/2-.07,z);scene.add(canvasMesh);}}
  // A door on the left wall near the front.
  // Restaurant entrance: a pair of dark-wood and glass doors in a brass-trimmed frame, brass pull handles, kick plates and a glazed transom.
  if(depth>=6){const z=depth/2-1.6,x=-width/2+.1,leaf=.82,gap=.02;
   box(.1,2.7,.1,darkWood,x,0,z-leaf-.1);box(.1,2.7,.1,darkWood,x,0,z+leaf+.1);box(.1,.12,2*leaf+.3,darkWood,x,2.6,z);   // frame
   box(.03,.04,2*leaf+.3,brass,x+.05,2.55,z);box(.04,.5,2*leaf,winMat,x,2.1,z);                                         // brass lip and glazed transom
   for(const side of [-1,1]){const zc=z+side*(leaf/2+gap/2);
    box(.05,2.1,leaf,darkWood,x,0,zc);                                                                                  // leaf
    box(.056,1.45,leaf-.24,winMat,x,.5,zc);                                                                             // glass panel
    box(.06,.28,leaf-.1,brass,x,.02,zc);                                                                                // brass kick plate
    const pull=new THREE.Mesh(own(new THREE.CylinderGeometry(.018,.018,.7,12)),brass);pull.position.set(x+.1,1.05,z+side*.07);scene.add(pull);}}
  // Potted plants in the back corners.
  for(const sign of [-1,1]){const x=sign*(width/2-.55),z=-depth/2+.6;cylinder(.22,.4,potMat,x,0,z);for(const [dx,dy,dz,r] of [[0,.78,0,.3],[.14,1.05,.08,.22],[-.12,1.0,-.1,.22],[.02,1.28,-.02,.17]]){const leaf=new THREE.Mesh(own(new THREE.IcosahedronGeometry(r,1)),leafMat);leaf.position.set(x+dx,dy,z+dz);leaf.castShadow=true;scene.add(leaf);}}
 }
 // Space 2: matte black carpet, sized by the booked guest count.
 {const {dance}=zones;
  danceMat.map=makeTexture(256,(g,size)=>{
   const r=rand(43);g.fillStyle='#aaaaaa';g.fillRect(0,0,size,size);
   for(let i=0;i<6500;i++){g.fillStyle=r()>.5?'rgba(255,255,255,.09)':'rgba(0,0,0,.1)';g.fillRect(r()*size,r()*size,1,1+r()*2);}
  },Math.max(1,dance.w/1.5),Math.max(1,dance.d/1.5));
  box(dance.w,.014,dance.d,danceMat,0,0,dance.z);
  for(const [w,d,x,z] of [[dance.w+.1,.07,0,dance.z-dance.d/2-.035],[dance.w+.1,.07,0,dance.z+dance.d/2+.035],[.07,dance.d,-dance.w/2-.035,dance.z],[.07,dance.d,dance.w/2+.035,dance.z]])box(w,.02,d,brass,x,0,z);
  for(const [w,d,x,z] of [[dance.w,.025,0,dance.z-dance.d/2+.06],[dance.w,.025,0,dance.z+dance.d/2-.06],[.025,dance.d,-dance.w/2+.06,dance.z],[.025,dance.d,dance.w/2-.06,dance.z]])box(w,.016,d,edgeMat,x,0,z);
  makeLabel('DANCE FLOOR',Math.min(3.2,dance.w-.4),.42,0,.03,dance.z+dance.d/2-.42);
  makeLabel('DJ BOOTH',2.4,.34,0,.045,-depth/2+3.27);
  if(zones.tables.length)makeLabel('DINING',2.0,.34,0,.02,depth/2-.4);}
 // Space 3, the dining area: oval tables (5 to 8 seats) dressed in white linen with a candle, dome pendants above them, and wooden chairs.
 // Furniture shares equipment's selection and movement controls, with stable keys.
 const furnitureGroup=(kind,number,x,z)=>{
  const group=new THREE.Group();group.position.set(x,0,z);
  group.userData.unit={key:`room:${kind}:${number}`,id:`room-${kind}`,kind,name:arName(kind,number),x,z};
  group.userData.instances=[];scene.add(group);furniture.push(group);models.set(group.userData.unit.key,group);return group;
 };
 const arName=(kind,number)=>kind==='cake'?(config.ar?'الكعكة':'Cake table'):kind==='sweetheart'?(config.ar?'طاولة العروسين':'Sweetheart table'):config.ar?`${kind==='table'?'طاولة':'عمود'} ${number}`:`${kind==='table'?'Table':'Column'} ${number}`;
 const collisionMaterial=own(new THREE.MeshBasicMaterial({visible:false}));
 const collider=(group,w,h,d,x,y,z)=>{const mesh=box(w,h,d,collisionMaterial,x,y,z,group);mesh.userData.collisionOnly=true;mesh.castShadow=false;mesh.receiveShadow=false;};
 // Columns: plastered shafts with a brass base and a brass capital.
 for(const [index,column] of (zones.columns||[]).entries()){
  const group=furnitureGroup('column',index+1,column.x,column.z);
  box(.7,.12,.7,brass,0,0,0,group);const shaft=new THREE.Mesh(own(new THREE.CylinderGeometry(.27,.3,3.4,24)),wall);shaft.position.set(0,1.8,0);shaft.castShadow=true;group.add(shaft);box(.72,.14,.72,brass,0,3.4,0,group);
 }
 const tableGroups=[];
 // Gold table-number discs.
 const numberTexture=number=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=128;const g=canvas.getContext('2d');g.fillStyle='#1d1410';g.beginPath();g.arc(64,64,58,0,Math.PI*2);g.fill();g.lineWidth=6;g.strokeStyle='#c9a45c';g.stroke();g.fillStyle='#f3e3bd';g.font='700 62px sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText(String(number),64,68);const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;return texture;};
 if(zones.tables.length){
  const tableCount=zones.tables.length,chairCount=zones.tables.reduce((sum,table)=>sum+table.chairs.length,0),dummy=new THREE.Object3D();
  const instanced=(geometry,material,count)=>{const mesh=new THREE.InstancedMesh(own(geometry),material,count);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;};
  // Luxury linen: a woven damask cloth that drapes over the edge, a gold-trimmed hem, a burgundy runner, and a white plate with a folded napkin at every chair.
  const linenTexture=makeTexture(256,(g,size)=>{g.fillStyle='#f6f0e4';g.fillRect(0,0,size,size);for(let i=0;i<size;i+=4){g.fillStyle=i%8?'rgba(120,100,70,.05)':'rgba(255,255,255,.35)';g.fillRect(i,0,2,size);g.fillRect(0,i,size,2);}g.strokeStyle='rgba(180,150,90,.14)';g.lineWidth=2;for(let x=32;x<size;x+=64)for(let y=32;y<size;y+=64){g.beginPath();g.moveTo(x,y-14);g.lineTo(x+10,y);g.lineTo(x,y+14);g.lineTo(x-10,y);g.closePath();g.stroke();}},3,2);
  const linen=own(new THREE.MeshStandardMaterial({map:linenTexture,color:'#ffffff',roughness:.95,side:THREE.DoubleSide})),napkinMat=own(new THREE.MeshStandardMaterial({color:'#6a1b34',roughness:.9})),plateMat=own(new THREE.MeshStandardMaterial({color:'#fbf8f1',roughness:.25}));
  const tops=instanced(new THREE.CylinderGeometry(.8,.8,.04,32),linen,tableCount),tableLegs=instanced(new THREE.CylinderGeometry(.07,.12,.72,12),brass,tableCount),candles=instanced(new THREE.CylinderGeometry(.03,.03,.09,10),candleMat,tableCount);
  const drapes=instanced(new THREE.CylinderGeometry(.8,.86,.5,48,1,true),linen,tableCount),hems=instanced(new THREE.CylinderGeometry(.865,.865,.02,48),brass,tableCount),runners=instanced(new THREE.BoxGeometry(1.7,.006,.3),napkinMat,tableCount);
  const plates=instanced(new THREE.CylinderGeometry(.12,.1,.012,20),plateMat,chairCount),napkins=instanced(new THREE.BoxGeometry(.11,.012,.07),napkinMat,chairCount);
  const seats=instanced(new THREE.BoxGeometry(.58,.08,.58),leather,chairCount),backs=instanced(new THREE.BoxGeometry(.58,.74,.08),leather,chairCount),chairLegs=instanced(new THREE.CylinderGeometry(.024,.02,.5,8),brass,chairCount*4);
  let tableGroup=null;
  const put=(mesh,index,x,y,z,rotation=0,sx=1,sz=1)=>{tableGroup.userData.instances.push({mesh,index});(mesh.userData.pickGroups??=[])[index]=tableGroup;dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.set(sx,1,sz);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);};
  let chairIndex=0;
  zones.tables.forEach((table,t)=>{
   tableGroup=furnitureGroup('table',table.number,table.x,table.z);tableGroups.push(tableGroup);
   collider(tableGroup,2.24*table.size,.8,1.5*table.size,0,0,0);
   for(const chair of table.chairs)collider(tableGroup,.65,1.35,.65,chair.x-table.x,0,chair.z-table.z);
   put(tops,t,table.x,.74,table.z,table.rotation,1.3*table.size,.85*table.size);
   {const sprite=new THREE.Sprite(own(new THREE.SpriteMaterial({map:numberTexture(table.number),depthWrite:false})));sprite.scale.set(.55,.55,1);sprite.position.set(0,1.5,0);tableGroup.add(sprite);}   // table number, floating above the table
   put(drapes,t,table.x,.5,table.z,table.rotation,1.3*table.size,.85*table.size);put(hems,t,table.x,.26,table.z,table.rotation,1.3*table.size,.85*table.size);put(runners,t,table.x,.763,table.z,table.rotation,table.size);put(candles,t,table.x,.8,table.z);
   put(tableLegs,t,table.x,.36,table.z);
   table.chairs.forEach(chair=>{const n=chairIndex++,sin=Math.sin(chair.rotation),cos=Math.cos(chair.rotation);
    put(seats,n,chair.x,.54,chair.z,chair.rotation);
    {const px=table.x+(chair.x-table.x)*.5,pz=table.z+(chair.z-table.z)*.47;put(plates,n,px,.772,pz,chair.rotation);put(napkins,n,px,.784,pz,chair.rotation+.3);}
    put(backs,n,chair.x+(-.27)*sin,.94,chair.z+(-.27)*cos,chair.rotation);
    [[-.24,-.24],[.24,-.24],[-.24,.24],[.24,.24]].forEach(([dx,dz],k)=>put(chairLegs,n*4+k,chair.x+dx*cos+dz*sin,.25,chair.z-dx*sin+dz*cos));});
   // Crystal chandelier above each table (up to 24): a brass ring, a ring of warm bulbs and a hanging drop.
   if(t<24){const group=new THREE.Group();group.position.set(0,2.3,0);
    const ring=new THREE.Mesh(own(new THREE.TorusGeometry(.3,.015,8,28)),brass);ring.rotation.x=Math.PI/2;group.add(ring);
    for(let k=0;k<8;k++){const bulb=new THREE.Mesh(own(new THREE.SphereGeometry(.035,10,8)),bulbMat);bulb.position.set(.3*Math.cos(k*Math.PI/4),.04,.3*Math.sin(k*Math.PI/4));group.add(bulb);}
    const drop=new THREE.Mesh(own(new THREE.OctahedronGeometry(.07)),bulbMat);drop.position.y=-.12;drop.scale.y=1.8;group.add(drop);
    const cord=new THREE.Mesh(own(new THREE.CylinderGeometry(.006,.006,1.0,5)),brass);cord.position.y=.5;group.add(cord);tableGroup.add(group);
    if(pendantLights.length<4){const light=new THREE.PointLight('#ffc98a',5,7,2);light.position.set(0,2.0,0);tableGroup.add(light);pendantLights.push(light);}}
  });
  for(const mesh of [tops,drapes,hems,runners,plates,napkins,tableLegs,candles,seats,backs,chairLegs])mesh.instanceMatrix.needsUpdate=true;
 }

 // Cake table: a round clothed table with a tiered cake whose size follows the guest count. Draggable like any table.
 if(config.cake){
  const tiers=config.guests<=15?1:config.guests<=40?2:config.guests<=90?3:4,base=.14+.05*tiers;
  const spot=placeExtras(zones,width,depth).cake,group=furnitureGroup('cake',1,spot.x,spot.z);
  const cloth=mat('#f6f0e4',.95),icing=mat('#fbf4ea',.5),rose=mat('#d9a0a8',.6);
  cylinder(.75,.04,cloth,0,.72,0,group);cylinder(.82,.7,cloth,0,.02,0,group);cylinder(.83,.025,brass,0,.02,0,group);
  cylinder(base+.07,.015,brass,0,.76,0,group);
  let y=.775,r=base;
  for(let i=0;i<tiers;i++){cylinder(r,.13,icing,0,y,0,group);cylinder(r+.004,.018,i%2?brass:rose,0,y+.02,0,group);y+=.13;r*=.78;}
  cylinder(.012,.07,candleMat,0,y,0,group);
 }
 // Sweetheart table, styled after a candle-lit ivory reception: a table in draped ivory cloth that pools on the floor, two round-back chairs, tall taper candles, bud vases, a big white rose arrangement on one corner,
 // flowers and pillar candles on the floor, and a swag of fabric hanging behind.
 if(config.sweetheart){
  const length=1.8,spot=placeExtras(zones,width,depth).sweetheart,group=furnitureGroup('sweetheart',1,spot.x,spot.z);
  const ivory=mat('#efe6d2',.92),cream=mat('#e9dcc1',.8),wood=mat('#a8774a',.55),white=mat('#fbf7ee',.6),leaf=mat('#5d6e47',.85),rose=mat('#f6efe2',.7),glass=own(new THREE.MeshStandardMaterial({color:'#eef6f8',transparent:true,opacity:.32,roughness:.08}));
  // Cloth: a straight drape plus a train that spreads over the floor at the front right.
  box(length,.04,.85,ivory,0,.72,0,group);box(length+.04,.72,.89,ivory,0,0,0,group);
  for(const [x,z,rx,rz] of [[.55,.7,.75,.38],[1.0,.55,.5,.3],[-.85,.62,.55,.28]]){const train=new THREE.Mesh(own(new THREE.CylinderGeometry(1,1,.02,24)),ivory);train.scale.set(rx,1,rz);train.position.set(x,.011,z);train.receiveShadow=true;group.add(train);}
  // Round-back chairs behind the table.
  for(const x of [-.42,.42]){box(.5,.07,.5,cream,x,.45,-.75,group);const back=new THREE.Mesh(own(new THREE.CylinderGeometry(.27,.27,.05,24)),cream);back.rotation.x=Math.PI/2;back.position.set(x,.98,-1.02);back.castShadow=true;group.add(back);
   const rim=new THREE.Mesh(own(new THREE.TorusGeometry(.27,.025,8,28)),wood);rim.position.set(x,.98,-1.02);group.add(rim);
   for(const [dx,dz] of [[-.2,-.2],[.2,-.2],[-.2,.2],[.2,.2]])cylinder(.022,.45,wood,x+dx,0,-.75+dz,group);}
  // On the table: plates, two tall taper candles in brass holders on the left, small bud vases.
  for(const x of [-.25,.25])cylinder(.12,.012,white,x,.76,.05,group);
  for(const x of [-.82,-.7]){cylinder(.03,.07,brass,x,.76,-.1,group);cylinder(.016,x<-.75?.34:.28,candleMat,x,.83,-.1,group);}
  for(const [x,z] of [[-.55,.0],[-.05,-.12],[.5,-.05]]){cylinder(.025,.1,glass,x,.76,z,group);const bud=new THREE.Mesh(own(new THREE.SphereGeometry(.035,8,6)),rose);bud.position.set(x,.9,z);group.add(bud);}
  // Flowers: a lush arrangement on the right corner of the table with a trailing garland, and a bouquet on the floor at the left.
  const cluster=(cx,cy,cz,count,spread,rMin,rMax,greens)=>{for(let k=0;k<count;k++){const a=k*2.399,r=spread*Math.sqrt((k+.5)/count),sphere=new THREE.Mesh(own(new THREE.SphereGeometry(rMin+(rMax-rMin)*((k*7)%5)/4,10,8)),k%greens===0?leaf:rose);sphere.position.set(cx+Math.cos(a)*r,cy+Math.sin(a*1.3)*r*.7+(k%3)*.01,cz+Math.sin(a)*r*.8);sphere.castShadow=true;group.add(sphere);}};
  cluster(.72,.9,-.02,18,.24,.06,.1,4);
  for(let k=0;k<6;k++){const bloom=new THREE.Mesh(own(new THREE.SphereGeometry(.05-k*.003,8,6)),k%2?leaf:rose);bloom.position.set(.9+k*.012,.78-k*.1,.34);group.add(bloom);}
  cluster(-1.1,.3,.55,16,.26,.07,.11,4);
  for(const [x,z,tilt] of [[-1.3,.42,.25],[-1.2,.75,-.2]]){const lily=new THREE.Mesh(own(new THREE.ConeGeometry(.07,.2,10,1,true)),white);lily.position.set(x,.58,z);lily.rotation.z=tilt;lily.material.side=THREE.DoubleSide;group.add(lily);cylinder(.01,.35,leaf,x,.2,z,group);}
  // Pillar candles in glass on the floor at the front right.
  for(const [x,z,h] of [[.78,.78,.2],[.95,.7,.14],[1.12,.82,.1],[.88,.95,.07],[1.05,.98,.1]]){cylinder(.045,h,candleMat,x,0,z,group);cylinder(.06,h+.04,glass,x,0,z,group);}
  // A swag of ivory fabric hanging behind, to the right.
  const swag=box(.3,2.3,.02,ivory,1.0,.4,-1.15,group);swag.rotation.z=.42;
 }
 const pmrem=new THREE.PMREMGenerator(renderer);{const environment=new RoomEnvironment();scene.environment=own(pmrem.fromScene(environment,.04).texture);environment.dispose?.();pmrem.dispose();}
 const ambient=new THREE.HemisphereLight('#ffffff','#cccccc',2.2);scene.add(ambient);const key=new THREE.DirectionalLight('#fff7ea',2.6);key.position.set(2*Math.max(1,Math.max(width,depth)/10),8*Math.max(1,Math.max(width,depth)/10),6*Math.max(1,Math.max(width,depth)/10));key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.radius=3;key.shadow.camera.left=-width;key.shadow.camera.right=width;key.shadow.camera.top=depth;key.shadow.camera.bottom=-depth;key.shadow.bias=-.001;scene.add(key);scene.add(key.target);
 const wash=new THREE.PointLight('#fff1dd',35,15,2);wash.position.set(0,2.7,-depth/2+1);scene.add(wash);
 // Warm architectural wall washes in evening mode; no extra shadow maps.
 const nightWallRig=new THREE.Group();nightWallRig.visible=false;scene.add(nightWallRig);
 if(!config.boundary?.length){
  const fixtures=[
   [-width*.34,2.65,-depth/2+.38,-width*.34,1.1,-depth/2+.09],
   [width*.34,2.65,-depth/2+.38,width*.34,1.1,-depth/2+.09],
   [-width/2+.38,2.65,-depth*.22,-width/2+.09,1.1,-depth*.22],
   [-width/2+.38,2.65,depth*.22,-width/2+.09,1.1,depth*.22]
  ];
  for(const [x,y,z,tx,ty,tz] of fixtures){
   const light=new THREE.SpotLight('#ffd39a',28,6,Math.PI/3,.85,1.5);
   light.position.set(x,y,z);light.target.position.set(tx,ty,tz);
   nightWallRig.add(light,light.target);
   cylinder(.09,.14,brass,x,y,z,nightWallRig);
   cylinder(.07,.025,bulbMat,x,y-.025,z,nightWallRig);
  }
 }

 const grid=new THREE.GridHelper(Math.max(width,depth),Math.max(width,depth),'#d3d3d3','#686868');grid.position.y=.014;grid.material.opacity=.16;grid.material.transparent=true;grid.visible=config.grid;scene.add(grid);
 const layout=layoutEquipment(items,width,depth);const deckMat=mat('#060707',.35);box(SW,.03,3.6,deckMat,0,.015,-depth/2+1.8);// stage deck
 const trimMat=own(new THREE.MeshBasicMaterial({color:'#c8c8c8'}));const sz=-depth/2+1.8;for(const [w,d,x,z] of [[SW+.04,.04,0,sz-1.8],[SW+.04,.04,0,sz+1.8],[.04,3.64,-SW/2,sz],[.04,3.64,SW/2,sz]])box(w,.034,d,trimMat,x,0,z);
 box(SW+.04,3.3,.1,deckMat,0,0,-depth/2+.2);// the stage's own back wall, black in every lighting mode
 for(const [w,h,x,y] of [[SW+.04,.04,0,3.3],[.04,3.3,-SW/2,0],[.04,3.3,SW/2,0]])box(w,h,.12,trimMat,x,y,-depth/2+.2);
 const stageLight=new THREE.SpotLight('#ffffff',55,14,.95,.65,1.2);stageLight.position.set(0,6.5,-depth/2+3.6);stageLight.target.position.set(0,0,-depth/2+1.6);scene.add(stageLight,stageLight.target);
 // The table stays available; the controller and laptop follow the booking’s DJ service.
  new GLTFLoader().loadAsync('/echo/models/dj-booth.glb').then(gltf=>{trackModel(gltf.scene);if(disposed)return;boothSetup=configureDjBooth(THREE,gltf.scene,{djAdded:djServiceEnabled,own});gltf.scene.rotation.y=Math.PI;gltf.scene.position.set(0,0,-depth/2+1.8);gltf.scene.traverse(child=>{if(child.isMesh){child.castShadow=true;child.receiveShadow=true;}});scene.add(gltf.scene);booth=gltf.scene;arrangeEquipment();}).catch(()=>{});
 new THREE.TextureLoader().loadAsync('/echo/models/dj-khalil-party.png').then(texture=>{
  if(disposed){texture.dispose();return;}
  own(texture);khalilPerformer=configureDjKhalilPerformer(THREE,texture,{depth,own});
  khalilPerformer.setDjAdded(djServiceEnabled);khalilPerformer.setParty(lightingMode==='party');
  scene.add(khalilPerformer.performer);
 }).catch(()=>{});
 // A restrained sign gives the back wall a human scale without inventing venue measurements.
 const sign=document.createElement('canvas');sign.width=1024;sign.height=256;const ctx=sign.getContext('2d');ctx.fillStyle='#292929';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#e6d6ac';ctx.textAlign='center';ctx.font='600 94px sans-serif';ctx.fillText('E C H O',512,135);ctx.font='23px sans-serif';ctx.fillStyle='#bdbdbd';ctx.fillText('YOUR EVENT · YOUR SPACE',512,195);const texture=own(new THREE.CanvasTexture(sign));texture.colorSpace=THREE.SRGBColorSpace;const signMesh=new THREE.Mesh(own(new THREE.PlaneGeometry(2.6,.65)),own(new THREE.MeshBasicMaterial({map:texture})));signMesh.position.set(0,2.8,-depth/2+.27);scene.add(signMesh);
 let completed=0,failed=0;const loader=new GLTFLoader();const loaderTasks=new Map();
 const trackModel=root=>root.traverse(child=>{if(child.geometry)own(child.geometry);for(const material of Array.isArray(child.material)?child.material:[child.material])if(material){own(material);for(const value of Object.values(material))if(value?.isTexture)own(value);}});
 // Use individual mesh bounds so a truss opening remains available for a screen.
 const meshBounds=root=>{const boxes=[];root.updateWorldMatrix(true,true);root.traverse(child=>{if(!child.isMesh||(root.userData.unit?.kind==='table'&&!child.userData.collisionOnly))return;for(let node=child;node&&node!==root;node=node.parent)if(!node.visible)return;child.geometry.computeBoundingBox();const bounds=child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld);if(!bounds.isEmpty())boxes.push(bounds);});return boxes;};
 // Rental markers live outside model groups, so they never change collision bounds.
 const rentalIndicators=new Map(),markerMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
 // A name label (not an arrow) floats above each piece of equipment and follows it when it is moved.
 const labels=new Map();
 const labelFor=text=>{
  const name=String(text||'').trim()||'Equipment';if(labels.has(name))return labels.get(name);
  const scale=2,fontSize=26*scale,pad=14*scale,measure=document.createElement('canvas').getContext('2d');measure.font=`700 ${fontSize}px Manrope, 'Noto Sans Arabic', sans-serif`;
  const text2=name.length>28?name.slice(0,27)+'…':name,w=Math.ceil(measure.measureText(text2).width)+pad*2,h=fontSize+pad*1.2;
  const art=document.createElement('canvas');art.width=w;art.height=h+10*scale;const g=art.getContext('2d');
  g.fillStyle='#14242df0';g.strokeStyle='#c1e7f5';g.lineWidth=3*scale;g.beginPath();g.roundRect(2*scale,2*scale,w-4*scale,h-4*scale,(h-4*scale)/2);g.fill();g.stroke();
  g.fillStyle='#c1e7f5';g.beginPath();g.moveTo(w/2-8*scale,h-3*scale);g.lineTo(w/2+8*scale,h-3*scale);g.lineTo(w/2,h+8*scale);g.closePath();g.fill();
  g.font=`700 ${fontSize}px Manrope, 'Noto Sans Arabic', sans-serif`;g.fillStyle='#f2fbff';g.textAlign='center';g.textBaseline='middle';g.fillText(text2,w/2,h/2);
  const map=own(new THREE.CanvasTexture(art));map.colorSpace=THREE.SRGBColorSpace;
  const entry={material:own(new THREE.SpriteMaterial({map,transparent:true,depthWrite:false,sizeAttenuation:false,toneMapped:false})),aspect:art.width/art.height};labels.set(name,entry);return entry;
 };
 const refreshRentalIndicators=()=>{
  if(!config.equipmentIndicators||!objects.length)return;
  for(const group of objects){
   let marker=rentalIndicators.get(group);
   if(!marker){const unit=group.userData.unit,label=labelFor(config.ar?(unit.nameAr||unit.name):unit.name),sprite=new THREE.Sprite(label.material);sprite.name=`rental-indicator:${unit.key}`;sprite.userData.equipmentId=unit.id;sprite.center.set(.5,0);sprite.scale.set(.0125*label.aspect,.0125,1);scene.add(sprite);marker={sprite,baseY:0,phase:rentalIndicators.size*.7};rentalIndicators.set(group,marker);}
   marker.sprite.visible=group.visible;if(!group.visible)continue;
   const bounds=new THREE.Box3();meshBounds(group).forEach(box=>bounds.union(box));if(bounds.isEmpty()){marker.sprite.visible=false;continue;}
   marker.baseY=bounds.max.y+.16;marker.sprite.position.set((bounds.min.x+bounds.max.x)/2,marker.baseY,(bounds.min.z+bounds.max.z)/2);
  }
 };
 const animateEquipmentIndicators=time=>{for(const {sprite,baseY,phase} of rentalIndicators.values())if(sprite.visible)sprite.position.y=baseY+(markerMotion.matches?0:(1+Math.sin(time*2.4+phase))*.11);};
 const overlaps=(a,b,gap=.08)=>a.min.x<b.max.x+gap&&a.max.x>b.min.x-gap&&a.min.z<b.max.z+gap&&a.max.z>b.min.z-gap&&a.min.y<b.max.y-.003&&a.max.y>b.min.y+.003;
 const inRing=(x,z,ring)=>{let inside=false;for(let i=0,j=ring.length-1;i<ring.length;j=i++){const a=ring[i],b=ring[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;};
 const footprintFits=bounds=>{
  if(bounds.min.x< -width/2+.1||bounds.max.x>width/2-.1||bounds.min.z< -depth/2+.1||bounds.max.z>depth/2-.1)return false;
  if(!config.boundary?.length)return true;
  const corners=[[bounds.min.x,bounds.min.z],[bounds.max.x,bounds.min.z],[bounds.max.x,bounds.max.z],[bounds.min.x,bounds.max.z]];
  const inside=([x,z])=>inRing(x,z,config.boundary)&&!(config.holes||[]).some(ring=>inRing(x,z,ring));
  if(!corners.every(inside))return false;
  // Reject concave edges and courtyard boundaries crossing the footprint, too.
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const rings=[config.boundary,...(config.holes||[])];
  return !rings.some(ring=>ring.some((a,i)=>{const b=ring[(i+1)%ring.length];return (a[0]>bounds.min.x&&a[0]<bounds.max.x&&a[1]>bounds.min.z&&a[1]<bounds.max.z)||corners.some((c,j)=>{const d=corners[(j+1)%4];return cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0;});}));
 };
 const reportStatus=()=>onStatus({loading:completed<units.filter(u=>u.part?.src||u.modelUrl||EQUIPMENT_MODELS[u.id]?.src).length,failed,unplaced});
 function arrangeEquipment(){
  if(roomResizePreview?.isResizing){reportStatus();return;}
  const occupied=[];const occupy=boxes=>{const bounds=new THREE.Box3();boxes.forEach(box=>bounds.union(box));occupied.push({bounds,boxes});};if(booth)occupy(meshBounds(booth));for(const group of furniture)occupy(meshBounds(group));unplaced=0;
  for(const group of objects){
   const unit=group.userData.unit,saved=positions[unit.key],anchor={x:saved?.x??unit.x,z:saved?.z??unit.z};
   group.position.x=anchor.x;group.position.z=anchor.z;
   const local=meshBounds(group).map(bounds=>bounds.translate(new THREE.Vector3(-anchor.x,0,-anchor.z)));
   const extent=new THREE.Box3();local.forEach(bounds=>extent.union(bounds));
   const at=(x,z)=>{const offset=new THREE.Vector3(x,0,z),bounds=extent.clone().translate(offset);if(!footprintFits(bounds))return null;const nearby=occupied.filter(other=>overlaps(bounds,other.bounds)),boxes=local.map(box=>box.clone().translate(offset));return nearby.some(other=>boxes.some(box=>other.boxes.some(obstacle=>overlaps(box,obstacle))))?null:boxes;};
   let x=anchor.x,z=anchor.z,boxes=at(x,z);
   const step=Math.max(.25,Math.max(width,depth)/80),limit=Math.ceil(Math.max(width,depth)/step)+1;
   search:for(let ring=1;!boxes&&ring<=limit;ring++)for(let i=-ring;i<=ring;i++)for(const [dx,dz] of [[i,-ring],[i,ring],[-ring,i],[ring,i]]){
    const nextX=anchor.x+dx*step,nextZ=anchor.z+dz*step;
    if(Math.abs(nextX)>width/2||Math.abs(nextZ)>depth/2)continue;
    const candidate=at(nextX,nextZ);if(candidate){x=nextX;z=nextZ;boxes=candidate;break search;}
   }
   group.visible=!!boxes;
   if(boxes){group.position.x=x;group.position.z=z;occupy(boxes);}else unplaced++;
  }
  refreshRentalIndicators();
  reportStatus();
 }
 // Reject manual changes that would intersect another unit or leave the venue.
 const changePose=(group,change)=>{const previousPosition=group.position.clone(),previousRotation=group.rotation.clone(),previousScale=group.scale.clone();change();const boxes=meshBounds(group),others=[...objects,...furniture].filter(item=>item!==group&&item.visible),other=[...(booth?meshBounds(booth):[]),...others.flatMap(meshBounds)],tableKind=item=>item.userData.unit?.kind==='table',tablesApart=tableKind(group)?others.filter(tableKind).flatMap(meshBounds):[];const bounds=new THREE.Box3();boxes.forEach(box=>bounds.union(box));if(!footprintFits(bounds)||boxes.some(box=>other.some(obstacle=>overlaps(box,obstacle))||tablesApart.some(obstacle=>overlaps(box,obstacle,1.8)))){group.position.copy(previousPosition);group.rotation.copy(previousRotation);group.scale.copy(previousScale);return false;}moveFurnitureInstances(THREE,group,previousPosition,previousRotation,previousScale);positions[group.userData.unit.key]={x:group.position.x,z:group.position.z,rotation:group.rotation.y};refreshRentalIndicators();return true;};
 const fallback=(unit,group)=>{const [w,h,d]=MODEL_SIZES[unit.kind];box(w,h,d,black,0,0,0,group);if(['speaker','sub'].includes(unit.kind)){const grille=mat('#3c3c3c',.65,.4);box(w*.86,h*.86,.014,grille,0,h*.07,d/2+.005,group);}if(['light','uplight'].includes(unit.kind)){const lens=own(new THREE.MeshBasicMaterial({color:'#eee9df'}));cylinder(w*.28,.035,lens,0,h,0,group);}if(unit.kind==='screen'){const face=own(new THREE.MeshBasicMaterial({color:'#929292'}));box(w*.95,h*.9,.01,face,0,h*.05,d/2+.01,group);}};
 // A multi-piece set (the JBL system) becomes one independently movable unit per piece.
 const clampX=x=>Math.max(-width/2+.4,Math.min(width/2-.4,x)),clampZ=z=>Math.max(-depth/2+.4,Math.min(depth/2-.4,z));
 const units=layout.units.flatMap(u=>{const set=u.modelUrl?null:EQUIPMENT_MODELS[u.id]?.parts;if(!set)return [u];const n=Number(u.key.split(':').pop())||0;return set.map((part,i)=>{const room=part.where==='room',side=part.at[0]<0?-1:1;// tower speakers stand by the side walls in front of the stage, aimed at the audience
  return {...u,key:`${u.key}:${i}`,part,kind:'sub',x:room?clampX(side*(width/2-.8)):clampX(part.at[0]),y:0,z:room?clampZ(-depth/2+4.6+n*1.6):clampZ(-depth/2+part.at[1]+n*1.6),rot:room?-side*Math.PI/2:part.at[2],name:`${u.name||'JBL System'} · ${part.label[0]}`};});});
 for(const unit of units){
  const group=new THREE.Group();group.userData.unit=unit;const saved=positions[unit.key];const size=unit.roomPlacement?.scale>0?unit.roomPlacement.scale:1;group.scale.setScalar(size);const part=unit.part;group.position.set(Math.max(-width/2+.4,Math.min(width/2-.4,saved?.x??unit.x)),part?.12:unit.y+(unit.y===0?.12:0),Math.max(-depth/2+.4,Math.min(depth/2-.4,saved?.z??unit.z)));if(!unit.hung)group.position.y*=size;if(unit.hung)group.rotation.set(Math.PI,saved?.rotation||0,0,'YXZ');else group.rotation.y=saved?.rotation??(unit.rot||0);scene.add(group);objects.push(group);models.set(unit.key,group);fallback(unit,group);
  if(unit.kind==='speaker'){const support=new THREE.Group();support.name='support';group.add(support);cylinder(.035,1.2,metal,0,-unit.y,0,support);cylinder(.24,.04,black,0,-unit.y,0,support);}
  if(['light','uplight'].includes(unit.kind)){const light=new THREE.PointLight(unit.kind==='light'?'#c087ff':'#ffe4bf',unit.kind==='light'?6:3,3);group.add(light);light.position.y=.5;unitLights.push({light,color:light.color.clone(),intensity:light.intensity});}
  const model=EQUIPMENT_MODELS[unit.id],source=part?.src||unit.modelUrl||model?.src;if(!source)continue;
  if(!loaderTasks.has(source))loaderTasks.set(source,loader.loadAsync(source).then(gltf=>{trackModel(gltf.scene);if(disposed){for(const resource of resources)resource.dispose?.();return null;}return gltf.scene;}).catch(()=>null));
  loaderTasks.get(source).then(root=>{if(disposed)return;completed++;if(root){const copy=root.clone(true);const bounds=new THREE.Box3().setFromObject(copy),size=bounds.getSize(new THREE.Vector3()),target=MODEL_SIZES[unit.kind];const boost=SIZE_BOOST[unit.kind]||1,scale=boost*(part?1:Math.min(target[0]/Math.max(size.x,.001),target[1]/Math.max(size.y,.001),target[2]/Math.max(size.z,.001)));copy.scale.setScalar(scale);const fitted=new THREE.Box3().setFromObject(copy),center=fitted.getCenter(new THREE.Vector3());copy.position.set(-center.x,-fitted.min.y,-center.z);copy.traverse(child=>{if(child.isMesh){child.castShadow=true;child.receiveShadow=true;if(child.material?.name==='LED logo display'&&!ledMaterials.includes(child.material))ledMaterials.push(child.material);}});for(const child of [...group.children])if(!child.isLight&&child.name!=='support')group.remove(child);group.add(copy);}else failed++;arrangeEquipment();});
 }

 arrangeEquipment();
 // Lighting modes: day (white room), dark (lights off) and party (coloured moving beams, pulsing LED wall).
 const PALETTES={day:{bg:'#111111',timber:'#ffffff',wall:'#f1ebdf',win:'#cfe3f5',bulb:.9,pend:4,env:.5,riser:'#060707',deck:'#060707',trim:'#c8c8c8',stage:55,seams:'#7d6a4e',seamOpacity:.45,sky:'#ffffff',ground:'#cccccc',ambient:1.2,key:2.2,wash:8,strip:1},dark:{bg:'#000000',timber:'#2a2623',wall:'#51483b',win:'#0c1420',bulb:1.9,pend:9,env:.12,riser:'#060707',deck:'#060707',trim:'#606060',stage:9,seams:'#2a3030',seamOpacity:.35,sky:'#e0e0e0',ground:'#1a1d1d',ambient:.9,key:2.2,wash:35,strip:1}};
 PALETTES.party={...PALETTES.dark,ambient:.35,key:.5,wash:10,trim:'#7a5cff',stage:0,win:'#170b2b',bulb:.5,pend:1.5,env:.07};
 const partyRig=new THREE.Group();partyRig.visible=false;scene.add(partyRig);const beams=[];
 for(let i=0;i<4;i++){const spot=new THREE.SpotLight('#ff3bd4',90,16,.38,.55,1.4);spot.position.set((i-1.5)*Math.min(2.2,width/5),3.4,-depth/2+1.1);const target=new THREE.Object3D();partyRig.add(target);spot.target=target;partyRig.add(spot);
  const geometry=own(new THREE.ConeGeometry(1.05,4.2,24,1,true));geometry.translate(0,-2.1,0);geometry.rotateX(-Math.PI/2);const material=own(new THREE.MeshBasicMaterial({color:'#ff3bd4',transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));const beam=new THREE.Mesh(geometry,material);beam.position.copy(spot.position);partyRig.add(beam);beams.push({spot,target,beam,material,phase:i*1.57});}
 const setMode=mode=>{lightingMode=PALETTES[mode]?mode:'day';const p=PALETTES[lightingMode];scene.background?.set(p.bg);scene.fog.color.set(config.backgroundColor||p.bg);timber.color.set(p.timber);wall.color.set(p.wall);wallLeft.color.set(p.wall);riserMat.color.set(p.riser);deckMat.color.set(p.deck);trimMat.color.set(p.trim);stageLight.intensity=p.stage;seams.color.set(p.seams);seams.opacity=p.seamOpacity;ambient.color.set(p.sky);ambient.groundColor.set(p.ground);ambient.intensity=p.ambient;key.intensity=p.key;wash.intensity=p.wash;winMat.color.set(p.win);bulbMat.emissiveIntensity=p.bulb;for(const light of pendantLights)light.intensity=p.pend;candleMat.emissiveIntensity=lightingMode==='day'?1.1:2.4;scene.environmentIntensity=p.env;partyRig.visible=lightingMode==='party';nightWallRig.visible=lightingMode==='dark';khalilPerformer?.setParty(lightingMode==='party');
  if(lightingMode!=='party'){edgeMat.color.set('#e5c992');for(const place of dancerRigs)place(0,false);for(const entry of unitLights){entry.light.color.copy(entry.color);entry.light.intensity=entry.intensity;}for(const material of ledMaterials){material.emissive.set('#ffffff');material.emissiveIntensity=1.4;}}};
 const animateParty=time=>{if(lightingMode!=='party')return;khalilPerformer?.animate(time,camera);const hue=offset=>(.7+(((time*.12+offset)%1+1)%1)*.4)%1;edgeMat.color.setHSL(hue(.1),.9,.6);for(const place of dancerRigs)place(time,true);
  for(const {spot,target,beam,material,phase} of beams){const color=new THREE.Color().setHSL(hue(phase*.16),.9,.55);spot.color.copy(color);material.color.copy(color);target.position.set(Math.sin(time*.9+phase)*width*.3,0,-depth/2+2.2+Math.cos(time*1.3+phase)*1.6);beam.lookAt(target.position);}
  unitLights.forEach((entry,index)=>{entry.light.color.setHSL(hue(index*.13),.95,.55);entry.light.intensity=entry.intensity*3.2*(.6+.4*Math.sin(time*7+index));});
  for(const material of ledMaterials){material.emissive.setHSL(hue(.3),.6,.62);material.emissiveIntensity=1.1+.9*Math.abs(Math.sin(time*5));}};


 // Guests: seated at the tables, and standing on the dance floor (they dance in party mode).
 const dancerRigs=[];
 // Every guest follows a small routine: eat at their own chair, then now and then walk to the dance floor or stand at another table to chat, and walk back.
 // Movement uses straight-line walking with a soft push away from tables and columns, no pathfinding; dancers may overlap. Add a navmesh if crowds ever look wrong.
 const seatedIdx=zones.tables.flatMap((table,index)=>Array.from({length:table.guests},()=>index));
 const guestSim=(()=>{
  const total=zones.seated.length+zones.dancers.length;if(!total)return null;
  const rand=Math.random,dance=zones.dance,limitX=width/2-.4,limitZ=depth/2-.4;
  // A chair follows its table if the visitor drags or turns it.
  const seatPose=home=>{const group=tableGroups[home.table],table=zones.tables[home.table];if(!group)return home;const c=Math.cos(group.rotation.y),n=Math.sin(group.rotation.y),dx=home.x-table.x,dz=home.z-table.z;return {x:group.position.x+dx*c+dz*n,z:group.position.z-dx*n+dz*c,rotation:home.rotation+group.rotation.y};};
  const free=zones.tables.flatMap((table,index)=>table.chairs.slice(table.guests).map(chair=>({x:chair.x,z:chair.z,rotation:chair.rotation,table:index})));
  const make=(home,state,person)=>({home,state,x:person.x,z:person.z,rot:person.rotation,t:rand()*14,phase:rand()*6.28,target:null,after:null,away:-1});
  const nth=new Map(),agents=[...zones.seated.map((person,i)=>{const table=seatedIdx[i],agent=make({x:person.x,z:person.z,rotation:person.rotation,table},'sit',person);agent.nameIdx=nth.get(table)||0;nth.set(table,agent.nameIdx+1);return agent;}),...zones.dancers.map(person=>make(free.shift()||null,'dance',person))];
  agents.forEach((agent,i)=>{agent.height=.93+((i*37)%13)/13*.12;});
  const go=(agent,target,after,duration,away=-1)=>{agent.state='walk';agent.target=target;agent.after=after;agent.duration=duration;agent.away=away;agent.side=rand()<.5?-1:1;agent.walked=0;agent.limit=4+2*Math.hypot(target.x-agent.x,target.z-agent.z)/1.15;};// the limit is a safety net: a guest still walking long after they should have arrived is placed at the goal
  // The party starts with everyone seated. Only in party mode do guests dance, in groups of 2 to 5 standing in a ring and facing each other.
  const groups=[],ringR=size=>.4+.15*size,ringSpot=(g,slot)=>{const a=g.angle+slot/g.slots.length*Math.PI*2,r=ringR(g.slots.length);return {x:g.x+Math.sin(a)*r,z:g.z+Math.cos(a)*r};};
  const leaveGroup=agent=>{const g=agent.group;if(!g)return;g.slots[agent.slot]=null;agent.group=null;if(g.slots.every(slot=>!slot))groups.splice(groups.indexOf(g),1);};
  // A new group needs its own patch of floor, clear of the other groups; with no room left the guest joins a group with a free place, or simply stays at the table.
  const danceSpot=agent=>{
   leaveGroup(agent);
   let g=rand()<.6?groups.find(group=>group.slots.includes(null)):null;
   for(let tries=0;!g&&tries<14;tries++){const size=2+Math.floor(rand()*4),m=ringR(size)+.45,x=dance.x+(rand()-.5)*Math.max(0,dance.w-2*m),z=dance.z+(rand()-.5)*Math.max(0,dance.d-2*m);
    if(groups.every(other=>Math.hypot(other.x-x,other.z-z)>ringR(other.slots.length)+m+.3)){g={x,z,angle:rand()*6.28,dance:rand()<.5?'dance1':'dance2',slots:Array(size).fill(null)};groups.push(g);}}
   g??=groups.find(group=>group.slots.includes(null));
   if(!g)return null;
   agent.group=g;agent.slot=g.slots.indexOf(null);g.slots[agent.slot]=agent;return ringSpot(g,agent.slot);
  };
  const facing=agent=>agent.group?Math.atan2(agent.group.x-agent.x,agent.group.z-agent.z):agent.rot;
  // Everyone starts seated; guests with no chair stand and chat.
  agents.forEach((agent,i)=>{if(agent.state==='dance'){if(agent.home){const seat=agent.home;agent.state='sit';agent.x=seat.x;agent.z=seat.z;agent.rot=seat.rotation;}else{agent.state='chat';const table=zones.tables.length?tableGroups[i%zones.tables.length]:null,angle=i*2.4;if(table){agent.x=table.position.x+Math.sin(angle)*2.6;agent.z=table.position.z+Math.cos(angle)*2.6;}}}});// a guest with no free chair stands beside a table, never out on the dance floor
  const chatSpot=agent=>{const others=zones.tables.map((_,i)=>i).filter(i=>i!==agent.home?.table&&tableGroups[i]);if(!others.length)return null;const i=others[Math.floor(rand()*others.length)],angle=rand()*6.28;return {x:tableGroups[i].position.x+Math.sin(angle)*2.6,z:tableGroups[i].position.z+Math.cos(angle)*2.6,table:i};};
  const decide=(agent,party)=>{
   const r=rand(),from=agent.state,keepDancing=party&&from==='dance'&&r<.25;
   if(from!=='walk'&&!keepDancing)leaveGroup(agent);
   if(from==='sit'&&!party){agent.t=8+rand()*16;return;}// daylight and evening: everyone stays at their table, sitting and talking; only Party mode gets guests moving
   if(from==='sit'){
    const seat=seatPose(agent.home);agent.x=seat.x-Math.sin(seat.rotation)*.45;agent.z=seat.z-Math.cos(seat.rotation)*.45;// stands up and steps back from the table
    const spot=chatSpot(agent),floor=party&&r<.6?danceSpot(agent):null;
    if(floor)go(agent,floor,'dance',8+rand()*20);
    else if(r<(party?.7:.3)&&spot)go(agent,spot,'chat',6+rand()*8,spot.table);
    else{agent.state='sit';agent.t=8+rand()*16;}
   }else if(agent.home&&!keepDancing)go(agent,agent.home,'sit',0);
   else{const floor=party?danceSpot(agent):null;if(floor)go(agent,floor,'dance',8+rand()*20);else{agent.state='chat';agent.t=8+rand()*16;}}
  };
  // Personal space: nobody stands inside anybody else. Standing guests are pushed apart (seated ones never move); a grid keeps it cheap in a crowd.
  const SPACE=.6,cells=new Map(),cellKey=(x,z)=>Math.floor(x/SPACE)*8192+Math.floor(z/SPACE);
  const separate=()=>{
   cells.clear();for(const agent of agents){const key=cellKey(agent.x,agent.z);(cells.get(key)||cells.set(key,[]).get(key)).push(agent);}
   for(const agent of agents){if(agent.state==='sit')continue;
    const cx=Math.floor(agent.x/SPACE),cz=Math.floor(agent.z/SPACE);
    for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(const other of cells.get((cx+i)*8192+cz+j)||[]){if(other===agent)continue;
     let ex=agent.x-other.x,ez=agent.z-other.z,d=Math.hypot(ex,ez);if(d>=SPACE)continue;if(d<.001){ex=rand()-.5;ez=rand()-.5;d=Math.hypot(ex,ez);}
     const push=(SPACE-d)*(other.state==='sit'?.4:.2);agent.x=Math.max(-limitX,Math.min(limitX,agent.x+ex/d*push));agent.z=Math.max(-limitZ,Math.min(limitZ,agent.z+ez/d*push));}}
  };
  const step=(agent,dt,party)=>{
   if(agent.state==='walk'){
    const goal=agent.after==='sit'?seatPose(agent.home):agent.target;agent.walked+=dt;if(agent.walked>agent.limit){agent.x=goal.x;agent.z=goal.z;}let dx=goal.x-agent.x,dz=goal.z-agent.z;const distance=Math.hypot(dx,dz);
    if(distance<.15){agent.state=agent.after;agent.t=agent.duration||8+rand()*16;if(agent.after==='sit'){agent.x=goal.x;agent.z=goal.z;agent.rot=goal.rotation;}else if(agent.after==='dance')agent.rot=facing(agent);else if(agent.after==='chat'&&agent.target)agent.rot=Math.atan2(tableGroups[agent.away].position.x-agent.x,tableGroups[agent.away].position.z-agent.z);return;}
    dx/=distance;dz/=distance;
    // Soft push away from tables (except the ones it is going to or leaving) and columns.
    const avoid=(ox,oz,radius)=>{const ax=agent.x-ox,az=agent.z-oz,d=Math.hypot(ax,az);if(d>=radius+.5||d<.01)return;const w=Math.min(1,(radius+.5-d)/.5);dx+=ax/d*w*.4-az/d*w*1.6*agent.side;dz+=az/d*w*.4+ax/d*w*1.6*agent.side;};// mostly a sidestep that always goes the same way round, so it can never cancel the walk and leave the guest wiggling in place
    zones.tables.forEach((_,i)=>{if(i!==agent.home?.table&&i!==agent.away&&tableGroups[i])avoid(tableGroups[i].position.x,tableGroups[i].position.z,1.7);});
    for(const column of zones.columns)avoid(column.x,column.z,.7);
    const norm=Math.hypot(dx,dz)||1;dx/=norm;dz/=norm;
    agent.x=Math.max(-limitX,Math.min(limitX,agent.x+dx*1.15*dt));agent.z=Math.max(-limitZ,Math.min(limitZ,agent.z+dz*1.15*dt));agent.rot=turn(agent.rot,Math.atan2(dx,dz),Math.min(1,dt*6));return;}// the heading turns smoothly: steering around tables changes the direction every frame
   if(agent.state==='sit'){const seat=seatPose(agent.home);agent.x=seat.x;agent.z=seat.z;agent.rot=seat.rotation;}
   agent.t-=dt;if(agent.t<=0)decide(agent,party);
  };
  // Guests are rigged characters (Mixamo) with walk, sit, chat and dance clips, one clone per guest, chosen to match the dress code. A guest appears once their model has loaded.
  const POOLS={formal:{m:['ch33','ch31'],f:['ch13','ch37']},'smart-casual':{m:['ch33','ch38'],f:['ch13','ch37']},casual:{m:['ch01','ch38'],f:['ch37','ch13']}};
  const gltfLoader=new GLTFLoader(),cache=new Map();
  const fetchGlb=name=>{if(!cache.has(name))cache.set(name,gltfLoader.loadAsync(`/echo/models/guests/${name}.glb`).then(gltf=>{trackModel(gltf.scene);return gltf;}));return cache.get(name);};
  // World-space travel belongs to the room controller. The animation helper
  // removes the walk clip's own forward travel so every loop is seamless.
  const clips=fetchGlb('anims').then(gltf=>gltf.animations.map(makeGuestClipInPlace));
  const clipFor=agent=>agent.state==='sit'?'sit':agent.state==='walk'?'walk':agent.state==='dance'?(agent.group?.dance||'dance1'):'idle';
  const play=(agent,name)=>{const rig=agent.rig;if(!rig||rig.name===name)return;const next=rig.actions[name];if(!next)return;const first=rig.name===null;
   for(const [key,action] of Object.entries(rig.actions))if(key!==name&&action.isRunning())action.fadeOut(.3);
   next.reset();next.time=rand()*next.getClip().duration;next.timeScale=name==='walk'?.85:1;if(!first)next.fadeIn(.3);next.play();rig.name=name;if(first)rig.mixer.update(0);};// the first frame is already posed, never a T-pose
  const mannequinMaterial=own(new THREE.MeshStandardMaterial({color:'#b9b4ad',roughness:.55,metalness:.05}));
  let regender=false,dressNow=config.dressCode?.current;
  const dressModels=async value=>{dressNow=value;
   const pool=POOLS[value]||POOLS['smart-casual'],list=await clips.catch(()=>null);if(!list)return;
   await Promise.all(agents.map(async(agent,i)=>{
    // A guest's character follows the gender chosen in the seating chart; with none chosen, a plain skinless mannequin stands in.
    const names=agent.gender?pool[agent.gender]:null,name=names?names[(i>>1)%names.length]:'mannequin';if(agent.model===name)return;
    agent.model=name;const gltf=await fetchGlb(name==='mannequin'?'ch22':name).catch(()=>null);if(!gltf||disposed||agent.model!==name)return;
    const body=SkeletonUtils.clone(gltf.scene),holder=new THREE.Group(),mixer=new THREE.AnimationMixer(body);holder.add(body);
    // Every Mixamo character names its bones with its own prefix (mixamorig7Hips), so the shared clips are renamed to match.
    const prefix=guestSkeletonPrefix(body);
    // The body mesh is only the skin that shows (head, hands, arms): the clothes give the torso and legs, so they stay, in plain grey.
    if(name==='mannequin')body.traverse(child=>{if(!child.isMesh)return;if(/Hair|Lash/i.test(child.name))child.visible=false;else child.material=mannequinMaterial;});
    const actions={};for(const clip of list)actions[clip.name]=mixer.clipAction(retargetGuestClip(THREE,clip,prefix),body);
    if(agent.rig){scene.remove(agent.rig.holder);agent.rig.mixer.stopAllAction();}
    agent.rig={holder,mixer,actions,name:null};scene.add(holder);play(agent,clipFor(agent));
   }));
  };
  // Guests glide and turn smoothly: the walk code steers in jumps (avoiding tables, new targets), the model never snaps.
  const turn=(from,to,k)=>{let d=(to-from)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return from+d*k;};
  const placeRig=agent=>{const rig=agent.rig;if(!rig)return;play(agent,clipFor(agent));const seated=agent.state==='sit',x=agent.x-Math.sin(agent.rot)*(seated?.12:0),z=agent.z-Math.cos(agent.rot)*(seated?.12:0),k=rig.placed?Math.min(1,frameDt*10):1;
   rig.holder.position.x+=(x-rig.holder.position.x)*k;rig.holder.position.z+=(z-rig.holder.position.z)*k;rig.holder.rotation.y=turn(rig.placed?rig.holder.rotation.y:agent.rot,agent.rot,k);rig.holder.scale.setScalar(agent.height);rig.placed=true;};
  const draw=()=>{for(const agent of agents)placeRig(agent);};
  // A name tag with a pointer above every guest the hosts typed into the seating chart (the i-th named guest at a table sits in its i-th chair).
  const tags=new Map(),tagTexture=text=>{
   // An elegant plaque: a dark glass pill with a gold hairline, a serif name and a small pointer toward the guest. Drawn at 2x so it stays sharp.
   const k=2,font=`600 ${30*k}px "Playfair Display","Cormorant Garamond",Georgia,"Noto Naskh Arabic","Noto Sans Arabic",serif`,canvas=document.createElement('canvas'),g=canvas.getContext('2d');
   g.font=font;if('letterSpacing' in g)g.letterSpacing=`${.6*k}px`;
   const bodyH=52*k,tail=14*k,pad=14*k,w=Math.ceil(g.measureText(text).width)+56*k+2*pad,h=bodyH+tail+2*pad;canvas.width=w;canvas.height=h;
   g.font=font;if('letterSpacing' in g)g.letterSpacing=`${.6*k}px`;
   const x0=pad,y0=pad,x1=w-pad,y1=pad+bodyH,r=bodyH/2,cx=w/2;
   g.beginPath();g.moveTo(x0+r,y0);g.lineTo(x1-r,y0);g.arc(x1-r,y0+r,r,-Math.PI/2,Math.PI/2);g.lineTo(cx+9*k,y1);g.lineTo(cx,y1+tail);g.lineTo(cx-9*k,y1);g.lineTo(x0+r,y1);g.arc(x0+r,y0+r,r,Math.PI/2,Math.PI*1.5);g.closePath();
   g.shadowColor='rgba(0,0,0,.5)';g.shadowBlur=10*k;g.shadowOffsetY=3*k;
   const fill=g.createLinearGradient(0,y0,0,y1);fill.addColorStop(0,'rgba(34,36,41,.96)');fill.addColorStop(1,'rgba(12,14,17,.96)');g.fillStyle=fill;g.fill();
   g.shadowColor='transparent';const rim=g.createLinearGradient(x0,0,x1,0);rim.addColorStop(0,'#b8975a');rim.addColorStop(.5,'#f6ecd0');rim.addColorStop(1,'#b8975a');g.strokeStyle=rim;g.lineWidth=2*k;g.stroke();
   g.fillStyle='#f6ecd0';g.textAlign='center';g.textBaseline='middle';g.fillText(text,cx,y0+bodyH/2+k);
   const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return {texture,aspect:w/h};};
  const setNames=map=>{regender=false;agents.forEach((agent,i)=>{
   const entry=agent.nameIdx===undefined?null:map?.[zones.tables[agent.home.table].number]?.[agent.nameIdx],text=entry?.text||'',tag=tags.get(i);if((entry?.gender||null)!==(agent.gender||null)){agent.gender=entry?.gender||null;regender=true;}
   if(!text){if(tag)tag.sprite.visible=false;return;}
   if(tag?.text===text){tag.sprite.visible=true;return;}
   const {texture,aspect}=tagTexture(text);
   if(tag){tag.sprite.material.map.dispose();tag.sprite.material.map=texture;tag.sprite.material.needsUpdate=true;tag.sprite.scale.set(.42*aspect,.42,1);tag.text=text;tag.sprite.visible=true;return;}
   const sprite=new THREE.Sprite(own(new THREE.SpriteMaterial({map:texture,depthTest:false,transparent:true})));sprite.center.set(.5,0);sprite.scale.set(.42*aspect,.42,1);sprite.renderOrder=20;scene.add(sprite);tags.set(i,{sprite,text});
  });if(regender)dressModels(dressNow);};
  const moveTags=()=>{for(const [i,{sprite}] of tags){const agent=agents[i];if(!sprite.visible)continue;sprite.position.set(agent.x,(agent.state==='sit'?1.5:1.8*agent.height)+(agent.lift||0),agent.z);}};
  setNames(config.names?.current);dressModels(config.dressCode?.current);
  let last=null,frame=0,frameDt=.016,wasParty=false;draw();moveTags();
  return {setNames,dressCode:value=>{dressModels(value);},tick:time=>{if(markerMotion.matches)return;const dt=last===null?0:Math.min(.1,time-last);last=time;const party=lightingMode==='party';frame++;frameDt=dt;if(party!==wasParty){wasParty=party;if(party)for(const agent of agents)if(agent.state==='sit')agent.t=Math.min(agent.t,rand()*6);}/* seated, chatting and dancing guests animate at half rate, staggered (skinning costs the CPU the most); walkers at full rate, or their steps would stutter against their smooth movement */agents.forEach((agent,i)=>{if((!party&&agent.state==='dance'||party===false&&agent.state==='chat')&&agent.t>3)agent.t=rand()*3;/* the music stopped: everyone heads back */step(agent,dt,party);if(agent.rig){agent.wait=(agent.wait||0)+dt;if(agent.state==='walk'||(frame+i)%2===0){agent.rig.mixer.update(agent.wait);agent.wait=0;}}});separate();draw();moveTags();}};
 })();
 for(const group of furniture){const saved=positions[group.userData.unit.key];if(saved&&Number.isFinite(saved.x)&&Number.isFinite(saved.z))changePose(group,()=>{group.position.x=saved.x;group.position.z=saved.z;group.rotation.y=Number.isFinite(saved.rotation)?saved.rotation:0;});}
 const pickMeshes=[];scene.traverse(child=>{if(child.userData.pickGroups)pickMeshes.push(child);});
 const selectedBox=new THREE.BoxHelper(new THREE.Object3D(),'#e8c983');selectedBox.visible=false;own(selectedBox.geometry);own(selectedBox.material);scene.add(selectedBox);
 const select=group=>{selected=group;selectedBox.visible=!!group;if(group){selectedBox.setFromObject(group);onSelect({...group.userData.unit,x:group.position.x,z:group.position.z,rotation:group.rotation.y,scale:group.scale.x});}else onSelect(null);};
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3(),offset=new THREE.Vector3();let dragging=null,miss=null,snapStep=0,dragMode='select';/* dragMode: 'select' (items can be picked and moved), or 'camera' (rotate / pan only) */const snapTo=value=>snapStep?Math.round(value/snapStep)*snapStep:value;
 const point=event=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);};
 const down=event=>{if(roomResizePreview?.isResizing||dragMode!=='select'||tour)return;if(!(config.movable||config.movableId)||event.button!==0)return;point(event);const intersection=ray.intersectObjects([...objects,...furniture,...pickMeshes],true).find(hit=>!hit.object.userData.collisionOnly);let group=intersection?.object.userData.pickGroups?.[intersection.instanceId]||intersection?.object;while(group&&!group.userData.unit)group=group.parent;if(group&&(config.movable||group.userData.unit.id===config.movableId)){event.stopImmediatePropagation();select(group);plane.constant=-group.position.y;ray.ray.intersectPlane(plane,hit);offset.copy(group.position).sub(hit);dragging=group;controls.enabled=false;renderer.domElement.setPointerCapture(event.pointerId);renderer.domElement.style.cursor='grabbing';}else miss={x:event.clientX,y:event.clientY};};
 const move=event=>{if(!dragging)return;point(event);if(!ray.ray.intersectPlane(plane,hit))return;changePose(dragging,()=>{dragging.position.x=snapTo(hit.x+offset.x);dragging.position.z=snapTo(hit.z+offset.z);});selectedBox.setFromObject(dragging);};
 // A click on empty space (not the end of an orbit/pan drag) deselects the selected item.
 const up=event=>{if(miss&&event?.type==='pointerup'&&selected&&Math.hypot(event.clientX-miss.x,event.clientY-miss.y)<5)select(null);miss=null;if(dragging){select(dragging);config.onPositionsChange?.(positions);}dragging=null;controls.enabled=true;renderer.domElement.style.cursor='grab';};
 renderer.domElement.style.touchAction='none';renderer.domElement.style.cursor='grab';renderer.domElement.addEventListener('pointerdown',down,true);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
 const resize=()=>{const w=element.clientWidth,h=Math.max(1,element.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(element);resize();const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(element);
 roomResizePreview=createRoomResizePreview({scene,width,depth,movable:()=>[...objects,...furniture,...(booth?[booth]:[])],reducedMotion:()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches});

 // Camera tour, like watching a video: the camera glides to every table and every added object (never the columns), each seen from three angles and zoom levels, then starts over.
 // The camera never jumps: each frame it eases toward the current shot, which keeps drifting round its subject.
 let tour=null;const clock=new THREE.Clock();
 const tourTargets=()=>{
  const list=[{center:new THREE.Vector3(0,.8,0),radius:Math.max(width,depth)*.45,overview:true}];
  const add=object=>{const box=new THREE.Box3().setFromObject(object);if(box.isEmpty())return;const size=box.getSize(new THREE.Vector3());list.push({center:box.getCenter(new THREE.Vector3()),radius:Math.max(.7,Math.hypot(size.x,size.z)/2)});};
  for(const group of furniture)if(group.userData.unit.kind!=='column')add(group);
  for(const object of objects)if(object.visible)add(object);
  if(booth)add(booth);
  return list;
 };
 const angleLerp=(from,to,k)=>{let d=(to-from)%(Math.PI*2);if(d>Math.PI)d-=Math.PI*2;if(d<-Math.PI)d+=Math.PI*2;return from+d*k;};
 const insideRoom=(point,margin)=>Math.abs(point.x)<=width/2-margin&&Math.abs(point.z)<=depth/2-margin&&point.y>=1&&point.y<=3.1;
 const nextShot=()=>{
  const t=tour,target=t.targets[t.index],shot=t.shot;
  const kinds=target.overview?[[1.35,1.1,.9]]:[[1.0,5.2,.8],[1.3,3.1,1.25],[1.12,1.9,2.1]],[phi,scale,rate]=kinds[shot%kinds.length];
  // The camera always stays inside the room, below the top of the walls and above the floor, so the subject is never hidden behind a wall: of the angles and distances tried, the first that fits is used.
  const center=target.center.clone().setY(Math.max(.4,target.center.y*.5)),wantRadius=Math.max(controls.minDistance,Math.min(controls.maxDistance,target.radius*scale+1.2)),wantPhi=Math.max(controls.minPolarAngle,Math.min(controls.maxPolarAngle,phi)),startTheta=(t.want?.theta??0)+1.9+Math.random()*1.2;
  let best=null;
  search:for(const shrink of [1,.8,.65,.5,.38])for(let step=0;step<24;step++){const theta=startTheta+(step%2?1:-1)*Math.ceil(step/2)*Math.PI/12,radius=Math.max(2.2,wantRadius*shrink),p=center.clone().add(new THREE.Vector3().setFromSphericalCoords(radius,wantPhi,theta));if(insideRoom(p,.8)){best={radius,theta};break search;}}
  t.want={center,radius:best?.radius??wantRadius,phi:wantPhi,theta:best?.theta??startTheta,rate:rate*.07};
  t.t=0;t.dur=target.overview?7:5.5;
  if(++t.shot>=(target.overview?1:kinds.length)){t.shot=0;t.index=(t.index+1)%t.targets.length;}
 };
 const tourTick=dt=>{
  if(!tour)return;
  tour.t+=dt;if(tour.t>=tour.dur)nextShot();
  const w=tour.want,c=tour.cur,k=1-Math.exp(-dt*1.3);
  w.theta+=dt*w.rate;c.center.lerp(w.center,k);c.radius+=(w.radius-c.radius)*k;c.phi+=(w.phi-c.phi)*k;c.theta=angleLerp(c.theta,w.theta,k);
  camera.position.copy(c.center).add(new THREE.Vector3().setFromSphericalCoords(c.radius,c.phi,c.theta));camera.position.x=Math.max(-width/2+.6,Math.min(width/2-.6,camera.position.x));camera.position.z=Math.max(-depth/2+.6,Math.min(depth/2-.6,camera.position.z));camera.position.y=Math.max(1,Math.min(3.1,camera.position.y));// safety net while the camera glides between shots
  controls.target.copy(c.center);camera.lookAt(c.center);
 };
 const setTour=on=>{
  if(!on){if(tour){tour=null;controls.enabled=true;}return;}
  if(tour)return;select(null);controls.enabled=false;
  const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
  tour={targets:tourTargets(),index:0,shot:0,t:0,dur:0,want:null,cur:{center:controls.target.clone(),radius:spherical.radius,phi:spherical.phi,theta:spherical.theta}};
  tour.want={theta:spherical.theta};nextShot();
 };
 renderer.setAnimationLoop(()=>{if(!visible||disposed||!config.active.current)return;roomResizePreview.tick();tourTick(Math.min(.1,clock.getDelta()));{const limitX=width/2+4,limitZ=depth/2+4;controls.target.x=Math.max(-limitX,Math.min(limitX,controls.target.x));controls.target.z=Math.max(-limitZ,Math.min(limitZ,controls.target.z));}controls.update();const elapsed=performance.now()/1000;animateParty(elapsed);guestSim?.tick(elapsed);animateEquipmentIndicators(elapsed);if(selected)selectedBox.setFromObject(selected);renderer.render(scene,camera);});
 setMode(config.mode?.current||'day');
 return {resizeRoom:(nextWidth,nextDepth)=>roomResizePreview.to({width:nextWidth,depth:nextDepth}),
  cameraPose:()=>({position:camera.position.toArray(),target:controls.target.toArray()}),
  restoreCamera:pose=>{if(pose){camera.position.fromArray(pose.position);controls.target.fromArray(pose.target);controls.update();}},
  tour:setTour,dressCode:value=>guestSim?.dressCode(value),names:map=>guestSim?.setNames(map),djService:on=>{djServiceEnabled=Boolean(on);boothSetup?.setDjAdded(on);khalilPerformer?.setDjAdded(on);arrangeEquipment();},mode:setMode,select:key=>select(models.get(key)),move:(axis,value)=>{if(!selected)return;if(!['x','y','z'].includes(axis)||!Number.isFinite(value))return;changePose(selected,()=>{selected.position[axis]=value;});select(selected);},snap:step=>{snapStep=step>0?step:0;},
  // Camera, like a building game: zoom, orbit, tilt, pan along the floor, and preset views.
  zoom:factor=>{const offset=camera.position.clone().sub(controls.target),distance=Math.max(controls.minDistance,Math.min(controls.maxDistance,offset.length()*factor));offset.setLength(distance);camera.position.copy(controls.target).add(offset);controls.update();},
  orbit:(azimuth,polar)=>{const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));spherical.theta+=azimuth;spherical.phi=Math.max(controls.minPolarAngle,Math.min(controls.maxPolarAngle,spherical.phi+polar));camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));camera.lookAt(controls.target);controls.update();},
  panBy:(right,forward)=>{const ahead=new THREE.Vector3();camera.getWorldDirection(ahead);ahead.y=0;if(ahead.lengthSq()<1e-6)return;ahead.normalize();const side=new THREE.Vector3().crossVectors(ahead,new THREE.Vector3(0,1,0)).normalize(),move=side.multiplyScalar(right).add(ahead.multiplyScalar(forward));controls.target.add(move);camera.position.add(move);controls.update();},
  view:name=>{if(name==='iso'){placeCamera();controls.target.set(0,.8,-.3);controls.update();return;}const spherical=new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));const presets={top:[spherical.theta,controls.minPolarAngle],front:[0,1.25],back:[Math.PI,1.25],left:[-Math.PI/2,1.25],right:[Math.PI/2,1.25]},[theta,phi]=presets[name]||[];if(theta===undefined)return;spherical.theta=theta;spherical.phi=phi;camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));camera.lookAt(controls.target);controls.update();},
  scaleTo:value=>{if(!selected||!(value>0))return;const ratio=value/selected.scale.x;changePose(selected,()=>{selected.scale.setScalar(value);if(!selected.userData.unit.hung)selected.position.y*=ratio;});select(selected);},rotateTo:radians=>{if(!selected||!Number.isFinite(radians))return;changePose(selected,()=>{selected.rotation.y=radians;});select(selected);},rotate:()=>{if(!selected)return;changePose(selected,()=>{selected.rotation.y+=Math.PI/4;});select(selected);},pan:mode=>{// 'rotate', 'pan' (or true) or 'select': in select mode a drag never moves the camera, so it only picks and moves items
   const on=mode===true||mode==='pan',picking=mode==='select';dragMode=picking?'select':'camera';if(!picking)select(null);controls.mouseButtons={LEFT:picking?-1:on?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:on?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN};controls.touches={ONE:picking?-1:on?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};renderer.domElement.style.cursor=picking?'default':on?'move':'grab';},reset:()=>{placeCamera();controls.target.set(0,.8,-.3);controls.update();},grid:value=>{grid.visible=value;},dispose:()=>{disposed=true;renderer.setAnimationLoop(null);resizeObserver.disconnect();observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',down,true);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);for(const resource of resources)resource.dispose?.();renderer.dispose();renderer.domElement.remove();}};
}
