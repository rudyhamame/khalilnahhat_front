"""Reimport the exported GLB and test the actual shipped geometry and animation."""
import bpy
import json
import math
from pathlib import Path
from mathutils import Vector

OUT = Path(__file__).resolve().parent / 'mpfb-draft'
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(OUT / 'khalil-mpfb-rig-test-v1.glb'))
scene = bpy.context.scene
rigs = [o for o in scene.objects if o.type == 'ARMATURE']
assert len(rigs) == 1, 'Expected one exported skeleton'
# The importer also creates an Icosphere custom bone shape, which is not asset geometry.
meshes = [o for o in scene.objects if o.type == 'MESH' and o.parent == rigs[0]]
assert len(meshes) == 6
assert all(any(m.type == 'ARMATURE' for m in o.modifiers) for o in meshes)

def positions(obj):
    bpy.context.view_layer.update()
    evaluated = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    mesh = evaluated.to_mesh()
    result = [v.co.copy() for v in mesh.vertices]
    evaluated.to_mesh_clear()
    return result

scene.frame_set(1)
rest = {o.name: positions(o) for o in meshes}
scene.frame_set(32)
results = []
for o in meshes:
    posed = positions(o)
    distance = [(a-b).length for a,b in zip(rest[o.name], posed)]
    results.append({'object':o.name, 'vertices':len(posed),
                    'movedVertices':sum(d > 0.00001 for d in distance),
                    'maximumDisplacementMeters':max(distance),
                    'finite':all(math.isfinite(v) for p in posed for v in p)})
assert all(r['finite'] for r in results)
assert any(r['movedVertices'] > 100 for r in results)
assert any('casualsuit' in r['object'] and r['movedVertices'] > 100 for r in results)
report = {'reimportedGLB':True,'skeletons':len(rigs), 'bones':len(rigs[0].data.bones),
          'animationName':rigs[0].animation_data.action.name, 'frameComparison':[1,32],
          'meshes':results,'visualDeformationReview':'Pending; numerical movement is not anatomical quality approval'}
(OUT / 'export-validation.json').write_text(json.dumps(report, indent=2))
print('REIMPORT_VALIDATION', json.dumps(report))
scene.frame_set(1)

# CPU render works without a dedicated GPU; no cloud submission.
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = 24
scene.cycles.use_denoising = True
scene.render.resolution_x = 600
scene.render.resolution_y = 800
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = False
world = bpy.data.worlds.new('Neutral studio')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs[0].default_value = (0.13,0.16,0.15,1)
world.node_tree.nodes['Background'].inputs[1].default_value = 0.5
scene.world = world
def aim(obj, target):
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

for name, location, energy, size in [('Key',(-3,-4,4),450,4),('Fill',(3,-2,2),220,3),('Rim',(0,3,3),300,2)]:
    light = bpy.data.lights.new(name,'AREA')
    light.energy, light.shape, light.size = energy,'DISK',size
    obj = bpy.data.objects.new(name,light)
    scene.collection.objects.link(obj)
    obj.location = location
    aim(obj,(0,0,1))
camera_data = bpy.data.cameras.new('Review camera')
camera = bpy.data.objects.new('Review camera',camera_data)
scene.collection.objects.link(camera)
camera.location = (0,-4.3,1.2)
camera_data.type = 'ORTHO'
camera_data.ortho_scale = 2.1
aim(camera,(0,0,0.94))
scene.camera = camera
scene.render.filepath = str(OUT / 'draft-front.png')
bpy.ops.render.render(write_still=True)
scene.frame_set(32)
scene.render.filepath = str(OUT / 'draft-deformation-test.png')
bpy.ops.render.render(write_still=True)
