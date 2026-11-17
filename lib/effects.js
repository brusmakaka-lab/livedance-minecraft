export const EFFECT_SECONDS={Rose:10,Donut:12,VIP:18,Float:12};
const RECOVERY_MS=1400;

// Two gift owners may share the stage; the arrival always has its own space.
// This clock is shared by every browser and survives browser reloads.
export class EffectDirector {
 constructor({now=Date.now,schedule=setTimeout,cancel=clearTimeout,chooseDance=()=>null,onEffect=()=>{},onState=()=>{}}={}){Object.assign(this,{now,schedule,cancel,chooseDance,onEffect,onState});this.active=new Map();this.pending=new Map();this.paused=false;this.pausedAt=0;this.timer=null;this.closed=false;}
 enqueue(event){
  if(this.closed)return false;
  if(this.active.has(event.viewerId)){this.start(event);this.publish();return true;}
  if(this.active.size<2){this.start(event);this.publish();return true;}
  if(!this.pending.has(event.viewerId)&&this.pending.size>=100)return false;
  const bundle=this.pending.get(event.viewerId)||new Map();bundle.set(event.type,event);this.pending.set(event.viewerId,bundle);this.publish();return true;
 }
 start(event){const startedAt=this.paused?this.pausedAt:this.now(),durationMs=(EFFECT_SECONDS[event.type]||8)*1000,record={...event,startedAt,endsAt:startedAt+durationMs,durationMs,danceId:this.chooseDance(event.type)};let owner=this.active.get(event.viewerId);if(!owner){owner={viewerId:event.viewerId,events:new Map(),until:0};this.active.set(event.viewerId,owner);}owner.events.set(event.type,record);owner.until=Math.max(owner.until,record.endsAt+RECOVERY_MS);this.onEffect({...record,remainingMs:durationMs});}
 snapshot(){const now=this.paused?this.pausedAt:this.now();return {paused:this.paused,serverNow:this.now(),active:[...this.active.values()].map(o=>({viewerId:o.viewerId,remainingMs:Math.max(0,o.until-now),events:[...o.events.values()].map(e=>({...e,remainingMs:Math.max(0,e.endsAt-now),sinceEndMs:Math.max(0,now-e.endsAt)}))})),pendingCount:this.pending.size,upcoming:[...this.pending.keys()].slice(0,8)};}
 publish(){this.onState(this.snapshot());this.arm();}
 arm(){if(this.timer!==null)this.cancel(this.timer);this.timer=null;if(this.closed||this.paused||!this.active.size)return;const next=Math.min(...[...this.active.values()].map(o=>o.until));this.timer=this.schedule(()=>{this.timer=null;this.advance();},Math.max(1,next-this.now()));this.timer?.unref?.();}
 advance(){if(this.closed||this.paused)return;for(const [id,o]of this.active)if(o.until<=this.now())this.active.delete(id);while(this.active.size<2&&this.pending.size){const [id,bundle]=this.pending.entries().next().value;this.pending.delete(id);for(const event of bundle.values())this.start(event);}this.publish();}
 pause(){if(this.paused)return;this.paused=true;this.pausedAt=this.now();this.publish();}
 resume(){if(!this.paused)return;const delta=this.now()-this.pausedAt;for(const o of this.active.values()){o.until+=delta;for(const e of o.events.values()){e.startedAt+=delta;e.endsAt+=delta;}}this.paused=false;this.publish();}
 remove(id){this.active.delete(id);this.pending.delete(id);this.advance();}
 reset(){if(this.timer!==null)this.cancel(this.timer);this.timer=null;this.active.clear();this.pending.clear();this.paused=false;this.publish();}
 close(){this.closed=true;this.reset();}
}
