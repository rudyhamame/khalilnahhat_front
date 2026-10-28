"""Pack unaltered portrait copies into a separate Blender reference workspace.

Initial alignment uses manually read eye centers, not calibrated cameras or a scan.
The right-facing photo is an approximate profile; perspective remains uncorrected.
"""
import bpy
import hashlib
import json
import math
from pathlib import Path
from mathutils import Vector, Quaternion

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'mpfb-draft'
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'khalil-mpfb-face-shape-v2.blend'))
scene = bpy.context.scene
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
before = {'bones':len(rig.data.bones), 'meshes':{
    o.name:len(o.data.vertices) for o in scene.objects if o.type == 'MESH'}}
collection = bpy.data.collections.new('PORTRAIT REFERENCES — originals unchanged')
scene.collection.children.link(collection)
eye_l = rig.matrix_world @ rig.data.bones['eye.L'].tail_local
eye_r = rig.matrix_world @ rig.data.bones['eye.R'].tail_local
eye_center = (eye_l+eye_r)/2
scale = abs(eye_l.x-eye_r.x)/223.0
records = []
for filename, label, eye_pixel, orientation in [
    ('khalil-front.png','FRONT — original neutral portrait',(506.5,592),'FRONT'),
    ('khalil-profile.png','PROFILE — original right-facing portrait',(727,578),'PROFILE'),
]:
    path = ROOT / 'references' / filename
    img = bpy.data.images.load(str(path),check_existing=True)
    width,height = img.size
    obj = bpy.data.objects.new(label,None)
    collection.objects.link(obj)
    obj.empty_display_type = 'IMAGE'
    obj.data = img
    obj.empty_display_size = max(width,height)*scale
    obj.color[3] = 0.35
    obj.empty_image_depth = 'BACK'
    obj.show_empty_image_perspective = False
    obj.show_empty_image_orthographic = True
    obj.empty_image_side = 'FRONT'
    obj.hide_render = True
    obj['alignment'] = 'Initial eye-level/eye-spacing alignment; not calibrated or fully fitted'
    center_z = eye_center.z+(eye_pixel[1]-height/2)*scale
    if orientation == 'FRONT':
        obj.rotation_euler = (math.pi/2,0,0)
        obj.location = (-(eye_pixel[0]-width/2)*scale,0.18,center_z)
    else:
        # Local image right maps to world -Y, matching a right-facing profile.
        obj.rotation_euler = (math.pi/2,0,-math.pi/2)
        obj.location = (-0.18,eye_center.y+(eye_pixel[0]-width/2)*scale,center_z)
    img.pack()
    records.append({'file':filename,'width':width,'height':height,
                    'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),
                    'eyePixelEstimate':eye_pixel,'metersPerPixelEstimate':scale})

# Hide old side-by-side reference empties to avoid confusing them with the new portraits.
for obj in scene.objects:
    if obj.type == 'EMPTY' and obj not in list(collection.objects):
        obj.hide_set(True)
for screen in bpy.data.screens:
    for area in screen.areas:
        if area.type == 'VIEW_3D':
            space = area.spaces.active
            space.region_3d.view_perspective = 'ORTHO'
            space.region_3d.view_rotation = Quaternion((1,0,0),math.pi/2)
            space.region_3d.view_location = Vector((0,0,1.5))
            space.region_3d.view_distance = 0.7
            space.shading.type = 'SOLID'
            space.overlay.show_bones = False
body = bpy.data.objects.get('Khalil_BODY_LIKENESS_NOT_APPROVED')
body['reference_status'] = 'Unmodified original front/profile portraits copied, packed and initially aligned'
scene['reference_review'] = 'Geometry fit, hair, beard and photo textures remain unfinished'
after = {'bones':len(rig.data.bones), 'meshes':{
    o.name:len(o.data.vertices) for o in scene.objects if o.type == 'MESH'}}
assert before == after, 'Loading references must not change the rig or geometry'
bpy.ops.wm.save_as_mainfile(filepath=str(OUT / 'khalil-mpfb-reference-workspace-v3.blend'))
(ROOT / 'references' / 'manifest.json').write_text(json.dumps({
    'copiedUnchanged':True,'referenceWorkspace':'../mpfb-draft/khalil-mpfb-reference-workspace-v3.blend',
    'images':records,'geometryAndBoneCountsUnchanged':True,
    'limitations':'Eye centers read manually; no lens correction, camera solve, photo texture or final likeness approval'
},indent=2))
print('PORTRAIT_REFERENCES_PACKED',json.dumps(records))
