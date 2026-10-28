"""Export current v3 workspace for browser review, without changing its .blend file."""
import bpy
from pathlib import Path
from bl_ext.user_default.mpfb.services.targetservice import TargetService

OUT = Path(__file__).resolve().parent / 'mpfb-draft'
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'khalil-mpfb-reference-workspace-v3.blend'))
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH' and o.parent == rig]
for obj in meshes:
    if obj.data.shape_keys:
        TargetService.bake_targets(obj)
    bpy.ops.object.select_all(action='DESELECT')
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    for modifier in list(obj.modifiers):
        if modifier.type in {'MASK','SUBSURF'}:
            bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.ops.object.select_all(action='DESELECT')
bpy.context.view_layer.objects.active = rig
rig.select_set(True)
for obj in meshes:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'khalil-reference-review-v3.glb'),
    export_format='GLB', use_selection=True, export_skins=True,
    export_morph=False, export_animations=False, export_apply=False)
print('CURRENT_REFERENCE_PREVIEW_EXPORTED')
