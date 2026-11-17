export class WorldClock {
 constructor({now=Date.now}={}){this.now=now;this.base=0;this.since=now();this.paused=false;}
 time(){return this.base+(this.paused?0:this.now()-this.since);}
 setPaused(p){this.base=this.time();this.since=this.now();this.paused=!!p;}
 snapshot(){return {timeMs:this.time(),paused:this.paused};}
 restore(s){if(s&&Number.isFinite(s.timeMs)){this.base=Math.max(0,s.timeMs);this.since=this.now();this.paused=!!s.paused;}}
}
