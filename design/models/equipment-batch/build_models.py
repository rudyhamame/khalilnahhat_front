import bpy, math, sys
from pathlib import Path
from mathutils import Vector
OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(parents=True,exist_ok=True)
def material(name,c,metal=0,rough=.45):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
def box(name,p,d,m,b=.01):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if b:mod=o.modifiers.new('Rounded edges','BEVEL');mod.width=b;mod.segments=3;o.modifiers.new('Surface normals','WEIGHTED_NORMAL')
 return o
def cyl(name,p,r,h,m,axis='Z'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=r,depth=h,location=p);o=bpy.context.object;o.name=name;o.data.materials.append(m)
 if axis=='Y':o.rotation_euler[0]=math.pi/2
 if axis=='X':o.rotation_euler[1]=math.pi/2
 for f in o.data.polygons:f.use_smooth=True
 return o
def tube(name,pts,r,m):
 c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=3;s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for p,v in zip(s.points,pts):p.co=(*v,1)
 o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
def ring(name,p,r,wire,m,axis='Z'):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=wire,major_segments=48,minor_segments=6,location=p);o=bpy.context.object;o.name=name;o.data.materials.append(m)
 if axis=='Y':o.rotation_euler[0]=math.pi/2
 if axis=='X':o.rotation_euler[1]=math.pi/2
 return o
def label(value,p,size,m,rot=(math.pi/2,0,0)):
 c=bpy.data.curves.new('Label','FONT');c.body=value;c.size=size;c.align_x='CENTER';o=bpy.data.objects.new(value,c);bpy.context.collection.objects.link(o);o.location=p;o.rotation_euler=rot;o.data.materials.append(m)
def finish(key,target,scale):
 bpy.ops.object.select_all(action='SELECT');bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(key+'.blend')),compress=True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(key+'-unjoined.glb')),export_format='GLB',use_selection=True,export_apply=True)
 floor=material('Studio floor',(.14,.16,.18),0,.8);box('Studio floor',(0,0,-.018),(200,200,.02),floor)
 bpy.context.scene.world.use_nodes=True;bpy.context.scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
 for loc,power in [((2,-3,4),400),((-3,-1,3),250),((1,3,4),400)]:
  bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=3;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler()
 bpy.ops.object.camera_add(location=Vector(target)+Vector((scale*.75,-scale*1.5,scale*.75)));o=bpy.context.object;o.rotation_euler=(Vector(target)-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=scale
 s=bpy.context.scene;s.camera=o;s.render.engine='CYCLES';s.cycles.samples=12;s.render.resolution_x=1000;s.render.resolution_y=900;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/(key+'-preview.png'));bpy.ops.render.render(write_still=True)
def reset():
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 global black,dark,steel,white,green,red
 black=material('Black equipment housing',(.008,.01,.012),.2,.56);dark=material('Dark recess',(.002,.003,.004),0,.8);steel=material('Brushed metal',(.35,.38,.40),.85,.28);white=material('White stripe',(.75,.77,.76),.1,.4);green=material('Green indicator',(.02,.5,.15),.1,.3);red=material('Red indicator',(.65,.01,.015),.1,.3)
# Sparklers: product only, no wedding scene or spark particles baked into geometry.
reset()
box('Cold spark machine',(0,0,.30),(.34,.31,.56),black)
for x in [-.163,.163]:box('Front corner rail',(x,-.158,.30),(.012,.012,.55),dark,.003)
box('White front stripe',(0,-.159,.385),(.315,.003,.024),white,.001)
cyl('Top discharge aperture',(-.025,-.03,.587),.024,.008,dark);ring('Aperture rim',(-.025,-.03,.591),.025,.003,steel)
cyl('Top fill cap',(.07,.04,.587),.022,.009,steel)
# Side fan and fold-down metal carry handle.
box('Side fan mount',(.177,.015,.18),(.025,.19,.20),dark,.004)
cyl('Fan recess',(.192,.015,.18),.081,.006,dark,'X')
for r in [.025,.038,.052,.067,.080]:ring('Fan guard ring',(.198,.015,.18),r,.0018,steel,'X')
for i in range(8):
 a=i*math.pi/4;tube('Fan guard spoke',[(.2,.015,.18),(.2,.015+.081*math.cos(a),.18+.081*math.sin(a))],.0015,steel)
cyl('Fan center',(.201,.015,.18),.026,.004,black,'X')
for y in [-.085,.085]:cyl('Handle pivot',(.178,y,.49),.012,.015,steel,'X')
tube('Fold-down side carry handle',[(.19,-.085,.49),(.20,-.085,.43),(.20,-.06,.415),(.20,.06,.415),(.20,.085,.43),(.19,.085,.49)],.005,steel)
for x in [-.155,.155]:
 for z in [.05,.56]:cyl('Front fastener',(x,-.164,z),.003,.002,steel,'Y')
for x in [-.13,.13]:
 for y in [-.11,.11]:box('Rubber foot',(x,y,.014),(.035,.04,.028),dark,.005)
finish('sparklers',(0,0,.29),.85)
# Dry ice machine, moulded vessel, lid handles, valve, control box and separate hose/nozzle.
reset()
box('Insulated dry ice vessel',(0,0,.31),(.47,.43,.59),black,.045)
box('Large removable lid',(0,0,.616),(.46,.42,.025),black,.025)
for x in [-.18,.18]:
 tube('Lid carry handle',[(x,-.12,.63),(x,-.12,.70),(x,-.09,.72),(x,.09,.72),(x,.12,.70),(x,.12,.63)],.014,black)
