// Decorative relief is outside the flat, playable clearing. No elevation is
// introduced into avatar, vehicle, ambient-event or animal movement systems.
export const LANDSCAPE_CELL=2;
export const CLEARING={minX:-38,maxX:38,minZ:-48,maxZ:60};
export function terrainHeight(x,z){
 if(x>=CLEARING.minX&&x<=CLEARING.maxX&&z>=CLEARING.minZ&&z<=CLEARING.maxZ)return 0;
 if(x>=44&&x<=60&&z>=-46&&z<=38)return 0; // stream and its flat banks
 let h=0;
 for(const [cx,cz,rx,rz,height]of [[-48,-60,27,25,22],[25,-76,32,28,27],[68,-53,28,28,19],[-62,-12,20,35,12],[62,3,20,35,10]]){
  const d=Math.hypot((x-cx)/rx,(z-cz)/rz);h=Math.max(h,(1-d)*height);
 }
 // Square terraces with exposed dirt and rock, rather than smooth cones.
 return Math.max(0,Math.floor(h/2)*2);
}
export const LANDSCAPE_TREES=[
 [-42,-32,1,0],[-47,-18,1.2,0],[-44,2,1,1],[-47,20,1.1,0],
 [42,-31,1.1,0],[45,-10,1,1],[44,12,1.1,1],[49,25,1.3,0],
 [-36,-53,1,1],[-25,-57,1.2,0],[-14,-61,1,0],[1,-63,1.2,1],
 [18,-59,1.3,0],[34,-60,1,1],[48,-51,1.2,0],[-60,-48,1,0],
 [-51,-68,1.15,0],[-39,-75,1,1],[21,-83,1.2,0],[33,-81,1,0]
].map(([x,z,scale,cherry])=>({x,z,scale,cherry:!!cherry,y:terrainHeight(x,z)}));
// A shallow decorative stream lies beyond the right edge of the clearing.
export function streamCell(x,z){return z>=-45&&z<=36&&x>=48+Math.round(Math.sin(z*.065)*3)&&x<=54+Math.round(Math.sin(z*.065)*3);}
