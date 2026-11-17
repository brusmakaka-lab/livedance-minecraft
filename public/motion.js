import {DANCE_CLIPS as LOCAL_CLIPS,DANCE_CATALOG} from './dance-library.js';
import {localFrame,rotationsFor,slerpInto} from './motion-rotation.js';
export const CHANNELS=['x','y','z'];
export const POSE={x:0,y:1,z:2};
export const DANCES=DANCE_CATALOG;
const valid=id=>Object.hasOwn(LOCAL_CLIPS,id)?id:'hiphop';
const smooth=t=>t*t*(3-2*t),mod=(x,n)=>((x%n)+n)%n;
export function sampleDance(id,beat,out=new Float32Array(3)){const {a,b,t}=localFrame(valid(id),beat);for(let i=0;i<3;i++)out[i]=a[i]+(b[i]-a[i])*t;return out;}
export class DancePlayer{
 constructor(seed=0,preferred='hiphop'){this.beat=0;this.lastTime=null;this.seed=seed>>>0;this.preferred=valid(preferred);this.id=this.preferred;this.previous=this.id;this.changedAt=-10;this.out=new Float32Array(3);this.a=new Float32Array(3);this.b=new Float32Array(3);this.rotations=new Float32Array(44);this.qa=new Float32Array(44);this.qb=new Float32Array(44);}
 update(time,bpm=112,forced='auto',allowedIds=null){
  this.beat+=this.lastTime===null?time*bpm/60:Math.max(0,time-this.lastTime)*bpm/60;this.lastTime=time;
  const available=allowedIds?.filter(id=>Object.hasOwn(LOCAL_CLIPS,id)),pool=available?.length?available:DANCES.map(d=>d.id),beat=this.beat,cycle=Math.floor(beat/32),preferred=pool.indexOf(this.preferred),offset=preferred<0?this.seed%pool.length:preferred,id=forced!=='auto'&&Object.hasOwn(LOCAL_CLIPS,forced)?forced:pool[mod(offset+cycle,pool.length)];
  if(id!==this.id){this.previous=this.id;this.id=id;this.changedAt=time;}
  const phase=(this.seed%100)/100*.7;sampleDance(this.previous,beat+phase,this.a);sampleDance(this.id,beat+phase,this.b);const mix=smooth(Math.min(1,Math.max(0,(time-this.changedAt)/.75)));
  for(let i=0;i<3;i++)this.out[i]=this.a[i]+(this.b[i]-this.a[i])*mix;
  rotationsFor(this.previous,beat+phase,this.a,this.qa);rotationsFor(this.id,beat+phase,this.b,this.qb);for(let j=0;j<11;j++)slerpInto(this.qa,this.qb,mix,this.rotations,j*4);return this.out;
 }
}
// A vertical arrival is a presentation transition; dancing still uses the imported local clips.
export const DROP_DURATION=1.65;
export function entrance(age){
 const t=Math.max(0,age),air=Math.max(0,1-t/DROP_DURATION),fall=t<DROP_DURATION?7.2*(1-smooth(t/DROP_DURATION)):0,land=(t-DROP_DURATION)/.45,impact=land>=0&&land<1?Math.sin(land*Math.PI)*(1-land):0;
 return {scale:1,lift:fall,travel:0,ring:t>=DROP_DURATION?Math.max(0,1-(t-DROP_DURATION)/.65):0,impact,air};
}
