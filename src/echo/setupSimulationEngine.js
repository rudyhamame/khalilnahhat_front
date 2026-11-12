import {EQUIPMENT_MODELS} from './equipmentModels';
import {layoutEquipment,layoutRoomZones,MODEL_SIZES} from './simulationLayout';
// Equipment is laid out by the stage plan and stays where it is placed.
const MOVABLE=false;
// Equipment is drawn larger than life so it reads at room scale; the truss, LED wall and booth keep true size.
const SIZE_BOOST={speaker:1.5,sub:1.5,light:1.5,uplight:1.5,fx:1.5,mixer:1.2,mic:1.2,projector:1.2};
const GUEST_SCALE=.75;// standing guests are drawn a little smaller than life so they stay in the background
export async function createSetupSimulation(element,config,onSelect,onStatus){
 const [THREE,{OrbitControls},{GLTFLoader},{RoomEnvironment}]=await Promise.all([import('three'),import('three/addons/controls/OrbitControls.js'),import('three/addons/loaders/GLTFLoader.js'),import('three/addons/environments/RoomEnvironment.js')]);
 let disposed=false,visible=true,selected=null;const resources=new Set(),models=new Map(),positions=config.positions,objects=[];
 const own=value=>{resources.add(value);return value;};
 const unitLights=[],ledMaterials=[];let lightingMode='day',partyClock=0;
 let booth=null,unplaced=0;
 const {width,depth,items}=config;
 const scene=new THREE.Scene();scene.background=new THREE.Color('#000000');scene.fog=new THREE.Fog('#000000',Math.max(40,Math.max(width,depth)*2.4),Math.max(90,Math.max(width,depth)*5));
 const renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});renderer.setPixelRatio(Math.min(devicePixelRatio,1.7));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.25;renderer.outputColorSpace=THREE.SRGBColorSpace;element.appendChild(renderer.domElement);
 const camera=new THREE.PerspectiveCamera(43,1,.1,Math.max(80,Math.max(width,depth)*5));
 // Frame the whole room from a corner, whatever its size: farther away and higher up (a steeper view) as the room grows, so a 50 x 50 m hall is not seen at a grazing angle.
 const placeCamera=()=>{const span=Math.max(width,depth),big=Math.max(0,Math.min(1,(span-12)/40)),distance=Math.max(14,span*1.45),elevation=(28+big*24)*Math.PI/180,azimuth=33.5*Math.PI/180;camera.position.set(distance*Math.cos(elevation)*Math.sin(azimuth),.8+distance*Math.sin(elevation),-.3+distance*Math.cos(elevation)*Math.cos(azimuth));};placeCamera();
 const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(0,.8,-.3);controls.enableDamping=true;controls.minDistance=3;controls.maxDistance=Math.max(width,depth)*2.5;controls.maxPolarAngle=Math.PI/2-.06;controls.minPolarAngle=.12;controls.enablePan=true;controls.screenSpacePanning=false;
 const mat=(color,roughness=.7,metalness=0)=>own(new THREE.MeshStandardMaterial({color,roughness,metalness}));const timber=own(new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.42,clearcoat:.4,clearcoatRoughness:.3})),wall=own(new THREE.MeshStandardMaterial({color:'#ffffff',roughness:.92})),black=mat('#171c1d',.45,.25),metal=mat('#8d9692',.28,.8);
 // Procedural textures (no image files): oak boards and plaster. Colour tints per lighting mode multiply them.
 const rand=seed=>{let t=seed>>>0;return()=>{t+=0x6D2B79F5;let r=Math.imul(t^t>>>15,1|t);r^=r+Math.imul(r^r>>>7,61|r);return((r^r>>>14)>>>0)/4294967296;};};
 const makeTexture=(size,draw,repeatX=1,repeatY=1)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=size;draw(canvas.getContext('2d'),size);const texture=own(new THREE.CanvasTexture(canvas));texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(repeatX,repeatY);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());return texture;};
 const woodTexture=(rx,ry)=>makeTexture(1024,(g,size)=>{const r=rand(7),rows=16,rh=size/rows;for(let row=0;row<rows;row++){let x=-r()*300;while(x<size){const len=190+r()*270,tone=.88+r()*.26;g.fillStyle=`hsl(${24+r()*6} ${34+r()*10}% ${Math.round(33*tone)}%)`;g.fillRect(x,row*rh,len,rh);for(let k=0;k<7;k++){g.strokeStyle=`rgba(70,40,16,${.05+r()*.08})`;g.lineWidth=1;g.beginPath();const y=row*rh+r()*rh;g.moveTo(x,y);g.lineTo(x+len,y+(r()-.5)*4);g.stroke();}g.fillStyle='rgba(40,22,8,.5)';g.fillRect(x,row*rh,2,rh);x+=len;}g.fillStyle='rgba(40,22,8,.45)';g.fillRect(0,row*rh,size,2);}},rx,ry);
 const brickTexture=(rx,ry)=>makeTexture(512,(g,size)=>{const r=rand(11),rows=16,rh=size/rows,bw=128;g.fillStyle='#b9ada0';g.fillRect(0,0,size,size);for(let row=0;row<rows;row++){const shift=row%2?-bw/2:0;for(let x=shift;x<size;x+=bw){g.fillStyle=`hsl(${9+r()*10} ${42+r()*14}% ${28+r()*13}%)`;g.fillRect(x+2,row*rh+2,bw-4,rh-4);for(let k=0;k<14;k++){g.fillStyle=r()>.5?'rgba(255,230,200,.05)':'rgba(40,12,6,.08)';g.fillRect(x+4+r()*(bw-10),row*rh+3+r()*(rh-8),2+r()*6,1+r()*2);}}}},rx,ry);
 const checkerTexture=(rx,ry)=>makeTexture(256,(g,size)=>{for(let i=0;i<2;i++)for(let j=0;j<2;j++){g.fillStyle=(i+j)%2?'#1d1f22':'#0c0d0f';g.fillRect(i*size/2,j*size/2,size/2,size/2);}g.strokeStyle='rgba(255,255,255,.05)';g.strokeRect(0,0,size,size);},rx,ry);
 wall.map=brickTexture(Math.max(2,width/.86),3.6/1.04);const wallLeft=wall.clone();wallLeft.map=brickTexture(Math.max(2,depth/.86),3.6/1.04);own(wallLeft);
 function box(w,h,d,material,x,y,z,parent=scene){const mesh=new THREE.Mesh(own(new THREE.BoxGeometry(w,h,d)),material);mesh.position.set(x,y+h/2,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 function cylinder(radius,height,material,x,y,z,parent=scene){const mesh=new THREE.Mesh(own(new THREE.CylinderGeometry(radius,radius,height,16)),material);mesh.position.set(x,y+height/2,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
 // Open-front room with a warm timber floor, a raised performance area and architectural lighting.
 if(config.boundary?.length>=3){
  const shape=new THREE.Shape(config.boundary.map(([x,z])=>new THREE.Vector2(x,-z)));for(const ring of config.holes||[])shape.holes.push(new THREE.Path(ring.map(([x,z])=>new THREE.Vector2(x,-z))));timber.map=woodTexture(1/2.4,1/2.4);const floor=new THREE.Mesh(own(new THREE.ShapeGeometry(shape)),timber);floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
  const vertices=config.boundary.flatMap(([x,z],i)=>{const next=config.boundary[(i+1)%config.boundary.length];return [x,.025,z,next[0],.025,next[1]];});scene.add(new THREE.LineSegments(own(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(vertices,3))),own(new THREE.LineBasicMaterial({color:'#d7c58f'}))));
 }else{timber.map=woodTexture(Math.max(1,width/2.4),Math.max(1,depth/2.4));box(width,.16,depth,timber,0,-.16,0);box(width,3.6,.16,wall,0,0,-depth/2);box(.16,3.6,depth,wallLeft,-width/2,0,0);}
 const seams=own(new THREE.LineBasicMaterial({color:'#b9bdba',transparent:true,opacity:.55}));const lines=[];for(let x=-width/2;x<=width/2;x+=.45)lines.push(x,.006,-depth/2,x,.006,depth/2);for(let z=-depth/2;z<=depth/2;z+=1.6)lines.push(-width/2,.007,z,width/2,.007,z);const floorLines=new THREE.LineSegments(own(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3))),seams);floorLines.visible=false;scene.add(floorLines);
 const riserMat=mat('#060707',.35);// A DJ stage at a Canadian wedding is a fixed-size riser, about 6.1 m (20 ft) wide, never the width of the room.
 const SW=Math.min(6.1,width-1.2);box(SW,.12,2.7,riserMat,0,0,-depth/2+1.5);
 const strip=own(new THREE.MeshBasicMaterial({color:'#e5c992'}));box(width-.4,.025,.025,strip,0,3.25,-depth/2+.12);box(.025,.025,depth-.4,strip,-width/2+.12,3.25,0);

 // The three spaces, back wall first: DJ stage, dance floor, and the dining area with wooden four-top tables.
 const zones=layoutRoomZones(config.guests,width,depth);
 // Toronto-restaurant interior: exposed brick, dark wainscot, black steel windows, dome pendants over wooden tables, warm light.
 const steel=own(new THREE.MeshStandardMaterial({color:'#15181a',roughness:.45,metalness:.7})),wainscot=own(new THREE.MeshStandardMaterial({color:'#24352e',roughness:.7})),darkWood=own(new THREE.MeshStandardMaterial({color:'#2b1d13',roughness:.5})),tableWood=own(new THREE.MeshStandardMaterial({color:'#6a4a30',roughness:.5})),chairWood=own(new THREE.MeshStandardMaterial({color:'#2e2017',roughness:.55})),leather=own(new THREE.MeshStandardMaterial({color:'#6e3a2c',roughness:.6})),winMat=own(new THREE.MeshBasicMaterial({color:'#d4e8ff'})),bulbMat=own(new THREE.MeshStandardMaterial({color:'#ffe9bd',emissive:'#ffc873',emissiveIntensity:1,roughness:.4})),candleMat=own(new THREE.MeshStandardMaterial({color:'#fff1d0',emissive:'#ffb85c',emissiveIntensity:1.6,roughness:.5})),brass=own(new THREE.MeshStandardMaterial({color:'#c9a45c',roughness:.3,metalness:.85})),edgeMat=own(new THREE.MeshBasicMaterial({color:'#e5c992'})),leafMat=own(new THREE.MeshStandardMaterial({color:'#4c7a4f',roughness:.8,flatShading:true})),potMat=own(new THREE.MeshStandardMaterial({color:'#2d2f2e',roughness:.55})),shadeMat=own(new THREE.MeshStandardMaterial({color:'#101214',roughness:.4,metalness:.6,side:THREE.DoubleSide})),danceMat=own(new THREE.MeshPhysicalMaterial({color:'#ffffff',roughness:.14,metalness:.15,clearcoat:1,clearcoatRoughness:.08}));
 danceMat.map=checkerTexture(Math.max(1,zones.dance.w/1.0),Math.max(1,zones.dance.d/1.0));
 const pendantLights=[],labelMaterials=[];
 const makeLabel=(text,w,h,x,y,z)=>{const canvas=document.createElement('canvas');canvas.width=1024;canvas.height=Math.round(1024*h/w);const g=canvas.getContext('2d');g.fillStyle='rgba(255,244,222,.9)';g.font=`600 ${Math.round(canvas.height*.46)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';if('letterSpacing' in g)g.letterSpacing=`${Math.round(canvas.height*.12)}px`;g.fillText(text,canvas.width/2,canvas.height/2);const texture=own(new THREE.CanvasTexture(canvas));texture.colorSpace=THREE.SRGBColorSpace;const material=own(new THREE.MeshBasicMaterial({map:texture,transparent:true,opacity:.5,depthWrite:false}));const mesh=new THREE.Mesh(own(new THREE.PlaneGeometry(w,h)),material);mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);scene.add(mesh);labelMaterials.push(material);};
 if(!config.boundary?.length){
  const bz=-depth/2+.1,lx=-width/2+.1;
  box(width,.16,.04,darkWood,0,0,bz);box(.04,.16,depth,darkWood,lx,0,0);                         // skirting boards
  box(width,1.0,.014,wainscot,0,.16,-depth/2+.088);box(.014,1.0,depth,wainscot,-width/2+.088,.16,0); // dark green wainscot below the brick
  box(width,.045,.06,brass,0,1.16,bz+.005);box(.06,.045,depth,brass,lx+.005,1.16,0);               // brass rail on top of the wainscot
  box(width,.16,.16,steel,0,3.4,-depth/2+.16);box(.16,.16,depth,steel,-width/2+.16,3.4,0);         // exposed steel beams
  // Black steel-framed windows along the left wall.
  const z0=-depth/2+1.6,z1=depth/2-(depth>=6?2.4:1),span=z1-z0,count=span>1.6?Math.max(1,Math.min(6,Math.floor(span/2.4))):0;
  for(let i=0;i<count;i++){const z=z0+span/count*(i+.5),x=-width/2+.09;
   box(.02,1.9,1.5,winMat,x,.95,z);
   box(.06,.06,1.62,steel,x+.01,.9,z);box(.06,.06,1.62,steel,x+.01,2.85,z);box(.06,1.99,.06,steel,x+.01,.9,z-.78);box(.06,1.99,.06,steel,x+.01,.9,z+.78);
   for(const dz of [-.26,.26])box(.045,1.9,.025,steel,x+.01,.95,z+dz);for(const dy of [1.45,1.95,2.4])box(.045,.025,1.5,steel,x+.01,dy,z);}
  // A door on the left wall near the front.
  if(depth>=6){const z=depth/2-1.3;box(.06,2.25,1.12,steel,-width/2+.1,0,z);box(.05,2.15,1.0,darkWood,-width/2+.12,0,z);const handle=new THREE.Mesh(own(new THREE.SphereGeometry(.04,10,8)),brass);handle.position.set(-width/2+.17,1.0,z-.36);scene.add(handle);}
  // Potted plants in the back corners.
  for(const sign of [-1,1]){const x=sign*(width/2-.55),z=-depth/2+.6;cylinder(.22,.4,potMat,x,0,z);for(const [dx,dy,dz,r] of [[0,.78,0,.3],[.14,1.05,.08,.22],[-.12,1.0,-.1,.22],[.02,1.28,-.02,.17]]){const leaf=new THREE.Mesh(own(new THREE.IcosahedronGeometry(r,1)),leafMat);leaf.position.set(x+dx,dy,z+dz);leaf.castShadow=true;scene.add(leaf);}}
 }
 // Space 2, the dance floor: glossy black-and-charcoal tiles with a brass border and a warm light strip.
 {const {dance}=zones;box(dance.w,.014,dance.d,danceMat,0,0,dance.z);
  for(const [w,d,x,z] of [[dance.w+.1,.07,0,dance.z-dance.d/2-.035],[dance.w+.1,.07,0,dance.z+dance.d/2+.035],[.07,dance.d,-dance.w/2-.035,dance.z],[.07,dance.d,dance.w/2+.035,dance.z]])box(w,.02,d,brass,x,0,z);
  for(const [w,d,x,z] of [[dance.w,.02,0,dance.z-dance.d/2+.06],[dance.w,.02,0,dance.z+dance.d/2-.06]])box(w,.016,d,edgeMat,x,0,z);
  makeLabel('DANCE FLOOR',3.2,.42,0,.03,dance.z+dance.d/2-.42);
  makeLabel('DJ STAGE',2.4,.34,0,.045,-depth/2+3.27);
  if(zones.tables.length)makeLabel('DINING',2.0,.34,0,.02,depth/2-.4);}
 // Space 3, the dining area: wooden four-top tables with a candle, dome pendants above them, and wooden chairs.
 if(zones.tables.length){
  const tableCount=zones.tables.length,chairCount=tableCount*4,dummy=new THREE.Object3D();
  const instanced=(geometry,material,count)=>{const mesh=new THREE.InstancedMesh(own(geometry),material,count);mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);return mesh;};
  const tops=instanced(new THREE.BoxGeometry(1.2,.04,.8),tableWood,tableCount),tableLegs=instanced(new THREE.CylinderGeometry(.025,.025,.72,8),steel,tableCount*4),candles=instanced(new THREE.CylinderGeometry(.03,.03,.09,10),candleMat,tableCount);
  const seats=instanced(new THREE.BoxGeometry(.42,.045,.42),leather,chairCount),backs=instanced(new THREE.BoxGeometry(.42,.5,.03),chairWood,chairCount),chairLegs=instanced(new THREE.CylinderGeometry(.018,.018,.46,6),chairWood,chairCount*4);
  const put=(mesh,index,x,y,z,rotation=0)=>{dummy.position.set(x,y,z);dummy.rotation.set(0,rotation,0);dummy.scale.setScalar(1);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);};
  zones.tables.forEach((table,t)=>{
   put(tops,t,table.x,.74,table.z);put(candles,t,table.x,.8,table.z);
   [[-.54,-.34],[.54,-.34],[-.54,.34],[.54,.34]].forEach(([dx,dz],k)=>put(tableLegs,t*4+k,table.x+dx,.36,table.z+dz));
   table.chairs.forEach((chair,c)=>{const n=t*4+c,sin=Math.sin(chair.rotation),cos=Math.cos(chair.rotation);
    put(seats,n,chair.x,.46,chair.z,chair.rotation);
    put(backs,n,chair.x+(-.2)*sin,.74,chair.z+(-.2)*cos,chair.rotation);
    [[-.18,-.18],[.18,-.18],[-.18,.18],[.18,.18]].forEach(([dx,dz],k)=>put(chairLegs,n*4+k,chair.x+dx*cos+dz*sin,.23,chair.z-dx*sin+dz*cos));});
   // Dome pendant above each table (up to 24).
   if(t<24){const group=new THREE.Group();group.position.set(table.x,2.25,table.z);
    const dome=new THREE.Mesh(own(new THREE.SphereGeometry(.22,18,8,0,Math.PI*2,0,Math.PI/2)),shadeMat);group.add(dome);
    const bulb=new THREE.Mesh(own(new THREE.SphereGeometry(.055,10,8)),bulbMat);bulb.position.y=.02;group.add(bulb);
    const cord=new THREE.Mesh(own(new THREE.CylinderGeometry(.006,.006,1.1,5)),steel);cord.position.y=.75;group.add(cord);scene.add(group);
    if(pendantLights.length<4){const light=new THREE.PointLight('#ffc98a',5,7,2);light.position.set(table.x,2.0,table.z);scene.add(light);pendantLights.push(light);}}
  });
  for(const mesh of [tops,tableLegs,candles,seats,backs,chairLegs])mesh.instanceMatrix.needsUpdate=true;
 }
 const pmrem=new THREE.PMREMGenerator(renderer);{const environment=new RoomEnvironment();scene.environment=own(pmrem.fromScene(environment,.04).texture);environment.dispose?.();pmrem.dispose();}
 const ambient=new THREE.HemisphereLight('#ffffff','#c9ccc9',2.2);scene.add(ambient);const key=new THREE.DirectionalLight('#fff7ea',2.6);key.position.set(2*Math.max(1,Math.max(width,depth)/10),8*Math.max(1,Math.max(width,depth)/10),6*Math.max(1,Math.max(width,depth)/10));key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.radius=3;key.shadow.camera.left=-width;key.shadow.camera.right=width;key.shadow.camera.top=depth;key.shadow.camera.bottom=-depth;key.shadow.bias=-.001;scene.add(key);scene.add(key.target);
 const wash=new THREE.PointLight('#50d6b0',35,15,2);wash.position.set(0,2.7,-depth/2+1);scene.add(wash);
 const grid=new THREE.GridHelper(Math.max(width,depth),Math.max(width,depth),'#c7d9cb','#587265');grid.position.y=.014;grid.material.opacity=.16;grid.material.transparent=true;grid.visible=config.grid;scene.add(grid);
 const layout=layoutEquipment(items,width,depth);const deckMat=mat('#060707',.35);box(SW,.03,3.6,deckMat,0,.015,-depth/2+1.8);// stage deck
 const trimMat=own(new THREE.MeshBasicMaterial({color:'#c4ccc8'}));const sz=-depth/2+1.8;for(const [w,d,x,z] of [[SW+.04,.04,0,sz-1.8],[SW+.04,.04,0,sz+1.8],[.04,3.64,-SW/2,sz],[.04,3.64,SW/2,sz]])box(w,.034,d,trimMat,x,0,z);
 box(SW+.04,3.3,.1,deckMat,0,0,-depth/2+.2);// the stage's own back wall, black in every lighting mode
 for(const [w,h,x,y] of [[SW+.04,.04,0,3.3],[.04,3.3,-SW/2,0],[.04,3.3,SW/2,0]])box(w,h,.12,trimMat,x,y,-depth/2+.2);
 const stageLight=new THREE.SpotLight('#ffffff',55,14,.95,.65,1.2);stageLight.position.set(0,6.5,-depth/2+3.6);stageLight.target.position.set(0,0,-depth/2+1.6);scene.add(stageLight,stageLight.target);
 // DJ booth (table and controller), centre stage. The table also carries any mixer, mic or projector the client adds.
  new GLTFLoader().loadAsync('/echo/models/dj-booth.glb').then(gltf=>{trackModel(gltf.scene);if(disposed)return;gltf.scene.rotation.y=Math.PI;gltf.scene.position.set(0,0,-depth/2+1.8);gltf.scene.traverse(child=>{if(child.isMesh){child.castShadow=true;child.receiveShadow=true;}});scene.add(gltf.scene);booth=gltf.scene;arrangeEquipment();}).catch(()=>{});
 // A restrained sign gives the back wall a human scale without inventing venue measurements.
 const sign=document.createElement('canvas');sign.width=1024;sign.height=256;const ctx=sign.getContext('2d');ctx.fillStyle='#243c33';ctx.fillRect(0,0,1024,256);ctx.fillStyle='#e6d6ac';ctx.textAlign='center';ctx.font='600 94px sans-serif';ctx.fillText('E C H O',512,135);ctx.font='23px sans-serif';ctx.fillStyle='#a9c7b8';ctx.fillText('YOUR EVENT · YOUR SPACE',512,195);const texture=own(new THREE.CanvasTexture(sign));texture.colorSpace=THREE.SRGBColorSpace;const signMesh=new THREE.Mesh(own(new THREE.PlaneGeometry(2.6,.65)),own(new THREE.MeshBasicMaterial({map:texture})));signMesh.position.set(0,2.8,-depth/2+.27);scene.add(signMesh);
 let completed=0,failed=0;const loader=new GLTFLoader();const loaderTasks=new Map();
 const trackModel=root=>root.traverse(child=>{if(child.geometry)own(child.geometry);for(const material of Array.isArray(child.material)?child.material:[child.material])if(material){own(material);for(const value of Object.values(material))if(value?.isTexture)own(value);}});
 // Use individual mesh bounds so a truss opening remains available for a screen.
 const meshBounds=root=>{const boxes=[];root.updateWorldMatrix(true,true);root.traverse(child=>{if(!child.isMesh)return;child.geometry.computeBoundingBox();const bounds=child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld);if(!bounds.isEmpty())boxes.push(bounds);});return boxes;};
 const overlaps=(a,b)=>a.min.x<b.max.x+.08&&a.max.x>b.min.x-.08&&a.min.z<b.max.z+.08&&a.max.z>b.min.z-.08&&a.min.y<b.max.y-.003&&a.max.y>b.min.y+.003;
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
  const occupied=[];const occupy=boxes=>{const bounds=new THREE.Box3();boxes.forEach(box=>bounds.union(box));occupied.push({bounds,boxes});};if(booth)occupy(meshBounds(booth));unplaced=0;
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
  reportStatus();
 }
 // Reject manual changes that would intersect another unit or leave the venue.
 const changePose=(group,change)=>{const previousPosition=group.position.clone(),previousRotation=group.rotation.clone();change();const boxes=meshBounds(group),other=[...(booth?meshBounds(booth):[]),...objects.filter(item=>item!==group&&item.visible).flatMap(meshBounds)];const bounds=new THREE.Box3();boxes.forEach(box=>bounds.union(box));if(!footprintFits(bounds)||boxes.some(box=>other.some(obstacle=>overlaps(box,obstacle)))){group.position.copy(previousPosition);group.rotation.copy(previousRotation);return false;}positions[group.userData.unit.key]={x:group.position.x,z:group.position.z,rotation:group.rotation.y};return true;};
 const fallback=(unit,group)=>{const [w,h,d]=MODEL_SIZES[unit.kind];box(w,h,d,black,0,0,0,group);if(['speaker','sub'].includes(unit.kind)){const grille=mat('#373f3d',.65,.4);box(w*.86,h*.86,.014,grille,0,h*.07,d/2+.005,group);}if(['light','uplight'].includes(unit.kind)){const lens=own(new THREE.MeshBasicMaterial({color:'#b6e9cc'}));cylinder(w*.28,.035,lens,0,h,0,group);}if(unit.kind==='screen'){const face=own(new THREE.MeshBasicMaterial({color:'#62aa99'}));box(w*.95,h*.9,.01,face,0,h*.05,d/2+.01,group);}};
 // A multi-piece set (the JBL system) becomes one independently movable unit per piece.
 const clampX=x=>Math.max(-width/2+.4,Math.min(width/2-.4,x)),clampZ=z=>Math.max(-depth/2+.4,Math.min(depth/2-.4,z));
 const units=layout.units.flatMap(u=>{const set=u.modelUrl?null:EQUIPMENT_MODELS[u.id]?.parts;if(!set)return [u];const n=Number(u.key.split(':').pop())||0;return set.map((part,i)=>{const room=part.where==='room',side=part.at[0]<0?-1:1;// tower speakers stand by the side walls in front of the stage, aimed at the audience
  return {...u,key:`${u.key}:${i}`,part,kind:'sub',x:room?clampX(side*(width/2-.8)):clampX(part.at[0]),y:0,z:room?clampZ(-depth/2+4.6+n*1.6):clampZ(-depth/2+part.at[1]+n*1.6),rot:room?-side*Math.PI/2:part.at[2],name:`${u.name||'JBL System'} · ${part.label[0]}`};});});
 for(const unit of units){
  const group=new THREE.Group();group.userData.unit=unit;const saved=positions[unit.key];const part=unit.part;group.position.set(Math.max(-width/2+.4,Math.min(width/2-.4,saved?.x??unit.x)),part?.12:unit.y+(unit.y===0?.12:0),Math.max(-depth/2+.4,Math.min(depth/2-.4,saved?.z??unit.z)));if(unit.hung)group.rotation.set(Math.PI,saved?.rotation||0,0,'YXZ');else group.rotation.y=saved?.rotation??(unit.rot||0);scene.add(group);objects.push(group);models.set(unit.key,group);fallback(unit,group);
  if(unit.kind==='speaker'){const support=new THREE.Group();support.name='support';group.add(support);cylinder(.035,1.2,metal,0,-unit.y,0,support);cylinder(.24,.04,black,0,-unit.y,0,support);}
  if(['light','uplight'].includes(unit.kind)){const light=new THREE.PointLight(unit.kind==='light'?'#c087ff':'#71ecc4',unit.kind==='light'?6:3,3);group.add(light);light.position.y=.5;unitLights.push({light,color:light.color.clone(),intensity:light.intensity});}
  const model=EQUIPMENT_MODELS[unit.id],source=part?.src||unit.modelUrl||model?.src;if(!source)continue;
  if(!loaderTasks.has(source))loaderTasks.set(source,loader.loadAsync(source).then(gltf=>{trackModel(gltf.scene);if(disposed){for(const resource of resources)resource.dispose?.();return null;}return gltf.scene;}).catch(()=>null));
  loaderTasks.get(source).then(root=>{if(disposed)return;completed++;if(root){const copy=root.clone(true);const bounds=new THREE.Box3().setFromObject(copy),size=bounds.getSize(new THREE.Vector3()),target=MODEL_SIZES[unit.kind];const boost=SIZE_BOOST[unit.kind]||1,scale=boost*(part?1:Math.min(target[0]/Math.max(size.x,.001),target[1]/Math.max(size.y,.001),target[2]/Math.max(size.z,.001)));copy.scale.setScalar(scale);const fitted=new THREE.Box3().setFromObject(copy),center=fitted.getCenter(new THREE.Vector3());copy.position.set(-center.x,-fitted.min.y,-center.z);copy.traverse(child=>{if(child.isMesh){child.castShadow=true;child.receiveShadow=true;if(child.material?.name==='LED logo display'&&!ledMaterials.includes(child.material))ledMaterials.push(child.material);}});for(const child of [...group.children])if(!child.isLight&&child.name!=='support')group.remove(child);group.add(copy);}else failed++;arrangeEquipment();});
 }

 arrangeEquipment();
 // Lighting modes: day (white room), dark (lights off) and party (coloured moving beams, pulsing LED wall).
 const PALETTES={day:{bg:'#0a1411',timber:'#f4ece2',wall:'#ffffff',win:'#cfe3f5',bulb:.9,pend:4,env:.5,riser:'#060707',deck:'#060707',trim:'#c4ccc8',stage:55,seams:'#7d6a4e',seamOpacity:.45,sky:'#ffffff',ground:'#c9ccc9',ambient:1.2,key:2.2,wash:8,strip:1},dark:{bg:'#000000',timber:'#2a2623',wall:'#26231f',win:'#0c1420',bulb:1.9,pend:9,env:.12,riser:'#060707',deck:'#060707',trim:'#56635d',stage:9,seams:'#2a3030',seamOpacity:.35,sky:'#cfe3da',ground:'#1a1d1d',ambient:.9,key:2.2,wash:35,strip:1}};
 PALETTES.party={...PALETTES.dark,ambient:.35,key:.5,wash:10,trim:'#7a5cff',stage:0,win:'#170b2b',bulb:.5,pend:1.5,env:.07};
 const partyRig=new THREE.Group();partyRig.visible=false;scene.add(partyRig);const beams=[];
 for(let i=0;i<4;i++){const spot=new THREE.SpotLight('#ff3bd4',90,16,.38,.55,1.4);spot.position.set((i-1.5)*Math.min(2.2,width/5),3.4,-depth/2+1.1);const target=new THREE.Object3D();partyRig.add(target);spot.target=target;partyRig.add(spot);
  const geometry=own(new THREE.ConeGeometry(1.05,4.2,24,1,true));geometry.translate(0,-2.1,0);geometry.rotateX(-Math.PI/2);const material=own(new THREE.MeshBasicMaterial({color:'#ff3bd4',transparent:true,opacity:.1,blending:THREE.AdditiveBlending,depthWrite:false,side:THREE.DoubleSide}));const beam=new THREE.Mesh(geometry,material);beam.position.copy(spot.position);partyRig.add(beam);beams.push({spot,target,beam,material,phase:i*1.57});}
 const setMode=mode=>{lightingMode=PALETTES[mode]?mode:'day';const p=PALETTES[lightingMode];scene.background.set(p.bg);scene.fog.color.set(p.bg);timber.color.set(p.timber);wall.color.set(p.wall);wallLeft.color.set(p.wall);riserMat.color.set(p.riser);deckMat.color.set(p.deck);trimMat.color.set(p.trim);stageLight.intensity=p.stage;seams.color.set(p.seams);seams.opacity=p.seamOpacity;ambient.color.set(p.sky);ambient.groundColor.set(p.ground);ambient.intensity=p.ambient;key.intensity=p.key;wash.intensity=p.wash;winMat.color.set(p.win);bulbMat.emissiveIntensity=p.bulb;for(const light of pendantLights)light.intensity=p.pend;candleMat.emissiveIntensity=lightingMode==='day'?1.1:2.4;scene.environmentIntensity=p.env;partyRig.visible=lightingMode==='party';
  if(lightingMode!=='party'){edgeMat.color.set('#e5c992');for(const place of dancerRigs)place(0,false);for(const entry of unitLights){entry.light.color.copy(entry.color);entry.light.intensity=entry.intensity;}for(const material of ledMaterials){material.emissive.set('#ffffff');material.emissiveIntensity=1.4;}}};
 const animateParty=time=>{if(lightingMode!=='party')return;const hue=offset=>((time*.12+offset)%1+1)%1;edgeMat.color.setHSL(hue(.1),.9,.6);for(const place of dancerRigs)place(time,true);
  for(const {spot,target,beam,material,phase} of beams){const color=new THREE.Color().setHSL(hue(phase*.16),.9,.55);spot.color.copy(color);material.color.copy(color);target.position.set(Math.sin(time*.9+phase)*width*.3,0,-depth/2+2.2+Math.cos(time*1.3+phase)*1.6);beam.lookAt(target.position);}
  unitLights.forEach((entry,index)=>{entry.light.color.setHSL(hue(index*.13),.95,.55);entry.light.intensity=entry.intensity*3.2*(.6+.4*Math.sin(time*7+index));});
  for(const material of ledMaterials){material.emissive.setHSL(hue(.3),.6,.62);material.emissiveIntensity=1.1+.9*Math.abs(Math.sin(time*5));}};


 // Guests: seated at the tables, and standing on the dance floor (they dance in party mode).
 const dancerRigs=[];
 const shirtMaterial=()=>{const material=mat('#ffffff',.8);material.userData.shirt=true;return material;};
 const personParts=(scale,seated)=>seated?[[new THREE.SphereGeometry(.12,10,8),mat('#d6bfa1'),1.17],[new THREE.CylinderGeometry(.17,.12,.6,9),shirtMaterial(),.86],[new THREE.CylinderGeometry(.105,.09,.46,8),mat('#2a2f33'),.25]]:[[new THREE.SphereGeometry(.12,10,8),mat('#d6bfa1'),1.59],[new THREE.CylinderGeometry(.17,.12,.68,9),shirtMaterial(),1.12],[new THREE.CylinderGeometry(.105,.09,.72,8),mat('#2a2f33'),.42]];
 const shirts=['#2f4858','#7a3b3b','#3d5a45','#8a6d3b','#4a3f6b','#2b2b2e','#a8a39a','#5b7c8d'].map(color=>new THREE.Color(color));
 const crowd=(people,seated)=>{const rigs=[],dummy=new THREE.Object3D(),scale=seated?1:GUEST_SCALE;
  for(const [geometry,material,y] of personParts(scale,seated)){own(geometry);const mesh=new THREE.InstancedMesh(geometry,material,Math.max(1,people.length));mesh.count=people.length;mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
   if(material.userData.shirt)people.forEach((_,index)=>mesh.setColorAt(index,shirts[(index*5+Math.floor(index/3))%shirts.length]));
   const place=(time,dancing)=>{people.forEach((person,index)=>{dummy.position.set(person.x,y*scale+(dancing?Math.abs(Math.sin(time*5+index))*.07:0),person.z);dummy.scale.setScalar(scale);dummy.rotation.y=person.rotation+(dancing?Math.sin(time*2.2+index)*.45:0);dummy.updateMatrix();mesh.setMatrixAt(index,dummy.matrix);});mesh.instanceMatrix.needsUpdate=true;};
   place(0,false);rigs.push(place);}
  return rigs;};
 if(zones.seated.length)crowd(zones.seated,true);
 if(zones.dancers.length)dancerRigs.push(...crowd(zones.dancers,false));
 const selectedBox=new THREE.BoxHelper(new THREE.Object3D(),'#e8c983');selectedBox.visible=false;own(selectedBox.geometry);own(selectedBox.material);scene.add(selectedBox);
 const select=group=>{selected=group;selectedBox.visible=!!group;if(group){selectedBox.setFromObject(group);onSelect({...group.userData.unit,x:group.position.x,z:group.position.z,rotation:group.rotation.y});}else onSelect(null);};
 const ray=new THREE.Raycaster(),pointer=new THREE.Vector2(),plane=new THREE.Plane(new THREE.Vector3(0,1,0),0),hit=new THREE.Vector3(),offset=new THREE.Vector3();let dragging=null;
 const point=event=>{const r=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-r.left)/r.width*2-1,-(event.clientY-r.top)/r.height*2+1);ray.setFromCamera(pointer,camera);};
 const down=event=>{if(!MOVABLE||event.button!==0)return;point(event);const intersection=ray.intersectObjects(objects,true)[0];let group=intersection?.object;while(group&&!group.userData.unit)group=group.parent;if(group){event.stopImmediatePropagation();select(group);plane.constant=-group.position.y;ray.ray.intersectPlane(plane,hit);offset.copy(group.position).sub(hit);dragging=group;controls.enabled=false;renderer.domElement.setPointerCapture(event.pointerId);renderer.domElement.style.cursor='grabbing';}};
 const move=event=>{if(!dragging)return;point(event);if(!ray.ray.intersectPlane(plane,hit))return;changePose(dragging,()=>{dragging.position.x=hit.x+offset.x;dragging.position.z=hit.z+offset.z;});selectedBox.setFromObject(dragging);};
 const up=()=>{if(dragging)select(dragging);dragging=null;controls.enabled=true;renderer.domElement.style.cursor='grab';};
 renderer.domElement.style.touchAction='none';renderer.domElement.style.cursor='grab';renderer.domElement.addEventListener('pointerdown',down,true);renderer.domElement.addEventListener('pointermove',move);renderer.domElement.addEventListener('pointerup',up);renderer.domElement.addEventListener('pointercancel',up);
 const resize=()=>{const w=element.clientWidth,h=Math.max(1,element.clientHeight);renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();};const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(element);resize();const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;});observer.observe(element);
 renderer.setAnimationLoop(()=>{if(!visible||disposed||!config.active.current)return;{const limitX=width/2+4,limitZ=depth/2+4;controls.target.x=Math.max(-limitX,Math.min(limitX,controls.target.x));controls.target.z=Math.max(-limitZ,Math.min(limitZ,controls.target.z));}controls.update();animateParty(performance.now()/1000);if(selected)selectedBox.setFromObject(selected);renderer.render(scene,camera);});
 setMode(config.mode?.current||'day');
 return {mode:setMode,select:key=>select(models.get(key)),move:(axis,value)=>{if(!selected)return;if(!['x','z'].includes(axis)||!Number.isFinite(value))return;changePose(selected,()=>{selected.position[axis]=value;});select(selected);},rotate:()=>{if(!selected)return;changePose(selected,()=>{selected.rotation.y+=Math.PI/4;});select(selected);},pan:on=>{controls.mouseButtons={LEFT:on?THREE.MOUSE.PAN:THREE.MOUSE.ROTATE,MIDDLE:THREE.MOUSE.DOLLY,RIGHT:on?THREE.MOUSE.ROTATE:THREE.MOUSE.PAN};controls.touches={ONE:on?THREE.TOUCH.PAN:THREE.TOUCH.ROTATE,TWO:THREE.TOUCH.DOLLY_PAN};renderer.domElement.style.cursor=on?'move':'grab';},reset:()=>{placeCamera();controls.target.set(0,.8,-.3);controls.update();},grid:value=>{grid.visible=value;},dispose:()=>{disposed=true;renderer.setAnimationLoop(null);resizeObserver.disconnect();observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerdown',down,true);renderer.domElement.removeEventListener('pointermove',move);renderer.domElement.removeEventListener('pointerup',up);renderer.domElement.removeEventListener('pointercancel',up);for(const resource of resources)resource.dispose?.();renderer.dispose();renderer.domElement.remove();}};
}
