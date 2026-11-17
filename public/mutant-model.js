import {mapBoxUV,faceRects} from './skin-atlas.js';
// Generic cuboid-data adapter. Geometry, UVs and sampled poses come from the
// downloaded MutantBeasts source, never from a generated replacement skin.
export async function buildMutantModel(THREE){
 const [data,map]=await Promise.all([fetch('/assets/downloaded/mobs/mutant-zombie.json').then(r=>{if(!r.ok)throw Error('Falta modelo MutantBeasts');return r.json();}),new THREE.TextureLoader().loadAsync('/assets/downloaded/mobs/mutant_zombie.png')]);
 map.colorSpace=THREE.SRGBColorSpace;map.minFilter=map.magFilter=THREE.NearestFilter;map.generateMipmaps=false;
 const material=new THREE.MeshLambertMaterial({map,transparent:true,alphaTest:.1}),root=new THREE.Group(),parts=new Map();
 for(const p of data.parts){const group=new THREE.Group();group.name=p.name;group.position.set(p.pivot[0],-p.pivot[1],-p.pivot[2]);parts.set(p.name,group);for(const b of p.boxes){const [x,y,z,w,h,d,pad=0]=b.box,g=new THREE.BoxGeometry(w+pad*2,h+pad*2,d+pad*2);mapBoxUV(g,faceRects(...b.uv,w,h,d),...data.textureSize,!!p.mirror);const mesh=new THREE.Mesh(g,material);mesh.position.set(x+w/2,-y-h/2,-z-d/2);group.add(mesh);}}
 for(const p of data.parts)(p.parent?parts.get(p.parent):root).add(parts.get(p.name));
 function pose(clip,time){const c=data.clips[clip],t=Math.max(0,Math.min(c.duration,time)),f=t/c.duration*(c.frames.length-1),i=Math.min(c.frames.length-1,Math.floor(f)),a=c.frames[i],b=c.frames[Math.min(c.frames.length-1,i+1)],u=f-i;for(const [name,angles]of Object.entries(a.rotations)){const v=angles.map((x,k)=>x+(b.rotations[name][k]-x)*u);parts.get(name).rotation.set(v[0],-v[1],-v[2],'ZYX');}if(a.pelvisY!==undefined)parts.get('pelvis').position.y=-(a.pelvisY+(b.pelvisY-a.pelvisY)*u);root.updateMatrixWorld(true);}
 pose('breathe',0);const box=new THREE.Box3().setFromObject(root,true),size=box.getSize(new THREE.Vector3()),scale=9.5/size.y;root.scale.setScalar(scale);root.position.set(-(box.min.x+box.max.x)/2*scale,-box.min.y*scale,-(box.min.z+box.max.z)/2*scale);
 const groundedY=root.position.y,groundBox=new THREE.Box3();
 function stage(state,time){
  pose('breathe',time%4);const rest=new Map([...parts].map(([name,p])=>[name,{q:p.quaternion.clone(),y:p.position.y}]));
  const clip=state.roarWeight>0?'gesture':'walk',weight=state.roarWeight>0?state.roarWeight:state.walkWeight;
  if(weight>0){pose(clip,clip==='walk'?state.walkTime:state.roarTime);for(const [name,p]of parts){const b=rest.get(name);p.quaternion.slerp(b.q,1-weight);p.position.y=p.position.y*weight+b.y*(1-weight);}}
  // The authored walk has vertical pelvis motion; keep its lowest foot on the ground.
  root.position.y=groundedY;root.updateMatrixWorld(true);groundBox.setFromObject(root,true);root.position.y-=groundBox.min.y;root.updateMatrixWorld(true);
 }
 return {root,material,pose,stage,source:data.source,license:data.license,walkDuration:data.clips.walk.duration};
}
