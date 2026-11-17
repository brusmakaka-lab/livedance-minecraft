import * as THREE from '/vendor/three-0.186.1/three.module.js';
import {CHARACTERS,buildCharacter,loadCharacterSkins} from './characters.js';
export async function renderCastThumbnails(){
 await loadCharacterSkins();
 const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true,preserveDrawingBuffer:true});renderer.setSize(180,210);renderer.setClearColor('#000000',0);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
 const scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-1.6,1.6,1.87,-1.87,.1,30);camera.position.set(-2,2.5,6);camera.lookAt(0,1.6,0);scene.add(new THREE.HemisphereLight('#f1f6ff','#77798b',2.2));const sun=new THREE.DirectionalLight('#fff2df',2.3);sun.position.set(-4,7,6);scene.add(sun);const images=new Map();
 try{for(const c of CHARACTERS){const b=buildCharacter(THREE,c.id);scene.add(b.root);b.joints.rightArm.rotation.z=-.1;b.joints.leftArm.rotation.z=.1;b.joints.rightElbow.rotation.x=-.15;b.joints.leftElbow.rotation.x=-.15;renderer.render(scene,camera);images.set(c.id,{image:renderer.domElement.toDataURL('image/png'),portrait:b.portrait});b.root.removeFromParent();b.dispose();if(images.size%4===0)await new Promise(requestAnimationFrame);}}finally{renderer.dispose();renderer.forceContextLoss();}
 return images;
}
