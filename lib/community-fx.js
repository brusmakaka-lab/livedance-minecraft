// Cosmetics never own camera focus or enter the paid gift queue.
export class CommunityFX {
 constructor({now=Date.now,onState=()=>{}}={}){this.now=now;this.onState=onState;this.items=new Map();this.paused=false;this.frozen=0;this.offset=0;this.timer=setInterval(()=>this.prune(),1000);this.timer.unref?.();}
 time(){return this.paused?this.frozen:this.now()-this.offset;}
 snapshot(){const t=this.time();return {paused:this.paused,items:[...this.items].map(([viewerId,e])=>({viewerId,...Object.fromEntries(Object.entries(e).map(([k,v])=>[k,Math.max(0,v-t)]))})).filter(e=>Object.entries(e).some(([k,v])=>k!=='viewerId'&&v>0))};}
 add(viewerId,type,durationMs){if(!viewerId||!['aura','vip','trail'].includes(type))return;const e=this.items.get(viewerId)||{};if(!this.items.has(viewerId)&&this.items.size>=128)this.items.delete(this.items.keys().next().value);this.items.delete(viewerId);e[type]=this.time()+durationMs;this.items.set(viewerId,e);this.onState(this.snapshot());}
 prune(){if(this.paused)return;let changed=false;for(const [id,e]of this.items){for(const k of Object.keys(e))if(e[k]<=this.time()){delete e[k];changed=true;}if(!Object.keys(e).length)this.items.delete(id);}if(changed)this.onState(this.snapshot());}
 setPaused(value){if(this.paused===!!value)return;if(value)this.frozen=this.time();else this.offset=this.now()-this.frozen;this.paused=!!value;this.onState(this.snapshot());}
 restore(s){this.items.clear();for(const e of s?.items||[])for(const type of ['aura','vip','trail'])if(e[type]>0)this.add(e.viewerId,type,e[type]);this.setPaused(!!s?.paused);}
 reset(){this.items.clear();this.onState(this.snapshot());}
 close(){clearInterval(this.timer);}
}
