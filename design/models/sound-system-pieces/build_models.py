"""Four individually rentable, photo-guided sound equipment types.
Run: blender -b -P build_models.py -- OUTPUT_DIR
Geometry is illustrative; dimensions and exact manufacturer models are unverified.
"""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
source=(Path(__file__).parent/'../equipment-batch/build_models.py').read_text()
exec(source[:source.index('# Sparklers')])
exec(source[source.index('def speaker'):source.index("speaker('Left small sub'")])

def pole_speaker():
    # Pole inserts into a subwoofer socket, as in the photo; no tripod base.
    cyl('Mounting pole',(0,.03,.35),.009,.70,black)
    cyl('Height adjustment collar',(0,.03,.36),.016,.06,steel)
    cyl('Upper pole coupling',(0,.03,.66),.015,.06,steel)
    speaker('Pole-mounted loudspeaker',(0,.03,.70),.28,.47,.25)

def subwoofer():
    speaker('Subwoofer',(0,0,0),.40,.53,.39)
    cyl('Top pole socket',(0,0,.532),.014,.005,dark)

def tower():
    speaker('Floor-standing double-driver loudspeaker',(0,0,0),.32,.85,.32,2)

def monitor():
    verts=[(-.18,-.28,.015),(.18,-.28,.015),(.18,.02,.015),(-.18,.02,.015),(-.18,-.28,.075),(.18,-.28,.075),(.18,.02,.23),(-.18,.02,.23)]
    mesh=bpy.data.meshes.new('Wedge enclosure');mesh.from_pydata(verts,[],[(0,3,2,1),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7),(4,5,6,7)]);mesh.update()
    obj=bpy.data.objects.new('Wedge floor monitor',mesh);bpy.context.collection.objects.link(obj);obj.data.materials.append(black)
    angle=math.atan2(.155,.30)
    o=box('Sloped monitor grille',(0,-.13,.159),(.33,.32,.008),dark,.005);o.rotation_euler[0]=angle
    for i in range(29):
        o=box('Monitor grille wire',(-.155+i*.011,-.13,.165),(.0015,.31,.0015),black,0);o.rotation_euler[0]=angle
    for i in range(27):
        yy=-.265+i*.010;zz=.087+(yy+.28)*.155/.30
        box('Monitor cross grille wire',(0,yy,zz),(.32,.001,.001),black,0)
    box('Side connector plate',(-.181,-.11,.075),(.003,.10,.06),dark,.005)

for key,build,target,scale in [
 ('pole-mounted-speaker',pole_speaker,(0,0,.58),1.65),
 ('sound-system-subwoofer',subwoofer,(0,0,.26),.88),
 ('floor-standing-speaker',tower,(0,0,.42),1.22),
 ('wedge-floor-monitor',monitor,(0,-.1,.12),.65),
]:
    reset();build()
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(key+'.blend')),compress=True)
    bpy.ops.export_scene.gltf(filepath=str(OUT/(key+'.glb')),export_format='GLB',use_selection=True,export_apply=True)
    scene=bpy.context.scene;scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
    for pos,power in [((2,-3,4),450),((-3,-1,2),300),((1,3,3),400)]:
        bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=3;light.rotation_euler=(Vector(target)-light.location).to_track_quat('-Z','Y').to_euler()
    bpy.ops.object.camera_add(location=Vector(target)+Vector((scale*.8,-scale*1.5,scale*.55)))
    camera=bpy.context.object;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=scale;scene.camera=camera
    scene.render.engine='CYCLES';scene.cycles.samples=12;scene.render.film_transparent=True
    scene.render.resolution_x=700;scene.render.resolution_y=700;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(OUT/(key+'-preview.png'));bpy.ops.render.render(write_still=True)
    print('EXPORTED',key,flush=True)
