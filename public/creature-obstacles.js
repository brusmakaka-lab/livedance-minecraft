import {stageSlot,COLUMN_SPACING,ROW_SPACING} from './presentation.js';
// Static dance rows and the landing pad are reserved even when the floor is
// empty. Moving performers reserve their complete path before they descend.
export function creatureObstacles(world,actors,capacity=40,{foregroundIds=[],anchors={}}={}){
 const out=[...world],columns=Math.min(10,Math.max(1,capacity)),rows=Math.ceil(capacity/columns),half=(columns-1)*COLUMN_SPACING/2,front=stageSlot(capacity-1,capacity).z+12;
 for(let row=0;row<rows;row++)out.push({x:-half,z:row*ROW_SPACING,endX:half,endZ:row*ROW_SPACING,radius:1.9,kind:'dance-row'});
 if(rows>1)for(const x of [-half,half])out.push({x,z:0,endX:x,endZ:(rows-1)*ROW_SPACING,radius:1.9,kind:'dance-aisle'});
 out.push({x:0,z:front+7,radius:2.5,kind:'landing-pad'});
 for(const side of [-1,1])out.push({x:side*3.6,z:front,endX:side*9,endZ:front,radius:2.9,kind:'gift-pad'});
 out.push({x:0,z:front+7,endX:-9,endZ:front+4.5,radius:2.0,kind:'handoff-route'});
 const foreground=new Set(foregroundIds);
 for(const a of actors){if(a.retireAt!==undefined)continue;const p=a.root.position,scale=Math.max(1,a.root.scale.x),radius=1.5*scale;
  out.push({x:p.x,z:p.z,radius,kind:'performer',viewerId:a.id});
  const anchor=anchors[a.id];if(anchor&&Math.hypot(p.x-anchor.x,p.z-anchor.z)>.15)out.push({x:p.x,z:p.z,endX:anchor.x,endZ:anchor.z,radius:radius+.35,kind:'performer-transit',viewerId:a.id});
  // Keep both the current transit and the eventual return to the row clear.
  const target=a.base;if(target&&(foreground.has(a.id)||Math.hypot(p.x-target.x,p.z-target.z)>.6))out.push({x:p.x,z:p.z,endX:target.x,endZ:target.z,radius:radius+.35,kind:'performer-route',viewerId:a.id});
 }
 return out;
}
