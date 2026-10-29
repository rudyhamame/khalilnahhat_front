"""Blender: rebuild the MPFB human with the fitted face-target weights and render front/profile for comparison."""
import bpy, addon_utils, math, json
import numpy as np
from pathlib import Path
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
fit=json.load(open('work/fit_weights.json'))
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
macro=TargetService.get_default_macro_info_dict(); macro.update(gender=1.0,age=0.45,muscle=0.42,weight=0.45,height=0.5,proportions=0.5); macro['race']=dict(caucasian=1.0,asian=0.0,african=0.0)
body=HumanService.create_human(macro_detail_dict=macro); body.name='Khalil_fit_v2'
n=0
for group,w in fit['weights'].items():
    for name in fit['groups'][group]:
        path=TargetService.target_full_path(name)
        if path: TargetService.load_target(body,path,weight=float(w)); n+=1
print('LOADED',n,'targets')
DATA=Path(LocationService.get_user_data())
HumanService.set_character_skin(str(DATA/'skins/young_caucasian_male/young_caucasian_male.mhmat'),body,skin_type='MAKESKIN')
HumanService.add_mhclo_asset(str(DATA/'eyes/high-poly/high-poly.mhclo'),body,asset_type='Eyes',subdiv_levels=0,set_up_rigging=False,interpolate_weights=False,import_weights=False)
bpy.ops.wm.save_as_mainfile(filepath=str(Path('out/khalil-fit-v2.blend').resolve()))
cam_j=json.load(open('work/cam.json'))
scene=bpy.context.scene; scene.render.engine='BLENDER_WORKBENCH'
sh=scene.display.shading; sh.light='FLAT'; sh.color_type='TEXTURE'; sh.background_type='VIEWPORT'; sh.background_color=(.62,.66,.72)
scene.render.resolution_x=cam_j['W']; scene.render.resolution_y=cam_j['H']
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=0.36
# camera centre from the fitted eye helper centroid so framing matches the photo-sized render
def centroid(gname):
    g=body.vertex_groups[gname].index; dg=bpy.context.evaluated_depsgraph_get()
    return np.mean([tuple(body.data.vertices[i].co) for i in range(len(body.data.vertices)) if any(gr.group==g and gr.weight>.5 for gr in body.data.vertices[i].groups)],axis=0)
sk=body.data.shape_keys.key_blocks
basis=np.array([tuple(p.co) for p in sk[0].data]); V=basis.copy()
for k in list(sk)[1:]:
    if k.mute or abs(k.value)<1e-9: continue
    V+=k.value*(np.array([tuple(p.co) for p in k.data])-basis)
np.save('work/fit_eval.npy',V)
g=json.load(open('work/groups.json')); mid=(V[g['helper-l-eye']].mean(0)+V[g['helper-r-eye']].mean(0))/2
def shot(name,loc,rot):
    cam.location=loc; cam.rotation_euler=rot; scene.render.filepath=f'//work/{name}.png'; bpy.ops.render.render(write_still=True)
shot('fit-front',(mid[0],mid[1]-1.5,mid[2]-0.045),(math.radians(90),0,0))
# profile: subject faces camera-right in the photo => camera on the model's +x side looking -x? (face points -y)
shot('fit-profile',(mid[0]+1.5,mid[1],mid[2]-0.045),(math.radians(90),0,math.radians(90)))
print('MID',mid.tolist())
