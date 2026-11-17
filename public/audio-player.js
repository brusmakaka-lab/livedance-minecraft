// One selected output: panel OR standalone stage. Embedded preview stays silent.
export class MusicPlayer {
 constructor(socket,role,onChange=()=>{}){
  this.socket=socket;this.role=role;this.onChange=onChange;this.audio=new Audio();this.audio.preload='metadata';this.audio.loop=false;this.audio.dataset.partyMusic=role;document.body.append(this.audio);this.state=null;this.blocked=false;this.revision=0;this.pendingEnd=null;this.metadataKey=null;
  socket.on('music-state',s=>this.receive(s));socket.on('connect',()=>{this.metadataKey=null;this.reportDuration();this.finishIfEnded();});socket.on('disconnect',()=>{this.pendingEnd=null;});
  this.audio.addEventListener('loadedmetadata',()=>{this.applyPosition();this.reportDuration();});
  this.audio.addEventListener('ended',()=>this.finishIfEnded());
  this.audio.addEventListener('error',()=>{this.blocked=true;this.onChange(this.state,this.inspect());});
  this.timer=setInterval(()=>{this.finishIfEnded();this.reportDuration();if(this.state?.playing&&this.isOutput()&&!this.audio.paused&&Math.abs(this.audio.currentTime-this.targetTime())>1.2)this.applyPosition();},2000);
 }
 isOutput(){return this.state?.output===this.role;}
 playbackKey(){return this.state?this.state.currentId+':'+(this.state.playbackId??0):'';}
 finishIfEnded(){
  if(!this.state?.playing||!this.isOutput()||!this.audio.ended||this.socket.connected===false)return;
  const key=this.playbackKey();if(this.pendingEnd===key)return;this.pendingEnd=key;
  this.socket.timeout(4000).emit('music-ended',{id:this.state.currentId,playbackId:this.state.playbackId},()=>{
   // A state change may already have started the next song.
   if(this.pendingEnd===key)this.pendingEnd=null;
  });
 }
 reportDuration(){
  if(!this.state||!this.isOutput()||!Number.isFinite(this.audio.duration)||this.audio.duration<.1||this.socket.connected===false)return;
  const track=this.state.tracks.find(t=>t.id===this.state.currentId);if(!track||this.audio.getAttribute('src')!==track.url)return;
  const key=this.playbackKey()+':'+this.role;if(this.metadataKey===key)return;this.metadataKey=key;
  this.socket.timeout(4000).emit('music-duration',{id:this.state.currentId,playbackId:this.state.playbackId,output:this.role,duration:this.audio.duration},(error,response)=>{if((error||!response?.ok)&&this.metadataKey===key)this.metadataKey=null;});
 }
 targetTime(){return Math.max(0,(this.state?.position||0)+(this.state?.playing?(Date.now()-this.state.serverNow)/1000:0));}
 applyPosition(){if(!this.audio.readyState)return;const time=Math.min(this.targetTime(),Number.isFinite(this.audio.duration)?Math.max(0,this.audio.duration-.05):Infinity);if(Math.abs(time-this.audio.currentTime)>.3)this.audio.currentTime=time;}
 receive(state){
  const oldKey=this.playbackKey();this.state=state;this.revision++;const track=state.tracks.find(t=>t.id===state.currentId),restarted=oldKey!==this.playbackKey();if(restarted)this.pendingEnd=null;
  if(track&&this.audio.getAttribute('src')!==track.url){this.audio.src=track.url;this.audio.load();}
  else if(track&&restarted&&this.audio.readyState){this.audio.currentTime=Math.max(0,state.position||0);}
  this.audio.volume=state.volume;this.applyPosition();
  if(this.isOutput()&&state.playing)this.tryPlay();else{this.audio.pause();this.blocked=false;}
  this.reportDuration();this.onChange(state,this.inspect());
 }
 tryPlay(){if(!this.audio.getAttribute('src'))return;const revision=this.revision;this.audio.play().then(()=>{if(revision!==this.revision&&(!this.state.playing||!this.isOutput()))this.audio.pause();this.blocked=false;this.onChange(this.state,this.inspect());}).catch(error=>{if(revision!==this.revision||!this.isOutput()||!this.state.playing)return;this.blocked=error.name==='NotAllowedError';this.onChange(this.state,this.inspect());});}
 unlock(){if(this.isOutput())this.tryPlay();}
 inspect(){return {role:this.role,output:this.state?.output,playing:!this.audio.paused,currentTime:this.audio.currentTime,readyState:this.audio.readyState,volume:this.audio.volume,blocked:this.blocked,trackId:this.state?.currentId,playbackId:this.state?.playbackId,repeatAll:this.state?.repeatAll===true,mediaError:this.audio.error?.message||null};}
}
