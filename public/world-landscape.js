import {mergeGeometries} from '/vendor/three-0.186.1/examples/jsm/utils/BufferGeometryUtils.js';
import {terrainHeight,LANDSCAPE_TREES,LANDSCAPE_CELL,CLEARING,streamCell} from './landscape-layout.js';
export async function buildWorldLandscape(THREE,scene){
 const group=new THREE.Group();group.name='Plaza de hierro · colinas y ribera';scene.add(group);
 const names=['landscape/mcl_core_grass_block_top','village/default_dirt','village/default_stone','village/default_tree','landscape/default_leaves','landscape/mcl_cherry_blossom_leaves','landscape/default_sand','landscape/mcl_core_water_source_animation'];
 const images=await Promise.all(names.map(n=>new THREE.TextureLoader().loadAsync('/assets/downloaded/'+n+'.png')));
 const canvas=document.createElement('canvas');canvas.width=canvas.height=144;const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=false;
 const tint=['#73b64a',null,null,null,'#579845',null,'#dacda0','#4596ae'];
 images.forEach((t,i)=>{const tile=document.createElement('canvas');tile.width=tile.height=36;const c=tile.getContext('2d');c.imageSmoothingEnabled=false;c.drawImage(t.image,0,0,t.image.width,t.image.width,0,0,36,36);if(tint[i]){c.globalCompositeOperation='multiply';c.fillStyle=tint[i];c.fillRect(0,0,36,36);c.globalCompositeOperation='destination-in';c.drawImage(t.image,0,0,t.image.width,t.image.width,0,0,36,36);}const x=i%4*36,y=Math.floor(i/4)*36;ctx.drawImage(tile,x,y);ctx.drawImage(tile,0,0,36,36,x+2,y+2,32,32);});
 const atlas=new THREE.CanvasTexture(canvas);atlas.colorSpace=THREE.SRGBColorSpace;atlas.magFilter=THREE.NearestFilter;atlas.minFilter=THREE.NearestMipmapLinearFilter;
 // Project only the top face of the supplied isometric block into a square.
 // Hardware repetition then tiles a flat iron surface, without black corners
 // or miniature isometric cubes. The source PNG remains unchanged on disk.
 const reference=await new THREE.TextureLoader().loadAsync('/assets/materials/iron-floor/block-reference.png'),iron=document.createElement('canvas');iron.width=iron.height=64;const ironContext=iron.getContext('2d');ironContext.imageSmoothingEnabled=false;
 // Source diamond: (150,8), (278,72), (150,136), (22,72), in a 300px image.
 const sx=300/reference.image.width,sy=300/reference.image.height;
 ironContext.setTransform(.25*sx,-.25*sx,.5*sy,.5*sy,-41.5,33.5);ironContext.drawImage(reference.image,0,0);reference.dispose();
 const groundMap=new THREE.CanvasTexture(iron);groundMap.colorSpace=THREE.SRGBColorSpace;groundMap.magFilter=THREE.NearestFilter;groundMap.minFilter=THREE.LinearMipmapLinearFilter;groundMap.wrapS=groundMap.wrapT=THREE.RepeatWrapping;groundMap.repeat.set(10000,10000);groundMap.anisotropy=4;
 const floorPixels=ironContext.getImageData(0,0,64,64).data,opaqueIron=[...floorPixels].every((v,i)=>i%4!==3||v===255);
 const material=new THREE.MeshLambertMaterial({map:atlas,vertexColors:true,alphaTest:.45}),parts=[],color=new THREE.Color();let blockCount=0;
 function box(x,y,z,w,h,d,tile,shade=1){
  const g=new THREE.BoxGeometry(w,h,d);g.clearGroups();const uv=g.attributes.uv,colors=new Float32Array(g.attributes.position.count*3);color.setRGB(shade,shade,shade);
  for(let f=0;f<6;f++){const t=Array.isArray(tile)?tile[f]:tile,tx=t%4*36+2,ty=Math.floor(t/4)*36+2;for(let k=0;k<4;k++){const n=f*4+k;uv.setXY(n,(tx+uv.getX(n)*32)/144,1-(ty+(1-uv.getY(n))*32)/144);color.toArray(colors,n*3);}}
  g.setAttribute('color',new THREE.BufferAttribute(colors,3));g.translate(x,y,z);parts.push(g);blockCount++;
 }
 // Only the surface and the exposed step walls are emitted, not buried cubes.
 const side=LANDSCAPE_CELL;
 for(let x=-92;x<=92;x+=side)for(let z=-110;z<=44;z+=side){const h=terrainHeight(x,z);if(!h)continue;
  const top=new THREE.PlaneGeometry(side,side);top.rotateX(-Math.PI/2);top.translate(x,h-.03,z);top.clearGroups();const uv=top.attributes.uv;for(let k=0;k<4;k++)uv.setXY(k,(2+uv.getX(k)*32)/144,1-(2+(1-uv.getY(k))*32)/144);top.setAttribute('color',new THREE.BufferAttribute(new Float32Array(12).fill(1),3));parts.push(top);
  for(const [dx,dz]of [[side,0],[-side,0],[0,side],[0,-side]]){const nh=terrainHeight(x+dx,z+dz);if(nh>=h)continue;const dh=h-nh;box(x+dx/2,(h+nh)/2-.04,z+dz/2,dx?.06:side,dh,dz?.06:side,h>=12?2:1,.83);}
 }
 for(const t of LANDSCAPE_TREES){const {x,y,z,scale:s,cherry}=t;box(x,y+2.5*s,z,.85*s,5*s,.85*s,3,.85);const leaf=cherry?5:4;
  for(const [dx,dy,dz,w,h,d]of [[0,5,0,5,2.5,5],[-1.2,6.4,.7,4,1.5,4],[1,4,-1.2,3,1.5,3]])box(x+dx*s,y+dy*s,z+dz*s,w*s,h*s,d*s,leaf,cherry?1:.92);
 }
 // Stream and sand banks are entirely beyond x=44. No collider or walkable
 // height changes are needed for the central creatures or presentations.
 const water=[];
 for(let z=-44;z<=36;z+=2)for(let x=44;x<=60;x+=2){if(!streamCell(x,z))continue;box(x,-.025,z,2,.025,2,7);water.push({x,z});for(const dx of [-2,2])if(!streamCell(x+dx,z))box(x+dx,-.012,z,2,.025,2,6);}
 const geometry=mergeGeometries(parts,false);parts.forEach(p=>p.dispose());const mesh=new THREE.Mesh(geometry,material);group.add(mesh);for(const t of images)t.dispose();
 return {groundMap,groundColor:0xffffff,inspect:()=>({style:'minecraft-clearing',floorMaterial:'iron-block',floorReference:'/assets/materials/iron-floor/block-reference.png',floorTextureOpaque:opaqueIron,floorTileWorldUnits:2,flatClearing:CLEARING,trees:LANDSCAPE_TREES.length,streamCells:water.length,drawCalls:1,triangles:geometry.index.count/3,blocks:blockCount,downloadedTextures:true,terrainMinDistance:38})};
}
