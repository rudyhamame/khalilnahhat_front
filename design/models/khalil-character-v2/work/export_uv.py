import bpy, numpy as np
body=[o for o in bpy.data.objects if o.name=='Khalil_fit_v2'][0]; me=body.data; uv=me.uv_layers.active.data
tv=[];tu=[]
for p in me.polygons:
    L=list(p.loop_indices); vs=[me.loops[l].vertex_index for l in L]
    for k in range(1,len(L)-1):
        tv.append([vs[0],vs[k],vs[k+1]]); tu.append([tuple(uv[L[0]].uv),tuple(uv[L[k]].uv),tuple(uv[L[k+1]].uv)])
np.savez('work/uv_tris.npz',tv=np.array(tv),tu=np.array(tu))
print('TRIS',len(tv),'uv layers',[l.name for l in me.uv_layers])
print('MATS',[m.name for m in body.data.materials])
