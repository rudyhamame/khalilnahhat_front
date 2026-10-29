import bpy, math, json, numpy as np
from pathlib import Path
body=bpy.data.objects['Khalil_fit_v2']
img=bpy.data.images.load(str(Path('out/khalil-skin-v2.png').resolve())); img.pack()
mat=bpy.data.materials.new('Khalil_photo_skin'); mat.use_nodes=True
nt=mat.node_tree; bsdf=nt.nodes['Principled BSDF']; tex=nt.nodes.new('ShaderNodeTexImage'); tex.image=img
nt.links.new(tex.outputs['Color'],bsdf.inputs['Base Color']); bsdf.inputs['Roughness'].default_value=.62
bsdf.inputs['Specular IOR Level'].default_value=.25
body.data.materials.clear(); body.data.materials.append(mat)
for p in body.data.polygons: p.material_index=0; p.use_smooth=True
cam_j=json.load(open('work/cam.json')); mid=np.array(cam_j['mid'])
sc=bpy.context.scene; sc.render.engine='BLENDER_WORKBENCH'; sh=sc.display.shading; sh.light='FLAT'; sh.color_type='TEXTURE'; sh.background_type='VIEWPORT'; sh.background_color=(.62,.66,.72)
sc.render.resolution_x=cam_j['W']; sc.render.resolution_y=cam_j['H']
cam=bpy.data.objects.get('cam') or bpy.data.objects.new('cam',bpy.data.cameras.new('cam')); 
if cam.name not in sc.collection.objects: sc.collection.objects.link(cam)
sc.camera=cam; cam.data.type='ORTHO'; cam.data.ortho_scale=0.36
def shot(name,loc,rot):
    cam.location=loc; cam.rotation_euler=rot; sc.render.filepath=str(Path(f'work/{name}.png').resolve()); bpy.ops.render.render(write_still=True)
shot('tex-front',(mid[0],mid[1]-1.5,mid[2]-0.045),(math.radians(90),0,0))
shot('tex-profile',(mid[0]-1.5,mid[1],mid[2]-0.045),(math.radians(90),0,math.radians(-90)))
cam.data.ortho_scale=0.36
d=1.5; a=math.radians(35)
shot('tex-34',(mid[0]-d*math.sin(a),mid[1]-d*math.cos(a),mid[2]-0.045),(math.radians(90),0,-a))
bpy.ops.wm.save_as_mainfile(filepath=str(Path('out/khalil-fit-v2-textured.blend').resolve()))
print('SAVED')
