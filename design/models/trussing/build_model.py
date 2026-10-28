"""Photo-guided box truss portal; illustrative proportions, no load rating."""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
OUT=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else Path(__file__).resolve().parent/'generated';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,metal,rough):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
silver=mat('Brushed aluminium tubes',(.62,.66,.68),.82,.3);steel=mat('Galvanised connectors',(.40,.45,.48),.85,.25);black=mat('Black steel base plates',(.012,.017,.02),.6,.4);rubber=mat('Protective feet',(.009,.012,.013),0,.8)
def beam(name,a,b,r,m,vertices=24):
 a=Vector(a);b=Vector(b);v=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.name=name;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return o
def box(name,p,d,m,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:mod=o.modifiers.new('Soft metal edge','BEVEL');mod.width=bevel;mod.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
# Two four-chord square towers, six braced bays apiece.
width=3.2;height=2.65;half=.145
for cx in [-width/2,width/2]:
 box('Black square base plate',(cx,0,.025),(.80,.68,.025),black,.006)
 for x in [-.33,.33]:
  for y in [-.27,.27]:
   beam('Leveling bolt',(cx+x,y,.02),(cx+x,y,.075),.009,steel,12)
   beam('Hex bolt nut',(cx+x,y,.035),(cx+x,y,.048),.015,steel,6)
   box('Base foot',(cx+x,y,.007),(.055,.055,.014),rubber,.004)
 for sx in [-1,1]:
  for sy in [-1,1]:
   x=cx+sx*half;y=sy*half
   beam('Tower main chord',(x,y,.055),(x,y,height),.025,silver)
   for z in [.07,1.35,height-.03]:
    beam('Tower connection sleeve',(x,y,z-.027),(x,y,z+.027),.030,steel)
    beam('Connector locking pin',(x-.037,y,z),(x+.037,y,z),.005,steel,12)
 for j in range(7):
  z=.10+(height-.16)*j/6
  for sy in [-1,1]:beam('Tower horizontal tie',(cx-half,sy*half,z),(cx+half,sy*half,z),.010,silver)
  for sx in [-1,1]:beam('Tower depth tie',(cx+sx*half,-half,z),(cx+sx*half,half,z),.010,silver)
 for j in range(6):
  z0=.10+(height-.16)*j/6;z1=.10+(height-.16)*(j+1)/6
  direction=1 if j%2 else -1
  for sy in [-1,1]:beam('Tower front/rear diagonal',(cx-direction*half,sy*half,z0),(cx+direction*half,sy*half,z1),.011,silver)
  for sx in [-1,1]:beam('Tower side diagonal',(cx+sx*half,-direction*half,z0),(cx+sx*half,direction*half,z1),.011,silver)
# Four horizontal chords form the full-width box-truss header.
for sy in [-1,1]:
 for sz in [-1,1]:beam('Header main chord',(-width/2-half,sy*half,height+half+sz*half),(width/2+half,sy*half,height+half+sz*half),.025,silver)
for j in range(11):
 x=-width/2-half+(width+2*half)*j/10
 for sy in [-1,1]:beam('Header vertical tie',(x,sy*half,height),(x,sy*half,height+2*half),.010,silver)
 for sz in [0,2*half]:beam('Header depth tie',(x,-half,height+sz),(x,half,height+sz),.010,silver)
for j in range(10):
 x0=-width/2-half+(width+2*half)*j/10;x1=-width/2-half+(width+2*half)*(j+1)/10
 direction=1 if j%2 else -1
 for sy in [-1,1]:beam('Header face diagonal',(x0,sy*half,height+half-direction*half),(x1,sy*half,height+half+direction*half),.011,silver)
 for sz in [0,2*half]:beam('Header top/bottom diagonal',(x0,-direction*half,height+sz),(x1,direction*half,height+sz),.011,silver)
# Visible end connectors and corner bolts.
for cx in [-width/2-half,width/2+half]:
 for sy in [-1,1]:
  for z in [height,height+2*half]:beam('Header end connection',(cx-.025,sy*half,z),(cx+.025,sy*half,z),.032,steel)
bpy.ops.object.select_all(action='SELECT');bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'trussing.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'trussing-unjoined.glb'),export_format='GLB',use_selection=True,export_apply=True)
floor=mat('Studio floor',(.16,.18,.19),0,.8);box('Studio floor',(0,0,-.015),(200,200,.02),floor)
bpy.context.scene.world.use_nodes=True;bpy.context.scene.world.node_tree.nodes['Background'].inputs[1].default_value=.6
for loc,power,size in [((1,-4,6),750,4),((-4,-1,4),500,3),((2,4,5),850,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,1.3))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(4,-8,4));o=bpy.context.object;o.rotation_euler=(Vector((0,0,1.4))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=4.65
s=bpy.context.scene;s.camera=o;s.render.engine='CYCLES';s.cycles.samples=16;s.render.resolution_x=1100;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/'trussing-preview.png');bpy.ops.render.render(write_still=True)
