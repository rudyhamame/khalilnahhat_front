"""Photo-guided upright-output smoke machine, hardware only; illustrative dimensions."""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(n,c,metal=0,rough=.45):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
black=mat('Black satin steel',(.017,.021,.026),.55);dark=mat('Vent and outlet interior',(.002,.003,.005));silver=mat('Brushed handle metal',(.39,.43,.46),.8,.3);rubber=mat('Black rubber',(.006,.008,.009));white=mat('Translucent fluid reservoir',(.64,.65,.59));red=mat('Red LED lenses',(.7,.006,.015),.1,.2);p=red.node_tree.nodes.get('Principled BSDF');p.inputs['Emission Color'].default_value=(1,.002,.006,1);p.inputs['Emission Strength'].default_value=2.5
yellow=mat('Yellow warning ink',(.8,.66,.025));ink=mat('Silver white printing',(.66,.69,.7))
def box(n,p,d,m,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:q=o.modifiers.new('Soft metal edges','BEVEL');q.width=bevel;q.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def beam(n,a,b,r,m,verts=24):
 a=Vector(a);b=Vector(b);v=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.name=n;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return o
def hose(n,points,r,m):
 curve=bpy.data.curves.new(n,'CURVE');curve.dimensions='3D';curve.bevel_depth=r;curve.bevel_resolution=3;s=curve.splines.new('BEZIER');s.bezier_points.add(len(points)-1)
 for b,p in zip(s.bezier_points,points):b.co=p;b.handle_left_type='AUTO';b.handle_right_type='AUTO'
 o=bpy.data.objects.new(n,curve);bpy.context.collection.objects.link(o);o.data.materials.append(m);bpy.context.view_layer.objects.active=o;o.select_set(True);bpy.ops.object.convert(target='MESH');o.select_set(False)
 return o
# Vented rectangular housing, built around open grille strips.
box('Main housing',(0,0,.105),(.48,.275,.17),black,.009)
# Dark vent recess and thin rows give the visible cooling slots depth.
box('Recessed front vent',(0,-.140,.104),(.285,.006,.070),dark,.003)
for j in range(6):box('Horizontal vent slat',(0,-.145,.072+j*.012),(.29,.006,.006),black,.001)
for i in range(8):box('Vertical grille bridge',(-.142+i*.041,-.146,.106),(.006,.007,.074),black,.001)
for x in [-.22,.22]:
 for z in [.043,.17]:
  beam('Front silver screw',(x,-.142,z),(x,-.149,z),.0032,silver,12)
  box('Fastener slot',(x,-.150,z),(.004,.0005,.0007),dark)
# Top nozzle assembly with a red LED ring around the central vertical outlet.
box('Raised LED nozzle block',(.055,.012,.207),(.15,.145,.035),black,.003)
beam('Nozzle metal rim',(.055,.012,.221),(.055,.012,.227),.023,silver)
beam('Nozzle dark aperture',(.055,.012,.227),(.055,.012,.228),.017,dark)
for i in range(8):
 a=2*math.pi*i/8;x=.055+.052*math.cos(a);y=.012+.052*math.sin(a)
 beam('LED chrome bezel',(x,y,.223),(x,y,.228),.009,silver)
 beam('Red uplighting lens',(x,y,.228),(x,y,.230),.0065,red)
# Off-white reservoir sits behind the left-hand section, with dark screw cap.
box('Fluid reservoir',(-.153,.060,.207),(.10,.125,.060),white,.012)
beam('Reservoir neck',(-.153,.061,.232),(-.153,.061,.250),.026,white)
beam('Reservoir screw cap',(-.153,.061,.247),(-.153,.061,.261),.030,rubber)
for i in range(12):
 a=i*math.tau/12
 beam('Cap grip ridge',(-.153+.029*math.cos(a),.061+.029*math.sin(a),.249),(-.153+.029*math.cos(a),.061+.029*math.sin(a),.260),.002,rubber,10)
hose('Reservoir feed hose',[(-.153,.061,.261),(-.191,.105,.277),(-.224,.108,.254),(-.235,.075,.205)],.004,rubber)
# Bent side carry handles, silver edge and black central grip.
for x in [-.248,.248]:
 box('Handle front mount',(x,-.085,.14),(.021,.029,.035),silver,.003)
 box('Handle rear mount',(x,.095,.14),(.021,.029,.035),silver,.003)
 hose('Raised carry bracket',[(x,-.085,.145),(x,-.085,.225),(x,.0,.242),(x,.095,.225),(x,.095,.145)],.008,silver)
 hose('Black handle grip',[(x,-.050,.235),(x,.0,.242),(x,.060,.234)],.009,rubber)
# Side connection and cable, kept close to the housing for useful viewer framing.
for y in [-.065,.025]:beam('Side cable gland',(.240,y,.106),(.260,y,.106),.012,rubber)
hose('Power cable',[(.26,-.065,.106),(.32,-.05,.085),(.35,.03,.03),(.29,.16,.018),(.12,.18,.018)],.004,rubber)
hose('Control cable',[(.26,.025,.106),(.31,.05,.10),(.34,.11,.055),(.27,.18,.018)],.003,rubber)
# Small warning triangle and restrained hardware labels.
mesh=bpy.data.meshes.new('Warning triangle');mesh.from_pydata([(-.005,-.073,.193),(.015,-.073,.193),(.005,-.058,.193)],[],[(0,1,2)]);mesh.materials.append(yellow);o=bpy.data.objects.new('Caution symbol',mesh);bpy.context.collection.objects.link(o)
for t,pos,size in [('SMOKE',(-.125,-.077,.194),.014),('UPRIGHT OUTPUT',(.045,-.096,.194),.006)]:
 bpy.ops.object.text_add(location=pos);o=bpy.context.object;o.data.body=t;o.data.size=size;o.data.align_x='CENTER';o.data.materials.append(ink);bpy.ops.object.convert(target='MESH')
for x in [-.18,.18]:
 for y in [-.09,.09]:box('Rubber foot',(x,y,.016),(.035,.032,.023),rubber,.004)
bpy.ops.object.select_all(action='SELECT');bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'smoke.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'smoke-unjoined.glb'),export_format='GLB',use_selection=True,export_apply=True)
floor=mat('Studio floor',(.13,.15,.16));box('Studio floor',(0,0,-.006),(200,200,.01),floor)
bpy.context.scene.world.use_nodes=True;bpy.context.scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
for loc,power,size in [((1,-2,3),170,2),((-2,-1,2),150,2),((0,2,3),220,2)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,.12))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(.8,-1.4,.8));o=bpy.context.object;o.rotation_euler=(Vector((.03,0,.13))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=.77
s=bpy.context.scene;s.camera=o;s.render.engine='CYCLES';s.cycles.samples=12;s.render.resolution_x=1100;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/'smoke-preview.png');bpy.ops.render.render(write_still=True)
