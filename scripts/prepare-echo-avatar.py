"""Create a web portrait copy; never overwrite the supplied original GLB."""
import bpy
import json
import math
import os
import sys
from mathutils import Vector

args = sys.argv[sys.argv.index('--') + 1:]
source, target = args[:2]
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
keep = {'Basis', 'Jaw_Open', 'Mouth_Close', 'Mouth_Smile_L', 'Mouth_Smile_R',
        'Eye_Blink_L', 'Eye_Blink_R', 'Eye_Squint_L', 'Eye_Squint_R',
        'Eye_Wide_L', 'Eye_Wide_R', 'Brow_Raise_Inner_L', 'Brow_Raise_Inner_R',
        'Brow_Raise_Outer_L', 'Brow_Raise_Outer_R', 'Brow_Drop_L', 'Brow_Drop_R',
        'Cheek_Raise_L', 'Cheek_Raise_R'}
report = {'source': os.path.basename(source), 'meshes': [], 'images': []}
for obj in list(bpy.data.objects):
    obj.animation_data_clear()
    if obj.type != 'MESH':
        continue
    if obj.data.shape_keys:
        obj.data.shape_keys.animation_data_clear()
        for key in list(obj.data.shape_keys.key_blocks)[::-1]:
            if key.name not in keep and not key.name.startswith('V_'):
                obj.shape_key_remove(key)
        for key in obj.data.shape_keys.key_blocks:
            key.value = 0
    # Dense hair/clothing pieces need fewer triangles at a 400px portrait size.
    if not obj.data.shape_keys and len(obj.data.vertices) > 15000:
        bpy.context.view_layer.objects.active = obj
        modifier = obj.modifiers.new('Web portrait reduction', 'DECIMATE')
        modifier.ratio = 0.28
        bpy.ops.object.modifier_apply(modifier=modifier.name)
    report['meshes'].append({'name': obj.name, 'vertices': len(obj.data.vertices),
                            'morphs': list(obj.data.shape_keys.key_blocks.keys()) if obj.data.shape_keys else []})

for image in bpy.data.images:
    if image.size[0] == 0 or image.size[1] == 0:
        continue
    longest = max(image.size)
    if longest > 1024:
        scale = 1024 / longest
        image.scale(max(1, round(image.size[0] * scale)), max(1, round(image.size[1] * scale)))
    image.pack()
    report['images'].append({'name': image.name, 'size': list(image.size)})

os.makedirs(os.path.dirname(target), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=target, export_format='GLB', export_animations=False,
    export_morph=True, export_skins=True, export_image_format='WEBP', export_image_quality=82,
    export_texcoords=True, export_normals=True, export_yup=True)
report['bytes'] = os.path.getsize(target)
print('ECHO_AVATAR_REPORT ' + json.dumps(report))
