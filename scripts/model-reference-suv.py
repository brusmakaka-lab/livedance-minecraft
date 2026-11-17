"""Editable Blender model, built from the user supplied multi-view reference.
No external scripts, generators, or downloaded executable code are used.
"""
import bpy,math,json,hashlib
from pathlib import Path
from mathutils import Vector
root=Path('E:/Codex/Proyectos/dance-party-clone');out=root/'public/assets/models/reference-suv';out.mkdir(parents=True,exist_ok=True)
source=Path('C:/Users/Usuario/Downloads/Memespara livedande/320524d6a0576af38530c78b90b7694d.jpg')
bpy.ops.wm.read_factory_settings(use_empty=True)
def material(name,color,metal=0,rough=.4,emission=0):
 m=bpy.data.materials.new(name);m.diffuse_color=(*color,1);m.use_nodes=True;n=m.node_tree.nodes.get('Principled BSDF');n.inputs['Base Color'].default_value=(*color,1);n.inputs['Metallic'].default_value=metal;n.inputs['Roughness'].default_value=rough
 if emission:n.inputs['Emission Color'].default_value=(*color,1);n.inputs['Emission Strength'].default_value=emission
 return m
blue=material('Escalade · azul metálico',(.012,.19,.52),.65,.27);glass=material('Cristal oscuro',(.012,.022,.034),.25,.15);chrome=material('Cromo satinado',(.68,.74,.79),.85,.23);rubber=material('Neumático',(.014,.016,.019),0,.8);dark=material('Parrilla y bajos',(.022,.027,.035),.1,.5);white=material('Luz delantera',(.82,.94,1),0,.25,.5);red=material('Piloto trasero',(.65,.015,.025),0,.3,.4);amber=material('Luz lateral',(.9,.3,.015),0,.4,.3)
def empty(name,parent=None):
 o=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(o);o.parent=parent;return o
vehicle=empty('ReferenceSUV');body=empty('BodyAssembly',vehicle);wheels=empty('WheelAssembly',vehicle)
def mesh(name,verts,faces,mat,parent=body):
 data=bpy.data.meshes.new(name);data.from_pydata(verts,[],faces);data.update();o=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(o);o.data.materials.append(mat);o.parent=parent;return o
def cube(name,size,pos,mat,parent=body,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=bpy.context.object;o.name=name;o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True);o.data.materials.append(mat);o.parent=parent
 if bevel:
  mod=o.modifiers.new('Borde suave','BEVEL');mod.width=bevel;mod.segments=2;bpy.context.view_layer.objects.active=o;bpy.ops.object.modifier_apply(modifier=mod.name)
 return o
def line(name,a,b,width,mat,parent=body):
 mid=(Vector(a)+Vector(b))*.5;o=cube(name,(width,width,(Vector(b)-Vector(a)).length),mid,mat,parent);o.rotation_euler=(Vector(b)-Vector(a)).to_track_quat('Z','Y').to_euler();return o
def cylinder(name,r,depth,pos,mat,parent=wheels,vertices=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=pos,rotation=(0,math.pi/2,0));o=bpy.context.object;o.name=name;o.data.materials.append(mat);o.parent=parent;return o
# The continuous side silhouette includes both open wheel arches.
profile=[(-2.70,.51)]
for center in [-1.60,1.60]:
 profile.append((center-.57,.51))
 for i in range(17):
  angle=math.pi-i*math.pi/16;profile.append((center+.57*math.cos(angle),.49+.57*math.sin(angle)))
profile.extend([(2.66,.51),(2.64,1.19),(2.38,1.24),(-1.10,1.22),(-2.44,1.10),(-2.70,.97)])
count=len(profile);verts=[(s*1.01,y,z)for s in [-1,1]for y,z in profile];faces=[tuple(range(count-1,-1,-1)),tuple(range(count,count*2))]+[(i,(i+1)%count,(i+1)%count+count,i+count)for i in range(count)];mesh('Carrocería · pasos de rueda abiertos',verts,faces,blue)
# Cabin follows the long roof and upright rear in the reference sheet.
sections=[(-1.10,1.18,1.00),(-.52,1.88,.90),(2.30,1.88,.92),(2.61,1.17,1.00)]
mesh('Cabina',[(s*w,y,z)for y,z,w in sections for s in [-1,1]],[(0,1,3,2),(2,3,5,4),(4,5,7,6),(0,2,4,6),(1,7,5,3),(6,7,1,0)],blue)
mesh('Parabrisas',[(-.94,-1.09,1.23),(.94,-1.09,1.23),(.84,-.60,1.82),(-.84,-.60,1.82)],[(0,1,2,3)],glass)
mesh('Luneta',[(-.93,2.59,1.24),(-.86,2.35,1.82),(.86,2.35,1.82),(.93,2.59,1.24)],[(0,1,2,3)],glass)
for side in [-1,1]:
 def sidewindow(name,points):return mesh(name,[(side*(1.025-(z-1.22)*.14),y,z)for y,z in points],[(0,1,2,3)if side>0 else(3,2,1,0)],glass)
 sidewindow('Ventana delantera',[(-.99,1.25),(-.47,1.80),(.31,1.80),(.31,1.25)])
 sidewindow('Ventana trasera',[(.39,1.25),(.39,1.80),(1.25,1.80),(1.25,1.25)])
 sidewindow('Ventana lateral del baúl',[(1.34,1.25),(1.34,1.80),(2.27,1.80),(2.51,1.25)])
 line('Marco cromado inferior',(side*1.005,-.99,1.22),(side*1.005,2.53,1.22),.035,chrome)
 line('Pilar cromado diagonal',(side*.925,1.17,1.84),(side*1.01,1.39,1.23),.065,chrome)
 line('Moldura lateral',(side*1.025,-.93,.63),(side*1.025,2.59,.63),.035,chrome)
 for y in [-.03,1.02]:cube('Manija',(.035,.26,.045),(side*1.025,y,1.17),chrome,bevel=.015)
 for y in [.34,1.34]:line('Unión de puertas',(side*1.016,y,.65),(side*1.016,y,1.20),.012,dark)
 cube('Espejo',(.24,.30,.15),(side*1.105,-.83,1.40),blue,bevel=.05);cube('Cristal espejo',(.023,.22,.105),(side*1.235,-.83,1.40),glass)
 cube('Estribo',(.16,2.03,.07),(side*1.045,.0,.43),dark)
 line('Barra de techo',(side*.82,-.31,1.95),(side*.82,2.16,1.95),.045,chrome)
 for y in [-.25,2.09]:cube('Soporte barra',(.08,.12,.08),(side*.82,y,1.91),dark)
