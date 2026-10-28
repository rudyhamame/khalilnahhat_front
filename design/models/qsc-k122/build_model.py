"""Illustrative QSC K12.2 cabinet from the supplied photo; dimensions inferred."""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
OUT=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else Path(__file__).resolve().parent/'generated';OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,c,metal=0,rough=.5):
 m=bpy.data.materials.new(name);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if name=='Black textured cabinet':p.inputs['Specular IOR Level'].default_value=.12
 return m
cabinet=mat('Black textured cabinet',(.004,.005,.006),0,.86);grille=mat('Perforated black steel',(.009,.011,.013),.45,.55);dark=mat('Dark acoustic baffle',(.003,.004,.005),0,.96);cone=mat('Dark paper woofer cones',(.014,.016,.017),0,.9);rubber=mat('Rubber speaker surround',(.008,.009,.01),0,.7);screw=mat('Blackened steel fasteners',(.065,.07,.075),.7,.34);blue=mat('Blue Elite badge',(.025,.21,.30),.35,.3);white=mat('Badge lettering',(.64,.76,.78),.1,.5)
def mesh(name,verts,faces,material):
 m=bpy.data.meshes.new(name);m.from_pydata(verts,[],faces);m.update();o=bpy.data.objects.new(name,m);bpy.context.collection.objects.link(o);o.data.materials.append(material);return o
def box(name,loc,dims,material,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:m=o.modifiers.new('Soft cabinet edge','BEVEL');m.width=bevel;m.segments=3;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 return o
def cyl(name,loc,r,depth,material,axis='Y'):
 bpy.ops.mesh.primitive_cylinder_add(vertices=48,radius=r,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.rotation_euler=(math.pi/2,0,0) if axis=='Y' else (0,math.pi/2,0);o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
def torus(name,loc,major,minor,material):
 bpy.ops.mesh.primitive_torus_add(major_radius=major,minor_radius=minor,major_segments=72,minor_segments=8,location=loc,rotation=(math.pi/2,0,0));o=bpy.context.object;o.name=name;o.data.materials.append(material)
 for p in o.data.polygons:p.use_smooth=True
 return o
# Photo-guided compact moulded enclosure, broad front and narrowed rear.
v=[(-.18,-.16,.02),(.18,-.16,.02),(.145,.17,.02),(-.145,.17,.02),(-.18,-.16,.60),(.18,-.16,.60),(.145,.17,.60),(-.145,.17,.60)]
o=mesh('Moulded tapered QSC cabinet',v,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],cabinet);mod=o.modifiers.new('Rounded shell edges','BEVEL');mod.width=.012;mod.segments=4;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
box('Dark recessed baffle',(0,-.164,.31),(.33,.008,.55),dark,.008)
# Single bass driver and upper horn, concealed behind the grille.
cyl('Single woofer',(0,-.172,.225),.139,.008,cone);torus('Driver surround',(0,-.179,.225),.129,.007,rubber)
cyl('Dust cap',(0,-.180,.225),.049,.003,cone)
for x in [-.126,.126]:box('Horn side rim',(x,-.175,.465),(.008,.012,.13),rubber,.003)
for z in [.403,.527]:box('Horn horizontal rim',(0,-.175,z),(.26,.012,.007),rubber,.003)
mesh('Upper horn flare',[(-.122,-.182,.409),(.122,-.182,.409),(.122,-.182,.521),(-.122,-.182,.521),(-.037,-.170,.446),(.037,-.170,.446),(.037,-.170,.484),(-.037,-.170,.484)],[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],cone)
# Physical round perforations on a slightly convex grille sheet.
v=[];f=[];cols=47;rows=83;dx=.334/cols;dz=.553/rows
for row in range(rows):
 for col in range(cols):
  x=-.167+(col+.5)*dx;z=.034+(row+.5)*dz;n=len(v)
  for inner in [False,True]:
   for k in range(8):
    a=math.pi*k/4;cx=math.cos(a);sz=math.sin(a)
    if inner:xx=x+.0023*cx;zz=z+.0023*sz
    else:
     t=min(dx/2/max(abs(cx),1e-9),dz/2/max(abs(sz),1e-9));xx=x+t*cx;zz=z+t*sz
    yy=-.188-.008*(1-(xx/.18)**2);v.append((xx,yy,zz))
  for k in range(8):j=(k+1)%8;f.append((n+k,n+j,n+8+j,n+8+k))
mesh('Curved perforated steel grille',v,f,grille)
for x in [-.172,.172]:box('Vertical front trim',(x,-.184,.31),(.014,.018,.575),cabinet,.004)
for z in [.025,.594]:box('Top and bottom grille rim',(0,-.188,z),(.35,.014,.013),cabinet,.005)
for x in [-.155,.155]:
 for z in [.044,.575]:cyl('Grille retaining screw',(x,-.199,z),.003,.002,screw)
# Recessed side handle with open-looking dark pocket and central grip.
for side in [-1,1]:
 x=side*.166
 box('Side handle recess',(x,.014,.31),(.009,.133,.124),dark,.013)
 for y in [-.053,.081]:box('Handle frame side',(x+side*.006,y,.31),(.012,.012,.123),rubber,.004)
 for z in [.252,.368]:box('Handle frame top and bottom',(x+side*.006,.014,z),(.012,.133,.013),rubber,.004)
 box('Recessed carry grip',(x+side*.006,.014,.31),(.012,.018,.092),cabinet,.005)
 for y in [-.044,.073]:
  for z in [.261,.359]:cyl('Handle screw',(x+side*.014,y,z),.0025,.002,screw,'X')
 for z in [.065,.544]:box('Side protective bumper',(side*.172,.125,z),(.022,.036,.026),rubber,.006)
# Discrete front badge reproduces the user-visible product identity.
box('QSC front badge',(0,-.199,.079),(.065,.003,.031),rubber,.002)
def label(value,z,size):
 c=bpy.data.curves.new('Badge text','FONT');c.body=value;c.size=size;c.align_x='CENTER';o=bpy.data.objects.new(value,c);bpy.context.collection.objects.link(o);o.location=(0,-.201,z);o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(white)
label('QSC',.079,.017);label('K12.2',.069,.0055)
for x in [-.13,.13]:
 for y in [-.10,.11]:box('Rubber feet',(x,y,.012),(.035,.042,.024),rubber,.004)
bpy.ops.object.select_all(action='SELECT');bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'qsc-k122.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'qsc-k122-unjoined.glb'),export_format='GLB',use_selection=True,export_apply=True)
floor=mat('Studio floor',(.13,.15,.17),0,.8);box('Studio floor',(0,0,-.006),(200,200,.01),floor)
bpy.context.scene.world.use_nodes=True;bpy.context.scene.world.node_tree.nodes['Background'].inputs[1].default_value=.45
for loc,power in [((1,-2,2),240),((-2,-1,2),150),((1,2,2),280)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=2;o.rotation_euler=(Vector((0,0,.30))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(-.95,-1.8,.90));o=bpy.context.object;o.rotation_euler=(Vector((0,0,.30))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=.81
scene=bpy.context.scene;scene.camera=o;scene.render.engine='CYCLES';scene.cycles.samples=16;scene.render.resolution_x=850;scene.render.resolution_y=1000;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'qsc-k122-preview.png');bpy.ops.render.render(write_still=True)
