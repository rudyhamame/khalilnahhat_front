"""Six-panel LED wall (3 columns x 2 rows): one logo texture spans all six panels.
blender -b -P build_wall.py -- OUT_DIR   (expects led-wall-logo.png beside this script)"""
import bpy,sys
from pathlib import Path
OUT=Path(sys.argv[sys.argv.index('--')+1]);OUT.mkdir(parents=True,exist_ok=True)
HERE=Path(__file__).parent
COLS,ROWS,W,H,D,GAP=3,2,1.0,.6,.1,.004
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
def mat(n,c,metal=0,rough=.5):
 m=bpy.data.materials.new(n);m.use_nodes=True;p=m.node_tree.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(*c,1);p.inputs['Metallic'].default_value=metal;p.inputs['Roughness'].default_value=rough;return m
body=mat('Charcoal cabinet',(.022,.03,.034),.45,.5);rib=mat('Rear ribs',(.036,.047,.052),.55,.45);edge=mat('Silver edge rail',(.49,.53,.54),.8,.28)
img=bpy.data.images.load(str(HERE/'led-wall-logo.png'));img.pack()
screen=bpy.data.materials.new('LED logo display');screen.use_nodes=True
nt=screen.node_tree;p=nt.nodes['Principled BSDF'];p.inputs['Base Color'].default_value=(0,0,0,1);p.inputs['Roughness'].default_value=.35
tex=nt.nodes.new('ShaderNodeTexImage');tex.image=img;tex.interpolation='Linear'
nt.links.new(tex.outputs['Color'],p.inputs['Emission Color']);p.inputs['Emission Strength'].default_value=1.4
def box(name,loc,dim,m,bevel=.004):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.name=name;o.dimensions=dim;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(m)
 if bevel:b=o.modifiers.new('Bevel','BEVEL');b.width=bevel;b.segments=2
 return o
def face(name,x0,x1,z0,z1,y,u0,u1,v0,v1):
 # front display quad (faces -Y) whose UVs take its slice of the shared logo texture
 me=bpy.data.meshes.new(name);me.from_pydata([(x0,y,z0),(x1,y,z0),(x1,y,z1),(x0,y,z1)],[],[(0,1,2,3)]);me.update()
 uv=me.uv_layers.new(name='UVMap');
 for loop,(u,v) in zip(me.polygons[0].loop_indices,[(u0,v0),(u1,v0),(u1,v1),(u0,v1)]):uv.data[loop].uv=(u,v)
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);me.materials.append(screen);return o
for r in range(ROWS):
 for c in range(COLS):
  cx=(c-(COLS-1)/2)*W;cz=H/2+(ROWS-1-r)*H;tag=f'R{r+1}C{c+1}'
  box(f'Panel {tag} cabinet',(cx,0,cz),(W-GAP,D,H-GAP),body)
  face(f'Panel {tag} display',cx-(W-GAP)/2+.01,cx+(W-GAP)/2-.01,cz-(H-GAP)/2+.01,cz+(H-GAP)/2-.01,-D/2-.001,c/COLS,(c+1)/COLS,(ROWS-1-r)/ROWS,(ROWS-r)/ROWS)
  box(f'Panel {tag} rail top',(cx,-D/2+.004,cz+(H-GAP)/2),(W-GAP,.012,.012),edge,.002);box(f'Panel {tag} rail bottom',(cx,-D/2+.004,cz-(H-GAP)/2),(W-GAP,.012,.012),edge,.002)
  for k in (-1,0,1):box(f'Panel {tag} rear rib',(cx+k*.28,D/2+.012,cz),(.04,.03,H-.12),rib,.003)
  box(f'Panel {tag} handle',(cx+W/2-.07,D/2+.02,cz),(.05,.03,.12),rib,.004)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'led-wall-3x2.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'led-wall-3x2.glb'),export_format='GLB',use_selection=True,export_apply=True)
print('BUILT',W*COLS,H*ROWS)
