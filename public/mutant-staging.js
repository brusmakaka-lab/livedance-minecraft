const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=v=>{const u=clamp(v);return u*u*(3-2*u);};
// A heavy stride follows world distance, never a free-running walk clock.
export function mutantStaging(time,walkDuration=Math.PI/4){
 const t=Math.max(0,Math.min(30,time)),approach=clamp(t/10.5),depart=clamp((t-20)/9.2),moving=t<10.5||t>20;
 const distance=37*(t<10.5?approach:depart),walkTime=(distance/4.8*walkDuration)%walkDuration;
 const phase=t<10.5?'approach':t<12?'settle':t<15?'roar':t<19?'breathe':t<20?'turn':'depart';
 const blend=t<10.5?smooth((10.5-t)/.65):t>20?smooth((t-20)/.65):0;
 return {phase,x:0,z:-43+37*approach-37*depart,yaw:Math.PI*smooth((t-19)/1),distance,walkTime,walkWeight:blend,moving,roarTime:clamp((t-12)/3)*3,roarWeight:smooth((t-11.7)/.3)*smooth((15.5-t)/.5),opacity:smooth(t/1.2)*smooth((30-t)/1.5)};
}
