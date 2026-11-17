import {LikesGoal} from './likes-goal.js';
import {randomUUID} from 'node:crypto';
import {sender,cleanText} from './events.js';

function positive(value){const n=Number(value);return Number.isSafeInteger(n)&&n>0?n:null;}
function giftPrice(data){let zero=false;
  for(const value of [data.giftDetails?.diamondCount,data.diamondCount,data.gift?.diamondCount,data.gift?.diamond_count,data.extendedGiftInfo?.diamond_count,data.extendedGiftInfo?.diamondCount]){
    if(value!==undefined&&value!==null){const n=Number(value);if(Number.isSafeInteger(n)&&n>0)return n;if(n===0)zero=true;}
  }
  return zero?0:null;
}

/** Contributions are owned by the live session, independently of avatar slots. */
export class Contributions{
  constructor({now=Date.now,onChange=()=>{},goalTarget=100000}={}){this.goal=new LikesGoal({now,target:goalTarget});this.now=now;this.onChange=onChange;this.reset('local','','');}
  reset(mode,channel,roomId){this.sessionId=randomUUID();this.startedAt=this.now();this.mode=mode;this.channel=channel;this.roomId=roomId;this.ended=false;this.rankingStartedAt={likes:this.startedAt,coins:this.startedAt};this.observedGlobalLikes=null;this.people=new Map();this.seen=new Set();this.order=0;this.totals={likes:0,coins:0,unknownGiftCount:0};this.changed();}
  resetGoal(target){if(!this.goal.reset(target))return false;this.changed();return true;}
  // Ranking baselines leave lifetime totals, reward thresholds, the goal and deduplication intact.
  resetRankings(scope){
    if(!['likes','coins','all'].includes(scope))return false;
    for(const key of scope==='all'?['likes','coins']:[scope]){
      for(const row of this.people.values())row[key+'Base']=row[key];
      this.rankingStartedAt[key]=this.now();
    }
    this.changed();return true;
  }
  changed(){this.goal.observe(this.sessionId,this.observedGlobalLikes,this.totals.likes);this.revision=(this.revision||0)+1;this.onChange();}
  beginLive(roomId,channel){
    if(typeof roomId==='number'&&!Number.isSafeInteger(roomId))roomId='';roomId=cleanText(roomId,80);if(roomId==='0')roomId='';channel=cleanText(channel,64).toLowerCase();
    if(this.mode==='live'&&!this.ended&&this.channel===channel&&(!roomId||!this.roomId||roomId===this.roomId)){
      if(roomId&&!this.roomId){this.roomId=roomId;this.changed();}return false;
    }
    this.reset('live',channel,roomId);return true;
  }
  endLive(){if(this.mode==='live'&&!this.ended){this.ended=true;this.changed();}}
  accept(type,data,extra=''){
    const id=extra||data.common?.msgId||data.msgId||data.messageId;if(!id||String(id)==='0')return true;
    const key=type+':'+String(data.common?.roomId||this.roomId||'')+':'+String(id);
    if(this.seen.has(key))return false;this.seen.add(key);if(this.seen.size>32768)this.seen.delete(this.seen.values().next().value);return true;
  }
  person(identity){let row=this.people.get(identity.viewerId);if(!row){row={...identity,likes:0,coins:0,likesBase:0,coinsBase:0,order:++this.order};this.people.set(row.viewerId,row);}else Object.assign(row,identity);return row;}
  observeLikes(data){const values=[data.totalLikeCount,data.totalLikes,data.total].filter(v=>v!==undefined&&v!==null&&v!=='').map(Number).filter(n=>Number.isSafeInteger(n)&&n>=0);if(values.length){const total=Math.max(...values,this.observedGlobalLikes??0);if(total!==this.observedGlobalLikes){this.observedGlobalLikes=total;this.changed();}}}
  like(data){
    this.observeLikes(data);const identity=sender(data),count=positive(data.likeCount)||positive(data.count);if(!identity||!count||!this.accept('like',data))return false;
    const row=this.person(identity),add=Math.min(count,Number.MAX_SAFE_INTEGER-this.totals.likes,Number.MAX_SAFE_INTEGER-row.likes);row.likes+=add;this.totals.likes+=add;this.changed();return true;
  }
  gift(data){
    const identity=sender(data),count=data.repeatCount===undefined?1:positive(data.repeatCount),type=Number(data.giftType??data.giftDetails?.giftType??data.gift?.type??0);
    if(!identity||!count||type===1&&![true,1,'1'].includes(data.repeatEnd))return false;
    if(!this.accept('gift',data))return false;
    const group=[data.groupId,data.orderId].find(id=>id&&String(id)!=='0');
    if(type===1&&group&&!this.accept('gift-streak',data,identity.viewerId+':'+String(data.giftId||data.gift?.id||'')+':'+String(group)))return false;
    const price=giftPrice(data);if(price===null){this.totals.unknownGiftCount+=count;this.changed();return false;}
    const amount=price*count;if(!Number.isSafeInteger(amount))return false;
    const row=this.person(identity),add=Math.min(amount,Number.MAX_SAFE_INTEGER-this.totals.coins,Number.MAX_SAFE_INTEGER-row.coins);row.coins+=add;this.totals.coins+=add;this.changed();return true;
  }
  snapshot(){
    const ranked=[...this.people.values()].map(r=>({...r,likes:r.likes-(r.likesBase||0),coins:r.coins-(r.coinsBase||0)}));
    const top=key=>ranked.filter(r=>r[key]>0).sort((a,b)=>b[key]-a[key]||b[key==='likes'?'coins':'likes']-a[key==='likes'?'coins':'likes']||a.order-b.order).slice(0,3).map(({viewerId,username,likes,coins})=>({viewerId,username,likes,coins}));
    return {sessionId:this.sessionId,revision:this.revision,mode:this.mode,channel:this.channel,roomId:this.roomId,startedAt:this.startedAt,ended:this.ended,rankingStartedAt:{...this.rankingStartedAt},totals:{...this.totals},observedGlobalLikes:this.observedGlobalLikes,goal:this.goal.snapshot(),topLikes:top('likes'),topCoins:top('coins')};
  }
  exportState(){return {...this.snapshot(),goalState:this.goal.exportState(),people:[...this.people.values()].map(r=>({...r})),seen:[...this.seen],order:this.order};}
  restore(value){
    if(!value?.sessionId||!Array.isArray(value.people))return false;
    this.sessionId=String(value.sessionId);this.startedAt=Number(value.startedAt)||this.now();this.mode=value.mode==='live'?'live':'local';this.channel=cleanText(value.channel,64);this.roomId=cleanText(value.roomId,80);this.ended=!!value.ended;this.rankingStartedAt=Object.fromEntries(['likes','coins'].map(k=>[k,Number.isSafeInteger(value.rankingStartedAt?.[k])&&value.rankingStartedAt[k]>=0?value.rankingStartedAt[k]:this.startedAt]));this.observedGlobalLikes=Number.isSafeInteger(value.observedGlobalLikes)?value.observedGlobalLikes:null;this.people=new Map();
    for(const row of value.people){const id=cleanText(row.viewerId,80);if(!id||![row.likes,row.coins,row.order].every(n=>Number.isSafeInteger(n)&&n>=0))continue;this.people.set(id,{viewerId:id,username:cleanText(row.username,32),likes:row.likes,coins:row.coins,likesBase:Number.isSafeInteger(row.likesBase)?Math.max(0,Math.min(row.likes,row.likesBase)):0,coinsBase:Number.isSafeInteger(row.coinsBase)?Math.max(0,Math.min(row.coins,row.coinsBase)):0,order:row.order});}
    this.totals={likes:0,coins:0,unknownGiftCount:Math.max(0,Number(value.totals?.unknownGiftCount)||0)};this.order=0;for(const r of this.people.values()){this.totals.likes+=r.likes;this.totals.coins+=r.coins;this.order=Math.max(this.order,r.order);}this.seen=new Set((value.seen||[]).slice(-32768).map(String));this.goal.restore(value.goalState,this.sessionId);this.changed();return true;
  }
}
