"""Render catalog GLBs with consistent studio framing, preserving set placement."""
import bpy
import json
import math
import os
import sys
from pathlib import Path
from mathutils import Vector

manifest = Path(sys.argv[sys.argv.index('--') + 1])
items = json.loads(manifest.read_text())['items']
only = sys.argv[sys.argv.index('--') + 2:]

def bounds(objects):
    return [o.matrix_world @ Vector(c) for o in objects if o.type == 'MESH' for c in o.bound_box]

def material(name, color, roughness):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    return m

for item in items:
    if only and item['id'] not in only:
        continue
    if Path(item['image']).exists():
        continue
    bpy.ops.wm.read_factory_settings(use_empty=True)
    equipment = []
    for part in item['parts']:
        before = set(bpy.data.objects)
        bpy.ops.import_scene.gltf(filepath=part['file'])
        imported = list(set(bpy.data.objects) - before)
        meshes = [o for o in imported if o.type == 'MESH']
        bpy.context.view_layer.update()
        points = bounds(meshes)
        if not points:
            raise ValueError('No mesh for ' + item['id'])
        group = bpy.data.objects.new('Part placement', None)
        bpy.context.collection.objects.link(group)
        for obj in imported:
            if obj.parent is None:
                obj.parent = group
        if item['sourceParts']:
            low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
            high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
            center = (low + high) / 2
            offset = Vector((-center.x, -center.y, -low.z))
            group.rotation_euler.z = math.radians(part.get('rotation', 0) or 0)
            group.location = group.rotation_euler.to_matrix() @ offset + Vector((part.get('x', 0) or 0, -(part.get('z', 0) or 0), part.get('y', 0) or 0))
        equipment.extend(meshes)
    bpy.context.view_layer.update()
    points = bounds(equipment)
    low = Vector(tuple(min(p[i] for p in points) for i in range(3)))
    high = Vector(tuple(max(p[i] for p in points) for i in range(3)))
    size = high - low
    scale = 2.6 / max(size)
    origin = bpy.data.objects.new('Studio normalization', None)
    bpy.context.collection.objects.link(origin)
    roots = [o for o in bpy.context.scene.objects if o.parent is None and o != origin]
    for obj in roots:
        obj.parent = origin
    origin.scale = (scale,) * 3
    origin.location = Vector((-(low.x + high.x) / 2, -(low.y + high.y) / 2, -low.z)) * scale
    bpy.context.view_layer.update()
    points = bounds(equipment)
    target = Vector((0, 0, size.z * scale / 2))
    bpy.ops.object.camera_add(location=target + Vector((3.6, -7, 3.4)))
    camera = bpy.context.object
    camera.rotation_euler = (target - camera.location).to_track_quat('-Z', 'Y').to_euler()
    camera.data.type = 'ORTHO'
    rotation = camera.rotation_euler.to_matrix().transposed()
    projected = [rotation @ (p - target) for p in points]
    camera.data.ortho_scale = max(max(p[i] for p in projected) - min(p[i] for p in projected) for i in (0, 1)) / .74
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -.012))
    bpy.context.object.data.materials.append(material('Charcoal studio', (.025, .029, .034), .75))
    scene = bpy.context.scene
    scene.camera = camera
    scene.world = bpy.data.worlds.new('Studio ambient')
    scene.world.use_nodes = True
    scene.world.node_tree.nodes['Background'].inputs[0].default_value = (.34, .39, .45, 1)
    scene.world.node_tree.nodes['Background'].inputs[1].default_value = .35
    for name, location, energy, size, color in [
        ('Large softbox', (1, -4, 5), 650, 4, (1, .91, .8)),
        ('Front fill', (-4, -2, 3), 500, 4, (.78, .87, 1)),
        ('Edge softbox', (2, 3, 4), 900, 3, (.9, .95, 1)),
    ]:
        bpy.ops.object.light_add(type='AREA', location=location)
        light = bpy.context.object
        light.name = name
        light.data.energy = energy
        light.data.shape = 'DISK'
        light.data.size = size
        light.data.color = color
        light.rotation_euler = (target - light.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.engine = os.environ.get('ARTWORK_ENGINE', 'CYCLES')
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 1000
    scene.render.resolution_percentage = 100
    scene.view_settings.view_transform = 'AgX'
    scene.render.image_settings.file_format = 'PNG'
    scene.render.filepath = item['image']
    bpy.ops.render.render(write_still=True)
    print('ARTWORK_DONE ' + item['id'], flush=True)
