import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';
import {createPartyServer} from '../server.js';import {SkinService} from '../lib/skins.js';import {mockSkinFetch} from './fixtures.js';
async function client(port){
 const ws=new WebSocket(`ws://127.0.0.1:${port}/socket.io/?EIO=4&transport=websocket`),events=[],acks=new Map();let ready;
 const connected=new Promise((resolve,reject)=>{ready=resolve;ws.addEventListener('error',reject,{once:true})});
 ws.addEventListener('message',event=>{const message=String(event.data);if(message.startsWith('0'))ws.send('40');else if(message==='2')ws.send('3');else if(message.startsWith('40'))ready();else if(message.startsWith('42'))events.push(JSON.parse(message.slice(2)));else if(message.startsWith('43')){const i=message.indexOf('['),id=Number(message.slice(2,i));acks.get(id)?.(JSON.parse(message.slice(i))[0]);acks.delete(id)}});
 await connected;let id=0;
 return {events,emit(type,data){const n=++id;return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Socket acknowledgement timed out')),2000);acks.set(n,result=>{clearTimeout(timer);resolve(result)});ws.send(`42${n}${JSON.stringify([type,data])}`)})},close:()=>ws.close()};
}
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
test('real Socket.io transport delivers demo chat, Minecraft skin and gifts, and reconnect restores roster',async t=>{
 const server=createPartyServer({env:{DEMO_MODE:'1',TIKTOK_ENABLED:'0'},skinService:new SkinService({fetcher:mockSkinFetch()})}),address=await server.start(0);t.after(()=>server.close());const c=await client(address.port);t.after(()=>c.close());
 assert((await c.emit('demo-event',{kind:'chat',viewerId:'one',username:'Luna',comment:'mc Notch'})).ok);await sleep(120);
 assert((await c.emit('demo-event',{kind:'gift',viewerId:'one',username:'Luna',giftName:'Rose'})).ok);assert(c.events.some(([event,data])=>event==='spawn-mc-skin'&&data.viewerId==='one'));assert(c.events.some(([event,data])=>event==='trigger-effect'&&data.type==='Rose'));
 const other=await client(address.port);t.after(()=>other.close());await sleep(30);assert(other.events.find(([event])=>event==='party-state')[1].avatars.some(a=>a.viewerId==='one'));
 assert((await c.emit('demo-control',{action:'pause'})).ok);assert.equal(server.status().paused,true);assert((await c.emit('demo-control',{action:'resume'})).ok);assert.equal(server.status().paused,false);
 const response=await fetch(`http://127.0.0.1:${address.port}/api/skins/Notch`),profile=await response.json();assert.equal(profile.uuid,'a'.repeat(32));const png=await fetch(`http://127.0.0.1:${address.port}${profile.textureUrl}`);assert.equal(png.headers.get('content-type'),'image/png');assert.equal((await png.arrayBuffer()).byteLength>33,true);
 assert((await c.emit('demo-control',{action:'reset'})).ok);assert.equal(server.party.roster.size,0);assert.equal(server.party.sequence,0);
});
test('live mode rejects simulated writes and injected connector forwards modern protobuf events',async t=>{
 class Connector extends EventEmitter{async connect(){return {roomId:'test'}}async disconnect(){this.disconnected=true}}
 const connector=new Connector(),server=createPartyServer({env:{TIKTOK_USERNAME:'test_creator'},connectorFactory:()=>connector}),address=await server.start(0);t.after(()=>server.close());const c=await client(address.port);t.after(()=>c.close());
 assert.equal((await c.emit('demo-event',{kind:'chat',viewerId:'x'})).ok,false);assert.equal((await c.emit('demo-control',{action:'reset'})).ok,false);
 connector.emit('chat',{common:{msgId:'chat'},user:{id:'real-id',displayId:'sender',nickname:'Sender'},content:'mc Alex'});
 connector.emit('gift',{common:{msgId:'gift'},user:{id:'real-id',displayId:'sender',nickname:'Sender'},gift:{name:'Donut',type:0},repeatCount:1});
 await sleep(30);assert(c.events.some(([event,data])=>event==='spawn-mc-skin'&&data.minecraftName==='Alex'));assert(c.events.some(([event,data])=>event==='trigger-effect'&&data.viewerId==='real-id'&&data.type==='Donut'));
});

test('connector MEMBER joins without commenting and restores the admission queue to a new socket',async t=>{
 class Connector extends EventEmitter{async connect(){return {roomId:'test'}}async disconnect(){}}
 const connector=new Connector(),server=createPartyServer({env:{TIKTOK_USERNAME:'test_creator'},connectorFactory:()=>connector}),address=await server.start(0);t.after(()=>server.close());
 connector.emit('chat',{user:{id:'comment-only',nickname:'Comment'},content:'hola'});assert.equal(server.party.roster.size,0);
 connector.emit('member',{user:{id:'member-one',nickname:'First'}});connector.emit('member',{user:{id:'member-two',nickname:'Second'}});connector.emit('member',{user:{id:'member-two',nickname:'Second'}});
 assert.equal(server.party.roster.size,1);assert.equal(server.arrivals.snapshot().pendingCount,1);
 const c=await client(address.port);t.after(()=>c.close());await sleep(30);const state=c.events.find(([event])=>event==='party-state')[1];assert.equal(state.avatars[0].viewerId,'member-one');assert.equal(state.arrivals.active.viewerId,'member-one');assert.equal(state.arrivals.upcoming[0].viewerId,'member-two');assert.equal(state.arrivals.intervalMs,5000);
});
