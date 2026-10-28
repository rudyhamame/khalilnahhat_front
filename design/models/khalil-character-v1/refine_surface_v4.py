"""Photo-projected surface draft and glTF-safe materials; not final likeness approval.

Original portraits remain unchanged. Projection is baked to the model's UV layout
using Blender, so the browser gets a real skinned mesh, not an image billboard.
"""
import bpy
import json
import sys
from mathutils.bvhtree import BVHTree
from pathlib import Path
from bl_ext.user_default.mpfb.services.humanservice import HumanService
from bl_ext.user_default.mpfb.services.locationservice import LocationService
from bl_ext.user_default.mpfb.services.targetservice import TargetService

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'mpfb-draft'
revision = 'v6' if '--hair-pass' in sys.argv else ('v5' if '--profile-pass' in sys.argv else 'v4')
bpy.ops.wm.open_mainfile(filepath=str(OUT / 'khalil-mpfb-reference-workspace-v3.blend'))
scene = bpy.context.scene
body = bpy.data.objects['Khalil_BODY_LIKENESS_NOT_APPROVED']
rig = next(o for o in scene.objects if o.type == 'ARMATURE')
original_bones = len(rig.data.bones)
original_vertices = len(body.data.vertices)
rig.data.pose_position = 'REST'

if revision in {'v5','v6'}:
    # Editable conservative corrections, not a calibrated reconstruction.
    profile_targets = {'nose-scale-depth-incr':0.42, 'nose-trans-forward':0.30,
        'nose-curve-convex':0.20, 'chin-prominent-incr':0.30,
        'chin-width-decr':0.0, 'head-scale-horiz-decr':0.02,
        'head-scale-depth-incr':0.12, 'forehead-trans-forward':0.10}
    for name,value in profile_targets.items():
        key=body.data.shape_keys.key_blocks.get(name)
        if key is not None:key.value=value
        else:TargetService.load_target(body,TargetService.target_full_path(name),weight=value,name=name)
    bpy.context.view_layer.update()
    HumanService.refit(body)

old_hair = next(o for o in scene.objects if o.type=='MESH' and 'short04' in o.name)
HumanService.unload_mhclo_asset(body,old_hair)
hair = HumanService.add_mhclo_asset(str(Path(LocationService.get_user_data())/'hair/short02/short02.mhclo'),
    body,asset_type='Hair',subdiv_levels=1)
if revision in {'v5','v6'}:
    # Reduce the library groom's helmet-like volume and pull its fringe back.
    # Apply consistently to every key so a relative shape does not undo the edit.
    blocks=hair.data.shape_keys.key_blocks if hair.data.shape_keys else []
    collections=[k.data for k in blocks] if blocks else [hair.data.vertices]
    for vertices in collections:
        for vertex in vertices:
            co=vertex.co
            co.x *= 0.985
            if co.z>1.59:co.z=1.59+(co.z-1.59)*0.88
            if co.y < -0.07 and co.z>1.56:
                co.y += min(0.021,max(0,(co.z-1.56)*0.45))
            if revision=='v6':
                # Extend temple coverage, retaining the existing weighted topology.
                temple=max(0,1-abs(co.z-1.565)/0.035)*max(0,min(1,(abs(co.x)-0.04)/0.025))
                if -0.10<co.y<0.01:
                    co.z-=0.009*temple
                    co.y+=0.008*temple
                # Pull the low central fringe upward/back to expose the forehead.
                if co.y< -0.075 and co.z<1.615 and abs(co.x)<0.045:
                    co.y+=0.012
                    co.z+=0.006
    bpy.context.view_layer.update()
    scalp=BVHTree.FromObject(body,bpy.context.evaluated_depsgraph_get())
    for vertices in collections:
        for vertex in vertices:
            point,normal,_,distance=scalp.find_nearest(vertex.co)
            if point is not None and distance<0.04 and vertex.co.z>1.55:
                clearance=(vertex.co-point).dot(normal)
                if clearance<0.003:vertex.co=point+normal*0.003
brows = next(o for o in scene.objects if o.type=='MESH' and 'eyebrow001' in o.name)
# The actual eyebrows are in the supplied photo; do not overlay the mismatched stock pair.
brows.hide_render=True
brows.hide_set(True)

