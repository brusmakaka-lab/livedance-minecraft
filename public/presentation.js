export const ROW_SIZE=10;
export const ROW_LIMIT=4;
export const COLUMN_SPACING=2.4;
export const ROW_SPACING=4.2;
export const FOREGROUND_SPACING=3.6;
export function stageSlot(slot,capacity=40){const columns=Math.min(ROW_SIZE,capacity),row=Math.floor(slot/columns),column=slot%columns;return {x:(column-(columns-1)/2)*COLUMN_SPACING,z:row*ROW_SPACING};}
// A serpentine queue: newest at the front, oldest at the back. Row-end turns
// happen in the side aisle, rather than crossing the people in another row.
export function flowSlot(rank,capacity=40){const columns=Math.min(ROW_SIZE,capacity),row=Math.floor(rank/columns),column=row%2?columns-1-rank%columns:rank%columns;return {x:(column-(columns-1)/2)*COLUMN_SPACING,z:(Math.ceil(capacity/columns)-1-row)*ROW_SPACING};}
export function foregroundPlan(selectedId,arrivalId,owners=[],present=true,frontZ=24.6,handoffId=null,previousLanes={},recoveringIds=[]){
 const giftIds=[...new Set(owners)].slice(0,2),ids=[...giftIds],lanes={},used=new Set();
 for(const id of giftIds){const lane=previousLanes[id];if([-1,1].includes(lane)&&!used.has(lane)){lanes[id]=lane;used.add(lane);}}
 for(const id of giftIds)if(lanes[id]===undefined){lanes[id]=[-1,1].find(l=>!used.has(l));used.add(lanes[id]);}
 if(arrivalId&&!ids.includes(arrivalId))ids.push(arrivalId);if(!arrivalId&&present&&selectedId&&!ids.includes(selectedId))ids.push(selectedId);
 const anchors={};for(const id of giftIds)anchors[id]={x:lanes[id]*(recoveringIds.includes(id)&&id!==arrivalId?9:FOREGROUND_SPACING),z:frontZ};if(arrivalId&&!anchors[arrivalId])anchors[arrivalId]={x:0,z:frontZ+7};
 if(!arrivalId&&present&&selectedId&&!anchors[selectedId])anchors[selectedId]={x:0,z:frontZ+7};
 if(handoffId&&!ids.includes(handoffId))anchors[handoffId]={x:-9,z:frontZ+4.5};
 return {ids,giftIds,anchors,lanes,arrivalId,primaryId:arrivalId||(present&&selectedId)||giftIds[0]||selectedId};
}
export function visibleSector(actors,selectedId,mode){if(mode==='group')return actors;const selected=actors.find(a=>a.id===selectedId)||actors[0];if(!selected)return [];if(mode==='individual')return [selected];const row=Math.floor(selected.slot/ROW_SIZE),list=actors.filter(a=>Math.floor(a.slot/ROW_SIZE)===row);if(mode==='row'){const column=selected.slot%ROW_SIZE,start=Math.max(0,Math.min(ROW_SIZE-4,column-2));return list.filter(a=>a.slot%ROW_SIZE>=start&&a.slot%ROW_SIZE<start+4);}return list;}
export function freeSlot(occupied,order,capacity){const wanted=((order||1)-1)%capacity;for(let i=0;i<capacity;i++){const slot=(wanted+i)%capacity;if(!occupied.has(slot))return slot;}return wanted;}
