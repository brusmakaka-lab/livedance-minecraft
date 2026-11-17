export const SUV_BAY={x:-6,z:-11,radius:6.6};
// Houses face the dance square; the center lane remains clear behind the flags.
export const VILLAGE_HOUSES=[
 {model:'small_house',x:-22,z:8,yaw:Math.PI/2,radius:5.6},
 {model:'medium_house',x:23,z:7,yaw:-Math.PI/2,radius:6.8},
 {model:'medium_house',x:-26,z:-17,yaw:Math.PI/2,radius:6.8},
 {model:'small_house',x:25,z:-19,yaw:-Math.PI/2,radius:5.6},
 {model:'small_house',x:-13,z:-36,yaw:0,radius:5.6},
 {model:'medium_house',x:14,z:-38,yaw:0,radius:6.8}
];
export const VILLAGE_LAMPS=[{x:-14,z:3},{x:14,z:3},{x:-16,z:19},{x:16,z:19},{x:-19,z:-24},{x:19,z:-25}];
export const WORLD_OBSTACLES=[SUV_BAY,...VILLAGE_HOUSES,...VILLAGE_LAMPS.map(p=>({...p,radius:2.3})),{x:-10.5,z:-5.5,radius:6},{x:0,z:-5.5,radius:5},{x:0,z:-6,radius:6}];