def pbr(name,image=None,color=(1,1,1,1),roughness=0.65,alpha=False):
    mat=bpy.data.materials.new(name)
    mat.use_nodes=True
    nodes=mat.node_tree.nodes; links=mat.node_tree.links
    shader=nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=color
    shader.inputs['Roughness'].default_value=roughness
    shader.inputs['Metallic'].default_value=0
    if image:
        tex=nodes.new('ShaderNodeTexImage');tex.image=image
        links.new(tex.outputs['Color'],shader.inputs['Base Color'])
        if alpha:
            links.new(tex.outputs['Alpha'],shader.inputs['Alpha'])
            mat.surface_render_method='DITHERED'
    mat.diffuse_color=color
    return mat

def existing_image(obj):
    return next(n.image for mat in obj.data.materials if mat and mat.use_nodes
                for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image)

eyes=next(o for o in scene.objects if o.type=='MESH' and 'high-poly' in o.name)
if revision=='v6':
    # One eye surface per socket avoids the overlapping cornea/iris shells.
    HumanService.unload_mhclo_asset(body,eyes)
    eyes=HumanService.add_mhclo_asset(str(Path(LocationService.get_user_data())/'eyes/low-poly/low-poly.mhclo'),
        body,asset_type='Eyes',subdiv_levels=1)
eye_image=existing_image(eyes)
eyes.data.materials.clear()
eyes.data.materials.append(pbr('Eyes — direct PBR brown iris',eye_image,roughness=0.28))
hair_image=existing_image(hair)
hair.data.materials.clear()
hair.data.materials.append(pbr('Short wavy brown — temporary groom',hair_image,roughness=0.8,alpha=True))
if revision=='v6':
    # Correct the stock green cast with a shader bake, leaving source images intact.
    hm=bpy.data.materials.new('Hair color correction bake');hm.use_nodes=True
    hn=hm.node_tree.nodes;hl=hm.node_tree.links;hn.clear()
    source=hn.new('ShaderNodeTexImage');source.image=hair_image
    gray=hn.new('ShaderNodeRGBToBW');hl.new(source.outputs['Color'],gray.inputs[0])
    tint=hn.new('ShaderNodeValToRGB')
    tint.color_ramp.elements[0].color=(0.018,0.009,0.005,1)
    tint.color_ramp.elements[1].position=0.65
    tint.color_ramp.elements[1].color=(0.23,0.115,0.060,1)
    hl.new(gray.outputs[0],tint.inputs[0])
    emission_h=hn.new('ShaderNodeEmission');hl.new(tint.outputs[0],emission_h.inputs[0])
    out_h=hn.new('ShaderNodeOutputMaterial');hl.new(emission_h.outputs[0],out_h.inputs['Surface'])
    corrected=bpy.data.images.new('Hair warm brown v6',width=2048,height=2048,alpha=False)
    bake_h=hn.new('ShaderNodeTexImage');bake_h.image=corrected;hn.active=bake_h
    hair.data.materials.clear();hair.data.materials.append(hm)
    bpy.ops.object.select_all(action='DESELECT');hair.select_set(True);bpy.context.view_layer.objects.active=hair
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1
    bpy.ops.object.bake(type='EMIT')
    corrected.filepath_raw=str(OUT/'hair-warm-brown-v6.png');corrected.file_format='PNG';corrected.save()
    hair.data.materials.clear();hair.data.materials.append(pbr('Hair — corrected warm brown',corrected,roughness=0.88))
    hmat=hair.data.materials[0]
    alpha_h=hmat.node_tree.nodes.new('ShaderNodeTexImage');alpha_h.image=hair_image
    hmat.node_tree.links.new(alpha_h.outputs['Alpha'],hmat.node_tree.nodes.get('Principled BSDF').inputs['Alpha'])
    hmat.surface_render_method='DITHERED'

base_image=bpy.data.images.get('young_lightskinned_male_diffuse.png')
front=bpy.data.images.load(str(ROOT/'references/khalil-front.png'),check_existing=True)
profile=bpy.data.images.load(str(ROOT/'references/khalil-profile.png'),check_existing=True)
scale=0.0002643597633849345
eye_z=1.5117613077163696
eye_y=-0.16336514055728912
mat=bpy.data.materials.new('Photographic projection — draft baking source')
mat.use_nodes=True
nodes=mat.node_tree.nodes;nodes.clear();links=mat.node_tree.links
def node(kind):return nodes.new(kind)
def math_node(operation,a,b=None):
    n=node('ShaderNodeMath');n.operation=operation
    for index,value in enumerate([a,b]):
        if value is not None:
            if isinstance(value,(int,float)):n.inputs[index].default_value=value
            else:links.new(value,n.inputs[index])
    return n.outputs[0]
