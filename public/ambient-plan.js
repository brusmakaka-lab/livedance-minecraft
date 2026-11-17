const hash=n=>{n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0;};
export const CREATURE_SPECIES=['pig','sheep','chicken','creeper','spider','cow'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
const smooth=n=>{n=clamp(n,0,1);return n*n*(3-2*n);};
const radii={pig:1.35,sheep:1.1,chicken:.57,creeper:.7,spider:1.35,cow:1.1};
const paths=new Map();
function perimeter(front,index){
 const key=front+':'+index;if(paths.has(key))return paths.get(key);
 const back=-6-index*.65,near=front+4.4+index*.65,w=15.9+index*.65,cz=(near+back)/2,h=(near-back)/2,points=[];let length=0;
 for(let i=0;i<=256;i++){const a=i/256*Math.PI*2,c=Math.cos(a),s=Math.sin(a),p={x:w*Math.sign(c)*Math.abs(c)**.46,z:cz+h*Math.sign(s)*Math.abs(s)**.46};if(i)length+=Math.hypot(p.x-points[i-1].x,p.z-points[i-1].z);points.push({...p,d:length});}
 const path={points,length};if(paths.size>24)paths.clear();paths.set(key,path);return path;
}
function onPath(path,d){d=((d%path.length)+path.length)%path.length;const p=path.points;let lo=0,hi=p.length-1;while(hi-lo>1){const mid=(lo+hi)>>1;if(p[mid].d<d)lo=mid;else hi=mid;}const f=(d-p[lo].d)/(p[hi].d-p[lo].d);return {x:p[lo].x+(p[hi].x-p[lo].x)*f,z:p[lo].z+(p[hi].z-p[lo].z)*f};}
// Each walker has its own clock. Stops and sprints integrate continuously, so
// switching gait cannot teleport the model or restart its imported leg cycle.
function travel(t,index){
 const seed=hash(index+4709),period=38+seed%11,age=((t+index*9)%period+period)%period,cycles=Math.floor((t+index*9)/period),walk=.85+(seed%7)*.08,run=walk*2.45,legs=[[11,walk],[3,0],[8,run],[4,0],[period-26,walk]];
 let distance=0,total=0,previous=walk,speed=walk,rest=age;
 for(const [duration,v]of legs){const ramp=previous===v?0:.8,integral=r=>ramp===0?v*r:r<ramp?previous*r+(v-previous)*r*r/(2*ramp):(previous+v)*ramp*.5+v*(r-ramp);total+=integral(duration);if(rest>0){const part=Math.min(rest,duration);distance+=integral(part);speed=ramp?previous+(v-previous)*Math.min(1,part/ramp):v;rest-=part;}previous=v;}
 return {distance:cycles*total+distance,speed,gait:speed<.025?'idle':speed>1.8?'run':'walk'};
}
export function creaturePlan(seconds,{capacity=40,obstacles=[],seed=0}={}){
 const front=(Math.ceil(clamp(capacity,1,40)/Math.min(10,capacity))-1)*4.2,cycle=Math.floor(Math.max(0,seconds)/110),actors=[];
 for(let i=0;i<5;i++){
  // Species rotate only at a lap boundary, outside the central presentation.
  const motion=travel(Math.max(0,seconds),i),path=perimeter(front,i),lap=Math.floor((motion.distance+path.length*i/5)/path.length),kind=CREATURE_SPECIES[hash(i+31+lap*131+Math.floor(seed))%6],direction=i%2?-1:1,d=direction*(motion.distance+path.length*i/5),p=onPath(path,d),ahead=onPath(path,d+direction*.16),radius=radii[kind];
  const visible=true;
  actors.push({id:'wander-'+i,kind,...p,yaw:Math.atan2(ahead.x-p.x,ahead.z-p.z),radius,speed:motion.speed,gait:motion.gait,distance:motion.distance,animationPhase:i*.19,animationTime:motion.distance*.62+i*.37,visible,phase:seconds*5+i*1.7});
 }
 return {cycle,age:seconds%110,kind:actors[0].kind,count:actors.length,direction:1,actors};
}
export function ambientEventPlan(quietSeconds){
 const block=Math.floor(Math.max(0,quietSeconds)/600),age=Math.max(0,quietSeconds)%600,seed=hash(block+9021);
 const schedule=[{type:'flower',start:42+seed%22,duration:27},{type:'suv',start:260,duration:16},{type:'meme-'+(block%4+1),start:365,duration:21},{type:'mutant',start:170+(seed>>>5)%50,duration:30},{type:'flower',start:306+(seed>>>10)%25,duration:27},{type:'herobrine',start:455+(seed>>>15)%70,duration:11}];
 const e=schedule.find(e=>age>=e.start&&age<e.start+e.duration);if(!e)return {type:null,block,nextIn:Math.min(...schedule.filter(e=>e.start>age).map(e=>e.start-age),600-age+42)};
 const time=age-e.start;return {...e,block,time,opacity:smooth(time/1.5)*smooth((e.duration-time)/1.8)};
}
