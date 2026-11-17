import {sender,validMinecraftName,chatText,isChatAura,isJoinCommand} from './events.js';

/** A single server clock owns admissions; browser refreshes cannot restart the queue. */
export class ArrivalQueue {
 constructor(party,{trigger='member',canPump=()=>true,canReplay=()=>true,chooseDance=()=>null,intervalMs=5000,maxPending=100,maxGiftReserve=100,now=Date.now,schedule=setTimeout,cancel=clearTimeout,onState=()=>{}}={}){
  Object.assign(this,{party,trigger,canPump,canReplay,chooseDance,intervalMs,maxPending,maxGiftReserve,now,schedule,cancel,onState});this.pending=new Map();this.replays=new Map();this.enrolled=new Set();this.active=null;this.timer=null;this.paused=false;this.closed=false;this.dropped=0;this.revision=0;
 }
 snapshot(){const remaining=this.active?Math.max(0,this.paused?this.remaining:this.active.endsAt-this.now()):0;return {revision:this.revision,trigger:this.trigger,intervalMs:this.intervalMs,paused:this.paused,pendingCount:this.pending.size,priorityPendingCount:[...this.pending.values()].filter(e=>e.priority).length,dropped:this.dropped,active:this.active?{...this.active,remainingMs:remaining}:null,upcoming:[...this.pending.values()].slice(0,8).map(e=>({viewerId:e.identity.viewerId,username:e.identity.username,source:e.source,priority:!!e.priority})),serverNow:this.now()};}
 publish(){this.revision++;this.onState(this.snapshot());}
 entry(data,source='member'){
  const identity=sender(data);if(!identity||this.closed)return false;
  if(this.party.roster.has(identity.viewerId)||this.enrolled.has(identity.viewerId))return false;
  let e=this.pending.get(identity.viewerId);if(e){e.data=data;e.identity=identity;return e;}
  if(this.pending.size>=(source==='gift'?this.maxPending+this.maxGiftReserve:this.maxPending)){this.dropped++;this.publish();return false;}
  e={identity,data,source,priority:source==='gift',chat:null,gifts:[]};this.pending.set(identity.viewerId,e);this.prioritize();return e;
 }
 follow(data){const e=this.entry(data,'follow');if(!e)return false;this.pump();this.publish();return true;}
 member(data){if(this.trigger!=='member')return false;const e=this.entry(data);if(!e)return false;this.pump();this.publish();return true;}
 chat(data){
  const identity=sender(data);if(!identity||this.closed)return false;
  if(this.party.roster.has(identity.viewerId)){
   const accepted=this.party.chat(data);if(!accepted||!isJoinCommand(chatText(data)))return accepted;
   // Re-present the same avatar only after real arrivals/gifts, with one request per owner.
   const id=identity.viewerId;if(this.active?.viewerId===id||this.pending.has(id)||this.now()-(this.replays.get(id)??-Infinity)<20000)return true;
   if(this.pending.size>=this.maxPending)return true;
   this.pending.set(id,{identity,data,source:'reentry',priority:false,chat:null,gifts:[]});this.prioritize();this.pump();this.publish();return true;
  }
  const content=chatText(data);if(isChatAura(content)){if(!this.pending.get(identity.viewerId)?.gifts.length)this.removePending(identity.viewerId);this.enrolled.add(identity.viewerId);return this.party.chat(data);}
  const skin=/^mc\s/i.test(content)&&validMinecraftName(content.slice(3).trim());
  const explicit=isJoinCommand(content);
  if(explicit||skin)this.enrolled.delete(identity.viewerId);
  let e=this.pending.get(identity.viewerId);
  if(this.trigger==='chat'||skin||explicit)e=e||this.entry(data,skin?'skin-command':explicit?'chat-command':'chat');
  if(!e)return false;if(skin||explicit||!e.chat)e.chat=data;this.pump();this.publish();return true;
 }
 gift(data){
  const identity=sender(data);if(!identity||this.closed)return false;
  if(this.party.roster.has(identity.viewerId)){if(this.pending.get(identity.viewerId)?.source==='reentry')this.removePending(identity.viewerId);return this.party.gift(data);}
  if(Number(data.giftType??data.gift?.type??data.giftDetails?.giftType??0)===1&&![true,1,'1'].includes(data.repeatEnd))return false;
  const e=this.pending.get(identity.viewerId)||this.entry(data,'gift');if(!e)return false;
  if(e.gifts.length<10)e.gifts.push(data);e.priority=true;e.source='gift';this.prioritize();this.pump();this.publish();return true;
 }
 prioritize(){const entries=[...this.pending];this.pending.clear();for(const tier of [0,1,2])for(const [id,e]of entries)if((e.priority?0:e.source==='reentry'?2:1)===tier)this.pending.set(id,e);}
 pump(){
  if(this.closed||this.paused||this.active||!this.pending.size||!this.canPump()&&![...this.pending.values()].some(e=>e.source==='gift'))return;
  this.prioritize();const [id,e]=this.pending.entries().next().value;
  if(e.source==='reentry'){if(!this.party.roster.has(id)){this.pending.delete(id);return this.pump();}if(!this.canReplay())return;this.replays.set(id,this.now());if(this.replays.size>4096)this.replays.delete(this.replays.keys().next().value);}
  this.pending.delete(id);this.enrolled.add(id);if(this.enrolled.size>4096)this.enrolled.delete(this.enrolled.values().next().value);
  const start=this.now();this.active={viewerId:id,username:e.identity.username,source:e.source,danceId:this.chooseDance(),startedAt:start,endsAt:start+this.intervalMs,durationMs:this.intervalMs};
  const record=this.party.upsert(e.identity);record.entrySource=e.source;
  this.party.emit(record.minecraftName?'spawn-mc-skin':'spawn-normal',{...record});
  if(e.chat)this.party.chat(e.chat);for(const gift of e.gifts)this.party.gift(gift);
  this.arm(this.intervalMs);
 }
 wake(){if(!this.active){this.pump();if(this.active)this.publish();}}
 arm(delay){this.timer=this.schedule(()=>{this.timer=null;this.active=null;this.pump();this.publish();},delay);this.timer?.unref?.();}
 pause(){if(this.paused||this.closed)return;this.remaining=this.active?Math.max(0,this.active.endsAt-this.now()):0;this.paused=true;if(this.timer!==null)this.cancel(this.timer);this.timer=null;this.publish();}
 resume(){if(!this.paused||this.closed)return;this.paused=false;if(this.active){this.active.startedAt=this.now()-(this.intervalMs-this.remaining);this.active.endsAt=this.now()+this.remaining;this.arm(this.remaining);}else this.pump();this.publish();}
 removePending(id){if(this.pending.delete(id))this.publish();}
 reset(notify=true){if(this.timer!==null)this.cancel(this.timer);this.timer=null;this.pending.clear();this.replays.clear();this.enrolled.clear();this.active=null;this.paused=false;this.remaining=0;this.dropped=0;if(notify)this.publish();}
 close(){this.closed=true;this.reset(false);}
}
