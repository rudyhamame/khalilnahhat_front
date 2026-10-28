"""Remove only the added lash objects from authoring source and active GLB."""
import bpy
import json
import struct
from pathlib import Path

OUT=Path(__file__).resolve().parent/'mpfb-draft'
source=OUT/'khalil-surface-work-v6.blend'
bpy.ops.wm.open_mainfile(filepath=str(source))
removed=[]
for obj in list(bpy.data.objects):
    if obj.type=='MESH' and 'eyelashes01' in obj.name:
        removed.append(obj.name)
        bpy.data.objects.remove(obj,do_unlink=True)
assert removed, 'Expected the added lash object'
bpy.ops.wm.save_as_mainfile(filepath=str(source))

# Retain every other mesh/buffer byte rather than round-tripping unrelated assets.
path=OUT/'khalil-surface-review-v6.glb'
raw=path.read_bytes()
json_length=struct.unpack_from('<I',raw,12)[0]
doc=json.loads(raw[20:20+json_length])
removed_meshes={i for i,m in enumerate(doc['meshes']) if 'eyelashes01' in m.get('name','')}
removed_nodes={i for i,n in enumerate(doc['nodes']) if n.get('mesh') in removed_meshes}
assert removed_meshes and removed_nodes
assert not doc.get('animations'), 'Handle animation node remapping before modifying animated files'
mesh_map={old:new for new,old in enumerate(i for i in range(len(doc['meshes'])) if i not in removed_meshes)}
node_map={old:new for new,old in enumerate(i for i in range(len(doc['nodes'])) if i not in removed_nodes)}
doc['meshes']=[m for i,m in enumerate(doc['meshes']) if i not in removed_meshes]
doc['nodes']=[n for i,n in enumerate(doc['nodes']) if i not in removed_nodes]
for n in doc['nodes']:
    if 'mesh' in n:n['mesh']=mesh_map[n['mesh']]
    if 'children' in n:n['children']=[node_map[i] for i in n['children'] if i in node_map]
for scene in doc.get('scenes',[]):
    scene['nodes']=[node_map[i] for i in scene.get('nodes',[]) if i in node_map]
for skin in doc.get('skins',[]):
    assert all(i in node_map for i in skin['joints'])
    skin['joints']=[node_map[i] for i in skin['joints']]
    if 'skeleton' in skin:skin['skeleton']=node_map[skin['skeleton']]
encoded=json.dumps(doc,separators=(',',':')).encode()
encoded+=b' '*((-len(encoded))%4)
tail=raw[20+json_length:]
result=struct.pack('<4sII',b'glTF',2,20+len(encoded)+len(tail))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+tail
path.write_bytes(result)
assert not any('eyelashes01' in n.get('name','') for n in doc['nodes'])
print('REMOVED_ADDED_LASHES',removed,'remaining meshes',len(doc['meshes']))
