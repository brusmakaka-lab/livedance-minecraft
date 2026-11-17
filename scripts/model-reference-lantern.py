"""Editable block model based on the user's lamp photograph; no downloaded code.
Run with E:/blender/blender.exe -b --python scripts/model-reference-lantern.py
Texture atlas is assembled first by prepare-reference-lantern.py.
"""
import bpy, math, json, hashlib
from pathlib import Path
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[1]; OUT=ROOT/'public/assets/models/reference-lantern'
OUT.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
mat=bpy.data.materials.new('Piedra, roble, campana y linternas · atlas');mat.use_nodes=True
nodes=mat.node_tree.nodes; links=mat.node_tree.links; shader=nodes.get('Principled BSDF')
shader.inputs['Roughness'].default_value=.86
for name,socket in [('atlas.png','Base Color'),('emission.png','Emission Color')]:
 tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(OUT/name));tex.image.pack();tex.interpolation='Closest';links.new(tex.outputs['Color'],shader.inputs[socket])
shader.inputs['Emission Strength'].default_value=1.2
parts=[]
def cube(name,p,s,tile):
 bpy.ops.mesh.primitive_cube_add(size=1,location=p);o=bpy.context.object;o.name=name;o.dimensions=s
 bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat)
 # A 4x4 atlas, 32px tiles with a 2px gutter. Independent UVs per face.
 for poly in o.data.polygons:
  tile_id=tile[0 if poly.normal.z>.5 else 1] if isinstance(tile,list) else tile
  x=tile_id%4*36+2;y=tile_id//4*36+2
  for loop,uv in zip(poly.loop_indices,[(0,0),(1,0),(1,1),(0,1)]):o.data.uv_layers.active.data[loop].uv=((x+uv[0]*32)/144,1-(y+(1-uv[1])*32)/144)
 parts.append(o);return o
# Trapdoor base and a stone plinth, with an uninterrupted fence post.
cube('Base interior roble',(0,0,.56),(1.36,1.36,1.12),1)
for side in [-1,1]:
 cube('Trampilla base frente',(0,side*.72,.56),(1.5,.12,1.12),2)
 cube('Trampilla base lateral',(side*.72,0,.56),(.12,1.5,1.12),2)
cube('Tapa base',(0,0,1.16),(1.54,1.54,.12),2)
cube('Pedestal de piedra',(0,0,1.64),(.64,.64,.86),0)
cube('Remate pedestal',(0,0,2.08),(.72,.72,.10),0)
cube('Poste valla roble',(0,0,3.4),(.27,.27,2.64),3)
for z in [2.3,2.65,3,3.35,3.7,4.05,4.4]:cube('Junta poste',(0,-.145,z),(.28,.025,.055),1)
cube('Capitel de adoquines',(0,0,5.08),(1.04,1.04,.96),0)
cube('Losa inferior capitel',(0,0,4.61),(1.15,1.15,.16),0)
cube('Travesaño roble',(0,0,5.64),(4.16,.68,.18),2)
for x in [-.5,.5]:cube('Soporte piedra campana',(x,0,6.18),(.18,.38,1.0),0)
cube('Yugo madera campana',(0,0,6.62),(.94,.25,.14),1)
cube('Cabeza campana',(0,0,6.42),(.3,.3,.2),4)
cube('Cuerpo campana',(0,0,6.16),(.52,.48,.48),4)
cube('Labio campana',(0,0,5.91),(.70,.64,.13),4)
cube('Badajo',(0,0,5.8),(.12,.12,.12),5)
for side in [-1,1]:
 x=side*1.55
 # Alternating orthogonal rectangular chain links, not a floating lantern.
 for i in range(3):
  z=5.42-i*.15;axis=i%2
  for s in [-1,1]:cube('Cadena eslabón',(x+s*.065*(not axis),s*.065*axis,z),(.035 if not axis else .035,.035,.19),5)
  cube('Cadena unión',(x,0,z-.08),(.16 if not axis else .035,.035 if not axis else .16,.035),5)
 cube('Linterna cubierta',(x,0,4.92),(.57,.57,.13),6)
 cube('Linterna luz cálida',(x,0,4.57),(.44,.44,.58),7)
 cube('Linterna base',(x,0,4.26),(.57,.57,.12),6)
 for dx in [-.245,.245]:
  for dy in [-.245,.245]:cube('Linterna esquina hierro',(x+dx,dy,4.57),(.065,.065,.56),5)
cube('Clavija capitel',(0,-.54,5.1),(.13,.09,.13),5)
bpy.ops.object.select_all(action='DESELECT')
for p in parts:p.select_set(True)
bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();model=bpy.context.object;model.name='FarolReferencia_Campana_DosLinternas'
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
# Put origin at ground, which GLTF converts from Z-up to Three.js Y-up.
bpy.context.scene.cursor.location=(0,0,0);bpy.ops.object.origin_set(type='ORIGIN_CURSOR')
bpy.ops.export_scene.gltf(filepath=str(OUT/'lantern.glb'),export_format='GLB',use_selection=True,export_yup=True)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.samples=24
scene.render.resolution_x=640;scene.render.resolution_y=860;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Ambiente de revisión');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.12,.16,.20,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.5
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.02));floor=bpy.context.object;floor.name='Solo render · suelo';fm=bpy.data.materials.new('Solo render · gris');fm.diffuse_color=(.09,.12,.11,1);floor.data.materials.append(fm)
for p,power,size in [((3,-5,10),1500,5),((-4,-2,5),850,4),((2,4,8),1000,3)]:
 bpy.ops.object.light_add(type='AREA',location=p);l=bpy.context.object;l.data.energy=power;l.data.size=size;l.rotation_euler=(Vector((0,0,3.2))-l.location).to_track_quat('-Z','Y').to_euler()
for x in [-1.55,1.55]:
 bpy.ops.object.light_add(type='POINT',location=(x,-.1,4.56));bpy.context.object.data.energy=12;bpy.context.object.data.color=(1,.30,.055)
bpy.ops.object.camera_add(location=(8,-13,8));cam=bpy.context.object;cam.rotation_euler=(Vector((0,0,3.3))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=8.3;scene.camera=cam
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'data/reference-lantern.blend'))
scene.render.filepath=str(ROOT/'test-results/reference-lantern/01-blender-farol.png');bpy.ops.render.render(write_still=True)
print('REFERENCE_LANTERN_OK',len(model.data.polygons),'polygons',OUT/'lantern.glb')