def ramp(value,lo,hi):
    return math_node('MINIMUM',math_node('MAXIMUM',math_node('DIVIDE',math_node('SUBTRACT',value,lo),hi-lo),0),1)
geom=node('ShaderNodeNewGeometry')
xyz=node('ShaderNodeSeparateXYZ');links.new(geom.outputs['Position'],xyz.inputs[0])
norm=node('ShaderNodeSeparateXYZ');links.new(geom.outputs['Normal'],norm.inputs[0])
x,y,z=[xyz.outputs[a] for a in ['X','Y','Z']]
uv=node('ShaderNodeTexCoord')
base=node('ShaderNodeTexImage');base.image=base_image;links.new(uv.outputs['UV'],base.inputs['Vector'])
def project(image,u,v):
    coords=node('ShaderNodeCombineXYZ')
    links.new(u,coords.inputs['X']);links.new(v,coords.inputs['Y'])
    tex=node('ShaderNodeTexImage');tex.image=image;tex.extension='EXTEND'
    links.new(coords.outputs[0],tex.inputs['Vector'])
    return tex.outputs['Color']
front_u=math_node('DIVIDE',math_node('ADD',math_node('DIVIDE',x,scale),506.5),1010)
front_v=math_node('SUBTRACT',1,math_node('DIVIDE',math_node('ADD',592,math_node('DIVIDE',math_node('SUBTRACT',eye_z,z),scale)),1557))
profile_u=math_node('DIVIDE',math_node('SUBTRACT',727,math_node('DIVIDE',math_node('SUBTRACT',y,eye_y),scale)),1010)
profile_v=math_node('SUBTRACT',1,math_node('DIVIDE',math_node('ADD',578,math_node('DIVIDE',math_node('SUBTRACT',eye_z,z),scale)),1557))
front_color=project(front,front_u,front_v)
side_color=project(profile,profile_u,profile_v)
blend=node('ShaderNodeMixRGB');blend.blend_type='MIX'
front_weight=ramp(math_node('MULTIPLY',norm.outputs['Y'],-1),0.25,0.8)
links.new(front_weight,blend.inputs[0]);links.new(side_color,blend.inputs[1]);links.new(front_color,blend.inputs[2])
face_height=math_node('MULTIPLY',ramp(z,1.365,1.405),math_node('SUBTRACT',1,ramp(z,1.625,1.66)))
face_width=math_node('SUBTRACT',1,ramp(math_node('ABSOLUTE',x),0.050 if revision=='v6' else 0.065,0.061 if revision=='v6' else 0.08))
face_front=math_node('SUBTRACT',1,ramp(y,-0.115 if revision=='v6' else -0.10,-0.085 if revision=='v6' else -0.055))
mask=math_node('MULTIPLY',math_node('MULTIPLY',face_height,face_width),face_front)
final=node('ShaderNodeMixRGB');links.new(mask,final.inputs[0]);links.new(base.outputs['Color'],final.inputs[1]);links.new(blend.outputs[0],final.inputs[2])
surface_color=final.outputs[0]
if revision=='v6':
    # Separate sideburn/beard projection from the face so it reaches toward the ear
    # without reintroducing a photographic ear on top of the modeled one.
    beard_u=math_node('DIVIDE',math_node('SUBTRACT',727,math_node('DIVIDE',math_node('SUBTRACT',y,eye_y),0.00042)),1010)
    beard_color=project(profile,beard_u,profile_v)
    beard_side=ramp(math_node('ABSOLUTE',x),0.033,0.055)
    beard_height=math_node('MULTIPLY',ramp(z,1.375,1.40),math_node('SUBTRACT',1,ramp(z,1.49,1.51)))
    beard_back=math_node('SUBTRACT',1,ramp(y,-0.045,-0.018))
    beard_mask=math_node('MULTIPLY',math_node('MULTIPLY',beard_side,beard_height),beard_back)
    # The source ear occupies the left half of the profile image. Never bake it
    # into the sideburn extension, even where the modeled cheek mask overlaps.
    beard_mask=math_node('MULTIPLY',beard_mask,ramp(beard_u,0.49,0.54))
    beard_mix=node('ShaderNodeMixRGB');links.new(beard_mask,beard_mix.inputs[0])
    links.new(surface_color,beard_mix.inputs[1]);links.new(beard_color,beard_mix.inputs[2])
    surface_color=beard_mix.outputs[0]
