import bpy,json,hashlib
from pathlib import Path
root=Path(__file__).resolve().parent.parent
folder=root/'public/assets/downloaded/voxel-house'
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.wm.obj_import(filepath=str(folder/'YHouse/Yhouse.obj'))
bpy.ops.export_scene.gltf(filepath=str(folder/'voxel-house.glb'),export_format='GLB')
(folder/'provenance.json').write_text(json.dumps({'name':'Voxel House','author':'Alex jr','source':'https://opengameart.org/content/voxel-house','license':'CC BY 4.0','licenseUrl':'https://creativecommons.org/licenses/by/4.0/','archiveSha256':hashlib.sha256((folder/'yhouse.zip').read_bytes()).hexdigest(),'conversion':'Original OBJ/MTL/PNG imported in Blender with automatic scripts disabled; GLB export. No modeled replacement.'},indent=2),encoding='utf-8')
