"""First visual-reference shape pass. Not a scan, fitted measurement, or approved likeness.

Uses the front/profile portraits supplied in chat on 2026-10-26.
Their local originals are still needed for aligned references and texture projection.
"""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector, Quaternion
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'mpfb-draft'
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'khalil-mpfb-editable-v1.blend'))
body = next(o for o in bpy.context.scene.objects if o.name == 'Khalil_BODY_LIKENESS_NOT_APPROVED')
rig = next(o for o in bpy.context.scene.objects if o.type == 'ARMATURE')
scene = bpy.context.scene
before_topology = (len(body.data.vertices), len(body.data.polygons))
before_groups = len(body.vertex_groups)

# Conservative, editable shape hypotheses from visible references, not landmark fitting.
# Neutral expression is retained: the smile will be a separate later expression.
adjustments = {
    'head-oval': 0.32,
    'head-scale-horiz-decr': 0.08,
    'head-scale-vert-incr': 0.12,
    'chin-width-decr': 0.04,
    'chin-height-incr': 0.16,
    'chin-prominent-incr': 0.18,
    'nose-trans-forward': 0.24,
    'nose-scale-depth-incr': 0.22,
    'nose-width1-incr': 0.13,
    'nose-point-width-incr': 0.12,
    'nose-curve-convex': 0.12,
    'nose-point-down': 0.08,
    'mouth-scale-horiz-incr': 0.16,
    'mouth-lowerlip-volume-incr': 0.18,
    'mouth-upperlip-volume-incr': 0.08,
    'forehead-scale-vert-incr': 0.12,
    'l-eye-height1-incr': 0.1,
    'r-eye-height1-incr': 0.1,
}
loaded = {}
for name, value in adjustments.items():
    path = TargetService.target_full_path(name)
    if not path:
        raise ValueError('Missing target: ' + name)
    key = body.data.shape_keys.key_blocks.get(name)
    if key is not None:
        key.value = value
    else:
        TargetService.load_target(body, path, weight=value, name=name)
    loaded[name] = value
bpy.context.view_layer.update()
HumanService.refit(body)
assert before_topology == (len(body.data.vertices), len(body.data.polygons))
assert before_groups == len(body.vertex_groups)
assert any(m.type == 'ARMATURE' and m.object == rig for m in body.modifiers)

# Fix v1's jagged material boundary: classify entire disconnected garment pieces.
outfit = next(o for o in scene.objects if o.type == 'MESH' and 'casualsuit02' in o.name)
parents = list(range(len(outfit.data.vertices)))
def root(i):
    while parents[i] != i:
        parents[i] = parents[parents[i]]
        i = parents[i]
    return i
for edge in outfit.data.edges:
    a, b = edge.vertices
    parents[root(a)] = root(b)
heights = {}
for vertex in outfit.data.vertices:
    key = root(vertex.index)
    heights[key] = max(heights.get(key, -100), vertex.co.z)
for poly in outfit.data.polygons:
    poly.material_index = 0 if heights[root(poly.vertices[0])] > 1.18 else 1

body['reference_status'] = 'Front and profile visible in chat; original image files pending'
body['likeness_status'] = 'First manual shape pass only; no photo texture, beard, or matched hair yet'
scene['review_status'] = 'UNAPPROVED — geometry review only, not a realistic final character'
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            space = area.spaces.active
            space.region_3d.view_distance = 1.0
            space.region_3d.view_location = Vector((0, 0, 1.56))
            space.region_3d.view_rotation = Quaternion((1, 0, 0), math.pi / 2)
            space.shading.type = 'SOLID'
            space.shading.color_type = 'MATERIAL'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'khalil-mpfb-face-shape-v2.blend'))
(OUT / 'face-shape-v2-notes.json').write_text(json.dumps({
    'status':'UNAPPROVED visual-reference approximation, not a reconstructed identity',
    'targets':loaded, 'topologyUnchanged': True, 'vertexGroupsUnchanged': True,
    'originalRigPreserved': True,
    'remaining':['Load local originals as aligned references','Iterative landmark alignment',
                 'Hairline and wavy hair','Beard and moustache','Skin and eye textures',
                 'Final likeness approval','Repeat deformation and GLB round-trip checks']
}, indent=2))

# Isolate shape review from the stock skin and mismatched stock hair.
clay = bpy.data.materials.new('Neutral clay — geometry review only')
clay.use_nodes = True
shader = clay.node_tree.nodes.get('Principled BSDF')
shader.inputs['Base Color'].default_value = (0.32,0.35,0.36,1)
shader.inputs['Roughness'].default_value = 0.8
for obj in scene.objects:
    if obj.type == 'MESH' and 'short04' in obj.name:
        obj.hide_render = True
scene.view_layers[0].material_override = clay
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_x = 640
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
world = bpy.data.worlds.new('Shape review studio')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.12,0.14,0.15,1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.4
scene.world = world
def aim(obj, point):
    obj.rotation_euler = (Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
for name, location, energy, size in [('Key',(-2,-3,3),220,3),('Fill',(2,-1,2),80,2)]:
    data = bpy.data.lights.new(name,'AREA')
    data.energy, data.size = energy, size
    obj = bpy.data.objects.new(name,data)
    scene.collection.objects.link(obj)
    obj.location = location
    aim(obj,(0,0,1.55))
camera = bpy.data.objects.new('Shape review camera',bpy.data.cameras.new('Shape review camera'))
scene.collection.objects.link(camera)
camera.data.type = 'ORTHO'
camera.data.ortho_scale = 0.43
scene.camera = camera
for label, location in [('front',(0,-3,1.55)),('profile',(3,0,1.55))]:
    camera.location = location
    aim(camera,(0,0,1.55))
    scene.render.filepath = str(OUT / ('face-shape-v2-' + label + '.png'))
    bpy.ops.render.render(write_still=True)
print('V2_SHAPE_REVIEW_READY')
