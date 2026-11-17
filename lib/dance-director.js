import {defaultDancePools,validateDancePools,DANCE_CATALOG} from '../public/dance-settings.js';
export class DanceDirector{
 constructor({settings,save=()=>{},onState=()=>{}}={}){this.pools=validateDancePools(settings)||defaultDancePools();this.save=save;this.onState=onState;this.counters=new Map();this.revision=0;}
 snapshot(){return {revision:this.revision,pools:Object.fromEntries(Object.entries(this.pools).map(([k,v])=>[k,[...v]])),catalog:DANCE_CATALOG};}
 choose(event){const choices=this.pools[event]||[];if(!choices.length)return null;const count=this.counters.get(event)||0;this.counters.set(event,count+1);return choices[count%choices.length];}
 configure(input){const pools=validateDancePools(input);if(!pools)return false;this.save(pools);this.pools=pools;this.counters.clear();this.revision++;this.onState(this.snapshot());return true;}
}
