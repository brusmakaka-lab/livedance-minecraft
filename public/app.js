import {creatureObstacles} from './creature-obstacles.js';
import {buildArrivalFX} from './arrival-fx.js';
import {loadParticleTextures} from './particle-assets.js';
import {mutantCameraImpulse} from './visual-motion.js';
import {buildCommunityFX} from './community-fx.js';
import {buildWorldDecor,WORLD_OBSTACLES} from './world-decor.js';
import {buildWorldLandscape} from './world-landscape.js';
import {mountLikesGoal} from './likes-goal-ui.js';
import {buildBackgroundCameos} from './background-cameos.js';
import {createFrameProfile} from './frame-profile.js';
import {defaultDancePools} from './dance-settings.js';
import {buildShareCelebration,interactionFrame} from './social-stage.js';
import {mountContributions} from './contribution-board.js';
import {buildAuraCompanions} from './aura-companions.js';
import {giantScale} from './effect-presentation.js';
import {departure,DEPARTURE_SECONDS,manualEventFrame} from './presentation-motion.js';
import {ROTATION_JOINTS} from './motion-rotation.js';
import * as THREE from '/vendor/three-0.186.1/three.module.js';
import {defaultSkin,prepareSkin,buildBody,hash} from './skin-atlas.js';
import {buildCharacter,characterForViewer,characterById,loadCharacterSkins} from './characters.js';
import {DancePlayer,DANCES,POSE,entrance} from './motion.js';
import {buildAura} from './stage-fx.js';
import {buildCountryFlags} from './country-flags.js';
import {buildWorldSky} from './world-sky.js';
import {buildAmbientCreatures} from './ambient-creatures.js';
import {placeNames} from './name-layout.js';
import {MusicPlayer} from './audio-player.js';
import {stageSlot,flowSlot,visibleSector,freeSlot,foregroundPlan} from './presentation.js';

