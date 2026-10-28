"""Run with Blender 4.5 + MPFB 2.0.18. Builds a rigging draft, NOT approved likeness."""
import bpy
import addon_utils
import json
import math
from pathlib import Path
from mathutils import Vector

addon_utils.enable('bl_ext.user_default.mpfb', default_set=True)
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.ui.rigging.standardrig.standardrigpanel import SETUP_HELPERS_PROPERTIES

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'mpfb-draft'
OUT.mkdir(exist_ok=True)
DATA = Path(LocationService.get_user_data())
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.render.fps = 24
scene.frame_start, scene.frame_end = 1, 96

macro = TargetService.get_default_macro_info_dict()
macro.update(gender=1.0, age=0.4, muscle=0.42, weight=0.42, height=0.5, proportions=0.5)
# This is a starting shape only, not measured anatomy or verified identity.
macro['race'] = dict(caucasian=1.0, asian=0.0, african=0.0)
body = HumanService.create_human(macro_detail_dict=macro)
body.name = 'Khalil_BODY_LIKENESS_NOT_APPROVED'
for name, value in [('head-oval', 0.25), ('head-scale-horiz-decr', 0.12),
                    ('chin-width-decr', 0.1), ('nose-trans-forward', 0.12)]:
    path = TargetService.target_full_path(name)
    if path:
        TargetService.load_target(body, path, weight=value)
skin = DATA / 'skins/young_caucasian_male/young_caucasian_male.mhmat'
HumanService.set_character_skin(str(skin), body, skin_type='MAKESKIN')
rig = HumanService.add_builtin_rig(body, 'default')
rig.name = 'Khalil_RIG_WORKING_DRAFT'
rig.show_in_front = True

def asset(relative, kind='Clothes'):
    return HumanService.add_mhclo_asset(str(DATA / relative), body,
        asset_type=kind, subdiv_levels=0, set_up_rigging=True,
        interpolate_weights=True, import_weights=True)

eyes = asset('eyes/high-poly/high-poly.mhclo', 'Eyes')
brows = asset('eyebrows/eyebrow001/eyebrow001.mhclo', 'Eyebrows')
hair = asset('hair/short04/short04.mhclo', 'Hair')
outfit = asset('clothes/male_casualsuit02/male_casualsuit02.mhclo')
shoes = asset('clothes/shoes01/shoes01.mhclo')

def plain_material(name, color, roughness=0.8):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get('Principled BSDF')
    bsdf.inputs['Base Color'].default_value = (*color, 1)
    bsdf.inputs['Roughness'].default_value = roughness
    mat.diffuse_color = (*color, 1)
    return mat

outfit.data.materials.clear()
outfit.data.materials.append(plain_material('Draft teal sweatshirt', (0.015, 0.19, 0.17)))
outfit.data.materials.append(plain_material('Draft charcoal trousers', (0.045, 0.05, 0.055)))
# The stock asset combines trousers and shirt; identify its separated surfaces by height.
for polygon in outfit.data.polygons:
    z = sum(outfit.data.vertices[i].co.z for i in polygon.vertices) / len(polygon.vertices)
    polygon.material_index = 0 if z > 0.96 else 1
shoes.data.materials.clear()
shoes.data.materials.append(plain_material('Draft black shoes', (0.022, 0.025, 0.028)))
for obj in [body, eyes, brows, hair, outfit, shoes]:
    for poly in obj.data.polygons:
        poly.use_smooth = True

# Preserve editable morphs, helpers, references and a genuinely weighted skeleton.
body['status'] = 'UNAPPROVED LIKENESS — editable rigging and wardrobe draft only'
rig['status'] = 'Technical deformation test; not a finished DJ performance'
for image_path, label, x in [
    (ROOT / 'identity-reference-user-closeup.png', 'REAL PHOTO — identity reference', -2.1),
    (ROOT / 'neutral-a-pose-front-v3-photo-reference.png', 'APPROVED 2D — wardrobe and pose', 2.1),
]:
    if image_path.exists():
        ref = bpy.data.objects.new(label, None)
        scene.collection.objects.link(ref)
        ref.empty_display_type = 'IMAGE'
        ref.data = bpy.data.images.load(str(image_path), check_existing=True)
        ref.empty_display_size = 1.7
        ref.location = (x, 0.5, 1.05)
        ref.rotation_euler = (math.pi / 2, 0, 0)
        ref.hide_render = True

