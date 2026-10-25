// Photo-based geometric interpretation of the Intimidator Spot 260X.
// The visible housing follows the supplied photo; hidden parts are approximated.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import fs from 'node:fs';

globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}};
const scene=new THREE.Scene(),fixture=new THREE.Group();scene.add(fixture);
fixture.name='Intimidator Spot 260X — photo-based illustrative model';
const paint=new THREE.MeshStandardMaterial({color:0x27292b,roughness:.65,metalness:.12});
const edge=new THREE.MeshStandardMaterial({color:0x343639,roughness:.6,metalness:.15});
const black=new THREE.MeshStandardMaterial({color:0x080a0c,roughness:.8,metalness:.1});
const rubber=new THREE.MeshStandardMaterial({color:0x141719,roughness:.95});
const metal=new THREE.MeshStandardMaterial({color:0x51565b,roughness:.5,metalness:.75});
const white=new THREE.MeshStandardMaterial({color:0xe3e8e7,roughness:.5});
const red=new THREE.MeshStandardMaterial({color:0xb92533,emissive:0x620916,emissiveIntensity:.2,roughness:.2,metalness:.3});
const glass=new THREE.MeshPhysicalMaterial({color:0x9b2534,roughness:.12,metalness:.25,clearcoat:1,clearcoatRoughness:.05});
const screen=new THREE.MeshStandardMaterial({color:0x182729,emissive:0x0f2324,emissiveIntensity:.6,roughness:.25});
function mesh(geometry,material,x=0,y=0,z=0,parent=fixture,name=''){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.name=name;parent.add(m);return m;}
function box(w,h,d,x,y,z,material=paint,parent=fixture,r=.004,name=''){return mesh(new RoundedBoxGeometry(w,h,d,1,Math.min(r,w/3,h/3,d/3)),material,x,y,z,parent,name);}
function cyl(radius,height,x,y,z,material=black,parent=fixture){return mesh(new THREE.CylinderGeometry(radius,radius,height,24),material,x,y,z,parent);}
function ring(radius,tube,x,y,z,material=metal,parent=fixture){return mesh(new THREE.TorusGeometry(radius,tube,6,48),material,x,y,z,parent);}
function screw(x,y,z,parent=fixture){const m=cyl(.0025,.0015,x,y,z,black,parent);m.rotation.x=Math.PI/2;const slot=box(.0037,.0006,.0004,x,y,z+.001,metal,parent,.0001);return slot;}
const font=new FontLoader().parse(JSON.parse(fs.readFileSync(new URL('../yorkville-subwoofer/helvetiker_regular.typeface.json',import.meta.url),'utf8')));
function label(value,size,x,y,z,material=white,parent=fixture){const g=new THREE.ShapeGeometry(font.generateShapes(value,size));g.computeBoundingBox();g.translate(-(g.boundingBox.max.x+g.boundingBox.min.x)/2,0,0);return mesh(g,material,x,y,z,parent,value);}

// The base is a tapered, chamfered housing with four separate rubber feet.
const baseGeometry=new RoundedBoxGeometry(.232,.073,.163,3,.009);
const positions=baseGeometry.attributes.position;
for(let i=0;i<positions.count;i++){const factor=1-((positions.getY(i)+.0365)/.073)*.16;positions.setX(i,positions.getX(i)*factor);positions.setZ(i,positions.getZ(i)*factor);}
baseGeometry.computeVertexNormals();
mesh(baseGeometry,paint,0,.052,0,fixture,'tapered vented base');
box(.225,.009,.154,0,.018,0,black,fixture,.003,'bottom seam');
for(const x of [-.086,.086])for(const z of [-.054,.054])cyl(.012,.016,x,.008,z,rubber);
// Recessed control face: screen, four keys, indicator and fasteners.
const controls=new THREE.Group();controls.position.set(0,.050,.076);controls.rotation.x=-.12;fixture.add(controls);
box(.103,.053,.002,0,0,0,black,controls,.002,'control panel');
box(.046,.029,.0015,0,.004,.002,screen,controls,.001,'colour LCD');
label('CHAUVET',.0057,0,.004,.003,white,controls);label('DJ',.0035,.016,-.003,.003,red,controls);
label('CONTROL PANEL',.0024,0,.022,.002,white,controls);
for(const [i,x]of [-.017,-.006,.006,.017].entries()){const key=cyl(.0024,.0018,x,-.017,.002,rubber,controls);key.rotation.x=Math.PI/2;label(['MENU','UP','DOWN','ENTER'][i],.0015,x,-.023,.003,white,controls);}
const led=cyl(.0012,.0013,.031,.002,.003,red,controls);led.rotation.x=Math.PI/2;
for(const x of [-.046,.046])for(const y of [-.021,.021])screw(x,y,.002,controls);
// Dark cooling slots on both side panels, fitted to the taper.
for(const side of [-1,1])for(const y of [.036,.058])for(let i=0;i<7;i++){
 const vent=box(.0015,.015,.0035,side*(.113-(y-.018)*.22),y,-.027+i*.008,black,fixture,.001,'base cooling vent');vent.rotation.x=-.22;
}
// Generic rear connector recesses; their concealed geometry is illustrative.
box(.12,.045,.002,0,.045,-.078,black,fixture,.002,'rear connector plate');
for(const x of [-.035,-.005]){const socket=cyl(.007,.002,x,.048,-.080,metal);socket.rotation.x=Math.PI/2;const hollow=cyl(.0055,.003,x,.048,-.082,black);hollow.rotation.x=Math.PI/2;
 for(const [dx,dy]of [[-.002,.001],[.002,.001],[0,-.002]]){const pin=cyl(.0007,.002,x+dx,.048+dy,-.084,metal);pin.rotation.x=Math.PI/2;}}
