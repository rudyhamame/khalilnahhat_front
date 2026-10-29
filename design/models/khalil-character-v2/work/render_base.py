import bpy, addon_utils, math, sys
from mathutils import Vector
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from pathlib import Path
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
macro=TargetService.get_default_macro_info_dict(); macro.update(gender=1.0,age=0.4,muscle=0.42,weight=0.42,height=0.5,proportions=0.5)
macro['race']=dict(caucasian=1.0,asian=0.0,african=0.0)
body=HumanService.create_human(macro_detail_dict=macro)
HumanService.set_character_skin(str(Path(LocationService.get_user_data())/'skins/young_caucasian_male/young_caucasian_male.mhmat'),body,skin_type='MAKESKIN')
DATA=Path(LocationService.get_user_data())
eyes=HumanService.add_mhclo_asset(str(DATA/'eyes/high-poly/high-poly.mhclo'),body,asset_type='Eyes',subdiv_levels=0,set_up_rigging=False,interpolate_weights=False,import_weights=False)
import numpy as np
v=np.array([tuple(x.co) for x in body.data.vertices]); np.save('work/base_verts.npy',v)
# head centre: use the eye helper groups
def centroid(gname):
    g=body.vertex_groups[gname].index
    pts=[body.data.vertices[i].co for i in range(len(body.data.vertices)) if any(gr.group==g and gr.weight>.5 for gr in body.data.vertices[i].groups)]
    return sum(pts,Vector())/len(pts)
le,re_=centroid('helper-l-eye'),centroid('helper-r-eye'); mid=(le+re_)/2
print('EYES',tuple(le),tuple(re_),'FWD axis check dims',tuple(body.dimensions))
scene=bpy.context.scene; scene.render.engine='BLENDER_WORKBENCH'
sh=scene.display.shading; sh.light='FLAT'; sh.color_type='TEXTURE'; sh.background_type='VIEWPORT'; sh.background_color=(.62,.66,.72)
scene.render.resolution_x=1010; scene.render.resolution_y=1557; scene.render.film_transparent=False
cam=bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); scene.collection.objects.link(cam); scene.camera=cam
cam.data.type='ORTHO'; cam.data.ortho_scale=0.36
def shot(name,loc,rot):
    cam.location=loc; cam.rotation_euler=rot; scene.render.filepath=f'//work/{name}.png'; bpy.ops.render.render(write_still=True)
d=1.5
# MPFB: Y is forward (-Y faces camera by default front view). Front camera at -Y looking +Y.
shot('base-front',(mid.x,mid.y-d,mid.z-0.045),(math.radians(90),0,0))
print('MID',tuple(mid))
