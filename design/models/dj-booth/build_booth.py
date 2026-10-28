"""Stylized DJ booth: table, three-module DJ controller modelled on the VP1 photo, and a faceless-style
DJ figure (only with --figure; green sweatshirt, headphones, sunglasses). Not a likeness; proportions are illustrative.
blender -b -P build_booth.py -- OUT_DIR"""
import bpy,math,sys
from pathlib import Path
OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(n,c,metal=0,rough=.5,emit=None,strength=0):
 m=bpy.data.materials.new(n);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough
 if emit:p.inputs['Emission Color'].default_value=(*emit,1);p.inputs['Emission Strength'].default_value=strength
 return m
cloth=mat('Booth cloth',(.075,.085,.09),0,.85);body=mat('Controller body',(.018,.02,.024),.4,.42);plate=mat('Controller plate',(.03,.033,.038),.5,.35)
silver=mat('Brushed silver',(.55,.58,.6),.9,.25);knob=mat('Knob',(.08,.08,.09),.6,.3);blue=mat('Pad blue',(.1,.3,.9),0,.3,(.15,.4,1),4)
sweat=mat('Sweatshirt',(.05,.4,.31),0,.85);skin=mat('Skin',(.62,.43,.32),0,.6);hair=mat('Hair',(.07,.04,.025),0,.7);pants=mat('Trousers',(.05,.06,.08),0,.8);shoe=mat('Shoes',(.01,.01,.012),0,.5)
glass=mat('Sunglasses',(.005,.005,.006),.3,.15);phone=mat('Headphones',(.015,.015,.018),.5,.35)
def box(n,p,d,m,b=.004):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=n;o.dimensions=d;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if b:x=o.modifiers.new('Bevel','BEVEL');x.width=b;x.segments=2
 return o
def cyl(n,p,r,h,m,rot=(0,0,0),v=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=v,radius=r,depth=h,location=p,rotation=rot);o=bpy.context.object;o.name=n;o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return o
def ball(n,p,r,m,s=(1,1,1)):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=16,radius=r,location=p);o=bpy.context.object;o.name=n;o.scale=s;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 for f in o.data.polygons:f.use_smooth=True
 return o
