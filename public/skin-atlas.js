export const UNIT = .09;
export function faceRects(x, y, w, h, d) {
  return [[x,y+d,d,h],[x+d+w,y+d,d,h],[x+d,y,w,d],[x+d+w,y,w,d],[x+d,y+d,w,h],[x+d+w+d,y+d,w,h]];
}
export function parts(model = 'classic', legacy = false) {
  const arm = model === 'slim' ? 3 : 4;
  return [
    { name:'head', size:[8,8,8], base:[0,0], layer:[32,0], position:[0,28,0] },
    { name:'body', size:[8,12,4], base:[16,16], layer:legacy?null:[16,32], position:[0,18,0] },
    { name:'rightArm', size:[arm,12,4], base:[40,16], layer:legacy?null:[40,32], pivot:[-4-arm/2,24,0] },
    { name:'leftArm', size:[arm,12,4], base:legacy?[40,16]:[32,48], layer:legacy?null:[48,48], pivot:[4+arm/2,24,0], mirror:legacy },
    { name:'rightLeg', size:[4,12,4], base:[0,16], layer:legacy?null:[0,32], pivot:[-2,12,0] },
    { name:'leftLeg', size:[4,12,4], base:legacy?[0,16]:[16,48], layer:legacy?null:[0,48], pivot:[2,12,0], mirror:legacy },
  ];
}
export function mapBoxUV(geometry, rectangles, width, height, mirror = false) {
  const uv = geometry.attributes.uv;
  for (let face=0;face<6;face++) {
    const index = mirror && face<2 ? 1-face : face;
    const [x,y,w,h] = rectangles[index];
    for(let corner=0;corner<uv.count/6;corner++) {
      const i=face*(uv.count/6)+corner, u=uv.getX(i), v=uv.getY(i);
      uv.setXY(i,(x+(mirror?1-u:u)*w)/width,1-(y+(1-v)*h)/height);
    }
  }
  uv.needsUpdate = true;
}
export function hash(text) { let n=0;for(const char of text)n=((n<<5)-n+char.charCodeAt(0))|0;n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0; }

export function defaultSkin(seed) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const ctx=canvas.getContext('2d'),n=hash(seed),outfits=[['#bf394a','#263044','#412c24'],['#30343d','#20242d','#171920'],['#9863d3','#2c223b','#583527'],['#4d9d7d','#2c4350','#b39260'],['#dfb54c','#44545b','#4b3327'],['#cbcfdb','#496478','#302326']],[shirt,pants,hair]=outfits[n%outfits.length],skin=['#d6a27b','#ae7655','#e7b68a','#83533e'][n%4];
  for(const part of parts()){
    const [w,h,d]=part.size,color=part.name==='head'?skin:part.name.includes('Leg')?pants:shirt;
    for(const [x,y,width,height] of faceRects(...part.base,w,h,d)){
      ctx.fillStyle=color;ctx.fillRect(x,y,width,height);
      if(part.name.includes('Leg')){ctx.fillStyle='#22232b';ctx.fillRect(x,y+height-3,width,3);}
      if(part.name.includes('Arm')){ctx.fillStyle=skin;ctx.fillRect(x,y+height-4,width,4);}
      if(part.name==='head'){ctx.fillStyle=hair;ctx.fillRect(x,y,width,Math.min(3,height));}
      if(part.name==='body'){ctx.fillStyle='#ffffff36';ctx.fillRect(x+1,y+1,Math.min(2,width),height-2);}
    }
  }
  ctx.fillStyle='#f1f0e9';ctx.fillRect(9,11,2,1);ctx.fillRect(13,11,2,1);ctx.fillStyle='#283b42';ctx.fillRect(10,11,1,1);ctx.fillRect(13,11,1,1);
  ctx.fillStyle='#9b5d4d';ctx.fillRect(11,14,2,1);return canvas;
}

