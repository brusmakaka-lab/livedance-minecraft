import {prepareSkin,buildBody} from './skin-atlas.js';
import {CHARACTERS,characterById,characterForViewer} from './cast-data.js';
const skinImages=new Map();let loading;
export function loadCharacterSkins(){return loading??=(async()=>{const pending=CHARACTERS.filter(c=>c.skinUrl)[Symbol.iterator]();await Promise.all(Array.from({length:6},async()=>{for(const c of pending){const response=await fetch(c.skinUrl);if(!response.ok)throw Error('No se pudo cargar '+c.name);const bitmap=await createImageBitmap(await response.blob());if(bitmap.width!==64||![32,64].includes(bitmap.height)){bitmap.close();throw Error('Skin inválida: '+c.name)}skinImages.set(c.id,bitmap);}}));})();}
export function buildCharacter(THREE,id,viewerId=''){
 const profile=characterById(id)||characterForViewer(viewerId),image=skinImages.get(profile.id);if(!image)throw Error('La biblioteca de skins todavía no está lista.');const body=buildBody(THREE,prepareSkin(THREE,image),profile.model||'classic',{style:profile.style}),j=body.joints,extra=[],materials=new Map();
 function material(color,emissive=false){const key=color+emissive;if(!materials.has(key)){const m=new THREE.MeshLambertMaterial({color,emissive:emissive?color:'#000000',emissiveIntensity:emissive?.55:0});materials.set(key,m);extra.push(m);}return materials.get(key);}
 function add(parent,size,position,color,{glow=false,rotation=[0,0,0],geometry=null}={}){const g=geometry||new THREE.BoxGeometry(...size),m=material(color,glow),o=new THREE.Mesh(g,m);o.position.set(...position);o.rotation.set(...rotation);parent.add(o);extra.push(g);return o;}
 const h=j.head;
 if(profile.accessory==='astronaut'){
  for(const side of [-1,1])add(h,[.13,.85,.88],[side*.48,0,0],'#e7edf5');
  add(h,[1.06,.14,.9],[0,.46,0],'#e7edf5');add(h,[.96,.12,.2],[0,-.4,.38],'#c8dae8');
  add(h,[.7,.07,.04],[0,.26,.46],profile.accent,{glow:true});add(j.body,[.75,.8,.35],[0,0,-.43],'#c1d2df');
  for(const s of [-1,1])add(j.body,[.2,.65,.22],[s*.35,0,-.6],profile.accent,{glow:true});
 }
 if(profile.accessory==='headphones'){
  for(const side of [-1,1]){add(h,[.2,.4,.4],[side*.5,0,0],'#252132');add(h,[.05,.27,.3],[side*.61,0,.025],profile.accent,{glow:true});}
  add(h,[.8,.09,.18],[0,.43,0],'#272133');for(const side of [-1,1])add(h,[.09,.3,.18],[side*.4,.28,0],'#272133');
  for(const key of ['rightKnee','leftKnee'])add(j[key],[.4,.13,.44],[0,-.49,.07],profile.accent);
  add(j.body,[.05,.8,.08],[0,0,.29],'#b3a2c5');
 }
 if(profile.accessory==='robot'){
  add(h,[.68,.28,.06],[0,.04,.39],'#152731');for(const s of [-1,1])add(h,[.16,.065,.02],[s*.18,.04,.428],profile.accent,{glow:true});
  add(h,[.065,.3,.065],[0,.5,0],'#8ca3b6');add(h,[.13,.13,.13],[0,.69,0],profile.accent,{glow:true});
  add(j.body,[.48,.5,.08],[0,0,.22],'#172e38');add(j.body,[.31,.31,.04],[0,0,.275],profile.accent,{glow:true});
  for(const key of ['rightArm','leftArm'])add(j[key],[.43,.26,.49],[0,-.1,0],'#738aa0');
 }
 if(profile.accessory==='fox'){
  for(const side of [-1,1]){add(h,[.24,.25,.2],[side*.25,.44,0],profile.shirt);add(h,[.12,.13,.18],[side*.25,.63,0],profile.shirt);add(h,[.12,.17,.03],[side*.26,.49,.13],'#ffe8c7');}
  add(h,[.4,.23,.2],[0,-.2,.45],'#fff0d6');add(h,[.13,.09,.05],[0,-.12,.57],'#453130');
  const tail=new THREE.Group();tail.position.set(0,-.28,-.2);j.waist.add(tail);add(tail,[.24,.26,.8],[0,.12,-.46],profile.shirt);add(tail,[.25,.27,.3],[0,.12,-.98],'#fff0d6');j.costumeTail=tail;
  add(j.body,[.4,.7,.04],[0,-.1,.21],'#ffe5c3');
 }
 if(profile.accessory==='star'){
  for(const side of [-1,1])add(h,[.19,.74,.7],[side*.44,-.14,-.06],profile.hair);
  add(h,[.7,.16,.16],[0,.34,.37],profile.hair);for(const s of [-1,1])add(h,[.2,.18,.12],[.22+s*.1,.44,.18],profile.accent,{rotation:[0,0,s*.35]});
  for(const key of ['rightArm','leftArm'])add(j[key],[.4,.15,.43],[0,-.16,0],'#fff1e3');
  add(j.body,[.16,.16,.05],[0,.08,.22],'#fff3aa',{glow:true});
 }
 if(profile.accessory==='knight'){
  for(const side of [-1,1])add(j.waist,[.56,.25,.6],[side*.62,1.01,0],'#8a87ba');add(h,[.79,.1,.78],[0,.29,0],'#d5b76e');
  add(h,[.12,.12,.06],[0,.29,.43],profile.accent,{glow:true});
  const cape=add(j.waist,[1.05,1.25,.055],[0,.35,-.34],'#646292');j.costumeCape=cape;
 }
 const dispose=body.dispose;return {...body,characterId:profile.id,character:profile,height:profile.skinUrl?2.95:profile.id==='pixel'?3.35:profile.id==='nori'?3.45:3.2,accentMaterial:materials.get(profile.accent+'true'),dispose(){dispose();extra.forEach(r=>r.dispose());}};
}
export {CHARACTERS,characterById,characterForViewer};