cyl('Lid locking spindle',(-.045,0,.66),.018,.055,black);box('Lid locking T handle',(-.045,0,.695),(.14,.028,.013),black,.006)
box('Raised control enclosure',(.10,-.13,.65),(.22,.19,.15),black,.008)
for x,m in [(.055,red),(.14,green)]:cyl('Control indicator',(x,-.15,.731),.012,.007,m)
cyl('Fog outlet',(.08,-.285,.43),.062,.19,black,'Y');ring('Fog outlet lip',(.08,-.385,.43),.061,.005,black,'Y');cyl('Outlet dark interior',(.08,-.386,.43),.053,.001,dark,'Y')
for x in [.04,.10]:
 tube('Control cable',[(x,-.23,.64),(x-.03,-.27,.53),(x-.12,-.28,.28),(x-.13,-.25,.08),(x-.10,-.20,.06)],.006,black)
box('Side lever scale',(-.24,0,.31),(.012,.14,.23),dark,.003)
tube('Basket lever',[(-.25,.02,.33),(-.32,-.06,.17),(-.38,-.12,.09)],.009,steel);cyl('Lever grip',(-.38,-.12,.09),.017,.07,black,'X')
# Detached corrugated hose and broad low fog nozzle shown as accessories.
cyl('Flexible hose',(.02,-.58,.045),.034,.54,black,'X')
for i in range(75):ring('Hose corrugation',(-.25+i*.0072,-.58,.045),.035,.0025,dark,'X')
box('Wide fog nozzle',(.35,-.54,.045),(.17,.14,.07),black,.009);cyl('Nozzle hose coupling',(.35,-.46,.08),.03,.075,black,'Y')
finish('dry-ice',(0,-.10,.34),1.12)
# JBL system: photo-guided eight-cabinet arrangement and two pole supports.
reset()
def speaker(name,p,w,h,d,drivers=1,tilt=0):
 x,y,z=p;parent=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(parent);before=set(bpy.context.scene.objects)
 box(name+' cabinet',(x,y,z+h/2),(w,d,h),black,.018)
 box('Dark grille',(x,y-d/2-.003,z+h/2),(w*.91,.007,h*.93),dark,.01)
 for j in range(drivers):
  cz=z+h*(.25+.40*j) if drivers>1 else z+h*.39
  cyl('Speaker cone',(x,y-d/2-.009,cz),w*.34,.005,black,'Y');ring('Driver surround',(x,y-d/2-.014,cz),w*.34,.006,dark,'Y')
 if drivers==1 and h>.43:
  box('Upper horn recess',(x,y-d/2-.010,z+h*.80),(w*.58,.005,h*.17),black,.004)
 # Fine metal grille lattice over visible driver silhouettes.
 for i in range(39):
  xx=x-w*.44+i*w*.88/38;box('Vertical grille wire',(xx,y-d/2-.02,z+h/2),(.0013,.0013,h*.90),black,0)
 for i in range(int(h/.012)):
  zz=z+.025+i*.012
  box('Horizontal grille wire',(x,y-d/2-.021,zz),(w*.88,.0013,.0012),black,0)
 box('JBL badge',(x,y-d/2-.024,z+h*.19),(.025,.002,.025),steel,.001);label('JBL',(x,y-d/2-.026,z+h*.19-.004),.008,white)
 for sx in [-1,1]:box('Recessed side handle',(x+sx*(w/2+.001),y,z+h*.56),(.003,d*.38,h*.16),dark,.004)
 if tilt:
  for o in set(bpy.context.scene.objects)-before:o.parent=parent;o.matrix_parent_inverse=parent.matrix_world.inverted()
  parent.location=(0,0,0);parent.rotation_euler[0]=tilt
speaker('Left small sub',(-.63,.0,0),.33,.40,.32)
speaker('Center sub',(-.23,.09,0),.40,.53,.39)
speaker('Tall double-driver tower',(.22,.24,0),.32,.85,.32,2)
speaker('Right tower',(.59,.26,0),.30,.77,.30,2)
for x,z in [(-.64,.83),(-.24,1.00)]:
 cyl('Speaker pole',(x,.03,z/2),.009,z,black);cyl('Pole coupling',(x,.03,z-.07),.015,.06,steel)
 speaker('Pole mounted JBL top',(x,.03,z),.28,.47,.25)
# Floor wedges use angled enclosure silhouettes.
for x in [-1.04,1.02]:
 verts=[(x-.18,-.28,.015),(x+.18,-.28,.015),(x+.18,.02,.015),(x-.18,.02,.015),(x-.18,-.28,.075),(x+.18,-.28,.075),(x+.18,.02,.23),(x-.18,.02,.23)]
 mesh=bpy.data.meshes.new('Wedge enclosure');mesh.from_pydata(verts,[],[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]);mesh.update();o=bpy.data.objects.new('Angled floor monitor',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(black)
 angle=math.atan2(.155,.30)
 o=box('Sloped monitor grille',(x,-.13,.159),(.33,.32,.008),dark,.005);o.rotation_euler[0]=angle
 for i in range(29):
  o=box('Monitor grille wire',(x-.155+i*.011,-.13,.165),(.0015,.31,.0015),black,0);o.rotation_euler[0]=angle
 for i in range(27):
  yy=-.265+i*.010;zz=.087+(yy+.28)*.155/.30
  box('Monitor cross grille wire',(x,yy,zz),(.32,.001,.001),black,0)
finish('jbl-system',(0,0,.64),2.9)
