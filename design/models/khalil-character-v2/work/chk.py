import bpy, addon_utils, numpy as np
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
macro=TargetService.get_default_macro_info_dict(); macro.update(gender=1.0,age=0.45,muscle=0.42,weight=0.45,height=0.5,proportions=0.5); macro['race']=dict(caucasian=1.0,asian=0.0,african=0.0)
body=HumanService.create_human(macro_detail_dict=macro)
print('MODS',[(m.name,m.type) for m in body.modifiers])
for m in body.modifiers: m.show_viewport=False; m.show_render=False
dg=bpy.context.evaluated_depsgraph_get(); ev=body.evaluated_get(dg); me=ev.to_mesh()
Ve=np.array([tuple(v.co) for v in me.vertices]); V=np.load('work/base_eval.npy')
print('EVAL',len(Ve),'maxdiff vs manual mix',float(np.abs(Ve-V).max()) if len(Ve)==len(V) else 'size')
print('RELKEYS',[(k.name,k.relative_key.name,round(k.value,2)) for k in body.data.shape_keys.key_blocks][:12])
