import test from 'node:test';import assert from 'node:assert/strict';
import {CHARACTERS,characterForViewer} from '../public/cast-data.js';
import {DANCES,DancePlayer,sampleDance,entrance} from '../public/motion.js';
import {parts,faceRects,splitFaceRects,mapBoxUV} from '../public/skin-atlas.js';
import {Party} from '../lib/events.js';
const chat=(id,content)=>({user:{id,nickname:id},content});
test('an explicit character selection replaces only that viewer skin and survives subsequent chat and snapshots',()=>{
 const p=new Party(()=>{});p.chat(chat('owner','mc Notch'));p.chat(chat('other','mc Alex'));
 assert.equal(p.character(chat('owner',''),'ld-01'),true);assert.equal(p.roster.get('owner').minecraftName,null);assert.equal(p.roster.get('owner').characterId,'ld-01');assert.equal(p.roster.get('other').minecraftName,'Alex');
 const slot=p.roster.get('owner').slot;p.chat(chat('owner','hola'));const restored=JSON.parse(JSON.stringify(p.snapshot())).find(a=>a.viewerId==='owner');assert.equal(restored.characterId,'ld-01');assert.equal(restored.slot,slot);
 assert.equal(p.character(chat('invalid',''),'https://example.com/model'),false);assert.equal(p.roster.has('invalid'),false);
 for(const id of ['owner','other','same'])assert.equal(characterForViewer(id).id,characterForViewer(id).id);
 assert(CHARACTERS.every(c=>c.style==='minecraft'));
});
test('the original four and six supplied choreographies produce distinct, bounded, continuous looping poses',()=>{
 assert.deepEqual(DANCES.map(d=>d.id),['twist','rumba','hiphop','celebrate','brooklyn-uprock','twerk','gangnam-style','hiphop-new','samba-a','samba-b']);const signatures=[];
 for(const {id,beats=8}of DANCES){const values=[];for(let beat=0;beat<beats;beat+=.13){const p=[...sampleDance(id,beat)];assert(p.every(Number.isFinite));assert(p.every(x=>Math.abs(x)<2.7));assert(Math.abs(p[0])<.25&&p[1]>-.8&&p[1]<.2);values.push(...p.map(x=>x.toFixed(2)));}
 signatures.push(values.join(','));const before=sampleDance(id,beats-.0001),after=sampleDance(id,beats+.0001);assert(before.every((v,i)=>Math.abs(v-after[i])<.002));}
 assert.equal(new Set(signatures).size,DANCES.length);
});
test('tempo changes and paused time do not jump a pose; choreography switches crossfade',()=>{
 const player=new DancePlayer(44,'hiphop');player.update(0);const before=[...player.update(2,112,'hiphop')],same=[...player.update(2,140,'hiphop')];assert.deepEqual(same,before);
 const changed=[...player.update(2,140,'rumba')];assert.deepEqual(changed,same);const next=player.update(2.001,140,'rumba');assert(next.every((v,i)=>Math.abs(v-changed[i])<.03));assert.notDeepEqual([...player.update(3,140,'rumba')],before);
 assert.equal(entrance(2).lift,0);assert.equal(entrance(0).lift,7.2);assert.equal(entrance(0).scale,1);
});
test('segmented arms and knees retain UV regions for classic, slim, legacy and rounded meshes',()=>{
 for(const legacy of [false,true])for(const model of ['classic','slim'])for(const part of parts(model,legacy).filter(p=>p.pivot))for(const lower of [false,true]){
  const rectangles=splitFaceRects(faceRects(...part.base,...part.size),lower);
  for(const [x,y,w,h]of rectangles){assert(x>=0&&y>=0&&w>0&&h>0);assert(x+w<=64&&y+h<=(legacy?32:64));}
  for(const perFace of [4,25]){const uv=Array.from({length:perFace*6},(_,i)=>[(i%perFace)%2,Math.floor((i%perFace)/2)%2]),geometry={attributes:{uv:{count:uv.length,getX:i=>uv[i][0],getY:i=>uv[i][1],setXY:(i,x,y)=>uv[i]=[x,y]}}};mapBoxUV(geometry,rectangles,64,legacy?32:64,!!part.mirror);assert(uv.flat().every(v=>Number.isFinite(v)&&v>=0&&v<=1));assert(geometry.attributes.uv.needsUpdate);}
 }
});

test('sky arrival falls vertically, lands and settles without shrinking or replaying a side slide',()=>{let previous=Infinity;for(let age=0;age<1.65;age+=.025){const e=entrance(age);assert(e.lift<=previous&&e.lift>=0);assert.equal(e.scale,1);assert.equal(e.travel,0);previous=e.lift;}assert.equal(entrance(1.65).lift,0);assert(entrance(1.8).impact>0);assert.deepEqual(entrance(2.4),{scale:1,lift:0,travel:0,ring:0,impact:0,air:0});});
