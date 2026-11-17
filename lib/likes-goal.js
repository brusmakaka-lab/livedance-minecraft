/** A round uses two independent baselines: totals and identified batches never add together. */
export class LikesGoal{
 constructor({target=100000,now=Date.now}={}){this.now=now;this.target=this.validTarget(target)?target:100000;this.sessionId=null;this.round=0;this.global=null;this.personal=0;}
 validTarget(n){return Number.isSafeInteger(n)&&n>=100&&n<=1000000000;}
 observe(sessionId,global,personal){
  if(this.sessionId!==sessionId){this.sessionId=sessionId;this.round=0;this.baseGlobal=0;this.basePersonal=0;this.count=0;this.completedAt=null;}
  this.global=global;this.personal=personal;
  // If a manual reset preceded the first global report, that report establishes its baseline.
  if(this.baseGlobal===null&&global!==null)this.baseGlobal=global;
  this.count=Math.max(this.count,personal-this.basePersonal,global===null?0:global-(this.baseGlobal??global),0);
  if(this.count>=this.target&&this.completedAt===null)this.completedAt=this.now();
 }
 reset(target=this.target){if(!this.validTarget(target))return false;this.target=target;this.round++;this.baseGlobal=this.global;this.basePersonal=this.personal;this.count=0;this.completedAt=null;return true;}
 snapshot(){const completed=this.completedAt!==null;return {id:this.sessionId+':'+this.round,target:this.target,count:Math.min(this.count,this.target),percent:completed?100:Math.min(100,this.count/this.target*100),completed,completedAt:this.completedAt,globalAvailable:this.global!==null};}
 exportState(){return {...this.snapshot(),sessionId:this.sessionId,round:this.round,baseGlobal:this.baseGlobal,basePersonal:this.basePersonal,rawCount:this.count};}
 restore(s,sessionId){if(!s||s.sessionId!==sessionId||!this.validTarget(s.target)||![s.round,s.basePersonal,s.rawCount].every(n=>Number.isSafeInteger(n)&&n>=0)||(s.baseGlobal!==null&&(!Number.isSafeInteger(s.baseGlobal)||s.baseGlobal<0)))return false;Object.assign(this,{sessionId,round:s.round,target:s.target,baseGlobal:s.baseGlobal,basePersonal:s.basePersonal,count:s.rawCount,completedAt:Number.isFinite(s.completedAt)?s.completedAt:null});return true;}
}
