export const AMBIENT_DURATIONS=Object.freeze({flower:27000,mutant:30000,herobrine:11000,suv:16000,'meme-1':12000,'meme-2':12000,'meme-3':21000,'meme-4':12000});
// One replaceable manual scene, shared by studio/OBS. No unbounded queue.
export class AmbientDirector {
 constructor({now=Date.now,schedule=setTimeout,cancel=clearTimeout,onState=()=>{}}={}){Object.assign(this,{now,schedule,cancel,onState});this.active=null;this.paused=false;this.waiting=false;this.timer=null;this.revision=0;this.sequence=0;this.closed=false;}
 snapshot(){const a=this.active;return {revision:this.revision,paused:this.paused,waiting:this.waiting,serverNow:this.now(),active:a?{id:a.id,type:a.type,durationMs:a.durationMs,remainingMs:Math.max(0,a.remainingMs-(this.paused?0:this.now()-a.since))}:null};}
 publish(){this.revision++;this.onState(this.snapshot());this.arm();}
 arm(){if(this.timer!==null)this.cancel(this.timer);this.timer=null;if(this.closed||this.paused||!this.active)return;this.timer=this.schedule(()=>{this.timer=null;this.active=null;this.publish();},Math.max(1,this.snapshot().active.remainingMs));this.timer?.unref?.();}
 start(type){if(this.closed||!Object.hasOwn(AMBIENT_DURATIONS,type))return false;if(this.active?.type===type)return true;this.active={id:++this.sequence,type,durationMs:AMBIENT_DURATIONS[type],remainingMs:AMBIENT_DURATIONS[type],since:this.now()};this.publish();return true;}
 setHeld(paused,waiting=false){if(this.closed)return;paused=!!paused;waiting=!!waiting;if(this.paused===paused&&this.waiting===waiting)return;const remaining=this.snapshot().active?.remainingMs;if(this.active){this.active.remainingMs=remaining;this.active.since=this.now();}this.paused=paused;this.waiting=waiting;this.publish();}
 stop(){if(this.closed)return;this.active=null;this.publish();}
 close(){if(this.timer!==null)this.cancel(this.timer);this.timer=null;this.closed=true;this.active=null;}
}
