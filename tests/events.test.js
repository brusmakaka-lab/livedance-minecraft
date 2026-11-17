import test from 'node:test';import assert from 'node:assert/strict';
import { Party, sender } from '../lib/events.js';
const modern=(id,content,msgId='m'+Math.random())=>({common:{msgId,roomId:'test'},user:{id,displayId:'unique-'+id,nickname:'Mismo nombre'},content});
test('modern and legacy chat preserve sender ID, Minecraft ownership and distinct same-name viewers',()=>{
  const events=[],p=new Party((type,data)=>{if(type!=='roster-order')events.push({type,data})});
  p.chat(modern('1','mc Notch'));p.chat(modern('1','hola'));p.chat(modern('2','hola'));
  assert.equal(events[0].type,'spawn-mc-skin');assert.equal(events[0].data.minecraftName,'Notch');assert.equal(p.roster.size,2);assert.equal(events[1].data.minecraftName,'Notch');
  p.chat({userId:'3',uniqueId:'legacy',nickname:'Legacy',comment:'mc Alex'});assert.equal(p.roster.get('3').minecraftName,'Alex');
  assert.equal(sender({nickname:'No ID'}),null);
});
test('duplicate messages are ignored and malformed Minecraft commands cannot fetch arbitrary URLs',()=>{
  const events=[],p=new Party((type,data)=>{if(type!=='roster-order')events.push({type,data})}),event=modern('1','hola','same');p.chat(event);p.chat(event);assert.equal(events.length,1);
  p.chat(modern('1','mc https://example.com'));assert.equal(p.roster.get('1').minecraftName,null);assert(events.some(e=>e.type==='skin-error'));
});
test('modern gifts and final streak duplicates produce exactly one effect for the real sender',()=>{
  const effects=[],p=new Party((type,data)=>{if(type==='trigger-effect')effects.push(data)});
  const gift={...modern('88',''),giftId:'5655',gift:{name:'Rosa',type:1},repeatCount:3,groupId:'group',repeatEnd:0};
  assert.equal(p.gift(gift),false);p.gift({...gift,repeatEnd:1});p.gift({...gift,repeatEnd:1,common:{msgId:'new-final'}});
  assert.equal(effects.length,1);assert.equal(effects[0].type,'Rose');assert.equal(effects[0].viewerId,'88');assert.equal(effects[0].count,3);
  p.gift({...modern('99',''),giftName:'Donut',giftType:0});assert.equal(effects[1].type,'Donut');assert.equal(effects[1].viewerId,'99');
});
test('capacity eviction follows admission order even after a recent comment',()=>{
  const removed=[];let now=0;const p=new Party((type,data)=>{if(type==='remove-avatar')removed.push(data.viewerId)},{maxAvatars:2,now:()=>++now});
  p.chat(modern('1','hello'));p.chat(modern('2','hello'));p.chat(modern('1','hello'));p.chat(modern('3','hello'));
  assert.deepEqual(removed,['1']);assert.deepEqual([...p.roster.keys()],['2','3']);
});

test('server preserves identity slots while FIFO ranks advance and slots are reused',()=>{
 let tick=0;const p=new Party(()=>{},{maxAvatars:4,now:()=>++tick});
 for(const id of ['1','2','3','4'])p.chat(modern(id,'hola'));
 for(const id of ['1','3','4'])p.chat(modern(id,'otro comentario'));
 p.chat(modern('5','hola'));assert.equal(p.roster.get('5').slot,0);
 p.chat(modern('6','hola'));assert.equal(p.roster.get('6').slot,1);
 const snapshot=JSON.parse(JSON.stringify(p.snapshot()));assert.deepEqual(snapshot.map(a=>[a.viewerId,a.slot]),[['3',2],['4',3],['5',0],['6',1]]);assert.equal(new Set(snapshot.map(a=>a.slot)).size,4);
});

test('default capacity is forty and a forty-first owner reuses a free slot within the four rows',()=>{const party=new Party(()=>{});assert.equal(party.maxAvatars,40);for(let i=0;i<41;i++)party.chat({user:{id:'capacity-'+i,nickname:'Viewer '+i},content:'hola'});assert.equal(party.roster.size,40);assert.equal(new Set([...party.roster.values()].map(a=>a.slot)).size,40);assert([...party.roster.values()].every(a=>a.slot>=0&&a.slot<40));});
