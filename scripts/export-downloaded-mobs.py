import bpy,json
from pathlib import Path
root=Path('E:/Codex/Proyectos/dance-party-clone/work/downloaded-assets-review');out=root/'converted';out.mkdir(exist_ok=True)
report=[]
for kind,source in [('pig','pig'),('cow','cow+mooshroom'),('chicken','chicken'),('creeper','creeper'),('sheep','sheep'),('spider','spider')]:
 bpy.ops.wm.open_mainfile(filepath=str(root/'models'/(source+'.blend')),use_scripts=False);assert not bpy.data.texts
 scene=bpy.context.scene;scene.frame_start=0;scene.frame_end=20 if kind=='chicken' else 40;scene.render.fps=30;scene.frame_set(0)
 def accept(o):
  if o.type!='MESH':return False
  n=o.name.lower()
  if kind=='pig':return n.startswith('pig_')
  if kind=='cow':return n.startswith('cow_')
  if kind=='creeper':return n.endswith('1')
  return True
 meshes=[o for o in scene.objects if accept(o)];assert meshes
 materials={}
 for o in meshes:
  wool=kind=='sheep' and o.name.startswith('fur.');texture=root/('mobs-ce/creeper.png' if kind=='creeper' else 'mobs/mobs_mc_'+('sheep_fur' if wool else kind)+'.png')
  key=str(texture)
  if key not in materials:
   m=bpy.data.materials.new(kind+('_wool' if wool else '_skin'));m.use_nodes=True;n=m.node_tree.nodes.new('ShaderNodeTexImage');n.image=bpy.data.images.load(key,check_existing=True);n.interpolation='Closest';bsdf=m.node_tree.nodes.get('Principled BSDF');m.node_tree.links.new(n.outputs['Color'],bsdf.inputs['Base Color']);m.node_tree.links.new(n.outputs['Alpha'],bsdf.inputs['Alpha']);bsdf.inputs['Roughness'].default_value=1;m.surface_render_method='DITHERED';materials[key]=m
  o.data.materials.clear();o.data.materials.append(materials[key]);o.hide_set(False);o.hide_render=False
 bpy.ops.object.select_all(action='DESELECT')
 for o in meshes:o.select_set(True)
 bpy.context.view_layer.objects.active=meshes[0];bpy.ops.object.join();joined=bpy.context.object;joined.name=kind+'_downloaded_mesh';armatures=[o for o in scene.objects if o.type=='ARMATURE'];assert len(armatures)==1;arm=armatures[0];arm.select_set(True)
 args=dict(filepath=str(out/(kind+'.glb')),export_format='GLB',use_selection=True,export_animations=True,export_frame_range=True,export_force_sampling=True,export_animation_mode='ACTIVE_ACTIONS',export_def_bones=True,export_yup=True,export_cameras=False,export_lights=False,export_extras=False)
 valid={p.identifier for p in bpy.ops.export_scene.gltf.get_rna_type().properties};bpy.ops.export_scene.gltf(**{k:v for k,v in args.items() if k in valid})
 report.append({'kind':kind,'source':source+'.blend','selectedMeshes':[o.name for o in meshes if o.name in bpy.data.objects] if False else len(meshes),'textures':[Path(k).name for k in materials],'clipFrames':[0,scene.frame_end],'bones':len(arm.data.bones),'embeddedScripts':0})
(out/'conversion-report.json').write_text(json.dumps(report,indent=2),encoding='utf8');print('DOWNLOADED_MOB_EXPORTS_READY')
