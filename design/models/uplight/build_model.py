"""Build an illustrative uplight from the user reference, with no claimed model/specs."""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector
OUT=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else Path(__file__).resolve().parent/'generated'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,color,metal=0,rough=.4,emission=None):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*color,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emission:p.inputs['Emission Color'].default_value=(*color,1);p.inputs['Emission Strength'].default_value=emission
 return m
body=mat('Satin black powder-coated housing',(.022,.025,.026),.25,.32)
dark=mat('Black recesses',(.004,.005,.006),.05,.5)
edge=mat('Handle and corner rails',(.013,.016,.018),.32,.29)
rubber=mat('Rubber feet',(.009,.010,.011),0,.75)
metal=mat('Dark metal fasteners',(.065,.07,.08),.85,.27)
purple=mat('Violet LED lenses',(.36,.012,.8),.22,.22,.65)
light=mat('LED optic highlights',(.51,.045,.95),.25,.28,.35)
def cube(name,loc,scale,material,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:
  mod=o.modifiers.new('Rounded manufactured edges','BEVEL');mod.width=bevel;mod.segments=4
  o.modifiers.new('Weighted surface normals','WEIGHTED_NORMAL')
 return o
def cyl(name,loc,radius,depth,material,rotation=None,vertices=64):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=radius,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.data.materials.append(material)
 if rotation:o.rotation_euler=rotation
 mod=o.modifiers.new('Soft machined edge','BEVEL');mod.width=.0006;mod.segments=2
 o.modifiers.new('Weighted normals','WEIGHTED_NORMAL');return o
def ring(name,loc,outer,inner,height,material):
 verts=[];faces=[];N=64
 for z in [-height/2,height/2]:
  for r in [outer,inner]:
   verts.extend([(r*math.cos(i*2*math.pi/N),r*math.sin(i*2*math.pi/N),z) for i in range(N)])
 for i in range(N):
  j=(i+1)%N
  faces.extend([(i,j,N+j,N+i),(2*N+i,3*N+i,3*N+j,2*N+j),(i,2*N+i,2*N+j,j),(N+i,N+j,3*N+j,3*N+i)])
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o);o.location=loc;o.data.materials.append(material)
 return o
cube('Main rounded battery housing',(0,0,.158),(.228,.226,.292),body,.010)
cube('Top recessed LED tray',(0,0,.306),(.213,.209,.014),dark,.007)
# Four sturdy full-height corner rails and rubber feet.
for x in [-.104,.104]:
 for y in [-.103,.103]:
  cube('Rounded corner rail',(x,y,.159),(.023,.025,.302),edge,.010)
  cube('Rubber foot',(x,y,.012),(.025,.029,.023),rubber,.006)
# Ribbed front face, slightly inset between rails.
cube('Front cooling panel',(0,-.114,.151),(.181,.004,.238),dark,.003)
for i in range(38):
 x=-.087+i*.174/37
 z=.157 if abs(x)>.035 else .176
 height=.218 if abs(x)>.035 else .18
 cube('Vertical heat-sink fin %02d'%i,(x,-.116,z),(.0018,.0035,height),body,.0006)
# Subtle side seam.
cube('Side panel seam',(.1145,0,.258),(.001,.181,.001),dark)
# Top perimeter lip.
for y in [-.104,.104]:cube('Top tray rim',(0,y,.315),(.215,.012,.014),edge,.004)
for x in [-.104,.104]:cube('Top tray side rim',(x,0,.315),(.012,.201,.014),edge,.004)
# Nine recessed circular violet optics, each with a black annular bezel.
for ix in range(3):
 for iy in range(3):
  x=(ix-1)*.061;y=(iy-1)*.061
  cyl('Optic recess',(x,y,.314),.0275,.005,dark)
  ring('LED bezel',(x,y,.317),.027,.023,.006,metal)
  cyl('Violet lens',(x,y,.318),.0228,.003,purple)
  ring('Optic concentric edge',(x,y,.320),.0215,.0206,.001,light)
  # Fine lens facets visible in close-up, rather than a flat coloured disc.
  for row in range(-4,5):
   for col in range(-4,5):
    px=col*.0045+(row%2)*.00225;py=row*.004
    if px*px+py*py<.019**2:
     cyl('LED micro optic',(x+px,y+py,.3201),.00125,.00055,light,vertices=8)
# Raised rear carry/tilt bracket: side cheeks slope toward the front.
for side in [-1,1]:
 x=side*.111
 verts=[(x-.003,-.092,.321),(x-.003,.095,.321),(x-.003,.095,.365),(x-.003,.035,.365),(x-.003,-.092,.329),
        (x+.003,-.092,.321),(x+.003,.095,.321),(x+.003,.095,.365),(x+.003,.035,.365),(x+.003,-.092,.329)]
 faces=[(0,1,2,3,4),(5,9,8,7,6),(0,5,6,1),(1,6,7,2),(2,7,8,3),(3,8,9,4),(4,9,5,0)]
 mesh=bpy.data.meshes.new('Bracket cheek');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Sloping carry bracket',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(edge)
 b=o.modifiers.new('Bracket softened edge','BEVEL');b.width=.002;b.segments=3;o.modifiers.new('Bracket normals','WEIGHTED_NORMAL')
 cyl('Bracket pivot screw',(side*.115,.038,.337),.005,.004,metal,(0,math.pi/2,0))
cube('Rear raised carry bar',(0,.095,.358),(.220,.010,.018),edge,.005)
cube('Carry bar inner grip',(0,.089,.345),(.167,.012,.009),dark,.004)
# Visible reference details; unobserved rear is kept plain.
for x in [-.09,.09]:cyl('Top screw',(x,-.09,.323),.0028,.0015,metal)
cyl('Lower round access port',(0,-.119,.055),.008,.003,dark,(math.pi/2,0,0))
ring_obj=ring('Access port rim',(0,-.121,.055),.008,.0065,.0015,body);ring_obj.rotation_euler=(math.pi/2,0,0)
cube('Lower rectangular access slot',(0,-.119,.030),(.012,.003,.004),dark,.001)
cube('Small lower service opening',(-.055,-.119,.030),(.015,.003,.010),dark,.0015)
# Export just the asset; metric proportions are illustrative, not specifications.
asset=list(bpy.context.scene.objects)
bpy.ops.object.select_all(action='DESELECT')
for o in asset:o.select_set(True)
bpy.context.view_layer.objects.active=asset[0]
bpy.ops.export_scene.gltf(filepath=str(OUT/'uplight-blender.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'uplight.blend'))
# Studio reference preview.
floor=mat('Preview studio floor',(.12,.14,.16),0,.65)
cube('Preview floor',(0,0,-.005),(200,200,.01),floor)
world=bpy.context.scene.world;world.color=(.2,.2,.2);world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.22,.24,.28,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for name,loc,power,size in [('Key',(1,-2,3),260,2),('Fill',(-2,-1,1),180,2),('Rim',(1,2,2),320,1.5)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.17))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(.58,-.75,.64));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,.18))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=.52;bpy.context.scene.camera=cam
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=900;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'uplight-preview.png');scene.view_settings.view_transform='AgX'
bpy.ops.render.render(write_still=True)
