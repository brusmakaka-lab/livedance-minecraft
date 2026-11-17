const zero=()=>({pitch:0,yaw:0,roll:0,strength:0});
// Absolute phase, no random accumulation: snapshots and pause do not replay a kick.
export function mutantCameraImpulse(event,{blocked=false,reducedMotion=false,paused=false}={}){
 if(blocked||reducedMotion||paused||event?.type!=='mutant'||!Number.isFinite(event.time)||event.ended)return zero();
 const t=event.time-12;if(t<0||t>=2.6)return zero();
 const envelope=Math.min(1,t/.12)*Math.pow(1-t/2.6,2),pulse=1+.24*Math.sin(t*9);
 return {pitch:Math.sin(t*47)*.0045*envelope*pulse,yaw:Math.sin(t*37+.7)*.0025*envelope,roll:Math.sin(t*31)*.007*envelope,strength:envelope};
}
