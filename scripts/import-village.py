"""Convert authored VoxeLibre MTS schematics into static cuboids, without executing downloaded code."""
import json,struct,zlib,urllib.request,hashlib,pathlib,math
ROOT=pathlib.Path(__file__).resolve().parents[1]; OUT=ROOT/'public/assets/downloaded/village'
SHA='4492ce6ff8d856daa4567abe2ea689f4e7a39842'; BASE='https://raw.githubusercontent.com/VoxeLibre/VoxeLibre/'+SHA+'/'
TEXTURES=['default_cobble','default_wood','default_tree','default_tree_top','default_glass','doors_trapdoor','mcl_ocean_sea_lantern','default_stone','mcl_doors_door_wood_lower','mcl_doors_door_wood_upper','wool_red','mcl_core_stonebrick_carved','default_dirt','loom_front','default_furnace_front','default_torch_on_floor']
OUT.mkdir(parents=True,exist_ok=True);manifest=[]
def download(path,target):
 if not target.exists():target.write_bytes(urllib.request.urlopen(BASE+path,timeout=40).read())
 data=target.read_bytes();manifest.append({'file':target.name,'source':BASE+path,'sha256':hashlib.sha256(data).hexdigest(),'bytes':len(data)});return data
for t in TEXTURES:
 try:download('textures/'+t+'.png',OUT/(t+'.png'))
 except Exception:
  if t=='default_torch_on_floor':TEXTURES[15]='default_wood'
  else:raise
models={}
for name in ['small_house','medium_house','lamp']:
 b=download('mods/MAPGEN/mcl_villages/schematics/'+name+'.mts',OUT/(name+'.mts')); version,sx,sy,sz=struct.unpack('>4H',b[4:12]); off=12+sy; count=struct.unpack('>H',b[off:off+2])[0]; off+=2;names=[]
 for _ in range(count):
  n=struct.unpack('>H',b[off:off+2])[0];off+=2;names.append(b[off:off+n].decode());off+=n
 raw=zlib.decompress(b[off:]); n=sx*sy*sz; assert len(raw)==n*4
 nodes={};parts=[]
 for z in range(sz):
  for y in range(sy):
   for x in range(sx):
    i=x+sx*(y+sy*z);kind=names[struct.unpack('>H',raw[i*2:i*2+2])[0]];param=raw[n*3+i]
    if kind not in ['air','ignore'] and 'dirt' not in kind:nodes[x,y,z]=(kind,param)
 def full(k):return not any(t in k for t in ['stairs:','door','fence','pane','torch','walls:','bed_','flower_pot'])
 for (x,y,z),(kind,param) in nodes.items():
  tile=0 if 'cobble' in kind else 7 if 'stone' in kind else 10 if 'bed_' in kind else 4 if 'pane' in kind else 8 if 'door_b' in kind else 9 if 'door_t' in kind else 5 if 'trapdoor' in kind else 6 if 'sea_lantern' in kind else 2 if ':tree' in kind else 13 if ':loom' in kind else 1
  faces=[tile]*6
  if ':tree' in kind:faces[2]=faces[3]=3
  shapes=[([0,0,0],[1,1,1])]; angle=0
  if ':slab_' in kind:shapes=[([0,.25 if kind.endswith('_top') else -.25,0],[1,.5,1])]
  elif ':stair_' in kind:
   shapes=[([0,-.25,0],[1,.5,1]),([0,.25,.25],[1,.5,.5])];angle=[0,-math.pi/2,math.pi,math.pi/2][param%4]
   if param>=20:shapes=[([a,-b,c],[w,h,d]) for ([a,b,c],[w,h,d]) in shapes]
  elif 'door_' in kind and 'trapdoor' not in kind:shapes=[([0,0,-.43],[1,1,.14])];angle=[0,-math.pi/2,math.pi,math.pi/2][param%4]
  elif 'trapdoor' in kind:
   shapes=[([0,0,.43],[1,1,.14])] if kind.endswith('_open') else [([0,-.43,0],[1,.14,1])];angle=[0,-math.pi/2,math.pi,math.pi/2][param%4]
  elif ':fence' in kind:shapes=[([0,0,0],[.25,1,.25]),([0,.22,0],[1,.13,.13]),([0,-.2,0],[1,.13,.13])]
  elif 'pane' in kind:shapes=[([0,0,0],[1,1,.07])];angle=math.pi/2 if param%2 else 0
  elif 'walls:' in kind:shapes=[([0,0,0],[.5,1,.5])]
  elif 'torch' in kind:shapes=[([0,-.1,0],[.13,.65,.13])]
  elif 'bed_' in kind:shapes=[([0,-.25,0],[1,.5,1])]
  elif 'flower_pot' in kind:shapes=[([0,-.3,0],[.4,.4,.4])]
  for center,size in shapes:
   c,s=math.cos(angle),math.sin(angle);a,b,d=center;center=[x-(sx-1)/2+a*c+d*s,y-1+.5+b,z-(sz-1)/2-a*s+d*c]
   mask=[True]*6
   if full(kind):
    for j,(dx,dy,dz) in enumerate([(1,0,0),(-1,0,0),(0,1,0),(0,-1,0),(0,0,1),(0,0,-1)]):
     neighbor=nodes.get((x+dx,y+dy,z+dz));mask[j]=not neighbor or not full(neighbor[0])
   if any(mask):parts.append({'p':center,'s':size,'r':round(angle,6),'tiles':faces,'faces':mask,'glow':'sea_lantern' in kind})
 models[name]={'size':[sx,sy-1,sz],'parts':parts,'source':name+'.mts'}
(OUT/'village.json').write_text(json.dumps({'textures':TEXTURES,'models':models},separators=(',',':')),encoding='utf-8')
(OUT/'provenance.json').write_text(json.dumps({'repository':'https://github.com/VoxeLibre/VoxeLibre','commit':SHA,'schematics':{'author':'MysticTempest / VoxeLibre','license':'CC-BY-SA-4.0'},'textures':{'author':'XSSheep / Pixel Perfection and VoxeLibre contributors','license':'CC-BY-SA-4.0; see LEGAL.md'},'conversion':'Live Dance: MTS decompression, exposed faces, cuboids for slabs/stairs/doors/panes/fences; original layout retained. No downloaded code executed. Interior workstation details simplified.','files':manifest},indent=2),encoding='utf-8')
print(json.dumps({k:len(v['parts']) for k,v in models.items()}))

