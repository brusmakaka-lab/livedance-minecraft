import bpy,math
from pathlib import Path
from mathutils import Vector
root=Path(__file__).resolve().parent.parent
scene=bpy.context.scene
scene.render.engine='BLENDER_EEVEE'
if hasattr(scene,'eevee') and hasattr(scene.eevee,'taa_render_samples'):scene.eevee.taa_render_samples=16
scene.render.resolution_x=1024;scene.render.resolution_y=768;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Studio environment');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.13,.17,.22,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.7
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.01));ground=bpy.context.object;m=bpy.data.materials.new('Studio floor');m.diffuse_color=(.13,.16,.19,1);ground.data.materials.append(m)
for pos,power,size in [((3,-5,8),1800,6),((-5,-1,5),1200,5),((2,6,6),1500,4)]:
 bpy.ops.object.light_add(type='AREA',location=pos);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((0,0,1))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(7,-9,4.5));camera=bpy.context.object;camera.rotation_euler=(Vector((0,0,1))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.lens=52;scene.camera=camera
scene.render.filepath=str(root/'test-results/community-world/10-suv-modelo.png');bpy.ops.render.render(write_still=True)
