"""Separate Shure handheld and BLX4 receiver, modeled from supplied front views.

Visible shapes/markings follow the references. Unseen rear details and physical
dimensions are not asserted. Exports contain geometry only, without studio lights.
"""
import bpy
import math
import sys
from pathlib import Path
from mathutils import Vector

OUT = Path(sys.argv[sys.argv.index('--') + 1])
OUT.mkdir(parents=True, exist_ok=True)

def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)

def mat(name, color, metal=0, rough=.4, glow=0):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (*color, 1)
    material.use_nodes = True
    shader = material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metal
    shader.inputs['Roughness'].default_value = rough
    if glow:
        shader.inputs['Emission Color'].default_value = (*color, 1)
        shader.inputs['Emission Strength'].default_value = glow
    return material

def palette():
    return (
        mat('Satin black body', (.012, .014, .016), .25, .32),
        mat('Silver grille wire', (.59, .62, .64), .87, .28),
        mat('Black acoustic foam', (.003, .004, .005), 0, .95),
        mat('Printed white lettering', (.85, .87, .84), 0, .5),
        mat('Green status indicator', (.35, .72, .025), .05, .28, .8),
        mat('Rubber control surface', (.008, .01, .012), 0, .65),
    )

def lathe(name, profile, material, steps=96):
    verts = [(r * math.cos(i * 2 * math.pi / steps), r * math.sin(i * 2 * math.pi / steps), z)
             for z, r in profile for i in range(steps)]
    faces = []
    for j in range(len(profile) - 1):
        for i in range(steps):
            a = j * steps + i
            b = j * steps + (i + 1) % steps
            faces.append((a, b, b + steps, a + steps))
    faces.extend([tuple(reversed(range(steps))), tuple(range((len(profile)-1)*steps, len(profile)*steps))])
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    for face in mesh.polygons:
        face.use_smooth = len(face.vertices) == 4
    return obj

def cylinder(name, location, radius, depth, material, front=False):
    bpy.ops.mesh.primitive_cylinder_add(vertices=80, radius=radius, depth=depth, location=location)
    obj = bpy.context.object
    obj.name = name
    if front:
        obj.rotation_euler.x = math.pi / 2
    obj.data.materials.append(material)
    bevel = obj.modifiers.new('Soft manufactured edge', 'BEVEL')
    bevel.width = min(.0004, radius / 8)
    bevel.segments = 3
    obj.modifiers.new('Surface normals', 'WEIGHTED_NORMAL')
    for face in obj.data.polygons:
        face.use_smooth = len(face.vertices) == 4
    return obj

def box(name, location, dimensions, material, bevel=.001):
    bpy.ops.mesh.primitive_cube_add(size=1, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    obj.data.materials.append(material)
    if bevel:
        mod = obj.modifiers.new('Rounded enclosure edge', 'BEVEL')
        mod.width = bevel
        mod.segments = 5
        obj.modifiers.new('Surface normals', 'WEIGHTED_NORMAL')
    return obj

def text(name, value, location, size, material, bold=False, center=False):
    curve = bpy.data.curves.new(name, 'FONT')
    curve.body = value
    curve.size = size
    curve.extrude = .000012
    curve.align_x = 'CENTER' if center else 'LEFT'
    if bold:
        curve.font = bpy.data.fonts.load('/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf')
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.pi / 2, 0, 0)
    obj.data.materials.append(material)
    return obj

