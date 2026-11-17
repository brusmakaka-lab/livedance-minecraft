import test from 'node:test';import assert from 'node:assert/strict';
import {DancePlayer,CHANNELS,sampleDance} from '../public/motion.js';
import {LOCAL_CLIPS} from '../public/local-dance-clips.js';
import {ROTATION_JOINTS,slerpInto} from '../public/motion-rotation.js';
test('four real local clips have closed loops, normalized rotations and bounded in-place motion',()=>{
 assert.equal(Object.keys(LOCAL_CLIPS).length,4);assert.equal(ROTATION_JOINTS.length,11);
 for(const [id,clip]of Object.entries(LOCAL_CLIPS)){
  assert(clip.sourceClip.startsWith('Mixamo'));assert.equal(clip.frames.length,clip.count+1);assert.deepEqual(clip.frames[0],clip.frames.at(-1));
  for(const f of clip.frames){assert.equal(f.length,47);assert(f.every(Number.isFinite));assert(Math.abs(f[0])<=.221&&Math.abs(f[2])<=.221);for(let q=0;q<11;q++){const n=Math.hypot(...f.slice(3+q*4,7+q*4));assert(Math.abs(n-1)<.00003);}}
  const player=new DancePlayer(18,id);for(let t=0;t<10;t+=.037){const p=player.update(t,112,id);assert.equal(p.length,CHANNELS.length);assert([...player.rotations].every(Number.isFinite));for(let q=0;q<11;q++)assert(Math.abs(Math.hypot(...player.rotations.slice(q*4,q*4+4))-1)<.00001);}
 }
});
test('quaternion transitions preserve the current pose, pause and shortest rotation path',()=>{
 const player=new DancePlayer(22,'hiphop');player.update(0,112,'hiphop');player.update(2,112,'hiphop');const before=[...player.rotations];player.update(2,140,'rumba');assert.deepEqual([...player.rotations],before);const pose=[...player.update(2,140,'rumba')],rot=[...player.rotations];assert.deepEqual([...player.update(2,140,'rumba')],pose);assert.deepEqual([...player.rotations],rot);player.update(3,140,'rumba');assert.notDeepEqual([...player.rotations],before);
 const out=new Float32Array(4);slerpInto([0,0,0,1],[0,0,0,-1],.5,out);assert.deepEqual([...out],[0,0,0,1]);
});
