"""Generic illustrative event projector model; no exact make or ratings implied."""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector
OUT=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else Path(__file__).resolve().parent/'generated'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,metal=0,rough=.5,emission=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emission:
  p.inputs['Emission Color'].default_value=(*emission,1);p.inputs['Emission Strength'].default_value=.7
 return m
def box(name,loc,dims,material,bevel=.01):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:mod=o.modifiers.new('Soft molded edges','BEVEL');mod.width=bevel;mod.segments=4;o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
 return o
def cyl(name,loc,r,depth,material,axis='Z'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=64,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(material)
 if axis=='Y':o.rotation_euler[0]=math.pi/2
 for p in o.data.polygons:p.use_smooth=True
 return o
def torus(name,loc,r,wire,material):
 bpy.ops.mesh.primitive_torus_add(major_radius=r,minor_radius=wire,major_segments=64,minor_segments=10,location=loc,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=name;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
body=mat('Charcoal graphite polymer',(.018,.022,.024),.18,.34);panel=mat('Matte side panels',(.009,.012,.014),.08,.48);black=mat('Deep black recess',(.0015,.002,.003),0,.72);metal=mat('Anodized dark metal',(.10,.12,.13),.72,.28);glass=mat('Blue coated optical glass',(.018,.12,.22),.45,.16,emission=(.015,.08,.18));led=mat('Status green',(.05,.35,.16),.05,.28,emission=(.04,.45,.12));white=mat('Neutral panel legends',(.44,.49,.46),.12,.48)
# Rounded low-profile chassis and four feet.
box('Projector lower chassis',(0,0,.135),(.48,.37,.20),body,.034)
box('Top shell',(0,.008,.254),(.485,.375,.095),body,.036)
for x in [-.18,.18]:
 for y in [-.13,.13]:
  cyl('Rubber isolation foot',(x,y,.025),.027,.05,black)
# Front bezel is at the negative Y end; inset lens stack projects slightly outward.
box('Front optical bezel',(0,-.185,.24),(.365,.022,.105),panel,.018)
cyl('Lens outer barrel',(0,-.207,.245),.063,.075,metal,'Y')
torus('Machined lens retaining ring',(0,-.249,.245),.052,.006,metal)
cyl('Lens shadow gasket',(0,-.252,.245),.047,.009,black,'Y')
cyl('Coated projection lens',(0,-.258,.245),.039,.006,glass,'Y')
torus('Inner lens bevel',(0,-.263,.245),.040,.0025,metal)
# Focus and zoom grip rings on the barrel.
for yy,rr in [(-.222,.061),(-.233,.057),(-.242,.053)]:torus('Lens barrel grip ring',(0,yy,.245),rr,.0016,black)
# Small lens shift cover and IR window.
box('Lens shift access cover',(.125,-.202,.244),(.055,.009,.061),body,.008)
box('Infrared receiver',(-.14,-.2,.244),(.025,.008,.014),glass,.003)
# Top control panel, tactile keys and indicator.
box('Top control inset',(0,.025,.305),(.23,.19,.008),panel,.012)
for x,y,r in [(-.075,-.015,.012),(-.028,-.015,.012),(.02,-.015,.012),(.068,-.015,.012)]:
 cyl('Rubber top control',(x,y,.313),r,.008,black)
for x in [-.075,-.028,.02,.068]:cyl('Control center',(x,-.015,.318),.003,.002,white)
cyl('Power indicator',(.092,.085,.312),.006,.003,led)
# Side exhaust vent inset and precise horizontal grille slats, visible on right wall.
box('Right ventilation recess',(.244,.025,.21),(.006,.205,.078),black,.006)
for z in [.181,.192,.203,.214,.225,.236]:box('Ventilation slat',(.249,.025,z),(.004,.177,.003),metal,.001)
# Opposite-side intake slots.
box('Left intake recess',(-.244,.035,.21),(.006,.16,.06),black,.005)
for z in [.19,.202,.214,.226]:box('Intake grille slat',(-.249,.035,z),(.004,.132,.0025),metal,.0008)
# Rear I/O panel with common-looking but intentionally generic ports.
box('Rear connection panel',(0,.188,.205),(.32,.009,.112),panel,.01)
for x,z,r in [(-.115,.21,.014),(-.07,.21,.014),(-.025,.21,.014),(.035,.21,.011),(.082,.21,.011)]:
 cyl('Generic recessed I/O port',(x,.195,z),r,.006,black,'Y');torus('Port rim',(x,.199,z),r*.78,.0016,metal)
box('Rear power inlet',(0,.197,.245),(.034,.008,.018),black,.003)
# Four corner screws.
for x in [-.214,.214]:
 for y in [-.158,.158]:
  cyl('Housing fastener',(x,y,.292),.004,.002,metal)
# Studio floor only for render, excluded from model export.
model_objects=list(bpy.context.scene.objects)
for o in model_objects:o.select_set(True)
bpy.context.view_layer.objects.active=model_objects[0]
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'projector.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'projector.glb'),export_format='GLB',use_selection=True,export_apply=True)
for o in bpy.context.scene.objects:o.select_set(False)
floor=mat('Studio floor',(.14,.16,.18),0,.8);box('Studio floor',(0,0,-.01),(200,200,.02),floor)
bpy.context.scene.world.use_nodes=True;bpy.context.scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
for loc,power in [((1,-2,2),230),((-2,-1,1.5),160),((1,2,2),230)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=1.8;o.rotation_euler=(Vector((0,0,.15))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(.75,-1.35,.78));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.16))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.94
s=bpy.context.scene;s.camera=cam;s.render.engine='CYCLES';s.cycles.samples=16;s.render.resolution_x=900;s.render.resolution_y=780;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/'projector-preview.png');bpy.ops.render.render(write_still=True)
