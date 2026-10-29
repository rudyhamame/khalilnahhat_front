import bpy, addon_utils
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
macro=TargetService.get_default_macro_info_dict(); macro.update(gender=1.0,age=0.4,muscle=0.42,weight=0.42,height=0.5,proportions=0.5)
body=HumanService.create_human(macro_detail_dict=macro)
print('VERTS',len(body.data.vertices),'dims',tuple(body.dimensions))
names=[g.name for g in body.vertex_groups]
print('GROUPS',len(names))
print([n for n in names if any(k in n.lower() for k in ('head','eye','nose','mouth','lip','chin','ear','jaw','brow','lid','face','cheek','temple','skull','neck'))][:80])
import os
d=TargetService.get_target_stack  # noqa
# list face targets
from bl_ext.user_default.mpfb.services.locationservice import LocationService
import glob
root=os.path.join(LocationService.get_mpfb_data(),'targets')
for sub in ('head','nose','mouth','chin','cheek','ears','eyes','eyebrows','forehead','neck','jaw'):
    fs=sorted(glob.glob(os.path.join(root,sub,'*.target.gz')))
    print(sub,len(fs),[os.path.basename(f)[:-10] for f in fs][:60])
