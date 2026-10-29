import bpy, numpy as np, math, json
from pathlib import Path
d=np.load('work/strands.npz'); cam_j=json.load(open('work/cam.json')); mid=np.array(cam_j['mid'])
for o in [o for o in bpy.data.objects if o.name in ('Khalil_hair','Khalil_beard')]: bpy.data.objects.remove(o)
def make(name,v,f,c):
    me=bpy.data.meshes.new(name); me.vertices.add(len(v)); me.vertices.foreach_set('co',v.ravel())
    me.loops.add(len(f)*3); me.loops.foreach_set('vertex_index',f.ravel())
    me.polygons.add(len(f)); me.polygons.foreach_set('loop_start',np.arange(0,len(f)*3,3)); me.polygons.foreach_set('loop_total',np.full(len(f),3))
    me.update(); me.validate()
    ca=me.color_attributes.new('Col','FLOAT_COLOR','POINT'); ca.data.foreach_set('color',np.c_[c,np.ones(len(c))].ravel())
    me.polygons.foreach_set('use_smooth',np.ones(len(f),bool))
    mat=bpy.data.materials.new(name+'_mat'); mat.use_nodes=True; nt=mat.node_tree; b=nt.nodes['Principled BSDF']
    a=nt.nodes.new('ShaderNodeVertexColor'); a.layer_name='Col'; nt.links.new(a.outputs['Color'],b.inputs['Base Color'])
    b.inputs['Roughness'].default_value=.55; b.inputs['Specular IOR Level'].default_value=.5
    try: b.inputs['Coat Weight'].default_value=0.0
    except Exception: pass
    me.materials.append(mat); o=bpy.data.objects.new(name,me); bpy.context.scene.collection.objects.link(o); return o
make('Khalil_hair',d['hair_v'],d['hair_f'],d['hair_c']); make('Khalil_beard',d['beard_v'],d['beard_f'],d['beard_c'])
sc=bpy.context.scene; sc.render.engine='BLENDER_WORKBENCH'; sh=sc.display.shading; sh.light='STUDIO'; sh.color_type='VERTEX'; sh.background_type='VIEWPORT'; sh.background_color=(.62,.66,.72)
# body keeps its photo texture in Workbench via per-object colour: switch body to TEXTURE by using material colour mode is global, so render body+strands separately via shading overrides
sh.color_type='MATERIAL'
sc.render.resolution_x=cam_j['W']; sc.render.resolution_y=cam_j['H']
cam=bpy.data.objects.get('cam') or bpy.data.objects.new('cam',bpy.data.cameras.new('cam'))
if cam.name not in sc.collection.objects: sc.collection.objects.link(cam)
sc.camera=cam; cam.data.type='ORTHO'; cam.data.ortho_scale=0.40
def shot(name,loc,rot):
    cam.location=loc; cam.rotation_euler=rot; sc.render.filepath=str(Path(f'work/{name}.png').resolve()); bpy.ops.render.render(write_still=True)
shot('hair-front',(mid[0],mid[1]-1.5,mid[2]-0.02),(math.radians(90),0,0))
shot('hair-profile',(mid[0]-1.5,mid[1],mid[2]-0.02),(math.radians(90),0,math.radians(-90)))
bpy.ops.wm.save_as_mainfile(filepath=str(Path('out/khalil-full-v2.blend').resolve()))
# bake shape-key mixes (macro + fitted face targets) into plain meshes for export
exp=[]
for o in list(bpy.data.objects):
    if o.type=='MESH' and (o.name.startswith('Khalil_fit_v2') or o.name in ('Khalil_hair','Khalil_beard')):
        if o.data.shape_keys:
            bpy.ops.object.select_all(action='DESELECT'); o.select_set(True); bpy.context.view_layer.objects.active=o
            bpy.ops.object.shape_key_remove(all=True,apply_mix=True)
        exp.append(o)
bpy.ops.object.select_all(action='DESELECT')
for o in exp: o.select_set(True)
bpy.context.view_layer.objects.active=exp[0]
print('EXPORT',[o.name for o in exp])
bpy.ops.export_scene.gltf(filepath=str(Path('out/khalil-full-v2.glb').resolve()),use_selection=True,export_format='GLB',export_image_format='JPEG',export_jpeg_quality=90,export_apply=True,export_vertex_color='MATERIAL' if hasattr(bpy.types,'x') else 'ACTIVE')
print('DONE')