export function prepareSkin(THREE, image) {
  const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(image,0,0);
  const pixels=ctx.getImageData(0,0,canvas.width,canvas.height);
  if(image.height===32){
    let opaque=true;
    for(let y=0;y<16;y++)for(let x=32;x<64;x++)if(pixels.data[(y*64+x)*4+3]<128)opaque=false;
    if(opaque)for(let y=0;y<16;y++)for(let x=32;x<64;x++)pixels.data[(y*64+x)*4+3]=0;
  }
  for(const [x,y,w,h] of [[0,0,32,16],[0,16,64,16],...(image.height===64?[[16,48,32,16]]:[])])
    for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)pixels.data[(yy*64+xx)*4+3]=255;
  ctx.putImageData(pixels,0,0);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.magFilter=texture.minFilter=THREE.NearestFilter;texture.generateMipmaps=false;
  const face=document.createElement('canvas');face.width=face.height=32;const faceCtx=face.getContext('2d');faceCtx.imageSmoothingEnabled=false;faceCtx.drawImage(canvas,8,8,8,8,0,0,32,32);if(image.height===64)faceCtx.drawImage(canvas,40,8,8,8,0,0,32,32);
  return {texture,pixels,legacy:image.height===32,portrait:face.toDataURL()};
}

export function splitFaceRects(rectangles,lower=false){
 return rectangles.map(([x,y,w,h],face)=>{
  if([0,1,4,5].includes(face))return [x,y+(lower?h/2:0),w,h/2];
  if((lower&&face===2)||(!lower&&face===3)){const front=rectangles[4];return [front[0],front[1]+front[3]/2-1,front[2],1];}
  return [x,y,w,h];
 });
}
function roundedBox(THREE,w,h,d,radius,precise=false){
 const segments=precise?3:4,geometry=new THREE.BoxGeometry(w,h,d,segments,segments,segments),p=geometry.attributes.position,n=geometry.attributes.normal;
 for(let i=0;i<p.count;i++){
  const half=[w/2,h/2,d/2],xyz=[p.getX(i),p.getY(i),p.getZ(i)].map((v,j)=>precise&&Math.abs(v)>1e-5&&Math.abs(v)<half[j]-.00001?Math.sign(v)*(half[j]-radius):v),core=xyz.map((v,j)=>THREE.MathUtils.clamp(v,-half[j]+radius,half[j]-radius)),delta=new THREE.Vector3(...xyz.map((v,j)=>v-core[j])).normalize();
  p.setXYZ(i,core[0]+delta.x*radius,core[1]+delta.y*radius,core[2]+delta.z*radius);n.setXYZ(i,delta.x,delta.y,delta.z);
 }
 if(precise){const uv=geometry.attributes.uv,faceSize=(segments+1)**2,lengths=[[d,h],[d,h],[w,d],[w,d],[w,h],[w,h]];for(let i=0;i<uv.count;i++){const [uLen,vLen]=lengths[Math.floor(i/faceSize)],remap=(v,len)=>v>.01&&v<.99?(v<.5?radius/len:1-radius/len):v;uv.setXY(i,remap(uv.getX(i),uLen),remap(uv.getY(i),vLen));}}
 return geometry;
}
export function buildBody(THREE,atlas,model='classic',{style='minecraft'}={}) {
 const root=new THREE.Group(),joints={},resources=[],toy=style==='toy',waist=new THREE.Group(),hips=new THREE.Group();hips.position.y=12*UNIT;root.add(hips);hips.add(waist);joints.hips=hips;joints.waist=waist;
 const finish={bevel:toy?.045:.012,pixelated:true,material:'phong'},surface={map:atlas.texture,shininess:18,specular:0x20212c};
 const base=new THREE.MeshPhongMaterial({...surface,alphaTest:.1}),outer=new THREE.MeshPhongMaterial({...surface,transparent:true,alphaTest:.1,depthWrite:false});resources.push(base,outer);
 function dimensions(part){if(!toy)return part.size;return part.name==='head'?[8.8,8.8,8.8]:part.name==='body'?[10.6,11.2,5.6]:part.name.includes('Arm')?[5.4,11.2,5.4]:[4.8,12,5];}
 function box(part,origin,layer=false,segment=null){
  const original=part.size,[w,fullH,d]=dimensions(part),h=segment?fullH/2:fullH,pad=layer?(part.name==='head'?.5:.25):0;
  const geometry=roundedBox(THREE,(w+pad)*UNIT,(h+pad)*UNIT,(d+pad)*UNIT,finish.bevel,!toy);
  const rectangles=faceRects(...origin,...original);mapBoxUV(geometry,segment?splitFaceRects(rectangles,segment==='lower'):rectangles,64,atlas.pixels.height,part.mirror);resources.push(geometry);return new THREE.Mesh(geometry,layer?outer:base);
 }
 for(const part of parts(model,atlas.legacy)){
  const group=new THREE.Group();joints[part.name]=group;const position=[...(part.pivot||part.position)];
  if(toy&&part.name.includes('Arm'))position[0]=Math.sign(position[0])*8;
  if(toy&&part.name.includes('Leg'))position[0]=Math.sign(position[0])*2.55;
  if(toy&&part.name==='head')position[1]=27.6;
  if(toy&&part.name==='body')position[1]=18.4;
  const armJoint=!toy&&part.name.includes('Arm'),offsetX=armJoint?Math.sign(position[0])*part.size[0]*UNIT/2:0,offsetY=armJoint?2*UNIT:0;if(armJoint){position[0]=Math.sign(position[0])*4;position[1]-=2;}
  const upper=part.name==='head'||part.name==='body'||part.name.includes('Arm');position[1]-=12;if(upper)waist.add(group);else hips.add(group);group.position.set(...position.map(v=>v*UNIT));
  const split=!!part.pivot,half=dimensions(part)[1]*UNIT/2;let lower;
  if(split){lower=new THREE.Group();lower.position.set(offsetX,-half+offsetY,0);group.add(lower);joints[part.name.replace('Arm','Elbow').replace('Leg','Knee')]=lower;}
  const origins=[[part.base,false]];
  if(part.layer){const visible=faceRects(...part.layer,...part.size).some(([x,y,w,h])=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++)if(atlas.pixels.data[(yy*64+xx)*4+3]>25)return true;return false;});if(visible)origins.push([part.layer,true]);}
  // Joint cores share the segment mesh/material: no extra draw call per joint.
  let cap=null;if(split){const [w,,d]=dimensions(part);cap=new THREE.BoxGeometry(w*UNIT*.82,Math.min(w,d)*UNIT*.82,d*UNIT*.82);const rects=faceRects(...part.base,...part.size).map(([x,y,rw,rh])=>[x+Math.floor(rw/2),y+Math.floor(rh/2),1,1]);mapBoxUV(cap,rects,64,atlas.pixels.height,part.mirror);resources.push(cap);lower.userData.sealed=true;}
  function join(source,core){const out=new THREE.BufferGeometry();for(const key of ['position','normal','uv']){const a=source.attributes[key],b=core.attributes[key],array=new Float32Array(a.array.length+b.array.length);array.set(a.array);array.set(b.array,a.array.length);out.setAttribute(key,new THREE.BufferAttribute(array,a.itemSize));}const indices=new Uint16Array(source.index.count+core.index.count);indices.set(source.index.array);for(let i=0;i<core.index.count;i++)indices[source.index.count+i]=core.index.getX(i)+source.attributes.position.count;out.setIndex(new THREE.BufferAttribute(indices,1));resources.push(out);return out;}
  function seal(mesh,offset){const core=cap.clone().translate(0,offset,0);mesh.geometry=join(mesh.geometry,core);core.dispose();}
  // Binary cutout layers share a draw with their base. Real translucent pixels
  // keep the separate transparent material and its original compositing.
  const binaryLayer=!part.layer||faceRects(...part.layer,...part.size).every(([x,y,w,h])=>{for(let yy=y;yy<y+h;yy++)for(let xx=x;xx<x+w;xx++){const alpha=atlas.pixels.data[(yy*64+xx)*4+3];if(alpha!==0&&alpha!==255)return false;}return true;});
  let upperBase,lowerBase;for(const [origin,layer]of origins){const mesh=box(part,origin,layer,split?'upper':null);if(split){mesh.position.set(offsetX,-half/2+offsetY,0);if(!layer)seal(mesh,half/2-UNIT);}if(layer&&binaryLayer)upperBase.geometry=join(upperBase.geometry,mesh.geometry);else group.add(mesh);if(!layer)upperBase=mesh;if(split){const bottom=box(part,origin,layer,'lower');bottom.position.y=-half/2;if(!layer)seal(bottom,half/2);if(layer&&binaryLayer)lowerBase.geometry=join(lowerBase.geometry,bottom.geometry);else lower.add(bottom);if(!layer)lowerBase=bottom;}}

 }
 return {root,joints,portrait:atlas.portrait,height:2.95,style,finish,dispose(){resources.forEach(r=>r.dispose());atlas.texture.dispose();}};
}
