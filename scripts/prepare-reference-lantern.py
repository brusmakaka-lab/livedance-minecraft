"""Crop existing downloaded PNG artwork into a small guttered model atlas."""
from pathlib import Path
from PIL import Image,ImageChops
import json,hashlib
ROOT=Path(__file__).resolve().parents[1];out=ROOT/'public/assets/models/reference-lantern';out.mkdir(parents=True,exist_ok=True)
village=ROOT/'public/assets/downloaded/village';land=ROOT/'public/assets/downloaded/landscape'
def tile(p,box=None):
 im=Image.open(p).convert('RGBA');return (im.crop(box) if box else im).resize((32,32),Image.Resampling.NEAREST)
def tint(im,rgb):return ImageChops.multiply(im,Image.new('RGBA',im.size,(*rgb,255)))
wood=tint(tile(village/'default_wood.png'),(192,139,83));trap=wood.copy();trap.alpha_composite(tint(tile(village/'doors_trapdoor.png'),(215,162,105)))
tiles=[tile(village/'default_cobble.png'),wood,trap,tint(tile(village/'default_tree.png'),(192,139,83)),tint(tile(land/'mcl_bells_bell_top.png'),(255,222,65)),tile(land/'mcl_lanterns_lantern.png',(1,9,5,14)),tile(land/'mcl_lanterns_lantern.png',(1,3,5,4)),tile(land/'mcl_lanterns_lantern.png',(1,5,5,8))]
atlas=Image.new('RGBA',(144,144),(20,20,20,255));em=Image.new('RGB',(144,144))
for i,t in enumerate(tiles):
 x=i%4*36;y=i//4*36
 # Duplicate edges into a two-pixel gutter, preventing mip-map bleeding.
 atlas.paste(t.resize((36,36),Image.Resampling.NEAREST),(x,y));atlas.paste(t,(x+2,y+2))
 if i==7:em.paste(t.convert('RGB').resize((36,36)),(x,y))
atlas.save(out/'atlas.png');em.save(out/'emission.png')
ref=Path('C:/Users/Usuario/Downloads/Memespara livedande/images.jpg')
(out/'provenance.json').write_text(json.dumps({'model':'Live Dance · Blender reconstruction from user supplied lamp reference','reference':ref.name,'referenceSha256':hashlib.sha256(ref.read_bytes()).hexdigest(),'referenceRedistributed':False,'textures':'VoxeLibre / Pixel Perfection; copied crops in atlas, see ../../downloaded/village/LEGAL.md and ../../downloaded/landscape/provenance.json','license':'Model and adapted texture atlas: CC BY-SA 4.0','editable':'data/reference-lantern.blend','generator':'scripts/model-reference-lantern.py','dimensions':{'width':4.16,'height':6.69,'depth':1.54}},indent=2),encoding='utf-8')
