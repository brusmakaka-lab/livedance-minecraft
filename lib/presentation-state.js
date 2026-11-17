import {DANCE_CATALOG} from '../public/dance-settings.js';
const cameras=['auto','individual','sector','group'],dances=['auto',...DANCE_CATALOG.map(d=>d.id)];
export const defaultPresentation=()=>({camera:'auto',quality:720,bpm:112,dance:'auto',flags:true,houses:true,sky:'cycle',creatures:true,showRankings:true,focusId:null,revision:0});
export function updatePresentation(current,input,knownId=()=>false){
 if(!input||typeof input!=='object'||Array.isArray(input))return null;
 const next={...current};let hasField=false;
 for(const [key,values] of Object.entries({camera:cameras,quality:[540,720,1080],bpm:[90,112,128,140],dance:dances,sky:['cycle','day','night']})){
  if(!Object.hasOwn(input,key))continue;if(!values.includes(input[key]))return null;next[key]=input[key];hasField=true;
 }
 if(Object.hasOwn(input,'flags')){if(typeof input.flags!=='boolean')return null;next.flags=input.flags;hasField=true;}
 if(Object.hasOwn(input,'houses')){if(typeof input.houses!=='boolean')return null;next.houses=input.houses;hasField=true;}
 if(Object.hasOwn(input,'showRankings')){if(typeof input.showRankings!=='boolean')return null;next.showRankings=input.showRankings;hasField=true;}
 if(Object.hasOwn(input,'creatures')){if(typeof input.creatures!=='boolean')return null;next.creatures=input.creatures;hasField=true;}
 if(Object.hasOwn(input,'focusId')){if(input.focusId!==null&&(typeof input.focusId!=='string'||!knownId(input.focusId)))return null;next.focusId=input.focusId;if(input.focusId)next.camera='individual';hasField=true;}
 else if(input.camera&&input.camera!=='individual')next.focusId=null;
 if(!hasField)return null;
 if(['camera','quality','bpm','dance','flags','houses','sky','creatures','showRankings','focusId'].every(k=>next[k]===current[k]))return current;
 next.revision=current.revision+1;return next;
}
