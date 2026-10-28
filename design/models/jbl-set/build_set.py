# Eight separate JBL speaker models (one GLB each), reusing the helpers and
# speaker() from ../equipment-batch/build_models.py.
# blender -b -P build_set.py -- OUT_DIR
import bpy, math, sys
from pathlib import Path
src=(Path(__file__).parent/'../equipment-batch/build_models.py').read_text()
head=src[:src.index('# Sparklers')]
spk=src[src.index('def speaker'):src.index("speaker('Left small sub'")]
exec(head);exec(spk)
def wedge(x=0,rot=0):
 verts=[(x-.18,-.28,.015),(x+.18,-.28,.015),(x+.18,.02,.015),(x-.18,.02,.015),(x-.18,-.28,.075),(x+.18,-.28,.075),(x+.18,.02,.23),(x-.18,.02,.23)]
 mesh=bpy.data.meshes.new('Wedge enclosure');mesh.from_pydata(verts,[],[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]);mesh.update();o=bpy.data.objects.new('Angled floor monitor',mesh);bpy.context.collection.objects.link(o);o.data.materials.append(black)
 for p in o.data.polygons:p.use_smooth=False
 angle=math.atan2(.155,.30)
 o=box('Sloped monitor grille',(x,-.13,.159),(.33,.32,.008),dark,.005);o.rotation_euler[0]=angle
 for i in range(29):
  o=box('Monitor grille wire',(x-.155+i*.011,-.13,.165),(.0015,.31,.0015),black,0);o.rotation_euler[0]=angle
 for i in range(27):
  yy=-.265+i*.010;zz=.087+(yy+.28)*.155/.30
  box('Monitor cross grille wire',(x,yy,zz),(.32,.001,.001),black,0)
 if rot:
  e=bpy.data.objects.new('Wedge pivot',None);bpy.context.collection.objects.link(e)
  for o in list(bpy.context.scene.objects):
   if o is not e and o.parent is None:o.parent=e
  e.rotation_euler[2]=rot
def top(h):
 cyl('Speaker pole',(0,.03,h/2),.009,h-.01,black);cyl('Tripod hub',(0,.03,.04),.04,.08,steel)
 for a in range(3):
  t=a*2*math.pi/3;tube('Tripod leg',[(0,.03,.07),(.3*math.sin(t),.03+.3*math.cos(t),.0)],.009,black)
 cyl('Pole coupling',(0,.03,h-.07),.015,.06,steel);speaker('Pole mounted JBL top',(0,.03,h),.28,.47,.25)
PARTS={'jbl-top-stand-a':lambda:top(.83),'jbl-top-stand-b':lambda:top(1.0),
 'jbl-compact-sub':lambda:speaker('Compact subwoofer',(0,0,0),.33,.40,.32),
 'jbl-large-sub':lambda:speaker('Large subwoofer',(0,0,0),.40,.53,.39),
 'jbl-tower-tall':lambda:speaker('Tall double-driver tower',(0,0,0),.32,.85,.32,2),
 'jbl-tower':lambda:speaker('Double-driver tower',(0,0,0),.30,.77,.30,2),
 'jbl-wedge-left':lambda:wedge(0,-.5),'jbl-wedge-right':lambda:wedge(0,.5)}
OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(parents=True,exist_ok=True)
for key,build in PARTS.items():
 reset();build()
 bpy.ops.object.select_all(action='SELECT')
 bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(key+'.blend')),compress=True)
 bpy.ops.export_scene.gltf(filepath=str(OUT/(key+'-unjoined.glb')),export_format='GLB',use_selection=True,export_apply=True)
 print('BUILT',key)
