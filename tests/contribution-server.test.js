import test from 'node:test';import assert from 'node:assert/strict';import {EventEmitter} from 'node:events';import {createPartyServer} from '../server.js';
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
test('real connector LIKE/GIFT handlers keep totals independent of admission queues; reconnect preserves and new room resets',async()=>{
 let room='room-1',connector;class Connector extends EventEmitter{async connect(){return {roomId:room};}async disconnect(){}}
 const s=createPartyServer({env:{TIKTOK_USERNAME:'Palermotusi',IDLE_SECONDS:'0'},channelSettingsPath:null,connectorFactory:()=>connector=new Connector()});
 try{await s.start(0);await sleep(15);for(let i=0;i<3;i++)connector.emit('member',{user:{id:'person-'+i,nickname:'Persona '+i}});assert(s.arrivals.snapshot().pendingCount>0);
  connector.emit('like',{common:{roomId:room,msgId:'like'},user:{id:'no-avatar',nickname:'Tapper'},count:12,total:'1000'});
  connector.emit('gift',{common:{roomId:room,msgId:'gift'},user:{id:'queued',nickname:'Donante'},giftId:'gift50',gift:{type:0,diamondCount:50,name:'Otro regalo'},repeatCount:2});
  assert.equal(s.contributions.snapshot().totals.likes,12);assert.equal(s.contributions.snapshot().totals.coins,100);assert(!s.party.roster.has('queued'));const session=s.contributions.sessionId;
  await s.connectionControl({action:'disconnect'});await s.connectionControl({action:'connect',username:'Palermotusi'});await sleep(15);assert.equal(s.contributions.sessionId,session);assert.equal(s.contributions.snapshot().totals.coins,100);
  room='room-2';await s.connectionControl({action:'disconnect'});await s.connectionControl({action:'connect',username:'Palermotusi'});await sleep(15);assert.notEqual(s.contributions.sessionId,session);assert.equal(s.contributions.snapshot().totals.coins,0);assert.equal(s.contributions.snapshot().totals.likes,0);
 }finally{await s.close();}
});
test('capture window launch is an explicit local action; cross-origin requests and rapid duplicates do not launch windows',async()=>{
 let launched=0;const s=createPartyServer({env:{DEMO_MODE:'1',TIKTOK_ENABLED:'0'},captureLauncher:()=>{launched++;return {ok:true};}});try{const a=await s.start(0),url=`http://127.0.0.1:${a.port}`;assert.equal((await fetch(url+'/captura')).status,200);assert.equal((await fetch(url+'/api/capture/open',{method:'POST',headers:{Origin:'https://otro.example'}})).status,403);assert.equal(launched,0);assert.equal((await fetch(url+'/api/capture/open',{method:'POST',headers:{Origin:url}})).status,202);assert.equal(launched,1);assert.equal((await fetch(url+'/api/capture/open',{method:'POST',headers:{Origin:url}})).status,429);assert.equal(launched,1);}finally{await s.close();}
});