def active(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

active(rig)
SETUP_HELPERS_PROPERTIES.set_value('arm_helpers_type', 'ARMCHAIN', entity_reference=scene)
SETUP_HELPERS_PROPERTIES.set_value('leg_helpers_type', 'LOWERUPPER', entity_reference=scene)
SETUP_HELPERS_PROPERTIES.set_value('finger_helpers_type', 'GRIP_AND_MASTER', entity_reference=scene)
bpy.ops.mpfb.add_helpers()

scene.world.color = (0.15, 0.15, 0.15)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            space = area.spaces.active
            space.region_3d.view_distance = 3.1
            space.region_3d.view_location = Vector((0, 0, 0.95))
            space.shading.type = 'MATERIAL'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'khalil-mpfb-editable-v1.blend'))

# Diagnostic export: preserve source above, strip control constraints for simple FK tests.
for pb in rig.pose.bones:
    for constraint in list(pb.constraints):
        pb.constraints.remove(constraint)
rig.animation_data_clear()
for obj in [body, eyes, brows, hair, outfit, shoes]:
    if obj.data.shape_keys:
        TargetService.bake_targets(obj)
    active(obj)
    for modifier in list(obj.modifiers):
        if modifier.type in {'MASK', 'SUBSURF'}:
            bpy.ops.object.modifier_apply(modifier=modifier.name)

for pb in rig.pose.bones:
    pb.rotation_mode = 'XYZ'
    pb.rotation_euler = (0, 0, 0)
    pb.location = (0, 0, 0)

def evaluated_positions(obj):
    bpy.context.view_layer.update()
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    positions = [v.co.copy() for v in mesh.vertices]
    evaluated.to_mesh_clear()
    return positions

rest = evaluated_positions(body)
tests = []
available = set(rig.pose.bones.keys())
for name in ['upperarm01.L', 'lowerarm01.L', 'wrist.L', 'upperleg01.L', 'lowerleg01.L']:
    if name not in available:
        tests.append({'bone': name, 'error': 'bone missing'})
        continue
    pb = rig.pose.bones[name]
    pb.rotation_euler.x = 0.3
    posed = evaluated_positions(body)
    changes = [(a-b).length for a,b in zip(rest, posed)]
    tests.append({'bone':name, 'movedVertices':sum(d > 0.00001 for d in changes),
                  'maxDisplacementMeters':max(changes)})
    pb.rotation_euler.x = 0
    bpy.context.view_layer.update()

# Deliberately labeled mechanical test, not music-reactive or finished motion.
motion = {'upperarm01.L': (0.35, 0, -0.15), 'lowerarm01.L': (0.7, 0, 0),
          'wrist.L': (0.2, 0, 0), 'upperarm01.R': (0.25, 0, 0.15),
          'lowerarm01.R': (0.55, 0, 0), 'lowerleg01.L': (0.2, 0, 0)}
for frame, factor in [(1, 0), (32, 1), (64, 0.4), (96, 0)]:
    for name, angles in motion.items():
        if name in available:
            pb = rig.pose.bones[name]
            pb.rotation_euler = tuple(a * factor for a in angles)
            pb.keyframe_insert(data_path='rotation_euler', frame=frame, group=name)
if rig.animation_data and rig.animation_data.action:
    rig.animation_data.action.name = 'DIAGNOSTIC_joint_movement_NOT_DJ_PERFORMANCE'
scene.frame_set(1)
active(rig)
for obj in [body, eyes, brows, hair, outfit, shoes]:
    obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT / 'khalil-mpfb-rig-test-v1.glb'),
    export_format='GLB', use_selection=True, export_animations=True,
    export_morph=False, export_skins=True, export_def_bones=True,
    export_force_sampling=True, export_apply=False)
report = {'blender':bpy.app.version_string,'mpfb':'2.0.18',
          'status':'Technical rig draft only; facial likeness NOT APPROVED',
          'sourceBones':len(rig.data.bones),'deformationTests':tests,
          'objects':[{'name':o.name,'vertices':len(o.data.vertices),
                      'vertexGroups':len(o.vertex_groups),
                      'weightedVertices':sum(bool(v.groups) for v in o.data.vertices)}
                     for o in [body, eyes, brows, hair, outfit, shoes]]}
(OUT / 'rig-validation.json').write_text(json.dumps(report, indent=2))
print('KHALIL_RIG_REPORT', json.dumps(report))