await loadCharacterSkins();
const localDances=new Set(DANCES.filter(d=>d.beats).map(d=>d.id));
const canvas=document.querySelector('#canvas3d'),scene=new THREE.Scene(),query=new URLSearchParams(location.search);
const portraitOutput=query.get('layout')!=='full';document.body.classList.toggle('portrait-output',portraitOutput);document.body.classList.toggle('transparent-output',query.get('transparent')==='1');
const renderer=new THREE.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'high-performance'});
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;renderer.setClearColor(0x000000,0);
const profiler=createFrameProfile(renderer,query.get('profile')==='1');
const camera=new THREE.PerspectiveCamera(43,1,.1,500),clock=new THREE.Clock(),names=document.querySelector('#names'),actors=new Map();
const particleMaps=await loadParticleTextures(THREE),reducedMotion=matchMedia('(prefers-reduced-motion: reduce)'),baseCameraQuaternion=new THREE.Quaternion();let cameraImpulse={strength:0};
const shareCelebration=buildShareCelebration(THREE,scene,particleMaps),shareToast=document.createElement('div');shareToast.id='share-toast';shareToast.hidden=true;document.querySelector('#stage').append(shareToast);let dancePools=defaultDancePools(),interactionView=null,interactionReceived=0,lastSocialId=null;
let width=innerWidth,height=innerHeight,capacity=40,elapsed=0,frameCount=0,connection={},selectedId=null,focusUntil=0,paused=false,mode='auto',quality=720,bpm=112,danceMode='auto',focusPriority=0,arrivalView=null,arrivalReceived=0,lastArrivalId=null,handoffId=null,handoffUntil=0,noticeTimer,cameraCut=false,lastShot={ids:[],giftIds:[],anchors:{}},presentationLanes={},effectView={active:[],pendingCount:0,paused:false},effectReceived=0,manualFocusId=null,presentationRevision=-1;
const look=new THREE.Vector3(0,1.25,0),cameraGoal=new THREE.Vector3(),projected=new THREE.Vector3(),headPoint=new THREE.Vector3(),labelRay=new THREE.Ray(),rayDirection=new THREE.Vector3(),rayHit=new THREE.Vector3();
if(['auto','individual','group','sector'].includes(query.get('camera')))mode=query.get('camera');
if([540,720,1080].includes(Number(query.get('quality'))))quality=Number(query.get('quality'));
const transparent=query.get('transparent')==='1';
const hemisphere=new THREE.HemisphereLight('#ffffff','#87929c',2.2);scene.add(hemisphere);
const light=new THREE.DirectionalLight('#fff8ec',2.5);light.position.set(-6,12,7);scene.add(light);const fill=new THREE.DirectionalLight('#b9d9ff',.65);fill.position.set(5,4,-6);scene.add(fill);
const landscape=await buildWorldLandscape(THREE,scene),floorMap=landscape.groundMap;floorMap.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());
const floor=new THREE.Mesh(new THREE.PlaneGeometry(20000,20000),new THREE.MeshLambertMaterial({map:floorMap,color:landscape.groundColor}));floor.rotation.x=-Math.PI/2;floor.position.set(0,-.035,0);scene.add(floor);
const worldSky=await buildWorldSky(THREE,scene,{transparent,hemisphere,sun:light,fill}),ambientCreatures=await buildAmbientCreatures(THREE);scene.add(ambientCreatures.group);
const worldDecor=await buildWorldDecor(THREE,scene);
let communityView={items:[]},communityReceived=0,skyClock={timeMs:0,paused:false},skyReceived=0;
function communityFor(id){const e=communityView.items.find(e=>e.viewerId===id)||{},dt=communityView.paused?0:performance.now()-communityReceived;return {aura:e.aura>dt,vip:e.vip>dt};}
const backgroundCameos=await buildBackgroundCameos(THREE,scene,camera,renderer);
const auraCompanions=await buildAuraCompanions(THREE);scene.add(auraCompanions.group);
const countryFlags=buildCountryFlags(THREE);scene.add(countryFlags.group);
function radialTexture(){const c=document.createElement('canvas');c.width=c.height=128;const g=c.getContext('2d'),r=g.createRadialGradient(64,64,8,64,64,64);r.addColorStop(0,'#ffffffd0');r.addColorStop(.5,'#ffffff80');r.addColorStop(1,'#ffffff00');g.fillStyle=r;g.fillRect(0,0,128,128);return new THREE.CanvasTexture(c);}
const glowMap=radialTexture(),shadowMap=radialTexture();
function halo(color,radius,opacity=.7){const mesh=new THREE.Mesh(new THREE.PlaneGeometry(radius*2,radius*2),new THREE.MeshBasicMaterial({map:glowMap,color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending}));mesh.rotation.x=-Math.PI/2;mesh.position.y=.018;return mesh;}
function crown(){const group=new THREE.Group(),gold=new THREE.MeshLambertMaterial({color:'#ffd632',emissive:'#9d6800',emissiveIntensity:.4});
 const band=new THREE.Mesh(new THREE.BoxGeometry(.91,.16,.91),gold);group.add(band);
 for(const x of [-.36,0,.36])for(const z of [-.36,.36]){const tooth=new THREE.Mesh(new THREE.BoxGeometry(.16,.28,.16),gold);tooth.position.set(x,.2,z);group.add(tooth);}
 group.position.y=3.02;group.visible=false;return group;
}
function receiveArrivals(data){
 arrivalView=data;arrivalReceived=performance.now();document.querySelector('#entry-hint').textContent=data?.trigger==='chat'?'Un comentario crea tu personaje.':'Tu personaje aparece al ingresar al directo.';const active=data?.active;document.body.classList.toggle('has-arrival',!!active);
 if(lastArrivalId&&lastArrivalId!==active?.viewerId){handoffId=lastArrivalId;handoffUntil=elapsed+1.2;}
 if(!active){if(lastArrivalId&&focusPriority===4){focusPriority=0;focusUntil=elapsed;}lastArrivalId=null;return;}
 const a=actors.get(active.viewerId);if(!a)return;
 const age=(active.durationMs-active.remainingMs)/1000;if(lastArrivalId!==active.viewerId){a.born=elapsed-age;a.justRestored=true;a.entrySeed=hash(a.id+active.startedAt);cameraCut=false;}
 lastArrivalId=active.viewerId;selectedId=a.id;focusPriority=4;focusUntil=elapsed+active.remainingMs/1000;hero(a,active.source==='gift'?'GRACIAS POR TU REGALO':active.source==='member'?'ENTRÓ AL DIRECTO':'SE SUMÓ A LA PISTA');
}
function notice(text){const box=document.querySelector('#notice');box.textContent=text;box.hidden=false;clearTimeout(noticeTimer);noticeTimer=setTimeout(()=>box.hidden=true,4500);}
function updateStatus(state){connection=state;paused=!!state.paused;document.body.classList.toggle('scene-paused',paused);document.querySelector('#status').textContent='EN PISTA';document.querySelector('#status-dot').style.background=state.connected?'#77ec77':'#ffd760';}
function hero(actor,title='SE UNIÓ A LA FIESTA'){
 if(!actor||query.get('hud')==='0')return;document.querySelector('#hero').hidden=false;document.querySelector('#hero-title').textContent=title;document.querySelector('#hero-name').textContent=actor.username;
 const portrait=document.querySelector('#hero-face');portrait.style.backgroundImage=`url(${actor.body.portrait})`;document.querySelector('#hero').style.setProperty('--character-accent',actor.body.character?.accent||'#85ff8c');
 const key=actor.id+title;if(document.querySelector('#hero').dataset.key!==key){document.querySelector('#hero').dataset.key=key;document.querySelector('#hero').animate([{opacity:0,transform:'translateY(-12px) scale(.94)'},{opacity:1,transform:'translateY(0) scale(1)'}],{duration:420,easing:'cubic-bezier(.16,1,.3,1)'});}
 portrait.style.borderColor=title.includes('REGALO')?'#ffd766':'#76ff77';
}
function focus(actor,title,duration=5,priority=1){if(elapsed<focusUntil&&priority<focusPriority){if(actor.id===selectedId)hero(actor,title);return;}focusPriority=priority;selectedId=actor.id;focusUntil=elapsed+duration;hero(actor,title);}
function retire(id){const a=actors.get(id);if(!a||a.retireAt!==undefined)return;a.retireAt=elapsed;a.retireOrigin=a.root.position.clone();a.retireBodyScale=a.body.root.scale.clone();a.label.hidden=true;if(selectedId===id){selectedId=[...actors.values()].find(x=>x.id!==id&&x.retireAt===undefined)?.id||null;hero(actors.get(selectedId));if(!selectedId)document.querySelector('#hero').hidden=true;}}
function remove(id){const a=actors.get(id);if(!a)return;auraCompanions.release(id);a.token++;a.body.root.removeFromParent();a.body.dispose();a.label.remove();a.root.removeFromParent();a.shadow.geometry.dispose();a.shadow.material.dispose();a.shadow.removeFromParent();
 a.fxRoot.removeFromParent();
 const disposeNodes=o=>{if(o.isInstancedMesh)o.dispose();if(o.isMesh||o.isPoints){o.geometry?.dispose();if(Array.isArray(o.material))o.material.forEach(m=>m.dispose());else o.material?.dispose();}};a.crown.traverse(disposeNodes);a.crown.removeFromParent();a.root.traverse(disposeNodes);a.fxRoot.traverse(disposeNodes);if(!a.aura.sharedTextures)a.aura.sparkMap.dispose();actors.delete(id);
 if(selectedId===id){selectedId=[...actors.values()].find(a=>a.retireAt===undefined)?.id||null;hero(actors.get(selectedId));}document.querySelector('#count').textContent=[...actors.values()].filter(x=>x.retireAt===undefined).length;
}
function create(record,arrival=false){if(!actors.size)cameraCut=true;const root=new THREE.Group(),body=buildCharacter(THREE,record.characterId,record.viewerId);root.add(body.root);scene.add(root);
 const occupied=new Set([...actors.values()].filter(a=>a.retireAt===undefined).map(a=>a.slot)),slot=Number.isInteger(record.slot)&&record.slot>=0&&record.slot<capacity&&!occupied.has(record.slot)?record.slot:freeSlot(occupied,record.order,capacity),p=flowSlot(Number.isInteger(record.rank)?record.rank:slot,capacity);root.position.set(p.x,0,p.z);
 const label=document.createElement('div');label.className='name';label.dataset.viewerId=record.viewerId;names.append(label);
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(1.8,1.5),new THREE.MeshBasicMaterial({map:shadowMap,color:'#22252a',transparent:true,opacity:.35,depthWrite:false}));shadow.rotation.x=-Math.PI/2;shadow.position.set(p.x,.006,p.z);scene.add(shadow);
 const a={id:record.viewerId,root,body,label,shadow,slot,rank:Number.isInteger(record.rank)?record.rank:slot,base:p,stageAnchor:new THREE.Vector3(p.x,0,p.z),occlusionBox:new THREE.Box3(),characterId:body.characterId,motion:new DancePlayer(hash(record.viewerId),body.character.dance),phase:(hash(record.viewerId)%1000)/160,born:arrival?elapsed:elapsed-4,token:0,requestedName:null,minecraftName:null,model:body.character.model||'classic',retryAt:0,roseUntil:0,donutUntil:0,auraUntil:arrival?elapsed+2.5:0,vipUntil:0,floatUntil:0,burstUntil:0};
 a.fxRoot=new THREE.Group();scene.add(a.fxRoot);a.aura=buildAura(THREE,a.fxRoot,glowMap,particleMaps);a.community=buildCommunityFX(THREE,a.fxRoot,particleMaps,hash(a.id));a.arrivalFX=buildArrivalFX(THREE,a.fxRoot,particleMaps);a.crown=crown();a.crown.position.y=body.height-2.52+.12;body.joints.head.add(a.crown);actors.set(a.id,a);publishPortrait(a);return a;
}
function upsert(record,arrival=false){if(!record?.viewerId)return;let a=actors.get(record.viewerId),fresh=!a;if(!a){if([...actors.values()].filter(x=>x.retireAt===undefined).length>=capacity){const oldest=[...actors.values()].find(x=>x.retireAt===undefined);remove(oldest.id);}a=create(record,arrival);}
 if(a.retireAt!==undefined){delete a.retireAt;for(const [m,v]of a.fadeMaterials||[])Object.assign(m,v);a.fadeMaterials=null;a.body.root.scale.set(1,1,1);}
 if(Number.isInteger(record.rank)){a.rank=record.rank;a.base=flowSlot(a.rank,capacity);}
 a.username=String(record.username||record.uniqueId||record.viewerId).slice(0,32);a.label.textContent=a.username;a.label.title=a.username;document.querySelector('#count').textContent=[...actors.values()].filter(x=>x.retireAt===undefined).length;
 if(record.minecraftName){if(record.minecraftName.toLowerCase()!==a.requestedName?.toLowerCase()&&Date.now()>=a.retryAt)void applySkin(a,record.minecraftName);}
 else{const character=characterById(record.characterId)||characterForViewer(record.viewerId);if(a.characterId!==character.id||a.minecraftName){a.token++;replaceBody(a,buildCharacter(THREE,character.id,a.id));a.characterId=character.id;a.minecraftName=null;a.requestedName=null;a.retryAt=0;a.model=character.model||'classic';a.motion=new DancePlayer(hash(a.id),character.dance);if(a.id===selectedId)hero(a,'EN LA PISTA');}}
 if(fresh&&arrival&&!arrivalView?.active&&!manualFocusId){selectedId=a.id;hero(a,'EN LA PISTA');}return a;
}
function publishPortrait(a){if(parent!==window)parent.postMessage({type:'actor-portrait',viewerId:a.id,portrait:a.body.portrait},location.origin);}
function replaceBody(a,body){a.body.root.removeFromParent();a.body.dispose();a.body=body;a.root.add(body.root);body.joints.head.add(a.crown);a.crown.position.y=body.height-2.52+.12;publishPortrait(a);}
async function applySkin(a,name){const token=++a.token;a.requestedName=name;
 try{const response=await fetch(`/api/skins/${encodeURIComponent(name)}`,{signal:AbortSignal.timeout(30000)}),profile=await response.json();if(!response.ok)throw Error(profile.error);
 const png=await fetch(profile.textureUrl,{signal:AbortSignal.timeout(10000)});if(!png.ok)throw Error('No se pudo descargar la textura.');const image=await createImageBitmap(await png.blob());
 if(token!==a.token||!a.root.parent){image.close();return;}const atlas=prepareSkin(THREE,image);image.close();const body=buildBody(THREE,atlas,profile.model);replaceBody(a,body);a.characterId=null;a.model=profile.model;a.minecraftName=profile.name;a.retryAt=0;if(a.id===selectedId)hero(a,arrivalView?.active?.viewerId===a.id&&arrivalView.active.source==='member'?'ENTRÓ AL DIRECTO':'EN LA PISTA');
 }catch(e){if(token!==a.token||!a.root.parent)return;a.requestedName=null;a.retryAt=Date.now()+30000;notice(`${a.username}: ${e.message} Se conserva su avatar.`);}
}
function effect(event){const duration=Math.max(.1,(event.remainingMs??event.durationMs??({Rose:10000,Donut:12000,VIP:18000,Float:12000}[event.type]||8000))/1000);const a=actors.get(event.viewerId);if(!a)return;focus(a,event.type==='VIP'?'MOMENTO VIP':'REGALO RECIBIDO',6,2);a.auraUntil=elapsed+duration;
 if(event.type==='Rose'){a.roseUntil=elapsed+duration;if(!a.light){a.light=new THREE.PointLight('#ff3155',3.5,4,2);a.light.position.set(0,2.7,.6);a.root.add(a.light);}}
 if(event.type==='Donut'){a.donutUntil=elapsed+duration;a.burstUntil=elapsed+3;}
 if(event.type==='VIP')a.vipUntil=elapsed+duration;
 if(event.type==='Float')a.floatUntil=elapsed+duration;
 // Gift names and combined effects are already shown in the top presentation card.
}
function receiveEffects(data){effectView=data||{active:[],pendingCount:0};effectReceived=performance.now();}
function syncEffects(){const delta=effectView.paused?0:Math.max(0,performance.now()-effectReceived);for(const a of actors.values()){const owner=effectView.active.find(o=>o.viewerId===a.id);a.donutUntil=0;a.roseUntil=0;a.vipUntil=0;a.floatUntil=0;a.effectTypes=[];a.effectAges={};if(!owner)continue;for(const e of owner.events){const remaining=(e.remainingMs-delta)/1000;if(remaining<=0)continue;a.effectTypes.push(e.type);a.effectAges[e.type]={age:Math.max(0,e.durationMs/1000-remaining),remaining};const key={Donut:'donutUntil',Rose:'roseUntil',VIP:'vipUntil',Float:'floatUntil'}[e.type];if(key)a[key]=elapsed+remaining;a.auraUntil=Math.max(a.auraUntil,elapsed+remaining);if(e.type==='Rose'&&!a.light){a.light=new THREE.PointLight('#ff3155',3.5,4,2);a.light.position.set(0,2.7,.6);a.root.add(a.light);}}}}
function renderGiftSpotlight(shot){const card=document.querySelector('#gift-spotlight'),owner=actors.get(shot.giftIds[0]);card.hidden=!owner||query.get('hud')==='0';document.body.classList.toggle('has-donut',!!owner);if(!owner)return;document.querySelector('#gift-owner').textContent=shot.giftIds.map(id=>actors.get(id)?.username).join(' + ');document.querySelector('#gift-kind').textContent=shot.giftIds.some(id=>actors.get(id)?.effectTypes?.includes('Donut'))?'🍩 GIGANTE':shot.giftIds.some(id=>actors.get(id)?.effectTypes?.includes('Rose'))?'🌹 AURA + GATITO':'✦ REGALOS';document.querySelector('#gift-phase').textContent=effectView.pendingCount?`${effectView.pendingCount} EN ESPERA`:shot.giftIds.map(id=>(actors.get(id)?.effectTypes||[]).join(' + ')).join(' · ')||'RECUPERANDO';}
function resize(){width=canvas.clientWidth||innerWidth;height=canvas.clientHeight||innerHeight;camera.aspect=portraitOutput?9/16:width/height;camera.updateProjectionMatrix();const scale=Math.min(devicePixelRatio||1,quality/Math.min(width,height));renderer.setPixelRatio(Math.max(.3,scale));renderer.setSize(width,height,false);}
addEventListener('resize',resize);resize();
function frameCamera(dt,shot,socialActor=null){if(elapsed>=focusUntil)focusPriority=0;const list=[...actors.values()].filter(a=>a.retireAt===undefined).map(a=>({id:a.id,slot:a.rank,actor:a}));let active=actors.get(selectedId)||[...actors.values()].find(a=>a.retireAt===undefined);
 if(manualFocusId&&!arrivalView?.active&&actors.has(manualFocusId)){selectedId=manualFocusId;active=actors.get(manualFocusId);}
 if(active&&!selectedId){selectedId=active.id;focusUntil=elapsed;focusPriority=0;hero(active,'EN LA PISTA');}
 if(shot.giftIds.length){active=actors.get(shot.primaryId)||active;if(!arrivalView?.active&&active&&selectedId!==active.id){selectedId=active.id;hero(active,'REGALO RECIBIDO');}}
 let actual=mode;
 if(mode==='auto')actual='group';if(socialActor){active=socialActor;actual='individual';}
 if(arrivalView?.active&&!shot.giftIds.length)actual='arrival';
 if(shot.giftIds.length)actual=shot.ids.length>1?'duo':'individual';
 const visible=actual==='arrival'||actual==='duo'||shot.giftIds.length&&actual==='individual'?list.filter(a=>shot.ids.includes(a.id)):visibleSector(list,selectedId,actual),bounds=new THREE.Box3();
 for(const {actor:a} of visible){if(actual==='arrival'||actual==='duo'||shot.giftIds.length||socialActor){const box=new THREE.Box3().setFromObject(a.root,true);a.visualBox={min:box.min.toArray(),max:box.max.toArray()};bounds.union(box);}else{const moving=Math.hypot(a.stageAnchor.x-a.base.x,a.stageAnchor.z-a.base.z)>.2,p=moving?a.root.position:{x:a.base.x,y:0,z:a.base.z},s=1;bounds.expandByPoint(new THREE.Vector3(p.x-1.15*s,Math.max(0,p.y-(a.entryLift||0)),p.z-.65));bounds.expandByPoint(new THREE.Vector3(p.x+1.15*s,((a.body.height||2.95)+.65)*s+Math.max(0,p.y-(a.entryLift||0)),p.z+.65));}}
 const cameoBounds=actual==='group'?ambientCreatures.cameraBounds():null;if(cameoBounds)bounds.union(cameoBounds);
 if(bounds.isEmpty())bounds.set(new THREE.Vector3(-2,0,-1),new THREE.Vector3(2,3.4,1));
 const target=bounds.getCenter(new THREE.Vector3());target.y=cameoBounds?Math.max(1.1,bounds.getCenter(new THREE.Vector3()).y*.7):actual==='arrival'||actual==='duo'?target.y+.3:shot.giftIds.length&&actual!=='group'?2.2:actual==='row'?1.5:actual==='individual'?1.4+((active?.root.position.y||0)-(active?.entryLift||0))*.5:1.1;if(active&&elapsed>=focusUntil&&document.querySelector('#hero-title').textContent!=='EN LA PISTA')hero(active,'EN LA PISTA');
 const vipPhase=active?Math.max(0,1-(active.vipUntil-elapsed)/12):0,overhead=actual==='individual'&&active?.vipUntil>elapsed?Math.sin(vipPhase*Math.PI)*.7:0,back=new THREE.Vector3(0,(actual==='group'?.6:actual==='sector'?.45:.14+overhead),1).normalize(),up=new THREE.Vector3().crossVectors(back,new THREE.Vector3(1,0,0)),tan=Math.tan(THREE.MathUtils.degToRad(camera.fov/2));
 const tracking=actual==='arrival'||actual==='duo';let distance=actual==='arrival'?6.6+Math.min(1,(active?.entryLift||0)/7.2)*1.4:actual==='individual'?7:9;
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){const v=new THREE.Vector3(x,y,z).sub(target);distance=Math.max(distance,v.dot(back)+Math.abs(v.x)/(tan*camera.aspect*.83),v.dot(back)+Math.abs(v.dot(up))/(tan*(tracking?.66:shot.giftIds.length&&actual!=='group'?.57:.55)));}
 if(actual==='individual')distance=Math.max(distance,11.5);
 const snap=frameCount<3||cameraCut;look.lerp(target,snap?1:1-Math.exp(-dt*(tracking?12:2.8)));cameraGoal.copy(target).addScaledVector(back,distance);camera.position.lerp(cameraGoal,snap?1:1-Math.exp(-dt*(tracking?12:2.8)));if(actors.size)cameraCut=false;camera.lookAt(look);camera.updateMatrixWorld();
 return actual;
}
const labelBlockers=['#hud','#hero','#gift-spotlight','#hint','#dance-chip','#notice','#contribution-board','#share-toast','#likes-goal'].map(s=>document.querySelector(s));
function animate(){profiler.begin();const rawDelta=Math.min(.05,clock.getDelta()),dt=paused?0:rawDelta;elapsed+=dt;frameCount++;countryFlags.update(elapsed);worldSky.update(elapsed,camera.aspect,(skyClock.timeMs+(skyClock.paused?0:performance.now()-skyReceived))/1000);worldDecor.update(worldSky.inspect().nightBlend);
 syncEffects();const reward=interactionFrame(interactionView,interactionReceived,performance.now()),socialActor=reward&&!reward.held&&!reward.ended&&!arrivalView?.active&&!effectView.active.length?actors.get(reward.viewerId):null,socialId=socialActor?.id;if(socialActor){selectedId=socialId;if(lastSocialId!==reward.id){lastSocialId=reward.id;focusUntil=elapsed+reward.remainingMs/1000;hero(socialActor,reward.type==='follow'?'¡GRACIAS POR SEGUIR!':reward.type==='solo'?'SOLO · '+reward.likes+' LIKES':reward.likes+' LIKES · BAILE + VIP');}}const shared=interactionFrame(interactionView,interactionReceived,performance.now(),'share');shareCelebration.update(shared);shareToast.hidden=!shared||shared.ended||query.get('hud')==='0'||!!arrivalView?.active||!!effectView.active.length;if(!shareToast.hidden)shareToast.textContent='↗ '+shared.username+(shared.count>1?' + '+(shared.count-1):'')+' compartió · ¡Gracias!';
 const donors=effectView.active.map(o=>o.viewerId).filter(id=>actors.has(id)&&actors.get(id).retireAt===undefined),arrivalId=actors.has(arrivalView?.active?.viewerId)?arrivalView.active.viewerId:null,present=mode==='individual';if(manualFocusId&&!arrivalId&&actors.has(manualFocusId))selectedId=manualFocusId;
 const welcome=arrivalView?.active,welcomeActor=actors.get(welcome?.viewerId);if(welcomeActor){const ageMs=welcome.durationMs-welcome.remainingMs+(arrivalView.paused?0:performance.now()-arrivalReceived);welcomeActor.born=elapsed-Math.min(welcome.durationMs,Math.max(0,ageMs))/1000;}
 const frontZ=stageSlot(capacity-1,capacity).z+12,shot=foregroundPlan(selectedId,arrivalId||socialId,donors,present,frontZ,elapsed<handoffUntil?handoffId:null,presentationLanes,donors.filter(id=>!actors.get(id).effectTypes.length));presentationLanes=shot.lanes;lastShot=shot;
 for(const a of [...actors.values()]){
  if(a.retireAt!==undefined){const exit=departure(elapsed-a.retireAt);if(exit.done){remove(a.id);continue;}a.root.position.copy(a.retireOrigin);a.root.position.y+=exit.lift;a.body.root.scale.copy(a.retireBodyScale).multiplyScalar(exit.scale);a.body.root.scale.y*=1-exit.anticipation*.06;a.label.hidden=true;if(!a.fadeMaterials){a.fadeMaterials=new Map();a.body.root.traverse(o=>{if(o.isMesh)for(const m of Array.isArray(o.material)?o.material:[o.material])if(!a.fadeMaterials.has(m))a.fadeMaterials.set(m,{opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite});});}for(const [m,v]of a.fadeMaterials){m.transparent=exit.opacity<1||v.transparent;m.depthWrite=exit.opacity>.98&&v.depthWrite;m.opacity=v.opacity*exit.opacity;}a.shadow.material.opacity=exit.shadowOpacity;a.aura.group.visible=false;a.community.update(elapsed);a.arrivalFX.update(-1,0,false);a.crown.visible=false;if(a.light){a.light.removeFromParent();a.light=null;}continue;}

  const giftDance=effectView.active.find(o=>o.viewerId===a.id)?.events.filter(e=>e.danceId&&a.effectTypes.includes(e.type)).sort((a,b)=>['VIP','Donut','Float','Rose'].indexOf(a.type)-['VIP','Donut','Float','Rose'].indexOf(b.type))[0]?.danceId,arrivalDance=arrivalId===a.id&&(a.entryAge||0)>=1.65?arrivalView.active.danceId:null,socialDance=giftDance||arrivalDance||(socialId===a.id?reward.danceId||'celebrate':null)||danceMode,pose=a.motion.update(elapsed,bpm,socialDance,dancePools.normal),j=a.body.joints,entry=entrance(elapsed-a.born),floating=elapsed<a.floatUntil;
  a.floatLift=(a.floatLift||0)+((floating?1.1:0)-(a.floatLift||0))*(1-Math.exp(-dt*6));
  if(a.effectAges?.Donut)a.root.scale.setScalar(giantScale(a.effectAges.Donut.age));else a.root.scale.lerp(new THREE.Vector3(1,1,1),1-Math.exp(-dt*7));const giant=a.root.scale.x;
  const anchor=shot.anchors[a.id]||a.base;if(socialId===a.id&&!a.wasSocial){a.stageAnchor.set(anchor.x,0,anchor.z);}a.wasSocial=socialId===a.id;if(mode==='individual'&&!arrivalId&&a.id===selectedId&&shot.anchors[a.id]&&!a.wasManual)a.stageAnchor.set(anchor.x,0,anchor.z);a.wasManual=mode==='individual'&&!arrivalId&&a.id===selectedId;if(shot.giftIds.includes(a.id)&&!a.wasGift&&a.stageAnchor.z<frontZ-3&&a.id!==arrivalId)a.stageAnchor.set(anchor.x,0,anchor.z);a.wasGift=shot.giftIds.includes(a.id);if((elapsed-a.born<.08||a.justRestored)&&shot.anchors[a.id])a.stageAnchor.set(anchor.x,0,anchor.z);
  a.justRestored=false;if(!paused)a.stageAnchor.lerp(new THREE.Vector3(anchor.x,0,anchor.z),1-Math.exp(-dt*(shot.ids.includes(a.id)?6:3)));
  a.root.position.set(a.stageAnchor.x+pose[POSE.x],entry.lift+pose[POSE.y]+a.floatLift+(floating?Math.sin(elapsed*2)*.12:0),a.stageAnchor.z+pose[POSE.z]+entry.travel);
  a.body.root.rotation.y=entry.air*Math.sin((a.entrySeed||hash(a.id))%7)*.16;
  a.body.root.scale.set(1+entry.impact*.07,1-entry.impact*.12,1+entry.impact*.07);a.entryLift=entry.lift;a.entryAge=elapsed-a.born;
  const rotations=a.motion.rotations;for(let index=0;index<ROTATION_JOINTS.length;index++)j[ROTATION_JOINTS[index]].quaternion.fromArray(rotations,index*4);if(entry.air>0){j.rightArm.rotation.z-=.35*entry.air;j.leftArm.rotation.z+=.35*entry.air;}
  if(j.costumeTail)j.costumeTail.rotation.y=Math.sin(elapsed*3+a.phase)*.3;if(j.costumeCape)j.costumeCape.rotation.x=.1+Math.sin(elapsed*2+a.phase)*.08;
  if(a.body.accentMaterial)a.body.accentMaterial.emissiveIntensity=.45+Math.sin(elapsed*3)*.18;
  if(localDances.has(a.motion.id)||localDances.has(a.motion.previous)){a.body.root.updateWorldMatrix(true,true);const feetY=footMinimumY(a.body);if(feetY<-.02)a.root.position.y+=-.02-feetY;}
  a.shadow.position.set(a.root.position.x,.006,a.root.position.z);a.shadow.material.opacity=floating?.13:.3*(1-Math.min(1,entry.lift/8)*.7);a.shadow.scale.setScalar(giant*(floating?.8:1));const community=communityFor(a.id);a.crown.visible=elapsed<a.vipUntil||community.vip;a.community.update(elapsed,{aura:community.aura,trail:socialActor===a&&reward.type==='follow'});a.crown.rotation.y=elapsed*.5;
  a.fxRoot.position.set(a.root.position.x,0,a.root.position.z);a.fxRoot.scale.setScalar(giant);a.arrivalFX.update(a.entryAge,a.entrySeed||hash(a.id),true,reducedMotion.matches);a.aura.update(elapsed,{active:a.id===arrivalId||elapsed<a.auraUntil||elapsed<a.vipUntil||floating,vip:elapsed<a.vipUntil,rose:elapsed<a.roseUntil,floating,giant:!!a.effectAges?.Donut,roseAge:a.effectAges?.Rose?.age||0,entry:entry.ring,burst:Math.max(0,(a.burstUntil-elapsed)/3)});
  if(a.light&&elapsed>a.roseUntil){a.light.removeFromParent();a.light=null;}a.label.dataset.effect=elapsed<a.vipUntil||community.vip?'VIP':elapsed<a.donutUntil?'Donut':elapsed<a.roseUntil?'Rose':'';
 }
 auraCompanions.update([...actors.values()].filter(a=>a.retireAt===undefined));
 const actual=frameCamera(dt,shot,socialActor);
 document.querySelector('[data-kind=aura]').classList.toggle('active',[...actors.values()].some(a=>a.effectAges?.Rose));document.querySelector('[data-kind=giant]').classList.toggle('active',[...actors.values()].some(a=>a.effectAges?.Donut));
 profiler.mark('motion');
 const ambientObstacles=creatureObstacles(WORLD_OBSTACLES,actors.values(),capacity,{foregroundIds:shot.ids,anchors:shot.anchors}),protectedBoxes=shot.ids.map(id=>actors.get(id)).filter(Boolean).map(a=>new THREE.Box3(new THREE.Vector3(a.root.position.x-1.15*a.root.scale.x,a.root.position.y-.1,a.root.position.z-.7*a.root.scale.x),new THREE.Vector3(a.root.position.x+1.15*a.root.scale.x,a.root.position.y+(a.body.height+.9)*a.root.scale.x,a.root.position.z+.7*a.root.scale.x)));
 ambientCreatures.update(elapsed,{manualEvent:manualEventFrame(ambientView,ambientReceived,performance.now()),capacity,obstacles:ambientObstacles,busy:!!shared&&!shared.ended||shot.ids.length>0||actual!=='group',camera,protectedBoxes});const foregroundBusy=!!shared&&!shared.ended||shot.ids.length>0||actual!=='group';likesGoal.setBusy(foregroundBusy);backgroundCameos.update(elapsed,{event:ambientCreatures.eventFrame(),busy:foregroundBusy,enabled:ambientCreatures.group.visible,paused,protectedBoxes,goalId:likesGoal.inspect()?.id});baseCameraQuaternion.copy(camera.quaternion);cameraImpulse=mutantCameraImpulse(ambientCreatures.eventFrame(),{blocked:foregroundBusy||!ambientCreatures.eventVisible(),paused,reducedMotion:reducedMotion.matches});camera.rotateX(cameraImpulse.pitch);camera.rotateY(cameraImpulse.yaw);camera.rotateZ(cameraImpulse.roll);camera.updateMatrixWorld();profiler.mark('ambient');profiler.render(scene,camera);
 const featuredActors=['arrival','individual','duo'].includes(actual)?lastShot.ids.map(id=>actors.get(id)).filter(Boolean):[],labels=[];
 for(const a of actors.values()){
  a.body.joints.head.getWorldPosition(headPoint);projected.copy(headPoint).project(camera);a.screenHead={x:(projected.x+1)/2,y:(1-projected.y)/2};a.headVisible=projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1&&Math.abs(projected.y)<1;
  if(!featuredActors.includes(a)||a.retireAt!==undefined){a.label.hidden=true;a.closeNameReady=false;a.nameVisible=false;}
 }
 if(featuredActors.length){
  const canvasRect=canvas.getBoundingClientRect(),blocked=labelBlockers.filter(e=>e&&!e.hidden&&getComputedStyle(e).display!=='none').map(e=>{const r=e.getBoundingClientRect();return {left:r.left-canvasRect.left,right:r.right-canvasRect.left,top:r.top-canvasRect.top,bottom:r.bottom-canvasRect.top}});
  for(const a of actors.values()){const p=a.root.position,s=a.root.scale.x,w=(a.body.style==='toy'?.7:.59)*s;a.occlusionBox.min.set(p.x-w,p.y,p.z-.43*s);a.occlusionBox.max.set(p.x+w,p.y+(a.body.height||2.95)*s,p.z+.43*s);}
  for(const a of featuredActors){
   if(a.retireAt!==undefined)continue;const p=a.root.position,s=a.root.scale.x;
   a.body.joints.head.getWorldPosition(headPoint);const headDistance=headPoint.distanceTo(camera.position);labelRay.set(camera.position,rayDirection.copy(headPoint).sub(camera.position).normalize());a.occluded=false;
   for(const other of actors.values())if(other!==a&&other.retireAt===undefined&&labelRay.intersectBox(other.occlusionBox,rayHit)&&rayHit.distanceTo(camera.position)<headDistance-.15){a.occluded=true;break;}
   projected.copy(headPoint);projected.y+=((a.body.height||2.95)-2.52+.18+(elapsed<a.vipUntil?.4:0))*s;projected.project(camera);const x=(projected.x+1)*width/2,y=(1-projected.y)*height/2,z=projected.z;projected.set(p.x,p.y,p.z).project(camera);const actorHeight=Math.abs((1-projected.y)*height/2-y);a.screenHeight=actorHeight/height;a.closeNameReady=a.screenHeight>=(a.closeNameReady?.12:.16);
   if(!a.closeNameReady||a.occluded||z>1||z< -1||x<0||x>width||y<0||y>height||actorHeight<24){a.label.hidden=true;a.nameVisible=false;continue;}
   const font=Math.round(Math.max(12,Math.min(22,actorHeight*.085))*2)/2,w=Math.min(width*.65,Math.max(35,a.username.length*font*.64+14));
   if(a.nameFont!==font){a.label.style.fontSize=font+'px';a.nameFont=font;}if(a.nameWidth!==w){a.label.style.maxWidth=w+'px';a.nameWidth=w;}a.label.style.zIndex='100';
   const targetY=y-font*.9-(font*1.4+6),alpha=1-Math.exp(-rawDelta*18);if(!a.nameVisible||Math.hypot((a.nameX??x)-x,(a.nameY??targetY)-targetY)>width*.15){a.nameX=x;a.nameY=targetY;}else{a.nameX+=(x-a.nameX)*alpha;a.nameY+=(targetY-a.nameY)*alpha;}
   labels.push({a,x:a.nameX,y:a.nameY,w,h:font*1.4+6,priority:a.id===arrivalId?4:3});
  }
  const placements=placeNames(labels,width,height,blocked),shown=new Set(placements.map(i=>i.a));
  for(const item of labels)if(!shown.has(item.a)){item.a.label.hidden=true;item.a.nameVisible=false;}
  for(const item of placements){const a=item.a;a.label.hidden=false;a.label.classList.toggle('name-reveal',!a.nameVisible);a.nameVisible=true;a.label.style.left='0';a.label.style.top='0';a.label.style.transform=`translate3d(${item.x}px,${item.y}px,0) translate(-50%,0)`;}
 }

 document.querySelector('#empty').hidden=actors.size>0;document.querySelector('#paused').hidden=!paused;
 const selected=actors.get(selectedId),danceName=DANCES.find(d=>d.id===selected?.motion.id)?.name||'Hip Hop',chip=document.querySelector('#dance-name');if(chip&&chip.textContent!==danceName)chip.textContent=danceName;const tempo=document.querySelector('#dance-bpm');if(tempo)tempo.textContent=`${bpm} BPM`;const meter=document.querySelector('#beat-meter');if(meter)meter.style.transform=`scaleX(${((selected?.motion.beat||0)%8)/8})`;
 renderGiftSpotlight(shot);document.querySelector('#hero').hidden=query.get('hud')==='0'||!shot.ids.length||!['arrival','individual','duo'].includes(actual);window.__cameraMode=actual;camera.quaternion.copy(baseCameraQuaternion);camera.updateMatrixWorld();profiler.mark('labels');profiler.end();requestAnimationFrame(animate);
}
if(query.get('hud')==='0'){document.querySelector('#hud').hidden=true;document.querySelector('#hint').hidden=true;document.querySelector('#hero').hidden=true;document.querySelector('#dance-chip').hidden=true;}
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();notice('WebGL se interrumpió. Recargá la vista.');});
const socket=window.io({transports:['websocket','polling']});
const likesGoal=mountLikesGoal(socket,document.querySelector('#stage'),{hidden:query.get('hud')==='0'});likesGoal.onComplete(s=>backgroundCameos.celebrate(s));labelBlockers.push(document.querySelector('#likes-goal'));
const contributionBoard=mountContributions(socket,document.querySelector('#stage'),{hidden:query.get('hud')==='0'});
labelBlockers.push(document.querySelector('#contribution-board'));
const musicPlayer=new MusicPlayer(socket,parent===window?'stage':'preview',(_s,a)=>{const b=document.querySelector('#audio-unlock');b.hidden=!a.blocked||a.output!=='stage'||parent!==window;});document.querySelector('#audio-unlock').onclick=()=>musicPlayer.unlock();
socket.on('effect-state',receiveEffects);
socket.on('dance-state',s=>{if(s?.pools)dancePools=s.pools;});
socket.on('interaction-state',s=>{interactionView=s;interactionReceived=performance.now();const guide=document.querySelector('#like-guide-step');if(guide)guide.textContent=s.settings.likeStep+' LIKES';});
socket.on('community-state',s=>{communityView=s;communityReceived=performance.now();});
socket.on('roster-order',s=>{for(const r of s.order){const a=actors.get(r.viewerId);if(a&&a.retireAt===undefined){a.rank=r.rank;a.base=flowSlot(r.rank,capacity);}}});
function receivePresentation(s){ambientCreatures.setSeed(s.worldSeed);if(s.worldClock){skyClock=s.worldClock;skyReceived=performance.now();}worldDecor.setHouses(s.houses!==false);countryFlags.setEnabled(s.flags!==false,elapsed);worldSky.setMode(s.sky,paused);ambientCreatures.setEnabled(s.creatures!==false);const initial=presentationRevision<0;presentationRevision=s.revision;manualFocusId=s.focusId||null;if(!(initial&&query.has('camera')&&s.revision===0))mode=s.camera;if(!(initial&&query.has('quality')&&s.revision===0)){quality=s.quality;resize();}bpm=s.bpm;danceMode=s.dance;if(manualFocusId&&actors.has(manualFocusId)&&!arrivalView?.active){selectedId=manualFocusId;hero(actors.get(selectedId),'EN LA PISTA');}}
socket.on('presentation-state',receivePresentation);
let ambientView=null,ambientReceived=0;socket.on('ambient-state',s=>{ambientView=s;ambientReceived=performance.now();});
socket.on('party-state',snapshot=>{if(snapshot.community){communityView=snapshot.community;communityReceived=performance.now();}if(snapshot.dances)dancePools=snapshot.dances.pools;interactionView=snapshot.interactions;interactionReceived=performance.now();capacity=Math.max(1,Math.min(40,snapshot.maxAvatars||40));const keep=new Set(snapshot.avatars.map(a=>a.viewerId));for(const id of actors.keys())if(!keep.has(id))remove(id);snapshot.avatars.forEach(r=>{const fresh=!actors.has(r.viewerId),a=upsert(r);if(fresh)a.justRestored=true;});updateStatus(snapshot.connection);if(snapshot.arrivals)receiveArrivals(snapshot.arrivals);receiveEffects(snapshot.effects);for(const o of snapshot.effects?.active||[]){const a=actors.get(o.viewerId);if(!a)continue;const d=o.events.find(e=>e.type==='Donut');if(d&&d.remainingMs>0)a.root.scale.setScalar(1.6);}});
socket.on('arrival-state',receiveArrivals);
socket.on('spawn-normal',r=>upsert(r,!r.quiet));socket.on('spawn-mc-skin',r=>upsert(r,true));socket.on('remove-avatar',e=>retire(e.viewerId));socket.on('trigger-effect',effect);socket.on('connection-status',updateStatus);socket.on('skin-error',e=>notice(e.message));socket.on('party-reset',()=>{for(const id of [...actors.keys()])remove(id);selectedId=null;lastSocialId=null;interactionView=null;presentationLanes={};receiveEffects(null);handoffId=null;handoffUntil=0;lastArrivalId=null;document.querySelector('#hero').hidden=true;});
socket.on('disconnect',()=>updateStatus({...connection,status:'reconnecting',connected:false}));socket.on('connect_error',()=>notice('No se pudo abrir el canal de eventos.'));

