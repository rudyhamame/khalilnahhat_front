"""Photo-guided LED cabinet pair showing front and rear; illustrative proportions."""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(n,c,metal=0,rough=.45):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
black=mat('Dark charcoal cabinet',(.022,.03,.034),.45);rib=mat('Raised rear ribs',(.036,.047,.052),.55);silver=mat('Silver cabinet edge',(.49,.53,.54),.8,.28);dark=mat('Recessed handle and ports',(.003,.006,.008));steel=mat('Connector hardware',(.25,.29,.30),.8)
# Use original reference as embedded texture: UVs select the display face without editing the source image.
img=bpy.data.images.load(str(OUT/'led-screen-reference.webp'));img.pack()
display=bpy.data.materials.new('Supplied scenic LED display');display.use_nodes=True
p=display.node_tree.nodes.get('Principled BSDF');t=display.node_tree.nodes.new('ShaderNodeTexImage');t.image=img;display.node_tree.links.new(t.outputs['Color'],p.inputs['Base Color']);display.node_tree.links.new(t.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=.55;p.inputs['Roughness'].default_value=.45
root=None
def box(n,p,d,m,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if root:o.parent=root
 if bevel:q=o.modifiers.new('Cabinet edge bevel','BEVEL');q.width=bevel;q.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def beam(n,a,b,r,m):
 a=Vector(a);b=Vector(b);v=b-a;bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=r,depth=v.length,location=(a+b)/2);o=bpy.context.object;o.name=n;o.rotation_euler=v.to_track_quat('Z','Y').to_euler();o.data.materials.append(m)
 if root:o.parent=root
 return o
for index in range(2):
 bpy.ops.object.empty_add();root=bpy.context.object;root.name='Front cabinet' if index==0 else 'Rear-facing cabinet';root.location=(.28,-.16,.54) if index==0 else (-.34,.12,.67);root.rotation_euler.z=0 if index==0 else math.pi
 box('Slim modular LED enclosure',(0,0,0),(1.02,.075,1.02),black,.006)
 # Display plane faces forward (-Y); reference photo UV corners follow the photographed display.
 mesh=bpy.data.meshes.new('LED display face');mesh.from_pydata([(-.5,-.039,-.5),(.5,-.039,-.5),(.5,-.039,.5),(-.5,-.039,.5)],[],[(0,1,2,3)]);mesh.materials.append(display);uv=mesh.uv_layers.new(name='Reference display UV')
 coords=[(307/800,1-588/800),(657/800,1-629/800),(656/800,1-261/800),(307/800,1-301/800)]
 for j,c in enumerate(coords):uv.data[j].uv=c
 o=bpy.data.objects.new('Scenic display surface',mesh);bpy.context.collection.objects.link(o);o.parent=root
 # Slightly inset large rear panel, raised geometric ribs and corner hardware.
 box('Rear access panel',(0,.043,0),(.96,.012,.96),black,.007)
 for x in [-.495,.495]:
  box('Silver edge rail',(x,0,0),(.022,.086,1.02),silver,.003)
  for z in [-.34,.34]:
   box('Edge latch recess',(x,-.005,z),(.025,.091,.075),dark,.002)
   beam('Side locking bolt',(x-.014,0,z+.065),(x+.014,0,z+.065),.006,steel)
 for x in [-.465,.465]:
  for z in [-.465,.465]:
   box('Silver rear corner block',(x,.056,z),(.074,.018,.064),silver,.003)
   beam('Corner fastener',(x,.066,z),(x,.075,z),.007,steel)
 # Rib paths echo the diagonal reinforced rear panel in the photograph.
 for sign in [-1,1]:
  for shift in [-.22,.16]:
   a=(sign*.43,.053,-.38+shift*.3);b=(sign*.12,.053,-.07+shift*.3)
   beam('Rear diagonal stiffener',a,b,.006,rib)
  beam('Rear upper diagonal',(sign*.43,.053,.32),(sign*.15,.053,.46),.005,rib)
  beam('Rear vertical stiffener',(sign*.13,.054,-.40),(sign*.13,.054,.35),.006,rib)
 box('Recessed rear carry handle',(0,.056,.405),(.23,.014,.055),dark,.004)
 box('Handle crossbar',(0,.069,.414),(.19,.012,.012),black,.003)
 box('Rear service cover',(0,.053,-.22),(.20,.013,.18),rib,.004)
 for x in [-.055,.055]:beam('Service connector',(x,.064,-.24),(x,.076,-.24),.014,dark)
root=None
bpy.ops.object.select_all(action='SELECT');bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'led-screen.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'led-screen-unjoined.glb'),export_format='GLB',use_selection=True,export_apply=True)
floor=mat('Studio floor',(.13,.15,.16));box('Studio floor',(0,0,-.01),(200,200,.02),floor)
bpy.context.scene.world.use_nodes=True;bpy.context.scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
for loc,power,size in [((1,-3,4),400,3),((-3,-1,3),300,2),((0,3,4),500,3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,.6))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(2,-5,2));o=bpy.context.object;o.rotation_euler=(Vector((0,0,.63))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=1.95
s=bpy.context.scene;s.camera=o;s.render.engine='CYCLES';s.cycles.samples=12;s.render.resolution_x=1100;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/'led-screen-preview.png');bpy.ops.render.render(write_still=True)
