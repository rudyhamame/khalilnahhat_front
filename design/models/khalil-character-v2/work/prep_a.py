"""Blender: neutral MPFB head -> evaluated vertices, faces, vertex groups, orthographic front render with known camera."""
import bpy, addon_utils, math, json
import numpy as np
from mathutils import Vector
from pathlib import Path
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
macro=TargetService.get_default_macro_info_dict(); macro.update(gender=1.0,age=0.45,muscle=0.42,weight=0.45,height=0.5,proportions=0.5); macro['race']=dict(caucasian=1.0,asian=0.0,african=0.0)
body=HumanService.create_human(macro_detail_dict=macro)
HumanService.set_character_skin(str(Path(LocationService.get_user_data())/'skins/young_caucasian_male/young_caucasian_male.mhmat'),body,skin_type='MAKESKIN')
HumanService.add_mhclo_asset(str(Path(LocationService.get_user_data())/'eyes/high-poly/high-poly.mhclo'),body,asset_type='Eyes',subdiv_levels=0,set_up_rigging=False,interpolate_weights=False,import_weights=False)
me=body.data
V=np.array([tuple(v.co) for v in me.vertices])
sk=me.shape_keys.key_blocks; basis=np.array([tuple(p.co) for p in sk[0].data]); V=basis.copy()
for k in list(sk)[1:]:
    if k.mute or abs(k.value)<1e-9: continue
    V+=k.value*(np.array([tuple(p.co) for p in k.data])-basis)
np.save('work/base_eval.npy',V)
F=[]
for p in me.polygons:
    vs=list(p.vertices)
    for k in range(1,len(vs)-1): F.append([vs[0],vs[k],vs[k+1]])
np.save('work/faces.npy',np.array(F))
groups={}
for g in body.vertex_groups:
    groups[g.name]=[i for i,v in enumerate(body.data.vertices) if any(gr.group==g.index and gr.weight>.3 for gr in v.groups)]
json.dump({k:v for k,v in groups.items() if k in ('ears','lips','helper-l-eye','helper-r-eye','joint-head','joint-jaw','joint-neck')},open('work/groups.json','w'))
print('VERTS',len(V),'FACES',len(F))
mid=(V[groups['helper-l-eye']].mean(0)+V[groups['helper-r-eye']].mean(0))/2
scene=bpy.context.scene; scene.render.engine='BLENDER_WORKBENCH'
sh=scene.display.shading; sh.light='FLAT'; sh.color_type='TEXTURE'; sh.background_type='VIEWPORT'; sh.background_color=(.62,.66,.72)
W,H=1010,1557; scene.render.resolution_x=W; scene.render.resolution_y=H
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=0.36
cx,cz=float(mid[0]),float(mid[2])-0.045
cam.location=(cx,float(mid[1])-1.5,cz); cam.rotation_euler=(math.radians(90),0,0)
scene.render.filepath='//work/base-front.png'; bpy.ops.render.render(write_still=True)
json.dump({'cx':cx,'cz':cz,'mpp':0.36/H,'W':W,'H':H,'mid':list(map(float,mid))},open('work/cam.json','w'))