const footBounds=new THREE.Box3();
function footMinimumY(body){let min=Infinity;for(const key of ['rightKnee','leftKnee'])body.joints[key].traverse(node=>{if(!node.isMesh)return;if(!node.geometry.boundingBox)node.geometry.computeBoundingBox();min=Math.min(min,footBounds.copy(node.geometry.boundingBox).applyMatrix4(node.matrixWorld).min.y)});return min;}
window.__LIVE_DANCE__=window.__DANCE_PARTY__={profile:profiler,groundAt:(x,y)=>{const ray=new THREE.Raycaster();ray.setFromCamera(new THREE.Vector2(x,y),camera);ray.far=camera.far;const hit=ray.intersectObject(floor)[0];return hit?hit.point.toArray():null;},inspect:()=>({ready:frameCount>2,cameraImpulse,particleAssets:Object.keys(particleMaps),goal:likesGoal.inspect(),cameos:backgroundCameos.inspect(),dancePools,interactions:interactionView,shareCelebration:shareCelebration.inspect(),visibility:document.visibilityState,captureMode:query.get('capture')==='1',contributions:contributionBoard.inspect(),connected:socket.connected,connection,frameCount,paused,bpm,danceMode,arrival:arrivalView,selectedId,presentation:{mode,manualFocusId,revision:presentationRevision},effects:effectView,music:musicPlayer.inspect(),ambientControl:ambientView,floor:{size:floor.geometry.parameters.width,position:floor.position.toArray(),far:camera.far},departures:[...actors.values()].filter(a=>a.retireAt!==undefined).map(a=>({viewerId:a.id,age:elapsed-a.retireAt,position:a.root.position.toArray(),origin:a.retireOrigin.toArray(),exit:departure(elapsed-a.retireAt)})),camera:{position:camera.position.toArray(),target:look.toArray()},handoffId:elapsed<handoffUntil?handoffId:null,foregroundIds:lastShot.ids,donorIds:lastShot.giftIds,decoration:countryFlags.inspect(),worldDecor:worldDecor.inspect(),landscape:landscape.inspect(),community:communityView,sky:worldSky.inspect(),creatures:ambientCreatures.inspect(),companions:auraCompanions.inspect(),drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,mode:window.__cameraMode,quality,viewport:{width,height,aspect:camera.aspect,portrait:portraitOutput},canvas:{width:canvas.width,height:canvas.height},memory:{...renderer.info.memory},actors:[...actors.values()].filter(a=>a.retireAt===undefined).map(a=>({viewerId:a.id,username:a.username,minecraftName:a.minecraftName,requestedName:a.requestedName,characterId:a.characterId,style:a.body.style,finish:a.body.finish,footMinimumY:footMinimumY(a.body),jointRotations:[...a.motion.rotations],dance:a.motion.id,articulated:{elbow:a.body.joints.rightElbow.rotation.x,knee:a.body.joints.rightKnee.rotation.x,waist:a.body.joints.waist.rotation.y},model:a.model,slot:a.slot,rank:a.rank,entryLift:a.entryLift||0,entryAge:a.entryAge,base:a.base,visualBox:a.visualBox||null,anchor:a.stageAnchor.toArray(),headVisible:!!a.headVisible,screenHead:a.screenHead,screenHeight:a.screenHeight,foreground:lastShot.ids.includes(a.id),position:a.root.position.toArray(),scale:a.root.scale.x,effect:a.label.dataset.effect,effectTypes:a.effectTypes||[],crownVisible:a.crown.visible,community:a.community.inspect(),arrivalFX:a.arrivalFX.inspect(),floatActive:elapsed<a.floatUntil,labelBox:a.label.hidden?null:(()=>{const r=a.label.getBoundingClientRect();return {left:r.left,right:r.right,top:r.top,bottom:r.bottom}})(),roseLight:!!a.light,labelHidden:a.label.hidden,headOccluded:!!a.occluded,aura:a.aura.group.visible,joints:Object.keys(a.body.joints)}))})};
animate();

if(parent!==window)parent.postMessage({type:"stage-ready"},location.origin);