def tube(n,pts,r,m):
 c=bpy.data.curves.new(n,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=4;s=c.splines.new('POLY');s.points.add(len(pts)-1)
 for q,v in zip(s.points,pts):q.co=(*v,1)
 o=bpy.data.objects.new(n,c);bpy.context.collection.objects.link(o);o.data.materials.append(m);return o
def torus(n,p,R,r,m,rot=(0,0,0)):
 bpy.ops.mesh.primitive_torus_add(major_radius=R,minor_radius=r,location=p,rotation=rot,major_segments=40,minor_segments=10);o=bpy.context.object;o.name=n;o.data.materials.append(m);return o
# --- booth table: top surface at z=.93, 4.0 x .85 m
box('Booth table',(0,0,.465),(4.0,.85,.93),cloth,.01)
# --- controller (modelled on the VP1 photo): left deck | 4-channel mixer | right deck, on the table
TOP=.93;H=.07;TZ=TOP+H
ring=mat('Jog LED ring',(0,.35,.6),0,.3,(.1,.7,1),6);padon=mat('Pad lit',(.1,.3,.9),0,.3,(.15,.45,1),5);padoff=mat('Pad dim',(.03,.07,.2),0,.4,(.04,.1,.35),1.2)
mg=mat('Meter green',(.05,.6,.2),0,.3,(.1,.9,.3),3);ma=mat('Meter amber',(.7,.45,0),0,.3,(1,.65,.05),3);mr=mat('Meter red',(.7,.05,.04),0,.3,(1,.1,.08),3)
lip=mat('Front lip',(.5,.53,.55),.9,.3);label=mat('Panel print',(.55,.57,.58),0,.5)
def knob(x,y,z=TZ,r=.011):
 cyl('Knob base',(x,y,z+.009),r,.018,knob_m,v=20);cyl('Knob cap',(x,y,z+.02),r*.72,.008,silver,v=20);box('Knob mark',(x,y+r*.4,z+.025),(.0022,r*.7,.0015),body,0)
knob_m=mat('Knob body',(.06,.06,.07),.6,.28)
for name,cx,w in (('Left deck',-.39,.40),('Mixer',0,.38),('Right deck',.39,.40)):
 box(name,(cx,0,TOP+H/2),(w-.004,.42,H),body,.008);box(name+' plate',(cx,0,TZ+.001),(w-.026,.396,.003),plate,.002)
 box(name+' front lip',(cx,-.205,TOP+.032),(w-.004,.016,.064),lip,.003)
 for sx in (-1,1):
  cyl('Lip screw',(cx+sx*(w/2-.02),-.2145,TOP+.032),.005,.003,body,rot=(math.pi/2,0,0),v=12)
  box('Side rail',(cx+sx*(w/2-.0035),0,TOP+H/2),(.006,.42,H-.004),lip,.002)
for cx in (-.39,.39):
 jy=.035
 cyl('Jog outer ring',(cx,jy,TZ+.006),.152,.012,body,v=48)
 for i in range(32):
  a=i*2*math.pi/32;cyl('Jog dimple',(cx+.136*math.cos(a),jy+.136*math.sin(a),TZ+.011),.0075,.004,plate,v=10)
 torus('Jog rim',(cx,jy,TZ+.016),.118,.009,silver);torus('Jog LED ring',(cx,jy,TZ+.019),.108,.0035,ring)
 cyl('Jog platter',(cx,jy,TZ+.015),.104,.012,body,v=48)
 for rr in (.05,.07,.088):torus('Platter groove',(cx,jy,TZ+.0215),rr,.0011,plate)
 cyl('Jog centre disc',(cx,jy,TZ+.0215),.034,.004,silver,v=32);cyl('Jog centre cap',(cx,jy,TZ+.025),.012,.004,body,v=16)
 for r in range(2):
  for c in range(4):box('Performance pad',(cx-.135+c*.09,-.185+r*.04,TZ+.0045),(.074,.032,.008),padon if (r+c)%2==0 else padoff,.003)
 for sx in (-1,1):knob(cx+sx*.16,.17)
 for k in range(3):box('Transport button',(cx-.05+k*.05,.19,TZ+.003),(.034,.012,.006),lip,.002)
# 4-channel mixer: gain + three EQ knobs + filter, channel fader with LED meter, crossfader
for ch in range(4):
 x=(ch-1.5)*.09
 for k,y in enumerate((.175,.135,.095,.055,.015)):knob(x,y)
 box('Fader slot',(x,-.085,TZ+.003),(.007,.105,.003),body,0);box('Fader cap',(x,-.065-ch%3*.025,TZ+.01),(.022,.034,.012),knob_m,.003);box('Fader cap line',(x,-.065-ch%3*.025,TZ+.0165),(.016,.002,.001),silver,0)
 for i in range(8):box('Level meter',(x-.03,-.13+i*.0135,TZ+.0035),(.006,.009,.004),mg if i<5 else (ma if i<7 else mr),0)
box('Crossfader slot',(0,-.19,TZ+.003),(.15,.008,.003),body,0);box('Crossfader cap',(.02,-.19,TZ+.01),(.032,.022,.012),knob_m,.003);box('Crossfader line',(.02,-.19,TZ+.0165),(.002,.016,.001),silver,0)
for sx in (-1,1):knob(sx*.15,.175,r=.013)
for sx in (-1,1):box('Headphone cue',(sx*.16,-.01,TZ+.003),(.024,.014,.006),lip,.002)
# The stylized figure is optional; the simulation does not use it (pass --figure to include it).
if '--figure' in sys.argv:
# --- DJ figure standing behind the table, facing the audience (-Y)
 Y=.62
 for sx in (-1,1):
  cyl('Leg',(sx*.1,Y,.45),.085,.9,pants);box('Shoe',(sx*.1,Y-.04,.03),(.12,.27,.06),shoe,.015)
 box('Hips',(0,Y,.92),(.34,.22,.14),pants,.04)
 box('Sweatshirt torso',(0,Y,1.2),(.46,.26,.58),sweat,.07);ball('Shoulder L',(-.24,Y,1.42),.085,sweat);ball('Shoulder R',(.24,Y,1.42),.085,sweat)
 cyl('Neck',(0,Y,1.54),.05,.09,skin);ball('Head',(0,Y,1.67),.105,skin,(.95,1.0,1.08));ball('Hair',(0,Y+.015,1.73),.108,hair,(1,1,.62))
 box('Sunglasses',(0,Y-.095,1.685),(.17,.018,.04),glass,.008);box('Sunglasses bridge',(0,Y-.1,1.7),(.05,.01,.008),glass,0)
 torus('Headphone band',(0,Y,1.5),.125,.016,phone);
 for sx in (-1,1):cyl('Headphone cup',(sx*.125,Y-.03,1.46),.045,.035,phone,rot=(0,math.pi/2,0),v=24)
 for sx,hand in ((-1,(-.38,-.04,1.02)),(1,(.12,-.06,1.03))):
  tube('Arm',[(sx*.27,Y,1.40),(sx*.3,Y-.22,1.14),hand],.05,sweat);ball('Hand',hand,.045,skin,(1,1.25,.6))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'dj-booth.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'dj-booth-unjoined.glb'),export_format='GLB',use_selection=True,export_apply=True)
print('BUILT')
