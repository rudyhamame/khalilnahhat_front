import bpy
from pathlib import Path
body=bpy.data.objects['Khalil_fit_v2']
bpy.ops.object.select_all(action='DESELECT'); body.select_set(True); bpy.context.view_layer.objects.active=body
bpy.ops.export_scene.gltf(filepath=str(Path('out/khalil-head-v2.glb').resolve()),use_selection=True,export_format='GLB',export_apply=False,export_image_format='JPEG',export_jpeg_quality=92)
print('EXPORTED')
