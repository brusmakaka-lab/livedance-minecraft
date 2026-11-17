const dist=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
const wrap=a=>Math.atan2(Math.sin(a),Math.cos(a));
const point=(x,z)=>({x,z});
export function closestOnObstacle(p,o){
 const dx=(o.endX??o.x)-o.x,dz=(o.endZ??o.z)-o.z,length=dx*dx+dz*dz;
 const t=length?Math.max(0,Math.min(1,((p.x-o.x)*dx+(p.z-o.z)*dz)/length)):0;
 return {x:o.x+dx*t,z:o.z+dz*t};
}
export function obstacleDistance(p,o){if(o.endX===undefined)return Math.hypot(p.x-o.x,p.z-o.z);const c=closestOnObstacle(p,o);return Math.hypot(p.x-c.x,p.z-c.z);}
function segmentDistance(a,b,c,d){
 const cross=(p,q,r)=>(q.x-p.x)*(r.z-p.z)-(q.z-p.z)*(r.x-p.x);
 const abC=cross(a,b,c),abD=cross(a,b,d),cdA=cross(c,d,a),cdB=cross(c,d,b);
 if(abC*abD<0&&cdA*cdB<0)return 0;
 const line=(p,q)=>({x:p.x,z:p.z,endX:q.x,endZ:q.z});
 return Math.min(obstacleDistance(a,line(c,d)),obstacleDistance(b,line(c,d)),obstacleDistance(c,line(a,b)),obstacleDistance(d,line(a,b)));
}
function pathDistance(a,b,o){if(o.endX===undefined){const dx=b.x-a.x,dz=b.z-a.z,l=dx*dx+dz*dz,t=l?Math.max(0,Math.min(1,((o.x-a.x)*dx+(o.z-a.z)*dz)/l)):0;return Math.hypot(a.x+t*dx-o.x,a.z+t*dz-o.z);}return segmentDistance(a,b,o,point(o.endX,o.endZ));}
export function sweptClear(a,b,r,obstacles){return obstacles.every(o=>pathDistance(a,b,o)>=r+o.radius+.08);}
// A newly reserved route may surround a walker. It can retreat out of that
// reservation, but can never move further into it or cross a new obstacle.
function canMove(a,b,r,obstacles){return obstacles.every(o=>{const limit=r+o.radius+.08,start=obstacleDistance(a,o);if(start>=limit-1e-7)return sweptClear(a,b,r,[o]);const end=obstacleDistance(b,o);return end>start+1e-7&&pathDistance(a,b,o)>=start-1e-7;});}
const hash=value=>{let h=2166136261;for(const c of String(value))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
const offsets=[0,.3,-.3,.65,-.65,1,-1,1.4,-1.4,1.8,-1.8,2.25,-2.25,2.7,-2.7,Math.PI];
// Five persistent walkers: anticipate, choose a stable detour, then resume.
// Visibility is independent from collisions; only the animals move aside.
export class GroundTraffic{
 constructor(){this.actors=new Map();this.time=0;}
 random(a){a.rng=(Math.imul(a.rng,1664525)+1013904223)>>>0;return a.rng/4294967296;}
 update(plans,dt,obstacles=[]){
  const result=[];dt=Math.max(0,Math.min(.05,dt));this.time+=dt;
  const ids=new Set(plans.map(p=>p.id));for(const id of this.actors.keys())if(!ids.has(id))this.actors.delete(id);
  for(const p of plans){
   let a=this.actors.get(p.id);
   if(!a){a={x:p.x,z:p.z,yaw:p.yaw,distance:0,radius:p.radius,rng:hash(p.id),detourUntil:0,stuck:0,turns:0,side:hash(p.id)%2?1:-1};this.actors.set(p.id,a);
    // Search once before appearing; repeated projection can oscillate between
    // a house, a lamp and a reserved row when their safety margins overlap.
    const occupied=[...obstacles,...result],origin={x:a.x,z:a.z};
    const free=c=>occupied.every(o=>obstacleDistance(c,o)>=a.radius+o.radius+.14);
    if(!free(a)){let found=false;for(let radius=.5;radius<=50&&!found;radius+=.5)for(let i=0;i<40;i++){const angle=a.yaw+i*Math.PI/20,c={x:origin.x+Math.sin(angle)*radius,z:origin.z+Math.cos(angle)*radius};if(free(c)){a.x=c.x;a.z=c.z;found=true;break;}}}

   }
   a.radius=p.radius;
   const others=[...obstacles,...[...this.actors].filter(([id])=>id!==p.id).map(([,v])=>v)];
   const phase=(hash(p.id)%1000)/100,goal={x:p.x+Math.sin(this.time*.31+phase)*.75,z:p.z+Math.cos(this.time*.23+phase)*.75};
   for(let pass=0;pass<2;pass++)for(const o of obstacles){const c=closestOnObstacle(goal,o),d=dist(goal,c),r=o.radius+a.radius+.35;if(d<r){const dx=d?(goal.x-c.x)/d:Math.sin(a.yaw),dz=d?(goal.z-c.z)/d:Math.cos(a.yaw);goal.x=c.x+dx*r;goal.z=c.z+dz*r;}}
   const normalAngle=Math.atan2(goal.x-a.x,goal.z-a.z),desiredSpeed=p.speed<.025?0:Math.min(3.8,Math.max(p.speed,.75));
   const reach=1.15+desiredSpeed*.6,probe={x:a.x+Math.sin(normalAngle)*reach,z:a.z+Math.cos(normalAngle)*reach};
   const danger=others.filter(o=>obstacleDistance(a,o)<a.radius+o.radius+reach+.3);
   const obstructed=!sweptClear(a,probe,a.radius,danger),overlap=danger.some(o=>obstacleDistance(a,o)<a.radius+o.radius+.08);
   if((obstructed&&desiredSpeed>0||overlap||a.stuck>.35)&&this.time>=a.detourUntil){
    const side=this.random(a)<.2?-a.side:a.side;a.side=side;a.turnHeading=normalAngle+side*(.95+this.random(a)*.8);a.detourUntil=this.time+1.1+this.random(a)*1.5;a.turns++;a.stuck=0;
   }
   const detouring=this.time<a.detourUntil,angle=detouring?a.turnHeading:normalAngle;
   const speed=overlap?3.8:detouring?Math.max(1.15,desiredSpeed):desiredSpeed,step=Math.min(detouring?Infinity:dist(a,goal),speed*dt);
   const nearby=others.filter(o=>obstacleDistance(a,o)<=a.radius+o.radius+.08+step);
   let best=null,bestScore=-Infinity;
   for(const offset of offsets){const heading=angle+offset,b={x:a.x+Math.sin(heading)*step,z:a.z+Math.cos(heading)*step};if(!canMove(a,b,a.radius,nearby))continue;
    let clearance=1.2;for(const o of danger)clearance=Math.min(clearance,obstacleDistance(b,o)-a.radius-o.radius);
    const progress=dist(a,goal)-dist(b,goal),score=(detouring?Math.cos(offset)*step*2.2:progress*3)-Math.abs(offset)*step*.1+Math.min(1,clearance)*step*.8;
    if(score>bestScore){bestScore=score;best=b;}
   }
   const moved=best?dist(a,best):0;
   if(best&&moved>1e-6){const heading=Math.atan2(best.x-a.x,best.z-a.z);a.yaw+=wrap(heading-a.yaw)*Math.min(1,dt*8);a.x=best.x;a.z=best.z;a.distance+=moved;a.stuck=0;}
   else if(speed>.1&&dt>0){a.stuck+=dt;if(a.stuck>.4){a.detourUntil=0;a.side=-a.side;}}
   result.push({...p,x:a.x,z:a.z,yaw:a.yaw,radius:a.radius,distance:a.distance,speed:dt?moved/dt:0,gait:moved<.0001?'idle':speed>1.8?'run':'walk',visible:true,avoiding:detouring||overlap,turns:a.turns});
  }
  return result;
 }
}
