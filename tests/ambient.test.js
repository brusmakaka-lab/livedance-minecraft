import test from 'node:test';import assert from 'node:assert/strict';
import {WORLD_OBSTACLES} from '../public/world-layout.js';
import {GroundTraffic} from '../public/ground-traffic.js';
import {creaturePlan,ambientEventPlan} from '../public/ambient-plan.js';
test('persistent walkers steer around obstacles and one another instead of disappearing',()=>{
 const obstacles=WORLD_OBSTACLES,traffic=new GroundTraffic();let prior=null,travel=0;
 for(let frame=0;frame<18000;frame++){const plan=creaturePlan(frame/30),actors=traffic.update(plan.actors.map(a=>({...a,radius:2.05})),1/30,obstacles);for(const a of actors){assert(a.visible);for(const o of obstacles)assert(Math.hypot(a.x-o.x,a.z-o.z)>=a.radius+o.radius+.079);for(const b of actors.filter(b=>b!==a))assert(Math.hypot(a.x-b.x,a.z-b.z)>=a.radius+b.radius+.079);if(prior){const moved=Math.hypot(a.x-prior.find(b=>b.id===a.id).x,a.z-prior.find(b=>b.id===a.id).z);assert(moved<=3.8/30+.00001);travel+=moved;}}prior=actors;
 }assert(travel>300);
});
test('motion is continuous through gait changes and asset changes remain bounded',()=>{for(let t=0;t<200;t+=.1){const a=creaturePlan(t),b=creaturePlan(t+.01);for(let n=0;n<5;n++)assert(Math.hypot(a.actors[n].x-b.actors[n].x,a.actors[n].z-b.actors[n].z)<.08);}});
test('background cameos share one separated schedule; myth remains rare while mobs and memes vary',()=>{for(let block=0;block<5;block++){const events=[],types=new Set();let previous=null;for(let t=block*600;t<(block+1)*600;t+=.25){const e=ambientEventPlan(t);if(e.type){types.add(e.type);assert(e.opacity>=0&&e.opacity<=1);assert(e.time>=0&&e.time<e.duration);if(e.type!==previous)events.push({type:e.type,t,end:t+e.duration-e.time});}previous=e.type;}assert.equal(types.size,5);for(const type of ['flower','herobrine','mutant','suv'])assert(types.has(type));assert.equal(events.filter(e=>e.type==='flower').length,2);assert.equal(events.filter(e=>e.type==='herobrine').length,1);assert(types.has('meme-'+(block%4+1)));for(let i=1;i<events.length;i++)assert(events[i].t>=events[i-1].end+5);assert(events.reduce((sum,e)=>sum+e.end-e.t,0)<200);}});
