// Approximate hand-modeled cabinet based on the user-supplied speaker photograph.
// Hidden surfaces are inferred. This is not a TRELLIS reconstruction or CAD file.
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {GLTFExporter} from 'three/addons/exporters/GLTFExporter.js';
import {FontLoader} from 'three/addons/loaders/FontLoader.js';
import fs from 'node:fs';

// GLTFExporter uses FileReader for the GLB container in browser and Node alike.
globalThis.FileReader=class {readAsArrayBuffer(blob){blob.arrayBuffer().then(value=>{this.result=value;this.onloadend?.();});}};
const scene=new THREE.Scene(),speaker=new THREE.Group();scene.add(speaker);speaker.name='ES18P photo-inspired custom model';
const W=.58,H=.70,D=.62;
const paint=new THREE.MeshStandardMaterial({color:0x565b5c,roughness:.95,metalness:.02});
const dark=new THREE.MeshStandardMaterial({color:0x080a09,roughness:.95});
const rubber=new THREE.MeshStandardMaterial({color:0x111513,roughness:1});
const metal=new THREE.MeshStandardMaterial({color:0x343a38,roughness:.58,metalness:.65,side:THREE.DoubleSide});
const silver=new THREE.MeshStandardMaterial({color:0x9da7a2,roughness:.4,metalness:.8});
const white=new THREE.MeshStandardMaterial({color:0xe8ece7,roughness:.65});
function mesh(geometry,material,x=0,y=0,z=0,name=''){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.name=name;speaker.add(m);return m;}
function box(w,h,d,x,y,z,material=paint,r=.006,name=''){return mesh(new RoundedBoxGeometry(w,h,d,2,Math.min(r,w/3,h/3,d/3)),material,x,y,z,name);}
function cylinder(r,h,x,y,z,material=dark){return mesh(new THREE.CylinderGeometry(r,r,h,24),material,x,y,z);}
// A real hollow shell and open front bass port, not a textured cube.
box(.024,H,D,-W/2+.012,0,0,paint,.01,'left cabinet wall');box(.024,H,D,W/2-.012,0,0,paint,.01,'right cabinet wall');
box(W,.025,D,0,H/2-.0125,0,paint,.009,'top');box(W,.025,D,0,-H/2+.0125,0,paint,.009,'bottom');
box(W-.03,H-.025,.023,0,0,-D/2+.0115,paint,.006,'rear');
box(W-.046,H-.1,.015,0,.027,D/2-.085,dark,.003,'acoustic backing');
box(W-.04,.011,.07,0,-H/2+.092,D/2-.045,metal,.002,'port top lip');
box(.018,.077,.085,0,-H/2+.053,D/2-.047,dark,.002,'bass port divider');
box(W-.05,.07,.008,0,-H/2+.053,D/2-.105,dark,.001,'port interior');
// Woofer cone, surround and dust cap behind the perforated grille.
const cone=new THREE.LatheGeometry([new THREE.Vector2(0,-.025),new THREE.Vector2(.075,-.025),new THREE.Vector2(.19,.002),new THREE.Vector2(.22,.008),new THREE.Vector2(.23,0)],64);
const driver=mesh(cone,dark,0,.035,D/2-.048);driver.rotation.x=Math.PI/2;
const surround=mesh(new THREE.TorusGeometry(.225,.009,8,64),rubber,0,.035,D/2-.044);
const cap=mesh(new THREE.SphereGeometry(.08,24,12),rubber,0,.035,D/2-.03);cap.scale.z=.22;
// Actual open hexagonal grille geometry, merged into one efficient mesh.
const outer=.009,inner=.0076;const hex=new THREE.Shape(),hole=new THREE.Path();
for(let i=0;i<6;i++){const a=Math.PI/3*i+Math.PI/6,x=Math.cos(a)*outer,y=Math.sin(a)*outer;i?hex.lineTo(x,y):hex.moveTo(x,y);}hex.closePath();
for(let i=5;i>=0;i--){const a=Math.PI/3*i+Math.PI/6,x=Math.cos(a)*inner,y=Math.sin(a)*inner;i===5?hole.moveTo(x,y):hole.lineTo(x,y);}hole.closePath();hex.holes.push(hole);
const ring=new THREE.ShapeGeometry(hex);const grille=[];
for(let row=0,y=-.224;y<.292;row++,y+=outer*1.5){for(let x=-.245+(row%2)*Math.sqrt(3)*outer/2;x<.247;x+=Math.sqrt(3)*outer){const g=ring.clone();g.translate(x,y,D/2-.008);grille.push(g);}}
mesh(mergeGeometries(grille),metal,0,0,0,'perforated hex grille');grille.forEach(g=>g.dispose());
box(.014,.565,.012,-W/2+.032,.04,D/2-.006,metal,.003);box(.014,.565,.012,W/2-.032,.04,D/2-.006,metal,.003);
box(W-.05,.014,.012,0,.316,D/2-.006,metal,.003);box(W-.05,.014,.012,0,-.24,D/2-.006,metal,.003);
// Recess-style side handle plates, bars and fasteners on both sides.
for(const side of [-1,1]){
 const x=side*(W/2+.001);
 box(.006,.258,.126,x,.015,-.015,metal,.002,'handle plate');box(.007,.218,.085,x+side*.004,.015,-.015,dark,.001,'handle recess');
 const grip=cylinder(.011,.085,x+side*.01,-.007,-.015,rubber);grip.rotation.x=Math.PI/2;
 for(const y of [-.095,.125])for(const z of [-.067,.037]){const screw=cylinder(.0032,.002,x+side*.005,y,z,silver);screw.rotation.z=Math.PI/2;}
}
// Pole-mount cup and stacking pads.
cylinder(.020,.002,0,H/2+.001,0,dark);
const pole=mesh(new THREE.TorusGeometry(.023,.003,8,32),metal,0,H/2+.002,0);pole.rotation.x=Math.PI/2;
for(const x of [-.20,.20])for(const z of [-.21,.21]){box(.041,.003,.018,x,H/2+.001,z,dark,.003,'stacking recess');box(.05,.022,.05,x,-H/2-.007,z,rubber,.005,'rubber foot');}
// Rear control plate and connector geometry. Rear layout is illustrative.
box(.265,.28,.007,0,.02,-D/2-.002,metal,.004,'rear amplifier plate');
for(const x of [-.09,0,.09]){const socket=cylinder(.013,.005,x,.025,-D/2-.009,dark);socket.rotation.x=Math.PI/2;const rim=mesh(new THREE.TorusGeometry(.013,.002,6,20),silver,x,.025,-D/2-.013);for(const [dx,dy]of [[-.004,.003],[.004,.003],[0,-.004]]){const pin=cylinder(.0014,.003,x+dx,.025+dy,-D/2-.015,silver);pin.rotation.x=Math.PI/2;}}
for(const x of [-.055,.055]){const dial=cylinder(.012,.014,x,.095,-D/2-.012,rubber);dial.rotation.x=Math.PI/2;}
box(.037,.027,.008,-.06,-.075,-D/2-.009,dark,.002,'power connector');box(.022,.027,.009,.06,-.075,-D/2-.009,rubber,.002,'power switch');
for(const x of [-.113,.113])for(const y of [-.105,.145]){const screw=cylinder(.003,.002,x,y,-D/2-.007,silver);screw.rotation.x=Math.PI/2;}
// Small front badge and a geometric interpretation of the supplied mark.
box(.060,.075,.004,0,-.202,D/2+.001,silver,.002,'badge frame');box(.054,.069,.005,0,-.202,D/2+.003,dark,.001,'badge');
const logo=new THREE.Shape();logo.moveTo(-.021,.022);logo.lineTo(.021,.022);logo.lineTo(-.009,.001);logo.lineTo(.012,.001);logo.lineTo(-.015,-.018);logo.lineTo(-.005,-.003);logo.lineTo(-.019,-.003);logo.closePath();
mesh(new THREE.ShapeGeometry(logo),white,0,-.190,D/2+.006,'badge symbol');
const font=new FontLoader().parse(JSON.parse(fs.readFileSync(new URL('./helvetiker_regular.typeface.json',import.meta.url),'utf8')));
function text(value,size,x,y,z,back=false){const geometry=new THREE.ShapeGeometry(font.generateShapes(value,size));geometry.computeBoundingBox();geometry.translate(-(geometry.boundingBox.max.x-geometry.boundingBox.min.x)/2,0,0);const m=mesh(geometry,white,x,y,z,value);if(back)m.rotation.y=Math.PI;return m;}
text('Yorkville',.006,0,-.231,D/2+.006);text('ES18P',.014,0,.125,-D/2-.007,true);text('INPUT   LINK',.006,0,-.015,-D/2-.007,true);
speaker.userData={provenance:'Custom geometric approximation from one photograph. Not Microsoft TRELLIS output.',realWorldDimensionsVerified:false};
const exporter=new GLTFExporter();const result=await exporter.parseAsync(scene,{binary:true,onlyVisible:true});
const output='public/echo/models/es18p-subwoofer.glb';fs.writeFileSync(output,Buffer.from(result));
console.log(JSON.stringify({output,bytes:result.byteLength,triangles:grille.length*12,meshes:speaker.children.length}));
