"""Blender: render neutral head, map mediapipe landmarks to mesh vertices, validate target-delta parsing."""
import bpy, addon_utils, math, json, gzip, os
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree
addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete()
macro=TargetService.get_default_macro_info_dict(); macro.update(gender=1.0,age=0.45,muscle=0.42,weight=0.45,height=0.5,proportions=0.5); macro['race']=dict(caucasian=1.0,asian=0.0,african=0.0)
body=HumanService.create_human(macro_detail_dict=macro)
base=np.array([tuple(v.co) for v in body.data.vertices]); np.save('work/base_verts.npy',base)
json.dump({'macro':{k:(v if not isinstance(v,dict) else v) for k,v in macro.items()}},open('work/macro.json','w'))
# validate parsing of a target + unit scale
path=TargetService.target_full_path('nose-width1-incr'); print('TARGET',path)
raw=[l.split() for l in gzip.open(path,'rt') if l.strip() and not l.startswith('#')]
d=np.zeros_like(base)
for r in raw: d[int(r[0])]=[float(r[1]),float(r[2]),float(r[3])]
TargetService.load_target(body,path,weight=1.0)
sk=body.data.shape_keys.key_blocks
print('KEYS',[k.name for k in sk])
k=sk[-1]; kb=np.array([tuple(p.co) for p in k.data]); bb=np.array([tuple(p.co) for p in sk[0].data])
delta=kb-bb; idx=np.abs(d).sum(1)>0
print('MOVED',int(idx.sum()),'blender moved',int((np.abs(delta).sum(1)>1e-9).sum()),'mag parsed',float(np.linalg.norm(d[idx],axis=1).mean()),'mag key',float(np.linalg.norm(delta[idx],axis=1).mean()))
print('SAMPLE parsed',d[idx][:3].tolist(),'key',delta[idx][:3].tolist())
