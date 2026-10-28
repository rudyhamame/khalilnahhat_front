"""Illustrative Elite 15-inch cabinet from the supplied photo; dimensions inferred."""
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
# Trapezoidal cabinet, narrower at the rear like the supplied enclosure.
verts=[(-.21,-.18,.02),(.21,-.18,.02),(.155,.17,.02),(-.155,.17,.02),(-.21,-.18,1.0),(.21,-.18,1.0),(.155,.17,1.0),(-.155,.17,1.0)]
o=mesh('Tall trapezoidal Elite cabinet',verts,[(0,3,2,1),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],cabinet);m=o.modifiers.new('Cabinet edge radius','BEVEL');m.width=.008;m.segments=3;o.modifiers.new('Cabinet normals','WEIGHTED_NORMAL')
box('Recessed acoustic baffle',(0,-.184,.51),(.38,.012,.95),dark,.004)
# Driver shapes behind the physically perforated front grille.
for z in [.255,.600]:
 cyl('Woofer backing',(0,-.187,z),.165,.006,dark)
 torus('Woofer rubber surround',(0,-.199,z),.148,.009,rubber)
 rings=[(.142,-.207),(.118,-.204),(.072,-.193),(.043,-.195)]
 v=[];f=[];N=72
 for r,y in rings:v.extend([(r*math.cos(i*2*math.pi/N),y,z+r*math.sin(i*2*math.pi/N)) for i in range(N)])
 for j in range(len(rings)-1):
  for i in range(N):k=(i+1)%N;f.append((j*N+i,j*N+k,(j+1)*N+k,(j+1)*N+i))
 mesh('Recessed woofer cone',v,f,cone)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=40,ring_count=20,radius=1,location=(0,-.199,z));o=bpy.context.object;o.name='Woofer dust cap';o.scale=(.049,.009,.049);o.data.materials.append(cone)
 for p in o.data.polygons:p.use_smooth=True
# Rectangular top horn, dark flare behind grille.
for hx in [-.14,.14]:box('Horn side rim',(hx,-.201,.864),(.012,.012,.145),rubber,.003)
for hz in [.796,.932]:box('Horn top and bottom rim',(0,-.201,hz),(.29,.012,.009),rubber,.003)
v=[(-.13,-.209,.805),(.13,-.209,.805),(.13,-.209,.923),(-.13,-.209,.923),(-.041,-.195,.846),(.041,-.195,.846),(.041,-.195,.882),(-.041,-.195,.882)]
mesh('Horn flare',v,[(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],cone)
box('Horn throat',(0,-.193,.864),(.078,.008,.034),dark,.003)
# One true perforated mesh sheet. Hole apertures expose the cones without a texture.
v=[];f=[];cols=43;rows=112;dx=.378/cols;dz=.942/rows
for row in range(rows):
 for col in range(cols):
  x=-.189+(col+.5)*dx;z=.037+(row+.5)*dz;start=len(v)
  for inner in [False,True]:
   for k in range(8):
    a=math.pi/4*k;cx=math.cos(a);sz=math.sin(a)
    if inner:xx=x+.0029*cx;zz=z+.0029*sz
    else:
     scale=min(dx/2/max(abs(cx),1e-9),dz/2/max(abs(sz),1e-9));xx=x+scale*cx;zz=z+scale*sz
    v.append((xx,-.214,zz))
  for k in range(8):j=(k+1)%8;f.append((start+k,start+j,start+8+j,start+8+k))
mesh('Full-height perforated grille',v,f,grille)
# Front metal frame and repeated screws.
for x in [-.199,.199]:box('Front grille side rail',(x,-.216,.51),(.017,.009,.977),cabinet,.003)
for z in [.028,.991]:box('Front grille top and bottom frame',(0,-.216,z),(.405,.01,.015),cabinet,.003)
for x in [-.199,.199]:
 for z in [.06,.28,.51,.75,.97]:
  cyl('Grille frame screw',(x,-.222,z),.0032,.0018,screw)
  box('Screw slot',(x,-.2232,z),(.0037,.0005,.0006),dark)
# Small blue manufacturer badge at the lower grille, as visible in the reference.
box('Blue Elite badge',(0,-.220,.115),(.027,.004,.041),blue,.001)
def text(name,value,loc,size):
 c=bpy.data.curves.new(name,'FONT');c.body=value;c.size=size;c.align_x='CENTER';o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=(math.pi/2,0,0);o.data.materials.append(white)
text('Badge Y','Y',(0,-.2228,.124),.021);text('Badge Elite','ELITE',(0,-.2228,.103),.006)
# Inset side handle on the visible right cheek; rear details remain unclaimed.
# The cheek narrows with depth, so match its surface angle.
handle=box('Side handle recess',(.185,-.025,.43),(.005,.066,.18),dark,.006);handle.rotation_euler[2]=math.radians(9)
handle=box('Recessed handle grip',(.190,-.025,.43),(.008,.017,.115),rubber,.003);handle.rotation_euler[2]=math.radians(9)
for z in [.352,.508]:cyl('Handle screw',(.192,-.025,z),.0028,.003,screw,'X')
for x in [-.16,.16]:
 for y in [-.13,.12]:box('Protective foot',(x,y,.012),(.04,.045,.024),rubber,.004)
for x in [-.195,.195]:box('Upper protective corner',(x,-.15,.993),(.03,.04,.018),screw,.003)
bpy.ops.object.select_all(action='SELECT');bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'elite-15.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'elite-15-unjoined.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
# Studio preview is excluded from the exported asset.
floor=mat('Studio floor',(.14,.16,.18),0,.8);box('Preview floor',(0,0,-.006),(200,200,.01),floor)
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.27,.30,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for loc,power,size in [((1,-2,3),260,2),((-2,-1,1.4),160,2),((1,2,2.3),300,1.5)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.45))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(1.2,-2.6,1.3));o=bpy.context.object;o.rotation_euler=(Vector((0,0,.50))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=1.22
scene=bpy.context.scene;scene.camera=o;scene.render.engine='CYCLES';scene.cycles.samples=24;scene.render.resolution_x=850;scene.render.resolution_y=1100;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'elite-15-preview.png');scene.view_settings.view_transform='AgX';bpy.ops.render.render(write_still=True)
