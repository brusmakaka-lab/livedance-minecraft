import test from 'node:test';import assert from 'node:assert/strict';
import {stageSlot,freeSlot,visibleSector,foregroundPlan} from '../public/presentation.js';
test('placements stay separate for 1, 3, 5, 10 and 24 owners, including order wraparound',()=>{
 for(const count of [1,3,5,10,24]){const used=new Set(),positions=new Set();for(let i=0;i<count;i++){const slot=freeSlot(used,i+1,24);used.add(slot);positions.add(JSON.stringify(stageSlot(slot,24)));}assert.equal(used.size,count);assert.equal(positions.size,count);}
 assert.equal(freeSlot(new Set([0,1,3]),25,24),2);
});
test('camera selects the same owner and its sector independently of roster array order',()=>{
 const actors=Array.from({length:24},(_,slot)=>({id:String(slot),slot})).reverse();
 assert.deepEqual(visibleSector(actors,'7','individual').map(a=>a.id),['7']);
 assert.deepEqual(visibleSector(actors,'7','sector').map(a=>a.slot).sort((a,b)=>a-b),[0,1,2,3,4,5,6,7,8,9]);
 assert.equal(visibleSector(actors,'7','group').length,24);
});

test('forty owners fill four straight rows of ten, with number eleven starting the second row',()=>{const places=Array.from({length:40},(_,slot)=>stageSlot(slot,40));assert.equal(new Set(places.map(p=>p.z)).size,4);for(let row=0;row<4;row++){const list=places.slice(row*10,row*10+10);assert.equal(new Set(list.map(p=>p.z)).size,1);for(let i=1;i<10;i++)assert(Math.abs(list[i].x-list[i-1].x-2.4)<.000001);}assert.equal(places[10].x,places[0].x);assert(places[10].z>places[0].z);assert(Math.abs(places[39].z-12.6)<.000001);});
test('normal arrivals have a dedicated foreground spot while retaining their canonical row',()=>{const shot=foregroundPlan('new','new',[]);assert.deepEqual(shot.anchors,{new:{x:0,z:31.6}});const next=foregroundPlan('next','next',[],true,8,'new');assert.equal(next.anchors.new.x,-9);assert.equal(next.anchors.next.x,0);assert.deepEqual(next.ids,['next']);assert.notEqual(foregroundPlan('next','next',['new'],true,8,'new').anchors.new.x,-9);const list=Array.from({length:40},(_,slot)=>({id:String(slot),slot}));assert.deepEqual(visibleSector(list,'9','row').map(a=>a.slot),[6,7,8,9]);assert.deepEqual(visibleSector(list,'10','row').map(a=>a.slot),[10,11,12,13]);});
test('Donut and an arriving owner share the front line without duplicate positions',()=>{const shot=foregroundPlan('arrival','arrival',['donor']);assert.deepEqual(shot.ids,['donor','arrival']);assert(shot.anchors.arrival.z>shot.anchors.donor.z);assert(shot.anchors.donor.x<shot.anchors.arrival.x);assert.equal(foregroundPlan('donor','donor',['donor']).ids.length,1);assert.equal(foregroundPlan('next','next',['donor']).anchors.donor.z,shot.anchors.donor.z);assert.equal(foregroundPlan('next',null,[],false).ids.length,0);});