def curve_wire(name, points, radius, material):
    curve = bpy.data.curves.new(name, 'CURVE')
    curve.dimensions = '3D'
    curve.bevel_depth = radius
    curve.bevel_resolution = 2
    spline = curve.splines.new('POLY')
    spline.points.add(len(points)-1)
    for p, coord in zip(spline.points, points):
        p.co = (*coord, 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj

def power_icon(x, y, z, radius, material):
    curve_wire('Power symbol ring', [(x + radius*math.sin(a), y, z + radius*math.cos(a))
        for a in [math.radians(42 + i*276/48) for i in range(49)]], radius*.10, material)
    curve_wire('Power symbol stem', [(x,y,z+radius*1.17),(x,y,z+radius*.15)], radius*.10, material)

def export(key):
    bpy.ops.object.select_all(action='SELECT')
    bpy.ops.wm.save_as_mainfile(filepath=str(OUT/(key+'.blend')), compress=True)
    for obj in list(bpy.context.selected_objects):
        bpy.context.view_layer.objects.active = obj
        if obj.type in {'FONT', 'CURVE'}:
            bpy.ops.object.select_all(action='DESELECT')
            obj.select_set(True)
            bpy.ops.object.convert(target='MESH')
    bpy.ops.object.select_all(action='SELECT')
    # Apply modifiers before joining so no individual enclosure/grille detail is lost.
    for obj in list(bpy.context.selected_objects):
        bpy.context.view_layer.objects.active = obj
        for modifier in list(obj.modifiers):
            bpy.ops.object.modifier_apply(modifier=modifier.name)
    bpy.context.view_layer.objects.active = next(o for o in bpy.context.selected_objects if o.type == 'MESH')
    bpy.ops.object.join()
    bpy.ops.export_scene.gltf(filepath=str(OUT/(key+'.glb')), export_format='GLB',
                              use_selection=True, export_apply=True, export_yup=True)

reset()
black, silver, foam, white, green, rubber = palette()
# Handle and lower battery sleeve, with the visible circumferential battery seam.
lathe('Lower battery sleeve', [(.001,.0118),(.002,.0135),(.007,.0135),(.009,.0165),
    (.012,.0176),(.0935,.0186),(.095,.0186)], black)
lathe('Battery seam', [(.095,.0184),(.0958,.0184)], rubber)
lathe('Upper transmitter handle', [(.0958,.0188),(.097,.0190),(.177,.0192),
    (.186,.0200),(.197,.0217),(.202,.0221)], black)
lathe('Silver lower grille collar', [(.202,.0221),(.206,.0235),(.2075,.0235)], silver)
# Real crossed wire geometry over dark foam; no blue identification ring.
bpy.ops.mesh.primitive_uv_sphere_add(segments=64, ring_count=40, radius=.0261, location=(0,0,.226))
bpy.context.object.name = 'Dark foam behind grille'
bpy.context.object.data.materials.append(foam)
verts, faces = [], []
strands, steps, sides = 52, 76, 5
for direction in (-1,1):
    for strand in range(strands):
        start = len(verts)
        for j in range(steps):
            theta = .025 + 2.32*j/(steps-1)
            phi = 2*math.pi*strand/strands + direction*1.62*theta
            radius = .027 + .00018*math.sin(theta*strands*1.62 + strand*math.pi)
            p = Vector((radius*math.sin(theta)*math.cos(phi), radius*math.sin(theta)*math.sin(phi), radius*math.cos(theta)))
            dt = .001
            q = Vector((radius*math.sin(theta+dt)*math.cos(phi+direction*1.62*dt),
                        radius*math.sin(theta+dt)*math.sin(phi+direction*1.62*dt), radius*math.cos(theta+dt)))
            tangent = (q-p).normalized()
            side = tangent.cross(p.normalized()).normalized()
            normal = side.cross(tangent).normalized()
            for k in range(sides):
                v = p + .00034*(math.cos(k*2*math.pi/sides)*normal + math.sin(k*2*math.pi/sides)*side)
                verts.append((v.x,v.y,v.z+.226))
            if j:
                for k in range(sides):
                    a = start+(j-1)*sides+k
                    b = start+(j-1)*sides+(k+1)%sides
                    faces.append((a,b,b+sides,a+sides))
mesh = bpy.data.meshes.new('Cross-woven silver microphone grille')
mesh.from_pydata(verts,[],faces)
mesh.update()
grille = bpy.data.objects.new('Cross-woven silver microphone grille',mesh)
bpy.context.collection.objects.link(grille)
mesh.materials.append(silver)
for face in mesh.polygons:
    face.use_smooth = True
lathe('Silver equatorial grille band', [(.2268,.0275),(.2291,.0275)], silver)
logo = text('SHURE handle logo','SHURE',(0,-.022,.1845),.0084,white,bold=True,center=True)
# Wrap the printed mark onto the tapered handle instead of letting its center
# disappear inside the cylinder or leaving a floating flat label.
bpy.ops.object.select_all(action='DESELECT')
logo.select_set(True)
bpy.context.view_layer.objects.active = logo
bpy.ops.object.convert(target='MESH')
logo = bpy.context.object
bpy.context.view_layer.update()
profile = [(.0958,.0188),(.097,.019),(.177,.0192),(.186,.020),(.197,.0217),(.202,.0221)]
for vertex in logo.data.vertices:
    point = logo.matrix_world @ vertex.co
    radius = profile[-1][1]
    for (z0,r0),(z1,r1) in zip(profile,profile[1:]):
        if z0 <= point.z <= z1:
            radius = r0+(r1-r0)*(point.z-z0)/(z1-z0)
            break
    point.y = -math.sqrt(max(.000001,radius*radius-point.x*point.x))-.00010
    vertex.co = logo.matrix_world.inverted() @ point
cylinder('Status LED surround',(0,-.01925,.1165),.0020,.00065,rubber,True)
cylinder('Green status LED',(0,-.0197,.1165),.00138,.00045,green,True)
cylinder('Power button bezel',(0,-.0194,.1050),.00615,.0010,black,True)
cylinder('Rubber power button',(0,-.02005,.1050),.0049,.00055,rubber,True)
icon = mat('Moulded power icon',(.045,.05,.055),0,.7)
power_icon(0,-.0204,.105,.00165,icon)
export('shure-wireless-microphone')

reset()
black, silver, foam, white, green, rubber = palette()
gloss = mat('Gloss black receiver fascia',(.005,.007,.009),.18,.2)
display = mat('Green display background',(.012,.045,.009),0,.25)
box('BLX4 rounded enclosure',(0,0,.026),(.188,.103,.041),black,.009)
box('Receiver top cover',(0,0,.048),(.184,.100,.007),black,.005)
box('Receiver glossy front panel',(0,-.052,.025),(.177,.003,.029),gloss,.0025)
for x in (-.077,.077):
    for y in (-.037,.037):
        box('Rubber base foot',(x,y,.003),(.015,.018,.006),rubber,.002)
text('Receiver SHURE logo','SHURE',(-.080,-.054,.029),.0093,white,bold=True)
text('Receiver model label','BLX4',(-.079,-.054,.020),.0039,white)
for x,label in [(-.033,'audio'),(-.019,'ready')]:
    text(label+' label',label,(x,-.054,.038),.003,white,center=True)
    cylinder(label+' green indicator',(x,-.054,.021),.00135,.0008,green,True)
box('Single receiver display',(.008,-.054,.024),(.028,.001,.021),display,.001)
segments = {'A':[0,1,2,4,5,6], '1':[1,2]}
for character,cx in [('A',.0002),('1',.0133)]:
    for seg in segments[character]:
        xx,zz,w,h=[(0,.007,.007,.0012),(.0042,.0035,.0012,.0058),(.0042,-.0035,.0012,.0058),
            (0,-.007,.007,.0012),(-.0042,-.0035,.0012,.0058),(-.0042,.0035,.0012,.0058),(0,0,.007,.0012)][seg]
        box('Illuminated A1 display segment',(cx+xx,-.0548,.024+zz),(w,.0004,h),green,.00018)
for x,label,sub in [(.040,'group','(A-Y)'),(.057,'channel','(0-9)')]:
    cylinder(label+' bezel',(x,-.054,.022),.0050,.0012,black,True)
    cylinder(label+' button',(x,-.055,.022),.0039,.0010,rubber,True)
    text(label+' label',label,(x,-.054,.039),.0028,white,center=True)
    text(label+' sublabel',sub,(x,-.054,.035),.0026,white,center=True)
cylinder('Receiver power bezel',(.079,-.054,.022),.0072,.0014,black,True)
cylinder('Receiver power button',(.079,-.0552,.022),.0057,.0012,rubber,True)
power_icon(.079,-.056,.022,.0028,mat('Moulded receiver power icon',(.045,.05,.055),0,.7))
text('Power label','power',(.079,-.054,.039),.0030,white,center=True)
# Keep the receiver low and wide, matching the supplied front photograph.
compress = ('BLX4 rounded enclosure','Receiver top cover','Receiver glossy front panel',
            'Rubber base foot','Single receiver display','Illuminated A1 display segment')
for obj in bpy.context.scene.objects:
    original_z = obj.location.z
    obj.location.z *= .70
    if obj.name.startswith(compress):
        obj.scale.z *= .70
    if obj.type == 'FONT' and original_z >= .035:
        obj.location.z -= .0016
    if obj.type == 'CURVE':
        for spline in obj.data.splines:
            for point in spline.points:
                point.co.z -= .022*.30
export('shure-wireless-receiver')