emission=node('ShaderNodeEmission');links.new(surface_color,emission.inputs['Color'])
output=node('ShaderNodeOutputMaterial');links.new(emission.outputs[0],output.inputs['Surface'])
body.data.materials.clear();body.data.materials.append(mat)
for polygon in body.data.polygons:polygon.material_index=0
texture=bpy.data.images.new('Khalil-photo-projection-'+revision,width=2048,height=2048,alpha=False)
target=node('ShaderNodeTexImage');target.image=texture;nodes.active=target
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1
scene.render.bake.margin=12
bpy.ops.object.bake(type='EMIT')
texture.filepath_raw=str(OUT/('khalil-photo-projection-'+revision+'.png'));texture.file_format='PNG';texture.save()
body.data.materials.clear();body.data.materials.append(pbr('Khalil photographic skin — projected draft',texture,roughness=0.72))
# The library iris UV orientation does not match the neutralized export reliably.
# Bake the supplied frontal eye color onto the existing weighted eyeballs instead.
links.new(front_color,emission.inputs['Color'])
iris=bpy.data.images.new('Khalil-photo-eyes-'+revision,width=1024,height=1024,alpha=False)
target.image=iris;nodes.active=target
eyes.data.materials.clear();eyes.data.materials.append(mat)
for polygon in eyes.data.polygons:polygon.material_index=0
bpy.ops.object.select_all(action='DESELECT');eyes.select_set(True);bpy.context.view_layer.objects.active=eyes
bpy.ops.object.bake(type='EMIT')
iris.filepath_raw=str(OUT/('khalil-photo-eyes-'+revision+'.png'));iris.file_format='PNG';iris.save()
eyes.data.materials.clear();eyes.data.materials.append(pbr('Khalil photo eye color — existing weighted eyeballs',iris,roughness=0.38))
body['surface_status']='Photo-projected UV texture; original photos unchanged; lighting is not fully de-lit; mirrored unseen-side inference'
body['likeness_status']='UNAPPROVED — shape, projection seams and temporary groom need review'
assert len(body.data.vertices)==original_vertices
assert len(rig.data.bones)==original_bones
rig.data.pose_position='POSE'
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/('khalil-surface-work-'+revision+'.blend')))

# Export deformation bones in neutral pose, not stale IK controller evaluations.
rig.data.pose_position='REST'
for pb in rig.pose.bones:
    for constraint in list(pb.constraints):pb.constraints.remove(constraint)
    pb.location=(0,0,0);pb.rotation_mode='XYZ';pb.rotation_euler=(0,0,0);pb.scale=(1,1,1)
rig.data.pose_position='POSE'
bpy.context.view_layer.update()
meshes=[o for o in scene.objects if o.type=='MESH' and o.parent==rig and o!=brows]
for obj in meshes:
    if obj.data.shape_keys:TargetService.bake_targets(obj)
    bpy.ops.object.select_all(action='DESELECT');obj.select_set(True);bpy.context.view_layer.objects.active=obj
    for modifier in list(obj.modifiers):
        if modifier.type in {'MASK','SUBSURF'}:
            if not modifier.show_viewport or (modifier.type=='SUBSURF' and modifier.levels==0):
                obj.modifiers.remove(modifier)
            else:
                bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
for obj in meshes:obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUT/('khalil-surface-review-'+revision+'.glb')),export_format='GLB',
    use_selection=True,export_skins=True,export_morph=False,export_animations=False)
(OUT/('surface-'+revision+'-notes.json')).write_text(json.dumps({
    'profileTargets':profile_targets if revision in {'v5','v6'} else {},
    'status':'UNAPPROVED PHOTO-PROJECTION DRAFT','bodyVerticesUnchanged':True,'boneCountUnchanged':True,
    'changes':['Direct PBR skin and iris materials','Original portraits projected and baked to real mesh UVs',
               'Stock slick hair replaced by temporary short wavy asset','Stock eyebrow overlay removed',
               'Neutral export clears controller constraints without modifying saved authoring rig'],
    'limitations':['Facial proportions still need fitting','Hair is a temporary library asset, not matched grooming',
                   'Photo lighting baked into color','Unseen side inferred by symmetry','Not an approved identity scan']
},indent=2))
print('SURFACE_EXPORTED',revision)
