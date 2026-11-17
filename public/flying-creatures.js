// Background wildlife uses the stage clock, independently of event turns.
export function flyingCreaturePlan(seconds){
 const t=Math.max(0,Number(seconds)||0);
 return [
  {kind:'bee',x:Math.sin(t*.27)*6.4,y:5.9+Math.sin(t*.63)*.65,z:-6.4+Math.cos(t*.27)*2.1,yaw:Math.atan2(6.4*Math.cos(t*.27),-2.1*Math.sin(t*.27))},
  {kind:'allay',x:Math.sin(t*.19+2.7)*5.2,y:8.2+Math.sin(t*.49+1.1)*.6,z:-7.4+Math.cos(t*.19+2.7)*2.6,yaw:Math.atan2(5.2*Math.cos(t*.19+2.7),-2.6*Math.sin(t*.19+2.7))}
 ];
}
export function createFlyingCreatures(THREE,assets,camera){
 const point=new THREE.Vector3(),box=new THREE.Box3(),axisY=new THREE.Vector3(0,1,0),axisZ=new THREE.Vector3(0,0,1),offset=new THREE.Quaternion();let state=[];
 function rect(b){let left=Infinity,right=-Infinity,top=Infinity,bottom=-Infinity;for(const x of [b.min.x,b.max.x])for(const y of [b.min.y,b.max.y])for(const z of [b.min.z,b.max.z]){point.set(x,y,z).project(camera);left=Math.min(left,point.x);right=Math.max(right,point.x);top=Math.min(top,point.y);bottom=Math.max(bottom,point.y);}return {left,right,top,bottom};}
 return {update(seconds,{enabled=true,protectedBoxes=[]}={}){
  const protectedRects=protectedBoxes.map(rect);state=[];
  for(const p of flyingCreaturePlan(seconds)){
   const a=assets[p.kind];if(!a?.root)continue;a.root.position.set(p.x,p.y,p.z);a.root.rotation.y=p.yaw;
   box.min.set(p.x-1.1,p.y-.2,p.z-1.1);box.max.set(p.x+1.1,p.y+1.9,p.z+1.1);const r=protectedRects.length?rect(box):null,occluded=!!r&&protectedRects.some(b=>r.left<b.right+.06&&r.right>b.left-.06&&r.top<b.bottom+.06&&r.bottom>b.top-.06);
   a.root.visible=enabled&&!occluded;
   if(a.root.visible){if(a.clip)a.mixer.setTime(seconds%a.clip.duration);if(p.kind==='allay')for(const [name,part]of Object.entries(a.parts)){const wing=name.includes('wing'),side=name.startsWith('left')?1:-1;part.bone.quaternion.copy(part.q).multiply(offset.setFromAxisAngle(wing?axisY:axisZ,Math.sin(seconds*(wing?16:3))*side*(wing?.65:.18)));}}
   state.push({...p,visible:a.root.visible,occluded,source:a.source});
  }
 },inspect:()=>state};
}
