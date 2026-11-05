"""Single centered box-truss tower and base plate; illustrative proportions, no load rating."""
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
# One four-chord square tower centered on its base plate, with six braced bays.
height=2.65;half=.145
for cx in [0]:
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
bpy.ops.object.select_all(action='SELECT');bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'trussing.blend'),compress=True)
# Join static meshes for a compact GLB; the saved Blender master retains editable pieces.
bpy.context.view_layer.objects.active=next(o for o in bpy.context.selected_objects if o.type=='MESH')
bpy.ops.object.join()
bpy.ops.export_scene.gltf(filepath=str(OUT/'trussing.glb'),export_format='GLB',use_selection=True,export_apply=True)
