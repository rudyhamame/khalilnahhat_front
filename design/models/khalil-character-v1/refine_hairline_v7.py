"""Hair-only contour correction; retain face, eye, beard and skin from v6."""
import bpy
import math
import json
from pathlib import Path
from mathutils.bvhtree import BVHTree
from bl_ext.user_default.mpfb.services.targetservice import TargetService

OUT=Path(__file__).resolve().parent/'mpfb-draft'
bpy.ops.wm.open_mainfile(filepath=str(OUT/'khalil-surface-work-v6.blend'))
scene=bpy.context.scene
rig=next(o for o in scene.objects if o.type=='ARMATURE')
body=bpy.data.objects['Khalil_BODY_LIKENESS_NOT_APPROVED']
hair=next(o for o in scene.objects if o.type=='MESH' and 'short02' in o.name)
assert not any('eyelashes01' in o.name and o.type=='MESH' for o in scene.objects)
before=len(hair.data.vertices)
rig.data.pose_position='REST'
scalp=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get())
def smooth(a,b,v):
    t=max(0,min(1,(v-a)/(b-a)))
    return t*t*(3-2*t)
changed=0
for vertex in hair.data.vertices:
    co=vertex.co
    front=smooth(0.07,0.12,-co.y)
    central=1-smooth(0.048,0.069,abs(co.x))
    low=1-smooth(1.59,1.625,co.z)
    weight=front*central*low
    if weight<0.001:continue
    # Lift a low fringe off the forehead, with a slightly higher temple contour.
    temple=math.exp(-((abs(co.x)-0.043)/0.019)**2)
    co.z+=(0.024+0.006*temple)*weight
    co.y+=0.010*weight
    changed+=1
    point,normal,_,distance=scalp.find_nearest(co)
    if point is not None and distance<0.035 and (co-point).dot(normal)<0.003:
        vertex.co=point+normal*0.003
assert len(hair.data.vertices)==before
assert changed>0
# Keep the sculpted contour continuous rather than collapsing fringe vertices
# onto a flat threshold; add actual strand normal detail to the stock cap.
from bl_ext.user_default.mpfb.services.locationservice import LocationService
normal_path=Path(LocationService.get_user_data())/'hair/short02/short02_normal.png'
hair_mat=hair.data.materials[0]
shader=hair_mat.node_tree.nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value=0.95
shader.inputs['Specular IOR Level'].default_value=0.12
if normal_path.exists():
    normal_image=bpy.data.images.load(str(normal_path),check_existing=True)
    normal_image.colorspace_settings.name='Non-Color'
    tex=hair_mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=normal_image
    normal=hair_mat.node_tree.nodes.new('ShaderNodeNormalMap');normal.inputs['Strength'].default_value=0.55
    hair_mat.node_tree.links.new(tex.outputs['Color'],normal.inputs['Color'])
    hair_mat.node_tree.links.new(normal.outputs['Normal'],shader.inputs['Normal'])
hair['hairline_revision']='Raised forehead fringe and shaped receding temples; sideburn topology retained'
rig.data.pose_position='POSE'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'khalil-hairline-work-v7.blend'))

# Export without changing anything else in the authoring source.
rig.data.pose_position='REST'
for pb in rig.pose.bones:
    for constraint in list(pb.constraints):pb.constraints.remove(constraint)
    pb.location=(0,0,0);pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.scale=(1,1,1)
rig.data.pose_position='POSE'
bpy.context.view_layer.update()
meshes=[o for o in scene.objects if o.type=='MESH' and o.parent==rig and not o.hide_render]
for obj in meshes:
    if obj.data.shape_keys:TargetService.bake_targets(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    for modifier in list(obj.modifiers):
        if modifier.type in {'MASK','SUBSURF'}:
            if not modifier.show_viewport or (modifier.type=='SUBSURF' and modifier.levels==0):obj.modifiers.remove(modifier)
            else:bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
for obj in meshes:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/'khalil-hairline-review-v7.glb'),export_format='GLB',
    use_selection=True,export_skins=True,export_morph=False,export_animations=False)
(OUT/'hairline-v7-notes.json').write_text(json.dumps({
    'hairVerticesAdjusted':changed,'hairTopologyUnchanged':True,
    'faceAndEyeAndBeardUnchanged':True,'addedEyelashesAbsent':True,
    'status':'Hairline contour revision, not a final groom or approved likeness'
},indent=2))
print('HAIRLINE_V7_EXPORTED',changed)
