"""Photo-guided CO2 effects gun with generic illustrative tank; illustrative dimensions."""
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
# Gun posed horizontally above and left of an illustrative cylinder.
gunmetal=mat('Satin black CO2 gun',(.014,.018,.021),.65,.3);tankmat=mat('Brushed cylinder aluminium',(.28,.32,.34),.8,.35);brass=mat('Valve brass',(.39,.26,.09),.75,.3)
# Hollow cylindrical barrel: two concentric rings and annular muzzle, open bore.
verts=[];faces=[];segments=64
for x,r in [(-.43,.081),(.12,.081),(-.43,.071),(.12,.071)]:
 for j in range(segments):
  a=j*math.tau/segments;verts.append((x,r*math.cos(a),.76+r*math.sin(a)))
for j in range(segments):
 k=(j+1)%segments
 faces.extend([(j,k,segments+k,segments+j),(2*segments+j,3*segments+j,3*segments+k,2*segments+k),(j,2*segments+j,2*segments+k,k),(segments+j,segments+k,3*segments+k,3*segments+j)])
mesh=bpy.data.meshes.new('Hollow effects barrel');mesh.from_pydata(verts,[],faces);mesh.materials.append(gunmetal);o=bpy.data.objects.new('Open CO2 barrel',mesh);bpy.context.collection.objects.link(o)
for p in mesh.polygons:p.use_smooth=True
beam('Deep bore shadow',(-.30,0,.76),(-.295,0,.76),.070,dark,64)
# Thin machined front rim.
for j in range(64):
 a=j*math.tau/64;b=(j+1)*math.tau/64
 beam('Muzzle silver rim',(-.431,.078*math.cos(a),.76+.078*math.sin(a)),(-.431,.078*math.cos(b),.76+.078*math.sin(b)),.0015,silver,8)
# Barrel perforations represented as shallow dark recesses around rear circumference.
for x in [.025,.073]:
 for j in range(10):
  a=j*math.tau/10;y=.081*math.cos(a);z=.76+.081*math.sin(a)
  beam('Barrel vent recess',(x,y,z),(x,y*1.014,.76+(z-.76)*1.014),.004,dark,16)
beam('Barrel rear neck',(.12,0,.76),(.185,0,.76),.052,gunmetal)
# Sculpted receiver, inclined rear handle, trigger and large oval guard.
box('Rear valve receiver',(.205,0,.716),(.19,.086,.10),gunmetal,.026)
handle=box('Pistol rear grip',(.258,0,.572),(.070,.074,.23),gunmetal,.020);handle.rotation_euler.y=math.radians(-8)
box('Grip heel',(.270,0,.462),(.086,.082,.025),gunmetal,.008)
hose('Rounded trigger guard',[(.18,-.002,.697),(.114,-.002,.632),(.105,-.002,.505),(.169,-.002,.461),(.265,-.002,.468)],.011,gunmetal)
hose('Inner trigger',[(.208,-.003,.688),(.191,-.003,.628),(.169,-.003,.595)],.006,silver)
for j in range(4):box('Grip texture rib',(.237,-.039,.51+j*.026),(.043,.003,.004),rubber,.001)
for x,z in [(.19,.733),(.281,.718),(.28,.485)]:
 beam('Receiver screw',(x,-.044,z),(x,-.047,z),.0045,dark,16)
# Front vertical support grip under the long barrel.
beam('Forward grip neck',(-.280,0,.697),(-.280,0,.667),.032,gunmetal)
beam('Forward carry grip',(-.280,0,.674),(-.306,0,.480),.034,rubber)
beam('Forward grip endcap',(-.307,0,.483),(-.309,0,.474),.036,gunmetal)
# Gun quick connector at grip base.
for z0,z1,r,m in [(.441,.460,.025,silver),(.414,.441,.019,silver),(.403,.414,.023,gunmetal)]:beam('Gun hose connector',(.27,0,z0),(.27,0,z1),r,m)
# Photo-visible logo set on front-facing barrel surface.
for t,x,size in [('MOKA',-.205,.046),('SFX',-.069,.022)]:
 bpy.ops.object.text_add(location=(x,-.0815,.743),rotation=(math.pi/2,0,0));o=bpy.context.object;o.data.body=t;o.data.size=size;o.data.align_x='CENTER';o.data.materials.append(ink);bpy.ops.object.convert(target='MESH')
box('Yellow logo underline',(-.067,-.082,.734),(.058,.001,.007),yellow)
# Tank is not visible in the reference: simple generic cylinder, no capacity or pressure markings.
tx=.47;ty=.13
beam('Generic CO2 tank cylinder',(tx,ty,.08),(tx,ty,.54),.111,tankmat,64)
def sphere(n,p,scale,m):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=20,location=p);o=bpy.context.object;o.name=n;o.scale=scale;o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return o
sphere('Rounded tank shoulder',(tx,ty,.54),(.111,.111,.085),tankmat)
sphere('Rounded tank foot',(tx,ty,.08),(.111,.111,.060),tankmat)
beam('Tank foot ring',(tx,ty,.021),(tx,ty,.050),.113,black,64)
beam('Tank neck',(tx,ty,.60),(tx,ty,.646),.029,tankmat)
box('Generic valve block',(tx,ty,.653),(.055,.041,.030),brass,.004)
beam('Valve spindle',(tx,ty,.663),(tx,ty,.695),.008,brass)
beam('Black valve handwheel',(tx,ty,.695),(tx,ty,.707),.036,rubber)
for i in range(8):
 a=i*math.tau/8
 beam('Handwheel grip',(tx+.033*math.cos(a),ty+.033*math.sin(a),.695),(tx+.033*math.cos(a),ty+.033*math.sin(a),.709),.004,rubber,12)
beam('Tank outlet fitting',(tx-.06,ty,.650),(tx-.02,ty,.650),.012,silver)
hose('Connected CO2 supply hose',[(.27,0,.406),(.30,-.04,.27),(.19,-.09,.055),(.25,-.18,.022),(.51,-.18,.027),(.62,.06,.10),(.61,.19,.42),(.43,.15,.65),(.41,.13,.65)],.008,rubber)
# Neutral CO2 identifier, with no invented specifications.
label=mat('Cylinder label white',(.72,.75,.74));box('Tank front label',(tx,ty-.1115,.33),(.12,.002,.15),black,.004)
for t,z,size in [('CO2',.35,.045),('EFFECTS',.307,.014)]:
 bpy.ops.object.text_add(location=(tx,ty-.114,z),rotation=(math.pi/2,0,0));o=bpy.context.object;o.data.body=t;o.data.size=size;o.data.align_x='CENTER';o.data.materials.append(label);bpy.ops.object.convert(target='MESH')
bpy.ops.object.select_all(action='SELECT');bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'co2-gun.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'co2-gun-unjoined.glb'),export_format='GLB',use_selection=True,export_apply=True)
floor=mat('Studio floor',(.13,.15,.16));box('Studio floor',(0,0,-.006),(200,200,.01),floor)
bpy.context.scene.world.use_nodes=True;bpy.context.scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
for loc,power,size in [((1,-2,3),250,2),((-2,-1,2),200,2),((0,2,3),300,2)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((.1,0,.45))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(-1.5,-3,1.4));o=bpy.context.object;o.rotation_euler=(Vector((.10,0,.43))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=1.28
s=bpy.context.scene;s.camera=o;s.render.engine='CYCLES';s.cycles.samples=12;s.render.resolution_x=1100;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/'co2-gun-preview.png');bpy.ops.render.render(write_still=True)
