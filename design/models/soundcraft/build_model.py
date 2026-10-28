"""Illustrative Soundcraft EFX-style console guided by supplied photograph."""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(n,c,metal=0,rough=.45):
 m=bpy.data.materials.new(n);m.diffuse_color=(*c,1);m.use_nodes=True;p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
navy=mat('Blue grey console panel',(.055,.08,.13),.35);black=mat('Black cabinet',(.009,.012,.017));dark=mat('Socket recess',(.003,.004,.006));silver=mat('Jack sockets',(.55,.58,.58),.8,.28);white=mat('Ivory fader caps',(.78,.79,.74));ink=mat('Panel white ink',(.67,.71,.72));red=mat('Red controls',(.56,.024,.026));blue=mat('Blue controls',(.10,.35,.44));yellow=mat('Yellow controls',(.77,.64,.10));purple=mat('Purple effects control',(.40,.22,.52));grey=mat('Grey control caps',(.44,.48,.48));green=mat('Green meter segments',(.25,.68,.055));amber=mat('Amber meter segments',(.83,.56,.025))
# Top controls use an inclined parent; the cabinet has a physical wedge section.
bpy.ops.object.empty_add();root=bpy.context.object;root.name='Sloped control surface';root.rotation_euler.x=math.radians(12);root.location.z=.09
def box(n,p,d,m,bevel=0,parent=True):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:q=o.modifiers.new('Rounded edges','BEVEL');q.width=bevel;q.segments=2;o.modifiers.new('Weighted normals','WEIGHTED_NORMAL')
 if parent:o.parent=root
 return o
def cyl(n,p,r,h,m,verts=20):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=r,depth=h,location=p);o=bpy.context.object;o.name=n;o.parent=root;o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return o
def text(t,p,size=.008,m=ink):
 bpy.ops.object.text_add(location=p);o=bpy.context.object;o.name='Printed '+t;o.parent=root;o.data.body=t;o.data.size=size;o.data.align_x='CENTER';o.data.materials.append(m)
 bpy.ops.object.convert(target='MESH')
# Side profile higher at rear.
verts=[(-.38,-.265,0),(.38,-.265,0),(.38,.265,0),(-.38,.265,0),(-.38,-.265,.029),(.38,-.265,.029),(.38,.265,.141),(-.38,.265,.141)]
mesh=bpy.data.meshes.new('Wedge cabinet');mesh.from_pydata(verts,[],[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]);mesh.materials.append(black);o=bpy.data.objects.new('Console wedge housing',mesh);bpy.context.collection.objects.link(o)
box('Blue metal faceplate',(0,0,0),(.756,.54,.008),navy,.003)
for x in [-.374,.374]:box('Protective side cheek',(x,0,.003),(.012,.54,.018),black,.003)
# 12 mono input channel strips, 2 stereo strips, FX and paired master faders.
xs=[-.345+i*.043 for i in range(17)]
for i,x in enumerate(xs):
 if i<14:
  box('Channel strip divider',(x-.021,0,.005),(.0007,.515,.0006),ink)
  text(str(i+1) if i<12 else 'ST'+str(i-11),(x,-.249,.006),.008)
  for row,y in enumerate([.115,.073,.031,-.011,-.053]):
   color=[grey,grey,blue,blue,yellow][row]
   cyl('Rotary control black skirt',(x,y,.012),.011,.012,black)
   cyl('Rotary control cap',(x,y,.023),.0085,.016,color)
   box('Knob position mark',(x,y+.004,.0315),(.0018,.005,.0008),ink)
   for dx in [-.013,.013]:box('Control scale tick',(x+dx,y,.005),(.002,.001,.0005),ink)
  cyl('Gain knob',(x,.157,.016),.008,.02,red)
  for y in [.195,.225]:
   cyl('Metal jack bezel',(x,y,.006),.0075,.004,silver)
   cyl('Jack hole',(x,y,.0085),.0042,.001,dark)
  if i<12:
   cyl('XLR socket rim',(x,.253,.008),.014,.006,silver)
   cyl('XLR black insert',(x,.253,.012),.0115,.004,dark)
   for dx,dy in [(-.004,.002),(.004,.002),(0,-.004)]:cyl('XLR pin hole',(x+dx,.253+dy,.0145),.0016,.001,silver,10)
  box('Mute switch',(x,-.088,.010),(.012,.009,.008),red,.001)
  text('MUTE',(x,-.104,.006),.004)
 # Long fader slot and fine level graduations.
 box('Fader slot',(x,-.183,.006),(.004,.111,.0015),dark,.001)
 for j in range(10):box('Fader scale tick',(x+.010,-.236+j*.011,.006),(.007 if j%3==0 else .004,.0007,.0005),ink)
 z=-.17+(.008 if i%3==0 else -.004 if i%3==1 else .0)
 cap=white if i<12 else blue if i<14 else purple if i==14 else yellow
 box('Fader cap',(x,z,.019),(.024,.025,.02),cap,.003)
 box('Fader cap centre line',(x,z,.0295),(.023,.0013,.0007),black)
# Effects/master control zone at upper right.
for i,y in enumerate([.22,.178,.136,.094,.052,.01]):
 x=.318;cyl('Effects and master rotary',(x,y,.018),.010,.023,purple if i in [2,3] else grey)
 box('Control pointer',(x,y+.005,.030),(.002,.005,.001),ink)
box('Effects display',(.308,-.04,.008),(.066,.027,.004),dark,.001)
text('24',(.308,-.047,.011),.018,green)
text('LEXICON',(.308,-.016,.007),.007)
text('Soundcraft',(.289,-.081,.008),.015)
text('EFX SERIES',(.289,-.100,.008),.009)
for x in [.343,.355]:
 for j in range(14):box('LED meter segment',(x,.018+j*.010,.007),(.006,.005,.002),green if j<9 else amber if j<12 else red)
# Rear auxiliary sockets and top right connector pair.
for x in [.21,.25,.29,.33]:
 cyl('Auxiliary jack rim',(x,.252,.007),.007,.005,silver);cyl('Auxiliary jack hole',(x,.252,.010),.004,.002,dark)
for x in [-.36,.36]:
 for y in [-.25,.26]:
  cyl('Panel screw',(x,y,.009),.003,.002,silver,12);box('Screw slot',(x,y,.0102),(.004,.0008,.0004),black)
for x in [-.30,.30]:
 for y in [-.20,.20]:box('Rubber foot',(x,y,-.005),(.045,.035,.015),black,.005,False)
bpy.ops.object.select_all(action='SELECT');bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'soundcraft.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'soundcraft-unjoined.glb'),export_format='GLB',use_selection=True,export_apply=True)
floor=mat('Studio floor',(.12,.14,.15));box('Studio floor',(0,0,-.024),(200,200,.02),floor,parent=False)
bpy.context.scene.world.use_nodes=True;bpy.context.scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
for loc,power,size in [((1,-2,3),130,2),((-2,0,2),100,2),((0,2,3),150,2)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.data.energy=power;o.data.size=size;o.rotation_euler=(Vector((0,0,.05))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(.70,-1.05,1.2));o=bpy.context.object;o.rotation_euler=(Vector((0,0,.07))-o.location).to_track_quat('-Z','Y').to_euler();o.data.type='ORTHO';o.data.ortho_scale=1.04
s=bpy.context.scene;s.camera=o;s.render.engine='CYCLES';s.cycles.samples=16;s.render.resolution_x=1100;s.render.resolution_y=1000;s.render.resolution_percentage=100;s.render.image_settings.file_format='PNG';s.render.filepath=str(OUT/'soundcraft-preview.png');bpy.ops.render.render(write_still=True)
