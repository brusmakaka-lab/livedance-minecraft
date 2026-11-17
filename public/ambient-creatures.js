import {GroundTraffic,obstacleDistance} from './ground-traffic.js';
import {sampleImportedPose,applyOffering,walkClipTime} from './ambient-animation.js';
import {creaturePlan,ambientEventPlan,CREATURE_SPECIES} from './ambient-plan.js';
import {mutantStaging} from './mutant-staging.js';
import {buildMutantModel} from './mutant-model.js';
import {buildCharacter} from './characters.js';
export {creaturePlan,ambientEventPlan} from './ambient-plan.js';
export async function buildAmbientCreatures(THREE){
 const [{GLTFLoader},{clone}]=await Promise.all([import('/vendor/three-0.186.1/examples/jsm/loaders/GLTFLoader.js'),import('/vendor/three-0.186.1/examples/jsm/utils/SkeletonUtils.js')]);
 const traffic=new GroundTraffic(),collisionRadii=new Map(),walkerKinds=new Map();let seed=0;
 const loader=new GLTFLoader(),templates=new Map(),pools=new Map(),group=new THREE.Group();group.name='Visitantes ambientales · recursos descargados';
 await Promise.all([...CREATURE_SPECIES,'iron_golem','villager'].map(async kind=>{const data=await loader.loadAsync('/assets/downloaded/mobs/'+kind+'.glb');if(!data.animations.length)throw Error('Falta la animación descargada: '+kind);const materials=new Map();data.scene.traverse(o=>{if(!o.isMesh)return;o.frustumCulled=true;const convert=m=>{if(materials.has(m))return materials.get(m);if(!m.map)throw Error('Falta textura descargada: '+kind);const map=m.map;map.colorSpace=THREE.SRGBColorSpace;map.magFilter=map.minFilter=THREE.NearestFilter;map.generateMipmaps=false;const result=new THREE.MeshLambertMaterial({map,alphaTest:.5,side:THREE.DoubleSide,transparent:false});materials.set(m,result);return result;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);});templates.set(kind,data);}));
 const heights={pig:1.8,sheep:1.95,chicken:1.4,creeper:2.9,spider:1.05,cow:2.2,iron_golem:4.9,villager:2.7};let enabled=true,lastPlan=creaturePlan(0),active=[],lastTime=null,quietTime=0,lastEvent={type:null},blocked=false;
 function create(kind){const template=templates.get(kind),model=clone(template.scene),root=new THREE.Group(),mixer=new THREE.AnimationMixer(model);const own=new Map();model.traverse(o=>{if(o.isMesh){const copy=m=>{if(!own.has(m))own.set(m,m.clone());return own.get(m);};o.material=Array.isArray(o.material)?o.material.map(copy):copy(o.material);}});const clip=template.animations[0];mixer.clipAction(clip).play();mixer.setTime(0);model.updateMatrixWorld(true);model.traverse(o=>{if(o.isSkinnedMesh){o.computeBoundingSphere();o.boundingSphere.radius*=2;}});const box=new THREE.Box3().setFromObject(model,true),size=box.getSize(new THREE.Vector3()),scale=heights[kind]/size.y;if(!Number.isFinite(scale))throw Error('Modelo sin volumen: '+kind);model.scale.multiplyScalar(scale);model.position.set(-(box.min.x+box.max.x)*.5*scale,-box.min.y*scale,-(box.min.z+box.max.z)*.5*scale);root.add(model);root.visible=false;group.add(root);const offerArm=kind==='iron_golem'?(model.getObjectByName('armright')||model.getObjectByName('arm_right')||model.getObjectByName('arm.right')):null;const instance={root,mixer,model,clip,offerArm,clipArmPose:offerArm?.quaternion.clone(),source:kind+'.glb',radius:0,opacity:1};
 if(!collisionRadii.has(kind)){let radius=0;for(let i=0;i<8;i++){sampleImportedPose(instance,clip.duration*i/8);root.updateMatrixWorld(true);const b=new THREE.Box3().setFromObject(root,true);radius=Math.max(radius,Math.hypot(Math.max(Math.abs(b.min.x),Math.abs(b.max.x)),Math.max(Math.abs(b.min.z),Math.abs(b.max.z))));}collisionRadii.set(kind,radius+.12);sampleImportedPose(instance,0);}instance.radius=collisionRadii.get(kind);return instance;}
 function get(kind,index){let pool=pools.get(kind);if(!pool){pool=[];pools.set(kind,pool);}while(pool.length<=index)pool.push(create(kind));return pool[index];}
 const golem=get('iron_golem',0),villager=get('villager',0),mutant=await buildMutantModel(THREE),mutantRoot=new THREE.Group();mutantRoot.add(mutant.root);group.add(mutantRoot);
 const flowerMap=await new THREE.TextureLoader().loadAsync('/assets/downloaded/mobs/poppy.png');flowerMap.colorSpace=THREE.SRGBColorSpace;flowerMap.minFilter=flowerMap.magFilter=THREE.NearestFilter;const flower=new THREE.Mesh(new THREE.PlaneGeometry(.85,.85),new THREE.MeshLambertMaterial({map:flowerMap,alphaTest:.25,side:THREE.DoubleSide,transparent:true}));group.add(flower);
 // This is an existing downloaded Herobrine skin, on the established skin rig.
 const myth=buildCharacter(THREE,'skdb-85','ambient-herobrine'),mythRoot=new THREE.Group();mythRoot.add(myth.root);group.add(mythRoot);myth.joints.head.rotation.x=.3;myth.joints.rightArm.rotation.x=-.12;myth.joints.leftArm.rotation.x=-.12;
 for(const kind of CREATURE_SPECIES)get(kind,0);
 const mutantBounds=new THREE.Box3();let mutantState=null,manualWasActive=false,suppressedAutoKey=null;
 const eventObjects=[golem.root,villager.root,flower,mutantRoot,mythRoot];for(const o of eventObjects)o.visible=false;
 function opacity(root,value){root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){m.transparent=true;m.opacity=value;m.depthWrite=value>.98;}});}
 const box=new THREE.Box3(),projected=new THREE.Vector3(),right=new THREE.Vector3(),up=new THREE.Vector3(),forward=new THREE.Vector3();
 function screenRect(bounds,camera){let l=Infinity,r=-Infinity,t=Infinity,b=-Infinity;for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){projected.set(x,y,z).project(camera);l=Math.min(l,projected.x);r=Math.max(r,projected.x);t=Math.min(t,projected.y);b=Math.max(b,projected.y);}return {l,r,t,b};}
 function covers(root,camera,protectedBoxes){if(!camera||!protectedBoxes?.length)return false;root.updateMatrixWorld(true);box.setFromObject(root,true);const a=screenRect(box,camera);return protectedBoxes.some(b=>{const p=screenRect(b,camera);return a.l<p.r+.08&&a.r>p.l-.08&&a.t<p.b+.08&&a.b>p.t-.08;});}
 function update(seconds,context={}){
  const dt=lastTime===null?0:Math.max(0,Math.min(.1,seconds-lastTime));lastTime=seconds;blocked=!!context.busy;if(enabled&&!blocked&&!context.manualEvent)quietTime+=dt;
  lastPlan=creaturePlan(seconds+seed,{...context,seed});
  for(const p of lastPlan.actors){let selected=walkerKinds.get(p.id);if(!selected){selected={kind:p.kind};walkerKinds.set(p.id,selected);}
   if(selected.kind!==p.kind&&context.camera&&selected.root){selected.root.getWorldPosition(projected);projected.y+=heights[selected.kind]*.5;projected.project(context.camera);if(Math.abs(projected.x)>2||Math.abs(projected.y)>2||Math.abs(projected.z)>1){const radius=collisionRadii.get(p.kind),position=selected.root.position,safe=(context.obstacles||[]).every(o=>obstacleDistance(position,o)>=radius+o.radius+.14)&&active.every(a=>a.root===selected.root||Math.hypot(position.x-a.root.position.x,position.z-a.root.position.z)>=radius+a.radius+.14);if(safe)selected.kind=p.kind;}}
   p.kind=selected.kind;p.radius=collisionRadii.get(p.kind);
  }
  lastPlan.actors=traffic.update(lastPlan.actors,dt,context.obstacles||[]);for(const a of active)a.root.visible=false;active=[];const used={};
  for(const p of lastPlan.actors){const index=used[p.kind]||0;used[p.kind]=index+1;const a=get(p.kind,index);a.root.position.set(p.x,0,p.z);a.root.rotation.y=p.yaw;sampleImportedPose(a,walkClipTime(p.kind,p.distance,a.clip.duration,p.animationPhase));a.root.updateMatrixWorld(true);
   // Walkers stay present. Depth occlusion is natural; no collision/foreground fade.
   a.root.visible=true;p.screenSuppressed=false;p.visible=true;walkerKinds.get(p.id).root=a.root;active.push(a);
  }
  for(const o of eventObjects)o.visible=false;
  const automatic=ambientEventPlan(context.eventTime===undefined?quietTime:context.eventTime),autoKey=automatic.type?`${automatic.block}:${automatic.start}:${automatic.type}`:null;
  if(context.manualEvent){manualWasActive=true;if(autoKey)suppressedAutoKey=autoKey;}
  else if(manualWasActive){manualWasActive=false;if(autoKey)suppressedAutoKey=autoKey;}
  lastEvent=context.manualEvent?(context.manualEvent.ended?{type:null,manual:true}:context.manualEvent):autoKey&&autoKey===suppressedAutoKey?{type:null}:automatic;
  if(!enabled||blocked||!lastEvent.type)return;
  const e=lastEvent,t=e.time,fade=e.opacity;
  if(e.type==='flower'){
   const approach=Math.min(1,t/6),leave=Math.max(0,(t-21)/6),x=-7+(1-approach)*-7-leave*7;golem.root.position.set(x,0,-5.5);villager.root.position.set(-3+(1-approach)*7+leave*7,0,-5.5);golem.root.rotation.y=t<6?Math.PI/2:t>21?-Math.PI/2:Math.PI/2;villager.root.rotation.y=t>21?Math.PI/2:-Math.PI/2;
   const moving=t<6||t>21;const travelDistance=t<6?7*Math.min(1,t/6):t>21?7*(t-21)/6:0;sampleImportedPose(golem,walkClipTime('iron_golem',travelDistance,golem.clip.duration));sampleImportedPose(villager,walkClipTime('villager',travelDistance,villager.clip.duration));golem.root.updateMatrixWorld(true);
   // The walk is imported. Offering the downloaded flower is a local ambient
   // staging pose, independent from the participant dance library.
   const arm=golem.model.getObjectByName('armright')||golem.model.getObjectByName('arm_right')||golem.model.getObjectByName('arm.right');const offer=Math.sin(Math.min(1,Math.max(0,(t-6)/2))*Math.PI/2)*Math.sin(Math.min(1,Math.max(0,(23-t)/2))*Math.PI/2);
   applyOffering(THREE,golem,offer);
   const hand=golem.offerArm,recipient=new THREE.Vector3(villager.root.position.x-.65,1.7,-5.2);if(hand){golem.root.updateMatrixWorld(true);flower.position.set(0,2.6,0).applyMatrix4(hand.matrixWorld).lerp(recipient,Math.min(1,Math.max(0,(t-13)/2)));}else flower.position.copy(recipient);flower.rotation.y=0;flower.visible=t>7&&t<23;
   for(const o of [golem.root,villager.root]){o.visible=true;opacity(o,fade);}flower.material.opacity=fade;
  }else if(e.type==='mutant'){
   mutantRoot.visible=true;mutantState=mutantStaging(t,mutant.walkDuration);mutantRoot.position.set(mutantState.x,0,mutantState.z);mutantRoot.rotation.y=mutantState.yaw;
   mutant.stage(mutantState,t);opacity(mutantRoot,Math.min(fade,mutantState.opacity));mutantRoot.updateMatrixWorld(true);mutantBounds.setFromObject(mutantRoot,true);
  }else if(e.type==='herobrine'){
   mythRoot.visible=true;if(context.camera){const camera=context.camera;camera.updateMatrixWorld(true);right.setFromMatrixColumn(camera.matrixWorld,0);up.setFromMatrixColumn(camera.matrixWorld,1);camera.getWorldDirection(forward);mythRoot.position.copy(camera.position).addScaledVector(forward,34).addScaledVector(up,4.2+Math.sin(t*.9)*.18).addScaledVector(right,Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*34*camera.aspect*.66);mythRoot.quaternion.copy(camera.quaternion);mythRoot.scale.setScalar(2.8);myth.joints.head.rotation.x=.34+Math.sin(t*.7)*.055;}else{mythRoot.position.set(0,12,-12);mythRoot.scale.setScalar(2.8);mythRoot.rotation.set(0,0,0);}opacity(mythRoot,fade*.76);
  }
  for(const o of eventObjects)if(o.visible&&covers(o,context.camera,context.protectedBoxes))o.visible=false;
 }
 return {group,setSeed:s=>{if(Number.isFinite(s))seed=s%1800;},eventFrame:()=>lastEvent,cameraBounds:()=>enabled&&!blocked&&lastEvent.type==='mutant'&&mutantRoot.visible?mutantBounds:null,eventVisible:()=>enabled&&!blocked&&eventObjects.some(o=>o.visible),setEnabled:value=>{enabled=!!value;group.visible=enabled;},update,inspect:()=>({enabled,decorative:true,downloadedModels:true,animationSource:'22i / minecraft-voxel-blender-models; MutantBeasts source poses',protectedRearZone:false,collisionVisibility:'persistent',collisionRadii:Object.fromEntries(collisionRadii),quietTime,event:{...lastEvent,suppressed:blocked,visible:enabled&&!blocked&&eventObjects.some(o=>o.visible),mutantMotion:lastEvent.type==='mutant'?mutantState:null,mutantBounds:lastEvent.type==='mutant'?{min:mutantBounds.min.toArray(),max:mutantBounds.max.toArray()}:null,golemArm:golem.offerArm?.quaternion.toArray(),golemClipArm:golem.clipArmPose?.toArray()},...lastPlan,actors:lastPlan.actors.map((a,i)=>({...a,model:active[i]?.source,modelRadius:active[i]?.radius,sampleTime:active[i]?.sampleTime,limbs:active[i]?.model.getObjectsByProperty('isBone',true).filter(b=>/leg/i.test(b.name)).map(b=>({name:b.name,q:b.quaternion.toArray()})),safeBounds:{minZ:a.z-(active[i]?.radius||a.radius),maxZ:a.z+(active[i]?.radius||a.radius)}}))})};
}
