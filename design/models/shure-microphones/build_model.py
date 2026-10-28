"""Photo-guided dual handheld microphone and receiver illustration."""
import bpy, math, sys
from pathlib import Path
from mathutils import Vector
OUT=Path(sys.argv[sys.argv.index('--')+1]) if '--' in sys.argv else Path(__file__).resolve().parent/'generated'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(name,rgb,metal=0,rough=.4,glow=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*rgb,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if glow:p.inputs['Emission Color'].default_value=(*rgb,1);p.inputs['Emission Strength'].default_value=glow
 return m
black=mat('Satin black transmitter body',(.015,.018,.02),.28,.32);dark=mat('Black mesh foam',(.004,.005,.006),0,.9);screen=mat('Glossy receiver front',(.004,.007,.008),.15,.23);silver=mat('Woven silver steel grille',(.53,.57,.58),.85,.3);blue=mat('Pale blue grille ring',(.13,.39,.53),.42,.3);white=mat('White printed markings',(.8,.82,.78),0,.55);green=mat('Green LCD and status lights',(.34,.65,.055),.15,.32,.6);rubber=mat('Rubber controls and feet',(.008,.01,.012),0,.65)
def box(name,loc,dims,material,bevel=0,parent=None):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dims;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(material)
 if bevel:m=o.modifiers.new('Rounded manufactured edge','BEVEL');m.width=bevel;m.segments=4;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 if parent:o.parent=parent
 return o
def cylinder(name,loc,r,depth,material,axis='X',parent=None,r2=None):
 bpy.ops.mesh.primitive_cone_add(vertices=64,radius1=r,radius2=r if r2 is None else r2,depth=depth,location=loc);o=bpy.context.object;o.name=name;o.rotation_euler=(0,math.pi/2,0) if axis=='X' else ((math.pi/2,0,0) if axis=='Y' else (0,0,0));o.data.materials.append(material)
 m=o.modifiers.new('Machined edge','BEVEL');m.width=.0005;m.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 for p in o.data.polygons:p.use_smooth=True
 if parent:o.parent=parent
 return o
def text(name,value,loc,size,material,rot=(0,0,0),parent=None):
 c=bpy.data.curves.new(name,'FONT');c.body=value;c.size=size;c.extrude=.00003;c.align_x='LEFT';o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.location=loc;o.rotation_euler=rot;o.data.materials.append(material)
 if parent:o.parent=parent
 return o
def wire_mesh(parent):
 verts=[];faces=[];sides=5;steps=58
 for direction in [-1,1]:
  for strand in range(36):
   start=len(verts)
   for j in range(steps):
    theta=.06+2.22*j/(steps-1);phi=2*math.pi*strand/36+direction*1.55*theta
    radius=.0257+(.00022*math.sin(theta*50+strand*math.pi))
    p=Vector((-radius*math.cos(theta),radius*math.sin(theta)*math.cos(phi),radius*math.sin(theta)*math.sin(phi)))
    th=theta+.001;ph=2*math.pi*strand/36+direction*1.55*th
    nxt=Vector((-radius*math.cos(th),radius*math.sin(th)*math.cos(ph),radius*math.sin(th)*math.sin(ph)))
    tangent=(nxt-p).normalized();normal=p.normalized();binormal=tangent.cross(normal).normalized();normal=binormal.cross(tangent).normalized()
    for k in range(sides):
     q=p+.00039*(math.cos(k*2*math.pi/sides)*normal+math.sin(k*2*math.pi/sides)*binormal);verts.append(q)
    if j:
     for k in range(sides):a=start+(j-1)*sides+k;b=start+(j-1)*sides+(k+1)%sides;faces.append((a,b,b+sides,a+sides))
 mesh=bpy.data.meshes.new('Woven grille geometry');mesh.from_pydata(verts,[],faces);mesh.update();o=bpy.data.objects.new('Interwoven metal microphone grille',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(silver);o.parent=parent
 for p in mesh.polygons:p.use_smooth=True
# Receiver: recognisable low-profile dual-channel front and rounded deck.
box('Dual receiver enclosure',(0,0,.031),(.425,.157,.044),black,.012)
box('Receiver top lid',(0,0,.054),(.414,.151,.009),black,.009)
box('Glossy front fascia',(0,-.079,.031),(.395,.004,.031),screen,.003)
for x in [-.182,.182]:
 for y in [-.055,.055]:box('Receiver foot',(x,y,.006),(.021,.025,.011),rubber,.003)
text('Receiver brand','SHURE',(-.187,-.082,.036),.013,white,(math.pi/2,0,0))
text('Receiver visible model label','BLX88',(-.186,-.082,.027),.0048,white,(math.pi/2,0,0))
# Visible A1/A2 illuminated segmented displays.
segments={'A':[0,1,2,4,5,6],'1':[1,2],'2':[0,1,6,4,3]}
def digit(value,cx,cz):
 for seg in segments[value]:
  xx,zz,w,h=[(0,.006,.007,.0011),(.004,.003,.001,.005),(.004,-.003,.001,.005),(0,-.006,.007,.0011),(-.004,-.003,.001,.005),(-.004,.003,.001,.005),(0,0,.007,.0011)][seg]
  box('LCD segment',(cx+xx,-.0825,cz+zz),(w,.0005,h),green,.00015)
for ch,x in enumerate([-.102,.073]):
 box('LCD window',(x,-.082,.031),(.034,.001,.023),dark,.002)
 digit('A',x-.008,.031);digit(str(ch+1),x+.009,.031)
 for dx,label in [(-.047,'audio'),(-.031,'ready')]:
  cylinder('Receiver green indicator',(x+dx,-.083,.028),.00095,.001,green,'Y')
  text('Receiver indicator label',label,(x+dx-.004,-.083,.044),.003,white,(math.pi/2,0,0))
 for dx,label in [(.031,'group'),(.051,'channel')]:
  cylinder('Channel selector',(x+dx,-.083,.029),.0055,.002,rubber,'Y')
  text('Channel selector label',label,(x+dx-.004,-.083,.044),.003,white,(math.pi/2,0,0))
cylinder('Receiver power bezel',(.179,-.083,.028),.009,.0025,black,'Y');cylinder('Receiver power button',(.179,-.085,.028),.0065,.0015,rubber,'Y')
text('Power label','power',(.171,-.083,.044),.0038,white,(math.pi/2,0,0))
# The rear is inferred: keep it plain instead of inventing connector specifications.
def microphone(name,loc,angle_y=0,angle_z=0):
 parent=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(parent)
 bpy.ops.mesh.primitive_uv_sphere_add(segments=48,ring_count=24,radius=.0249);o=bpy.context.object;o.name='Dark grille foam';o.data.materials.append(dark);o.parent=parent
 # Hide the back of the sphere inside the collar/handle.
 wire_mesh(parent)
 cylinder('Silver capsule collar',(.019,0,0),.020,.012,silver,parent=parent,r2=.019)
 cylinder('Black collar',(.029,0,0),.019,.008,black,parent=parent,r2=.0175)
 cylinder('Transmitter grip',(.127,0,0),.0177,.19,black,parent=parent,r2=.015)
 cylinder('Battery end cap',(.229,0,0),.015,.016,black,parent=parent,r2=.014)
 cylinder('Bottom bumper',(.240,0,0),.014,.006,rubber,parent=parent)
 # Full blue identification ring around the grille's widest section.
 bpy.ops.mesh.primitive_torus_add(major_radius=.026,minor_radius=.00105,major_segments=80,minor_segments=8,location=(-.0015,0,0),rotation=(0,math.pi/2,0));o=bpy.context.object;o.name='Blue grille identification band';o.data.materials.append(blue);o.parent=parent
 cylinder('Battery seam',(.171,0,0),.0163,.0013,dark,parent=parent)
 cylinder('Microphone power bezel',(.148,-.012,.011),.0058,.0018,black,'Y',parent)
 cylinder('Microphone power button',(.148,-.0135,.011),.0043,.001,rubber,'Y',parent)
 cylinder('Handheld status LED',(.135,-.014,.010),.0012,.001,green,'Y',parent)
 text('Handheld Shure marking','SHURE',(.040,-.004,.0179),.0078,white,(0,0,0),parent)
 parent.location=loc;parent.rotation_euler=(0,math.radians(angle_y),math.radians(angle_z))
 return parent
microphone('Front handheld microphone',(-.174,-.025,.086),3,0)
microphone('Raised diagonal handheld microphone',(-.053,-.010,.125),13,-9)
text('Top receiver logo','SHURE',(-.06,-.033,.059),.023,white)
# Export standalone asset with modifiers applied, no studio geometry.
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'shure-microphones.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'shure-microphones-unjoined.glb'),export_format='GLB',use_selection=True,export_apply=True,export_yup=True)
# Studio lighting for the review image.
floor=mat('Studio floor',(.13,.15,.17),0,.7);box('Preview floor',(0,0,-.004),(200,200,.006),floor)
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.25,.28,.31,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for loc,power,size in [((0,-1,2),190,1.5),((-1,0,1),120,1),((.4,1,1.3),230,1)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.shape='DISK';o.data.size=size;o.rotation_euler=(Vector((0,0,.07))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(.40,-1,.56));o=bpy.context.object;o.rotation_euler=(Vector((0,0,.078))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=.55
scene=bpy.context.scene;scene.camera=o;scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1200;scene.render.resolution_y=850;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/'shure-microphones-preview.png');scene.view_settings.view_transform='AgX';bpy.ops.render.render(write_still=True)
