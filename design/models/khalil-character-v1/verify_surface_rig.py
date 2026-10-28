"""Reimport the revised surface GLB and exercise its actual exported skin weights."""
import bpy
import json
import struct
import sys
from pathlib import Path

OUT=Path(__file__).resolve().parent/'mpfb-draft'
revision='v7' if '--hairline-pass' in sys.argv else ('v6' if '--hair-pass' in sys.argv else ('v5' if '--profile-pass' in sys.argv else 'v4'))
path=OUT/(('khalil-hairline-review-' if revision=='v7' else 'khalil-surface-review-')+revision+'.glb')
data=path.read_bytes()
length=struct.unpack_from('<I',data,12)[0]
gltf=json.loads(data[20:20+length])
assert gltf.get('skins')
assert all({'JOINTS_0','WEIGHTS_0'} <= set(p['attributes'])
           for m in gltf['meshes'] for p in m['primitives'])
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(path))
rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.parent==rig]
def positions(obj):
    bpy.context.view_layer.update()
    evaluated=obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh=evaluated.to_mesh();result=[v.co.copy() for v in mesh.vertices]
    evaluated.to_mesh_clear();return result
rest={o.name:positions(o) for o in meshes}
tests=[]
for name in ['head','eye.L','upperarm01.L','lowerarm01.L','wrist.L','upperleg01.L','lowerleg01.L']:
    pb=rig.pose.bones[name];pb.rotation_mode='XYZ';pb.rotation_euler.x=0.2
    moved={}
    for obj in meshes:
        posed=positions(obj)
        moved[obj.name]=sum((a-b).length>0.00001 for a,b in zip(rest[obj.name],posed))
    assert sum(moved.values())>0, name+' did not deform any mesh'
    tests.append({'bone':name,'movedVerticesByMesh':moved})
    pb.rotation_euler.x=0;bpy.context.view_layer.update()
report={'glbBytes':len(data),'skins':len(gltf['skins']),'meshes':len(gltf['meshes']),
        'jointWeightAttributesVerified':True,'jointTests':tests,
        'status':'Technical skin deformation verified; not a likeness or anatomical-quality approval'}
(OUT/('surface-'+revision+'-rig-validation.json')).write_text(json.dumps(report,indent=2))
print('SURFACE_RIG_VALIDATED',json.dumps(report))
