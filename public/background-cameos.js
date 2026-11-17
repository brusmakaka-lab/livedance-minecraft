import {SUV_BAY} from './world-layout.js';
import {createFlyingCreatures} from './flying-creatures.js';
import {mergeGeometries} from '/vendor/three-0.186.1/examples/jsm/utils/BufferGeometryUtils.js';
import {GLTFLoader} from '/vendor/three-0.186.1/examples/jsm/loaders/GLTFLoader.js';
const clamp=n=>Math.max(0,Math.min(1,n)),ease=n=>{n=clamp(n);return n*n*(3-2*n);};
export async function buildBackgroundCameos(THREE,scene,camera,renderer){
 const loader=new GLTFLoader(),group=new THREE.Group();group.name='Recursos descargados · apariciones';scene.add(group);
 const assets={};
 await Promise.all([['bee','bee/scene.gltf',1.1],['allay','allay/scene.gltf',1.7],['suv','/assets/downloaded/visual-quality/pickup.glb',3.2],['chest','chest.glb',.72]].map(async([id,file,height])=>{try{
  const data=await loader.loadAsync(file.startsWith('/')?file:'/assets/downloaded/polish/'+file),root=new THREE.Group();root.add(data.scene);group.add(root);root.visible=false;
  const converted=new Map();
  data.scene.traverse(o=>{if(!o.isMesh)return;const convert=m=>{if(converted.has(m))return converted.get(m);let material;
   if(id==='suv'){
    material=m.clone();if(material.map){material.map.magFilter=THREE.LinearFilter;material.map.colorSpace=THREE.SRGBColorSpace;material.map.anisotropy=4;}
    if(/glass|clearlens/.test(m.name)){material.transparent=true;material.opacity=/glass/.test(m.name)?.48:.72;material.depthWrite=false;}
   }else{if(m.map){m.map.magFilter=THREE.NearestFilter;m.map.colorSpace=THREE.SRGBColorSpace;}material=new THREE.MeshLambertMaterial({color:m.color,map:m.map,alphaTest:.25,side:THREE.DoubleSide,emissive:id==='allay'?0x095455:0x000000,emissiveIntensity:.25});}
   material.userData.fadeBase={opacity:material.opacity,transparent:material.transparent,depthWrite:material.depthWrite};converted.set(m,material);return material;};o.material=Array.isArray(o.material)?o.material.map(convert):convert(o.material);});
  if(id==='suv'){
   const body=new THREE.Group(),wheels=new THREE.Group(),pieces=[];body.name='BodyAssembly';wheels.name='WheelAssembly';data.scene.traverse(o=>{if(o.isMesh)pieces.push(o);});data.scene.add(body,wheels);data.scene.updateMatrixWorld(true);
   for(const mesh of pieces)(/^107 reused|^Brake |^Rotor |^Siped tread|^Ventilated/i.test(mesh.name)?wheels:body).attach(mesh);
   mergeStaticVehicle(body);mergeStaticVehicle(wheels);
   if(renderer){const environment=new THREE.Scene();environment.background=new THREE.Color('#70839d');const resources=[];
    for(const [x,y,z,w,h,power]of [[-5,4,2,4,8,4],[5,3,-2,3,7,2],[0,7,0,7,5,3]]){const g=new THREE.PlaneGeometry(w,h),m=new THREE.MeshBasicMaterial({color:new THREE.Color(power,power,power)}),panel=new THREE.Mesh(g,m);panel.position.set(x,y,z);panel.lookAt(0,1,0);environment.add(panel);resources.push(g,m);}
    const pmrem=new THREE.PMREMGenerator(renderer),reflection=pmrem.fromScene(environment,.04).texture;pmrem.dispose();resources.forEach(r=>r.dispose());for(const m of converted.values()){m.envMap=reflection;m.envMapIntensity=.75;}
   }
  }
  root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(data.scene),size=bounds.getSize(new THREE.Vector3()),scale=height/size.y;data.scene.scale.multiplyScalar(scale);data.scene.position.set(-(bounds.min.x+bounds.max.x)*.5*scale,-bounds.min.y*scale,-(bounds.min.z+bounds.max.z)*.5*scale);
  const mixer=new THREE.AnimationMixer(data.scene),clip=data.animations.find(a=>a.name.endsWith('.flying'));if(clip)mixer.clipAction(clip).play();
  const parts={};for(const name of ['left_wing_9','right_wing_11','left_arm_5','right_arm_7']){const bone=data.scene.getObjectByName(name);if(bone)parts[name]={bone,q:bone.quaternion.clone()};}
  assets[id]={root,model:data.scene,mixer,clip,parts,body:data.scene.getObjectByName('BodyAssembly'),wheels:data.scene.getObjectByName('WheelAssembly'),source:file,meshes:data.scene.getObjectsByProperty('isMesh',true).length};
  if(id==='chest'){
   const lid=data.scene.getObjectByName('Barrel_lid_002')||data.scene.getObjectByName('Barrel lid 002');
   if(lid){data.scene.updateWorldMatrix(true,true);const box=new THREE.Box3().setFromObject(lid),pivot=new THREE.Group();pivot.position.copy(data.scene.worldToLocal(new THREE.Vector3(box.getCenter(new THREE.Vector3()).x,box.min.y+(box.max.y-box.min.y)*.48,box.min.z)));data.scene.add(pivot);pivot.attach(lid);assets[id].lid=pivot;}
   camera.add(root);root.position.set(0,.7,-7);root.rotation.y=-.28;scene.add(camera);
  }
 }catch(e){assets[id]={error:e.message};console.warn('Recurso de fondo no disponible:',id);}}));
 const flyers=createFlyingCreatures(THREE,assets,camera);
 const assetInfo=Object.fromEntries(Object.entries(assets).map(([id,a])=>[id,{loaded:!!a.root,error:a.error,source:a.source,importedClip:!!a.clip,meshes:a.meshes}]));
 const manifest=await fetch('/assets/local-memes/manifest.json').then(r=>r.json()).catch(()=>[]);let video=null,videoTexture=null,videoPlane=null,videoId=null,lastType=null,status={},chestPending=null,chestAge=null,chestId=null,lastSeconds=null;
 const errorToast=document.createElement('div');errorToast.id='cameo-error';errorToast.hidden=true;errorToast.setAttribute('role','status');document.querySelector('#stage').append(errorToast);
 function fade(root,value){if(Math.abs((root.userData.fade??-1)-value)<.001)return;root.userData.fade=value;root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material]){const base=m.userData.fadeBase||{opacity:1,transparent:false,depthWrite:true},transparent=base.transparent||value<.999;if(m.transparent!==transparent){m.transparent=transparent;m.needsUpdate=true;}m.opacity=base.opacity*value;m.depthWrite=base.depthWrite&&value>.98;}});}
 function stopVideo(){if(video){video.pause();video.removeAttribute('src');video.load();}if(videoPlane){group.remove(videoPlane);videoPlane.geometry.dispose();videoPlane.material.dispose();}videoTexture?.dispose();videoTexture=videoPlane=video=null;videoId=null;}
 function playMeme(id){stopVideo();const item=manifest.find(m=>m.id===id);if(!item)return;videoId=id;video=document.createElement('video');video.src=item.url;video.muted=true;video.playsInline=true;video.loop=true;video.preload='auto';videoTexture=new THREE.VideoTexture(video);videoTexture.colorSpace=THREE.SRGBColorSpace;
  videoPlane=new THREE.Mesh(new THREE.PlaneGeometry(4.5,8),new THREE.MeshBasicMaterial({map:videoTexture,transparent:true,side:THREE.DoubleSide}));videoPlane.position.set(0,4.7,-7);group.add(videoPlane);video.onerror=()=>{errorToast.hidden=false;errorToast.textContent='No se pudo reproducir el video de fondo.';};void video.play().catch(()=>{errorToast.hidden=false;errorToast.textContent='Recargá el escenario para habilitar el video de fondo.';});
 }
 function update(seconds,{event,busy=false,enabled=true,paused=false,goalId=null,protectedBoxes=[]}={}){
  const dt=lastSeconds===null?0:Math.max(0,Math.min(.1,seconds-lastSeconds));lastSeconds=seconds;
  flyers.update(seconds,{enabled,protectedBoxes});
  for(const id of ['suv'])if(assets[id]?.root)assets[id].root.visible=false;
  const e=enabled&&event&&!event.ended?event:null,type=e?.type||null,isMeme=type?.startsWith('meme-'),time=e?.time||0,opacity=e?.opacity??1;
  if(isMeme&&videoId!==type)playMeme(type);else if(!isMeme&&video)stopVideo();
  if(videoPlane){videoPlane.visible=!busy&&enabled;videoPlane.material.opacity=opacity;videoPlane.lookAt(camera.position);if(paused||busy){video.pause();}else if(video.paused)void video.play().catch(()=>{});if(!busy&&!paused&&video.readyState>=2&&Math.abs(video.currentTime-(time%video.duration))>.6)video.currentTime=time%video.duration;}
  const a=type==='suv'?assets.suv:null;if(a?.root&&!busy&&enabled){a.root.visible=true;fade(a.root,opacity);const enter=ease(time/2),leave=ease((time-((e.duration||18)-2))/2);
   if(type==='suv'){a.root.position.set(SUV_BAY.x,0,SUV_BAY.z);a.root.scale.setScalar(.96+.04*enter);a.root.rotation.set(0,-.7,0);if(a.body){a.body.position.y=.13+.13*Math.sin(time*4.1);a.body.rotation.z=Math.sin(time*4.1)*.025;}}

  }
  if(chestPending&&chestPending.id!==goalId)chestPending=null;if(chestAge!==null&&chestId!==goalId)chestAge=null;
  if(chestPending&&!busy&&chestAge===null){chestAge=0;chestId=chestPending.id;chestPending=null;}
  const chest=assets.chest;if(chest?.root){if(chestAge!==null&&!busy&&!paused)chestAge+=dt;chest.root.visible=chestAge!==null&&chestAge<9&&!busy;if(chest.root.visible){const fadeValue=ease(chestAge/.8)*ease((9-chestAge)/1.5);fade(chest.root,fadeValue);chest.root.position.y=.7+Math.sin(chestAge*2)*.08;if(chest.lid)chest.lid.rotation.x=-ease((chestAge-1)/1.3)*1.65;chest.root.scale.setScalar(.9+ease(chestAge/.8)*.1);}if(chestAge!==null&&chestAge>=9)chestAge=null;}
  status={vehicle:{bay:SUV_BAY,bodyY:assets.suv?.body?.position.y,wheelsY:assets.suv?.wheels?.position.y,realistic:true,glassOpacity:assets.suv?.model?.getObjectsByProperty('isMesh',true).find(o=>/glass/.test(o.material.name))?.material.opacity},type,visible:!busy&&enabled&&!!(a?.root||videoPlane)&&!!type,paused:paused||busy,video:videoId,videoTime:video?.currentTime||0,videoPlaying:!!video&&!video.paused,chestVisible:!!chest?.root?.visible,chestAge,chestId,chestLid:chest?.lid?.rotation.x??null,flyingCreatures:flyers.inspect(),assets:assetInfo};
 }
 window.addEventListener('pagehide',stopVideo,{once:true});
 return {update,celebrate(s){if(s.id!==chestId)chestPending=s;},inspect:()=>status};
}

// Merge downloaded pickup pieces per material and suspension assembly once.
// Bake transforms and merge by material once; preserve the authored geometry.
function mergeStaticVehicle(model){
 model.updateWorldMatrix(true,true);const inverse=model.matrixWorld.clone().invert(),batches=new Map(),old=[];
 model.traverse(o=>{if(!o.isMesh)return;if(Array.isArray(o.material))throw Error('El SUV debe usar una sola asignación por pieza.');const g=o.geometry.clone().applyMatrix4(inverse.clone().multiply(o.matrixWorld));if(!g.attributes.uv)g.setAttribute('uv',new (g.attributes.position.constructor)(new Float32Array(g.attributes.position.count*2),2));if(!batches.has(o.material))batches.set(o.material,[]);batches.get(o.material).push(g);old.push(o);});
 const merged=[];for(const [material,pieces]of batches){const geometry=mergeGeometries(pieces,false);if(!geometry)throw Error('No se pudieron agrupar las piezas del SUV.');const mesh=new (old[0].constructor)(geometry,material);mesh.name='SUV · '+(material.name||'material');merged.push(mesh);for(const g of pieces)g.dispose();}
 for(const mesh of old){mesh.removeFromParent();mesh.geometry.dispose();}model.add(...merged);
}
