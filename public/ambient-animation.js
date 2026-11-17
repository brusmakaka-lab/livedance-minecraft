// Sampling a bounded position in the downloaded clip avoids repeatedly seeking
// through hundreds of loops. Manual offering is applied from the sampled pose.
export function sampleImportedPose(instance,time){
 if(instance.offerArm&&instance.clipArmPose)instance.offerArm.quaternion.copy(instance.clipArmPose);
 const duration=instance.clip.duration,phase=((time%duration)+duration)%duration;
 instance.mixer.setTime(phase);
 if(instance.offerArm)instance.clipArmPose=instance.offerArm.quaternion.clone();
 instance.sampleTime=phase;
}
export function applyOffering(THREE,instance,amount){if(!instance.offerArm)return;const offset=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),-amount*1.05);instance.offerArm.quaternion.copy(instance.clipArmPose).multiply(offset);}
export const WALK_STRIDES=Object.freeze({pig:1.45,sheep:1.5,chicken:.9,creeper:1.3,spider:2.1,cow:1.7,iron_golem:1.7,villager:1.25});
export function walkClipTime(kind,distance,duration,phase=0){return (distance/(WALK_STRIDES[kind]||1.5)+phase)*duration;}