box(.014,.016,.003,.036,.045,-.081,black,fixture,.001,'power connection');
const bearing=cyl(.047,.01,0,.094,0,black);cyl(.043,.004,0,.101,0,metal);
for(let i=0;i<64;i++){const a=i*Math.PI/32;box(.0016,.004,.0016,Math.cos(a)*.044,.099,Math.sin(a)*.044,edge,fixture,.0003);}

// A true open U-shaped yoke; no solid block behind the lamp head.
const pan=new THREE.Group();pan.name='pan yoke';fixture.add(pan);
const yokeShape=new THREE.Shape();
const outline=[[-.112,.110],[-.118,.129],[-.118,.257],[-.107,.280],[-.085,.286],[-.079,.277],[-.079,.161],[-.062,.146],[.062,.146],[.079,.161],[.079,.277],[.085,.286],[.107,.280],[.118,.257],[.118,.129],[.112,.110]];
outline.forEach(([x,y],i)=>i?yokeShape.lineTo(x,y):yokeShape.moveTo(x,y));yokeShape.closePath();
const yoke=mesh(new THREE.ExtrudeGeometry(yokeShape,{depth:.045,bevelEnabled:true,bevelThickness:.003,bevelSize:.003,bevelSegments:3,steps:1}),paint,0,0,-.0225,pan,'sculpted twin-arm yoke');
for(const side of [-1,1]){
 const pivot=cyl(.023,.009,side*.084,.260,0,edge,pan);pivot.rotation.z=Math.PI/2;
 box(.017,.113,.003,side*.108,.208,.025,edge,pan,.003,'arm trim');
 for(const y of [.125,.270])screw(side*.106,y,.027,pan);
}
for(const x of [-.047,.047])screw(x,.132,.028,pan);
// Raised branding on the outer side of one arm, rather than an image billboard.
const armLabel=label('CHAUVET',.007,0,0,0,black,pan);armLabel.rotation.set(0,Math.PI/2,Math.PI/2);armLabel.position.set(-.122,.196,0);

// The tilted optical engine, with panel seams and a deep, layered lens barrel.
const head=new THREE.Group();head.name='tilting optical head';head.position.set(0,.260,0);head.rotation.x=-.60;pan.add(head);
box(.153,.132,.173,0,0,-.006,paint,head,.026,'rounded optical housing');
box(.144,.123,.165,0,0,-.012,edge,head,.022,'housing panel seam');
box(.141,.121,.160,0,0,-.011,paint,head,.021,'main body');
for(const x of [-.067,.067])for(const y of [-.047,.047])screw(x,y,.068,head);
// Rear heat sink and lower cooling fins.
box(.105,.085,.008,0,0,-.096,black,head,.005,'rear grille');
for(let i=0;i<10;i++)box(.004,.068,.011,-.045+i*.010,0,-.101,edge,head,.001,'rear vent fin');
for(let i=0;i<5;i++)box(.09,.0017,.010,0,-.060,-.055+i*.013,black,head,.0006,'underside vent');
const barrel=mesh(new THREE.CylinderGeometry(.063,.063,.045,40,1,true),edge,0,.010,.084,head,'open optical barrel');barrel.rotation.x=Math.PI/2;
const barrelInset=mesh(new THREE.CylinderGeometry(.056,.056,.049,40,1,true),black,0,.010,.088,head,'open lens recess');barrelInset.rotation.x=Math.PI/2;
ring(.059,.0035,0,.010,.108,paint,head);ring(.053,.0025,0,.010,.108,edge,head);
for(let i=0;i<56;i++){const a=i*Math.PI/28;const notch=box(.0018,.004,.005,Math.cos(a)*.060,.010+Math.sin(a)*.060,.107,black,head,.0003);notch.rotation.z=a-Math.PI/2;}
// Curved red glass captures the distinctive lens from the supplied reference.
const lens=mesh(new THREE.SphereGeometry(.052,40,20,0,Math.PI*2,0,Math.PI/2),glass,0,.010,.098,head,'convex red lens');lens.rotation.x=Math.PI/2;lens.scale.set(1,.18,1);
const inner=cyl(.046,.002,0,.010,.104,red,head);inner.rotation.x=Math.PI/2;
for(const radius of [.028,.039,.047])ring(radius,.0007,0,.010,.106,glass,head);
const glint=mesh(new THREE.TorusGeometry(.043,.001,6,48,1.5),white,0,.010,.109,head,'lens reflection');glint.rotation.z=.8;
box(.084,.017,.001,0,-.047,.078,edge,head,.001,'name plaque');label('INTIMIDATOR',.0058,0,-.049,.080,black,head);

// Match the manufacturer's 351 mm overall height while preserving photo proportions.
fixture.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(fixture);const factor=.351/(bounds.max.y-bounds.min.y);fixture.scale.setScalar(factor);fixture.position.y=-bounds.min.y*factor;
fixture.userData={provenance:'Custom geometric interpretation from the supplied photograph; visually matched to the manufacturer Intimidator Spot 260X image.',manufacturerCAD:false,hiddenSurfaces:'Inferred',overallHeightMetres:.351};
const result=await new GLTFExporter().parseAsync(scene,{binary:true,onlyVisible:true});
const output='public/echo/models/intimidator-moving-head.glb';fs.writeFileSync(output,Buffer.from(result));
let triangles=0;scene.traverse(object=>{if(object.isMesh)triangles+=(object.geometry.index?.count||object.geometry.attributes.position.count)/3;});
console.log(JSON.stringify({output,bytes:result.byteLength,triangles,overallHeightMetres:.351}));