cube('Techo panorámico',(1.33,1.63,.015),(0,.42,1.89),glass,bevel=.07)
cube('Parrilla negra',(1.71,.045,.62),(0,-2.718,.78),dark,bevel=.04)
for z in [.53,.64,.75,.86,.97,1.06]:cube('Barra cromada parrilla',(1.55,.045,.022),(0,-2.75,z),chrome)
for side in [-1,1]:
 line('Borde parrilla',(side*.87,-2.75,.49),(side*.87,-2.75,1.10),.04,chrome)
 cube('Faro horizontal',(.36,.055,.12),(side*.81,-2.76,1.13),white,bevel=.025)
 cube('Luz vertical característica',(.043,.06,.50),(side*.99,-2.75,.78),white)
 cube('Intermitente lateral',(.026,.075,.13),(side*1.025,-2.15,.97),amber)
 cube('Piloto vertical trasero',(.10,.07,.73),(side*.965,2.67,1.08),red,bevel=.025)
 cube('Refuerzo piloto',(.08,.055,.40),(side*.94,2.60,1.61),red,bevel=.02)
cube('Bajo delantero',(1.90,.16,.15),(0,-2.68,.38),dark,bevel=.025);cube('Moldura delantera',(1.89,.07,.035),(0,-2.78,.45),chrome)
cube('Paragolpes trasero',(1.96,.12,.16),(0,2.66,.43),dark,bevel=.025);cube('Moldura portón',(1.72,.035,.035),(0,2.68,1.19),chrome)
cube('Patente trasera',(.37,.026,.15),(0,2.69,.82),dark)
# Editable wheels; tire bottoms remain on the ground during body suspension motion.
for side in [-1,1]:
 for y in [-1.60,1.60]:
  x=side*1.02;cylinder('Neumático',.48,.27,(x,y,.48),rubber);cylinder('Llanta',.31,.285,(x,y,.48),dark);cylinder('Borde llanta',.32,.025,(side*1.175,y,.48),chrome);cylinder('Disco oscuro',.285,.035,(side*1.193,y,.48),dark)
  for i in range(7):
   a=i*math.tau/7;line('Rayo de llanta',(side*1.22,y+math.cos(a)*.06,.48+math.sin(a)*.06),(side*1.22,y+math.cos(a)*.275,.48+math.sin(a)*.275),.046,chrome,wheels)
  cylinder('Centro rueda',.095,.045,(side*1.23,y,.48),chrome,vertices=16)
# Pack the provided blueprint as a non-rendering reference, not as vehicle texture.
reference=empty('Referencia multivista · usuario');reference.empty_display_type='IMAGE';reference.data=bpy.data.images.load(str(source));reference.data.pack();reference.location=(0,0,-4);reference.hide_render=True;reference.hide_viewport=True
bpy.context.scene['reference_note']='Aproximación de presentación basada en la imagen aportada; no es CAD ni modelo oficial del fabricante.'
bpy.ops.wm.save_as_mainfile(filepath=str(root/'data'/'reference-suv.blend'))
bpy.ops.object.select_all(action='DESELECT')
for o in vehicle.children_recursive:o.select_set(True)
vehicle.select_set(True);bpy.context.view_layer.objects.active=vehicle
bpy.ops.export_scene.gltf(filepath=str(out/'suv-reference.glb'),export_format='GLB',use_selection=True,export_animations=False,export_yup=True,export_cameras=False,export_lights=False)
(out/'provenance.json').write_text(json.dumps({'reference':'320524d6a0576af38530c78b90b7694d.jpg','referenceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'createdIn':'Blender','editable':'data/reference-suv.blend','method':'Modelado geométrico y materiales, por script local a partir de la referencia del usuario. No se extrajo geometría de un video.','limits':'Aproximación visual; sin precisión CAD ni vinculación oficial con el fabricante.'},ensure_ascii=False,indent=2),encoding='utf-8')
