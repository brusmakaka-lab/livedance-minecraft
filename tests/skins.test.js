import test from 'node:test';import assert from 'node:assert/strict';
import {SkinService} from '../lib/skins.js';import {mockSkinFetch} from './fixtures.js';import {parts,faceRects} from '../public/skin-atlas.js';
test('UUID → session → PNG uses native fetch, decodes model and coalesces concurrent calls',async()=>{
  const requests=[],service=new SkinService({fetcher:mockSkinFetch({model:'slim',onRequest:url=>requests.push(url)})});
  const [a,b]=await Promise.all([service.resolve('Notch'),service.resolve('notch')]);assert.equal(a,b);assert.equal(a.model,'slim');assert.equal(a.width,64);assert.equal(requests.length,3);await service.resolve('NOTCH');assert.equal(requests.length,3);
});
test('invalid names, hostile texture locations and missing players fail safely',async()=>{
  let calls=0;const service=new SkinService({fetcher:mockSkinFetch({url:'http://127.0.0.1/secret',onRequest:()=>calls++})});
  await assert.rejects(service.resolve('../etc'),e=>e.status===400);assert.equal(calls,0);
  await assert.rejects(service.resolve('Notch'),/Origen/);assert.equal(calls,2);
  const missing=new SkinService({fetcher:async()=>new Response(null,{status:404})});await assert.rejects(missing.resolve('MissingPlayer'),e=>e.status===404);
});
test('profile service timeouts use the official Minecraft Services fallback without bypassing 404 or 429',async()=>{
  const requested=[],fallback=mockSkinFetch({onRequest:url=>requested.push(url)});
  const service=new SkinService({fetcher:async(url,options)=>url.includes('api.mojang.com')?new Response(null,{status:503}):fallback(url,options)});
  const result=await service.resolve('Notch');assert.equal(result.uuid,'a'.repeat(32));assert(requested.some(url=>url.startsWith('https://api.minecraftservices.com/')));
  let calls=0;const limited=new SkinService({fetcher:async()=>{calls++;return new Response(null,{status:429})}});await assert.rejects(limited.resolve('Notch'),e=>e.status===429);assert.equal(calls,1);
});
test('failed lookups cool down; successful entries expire and cache stays bounded',async()=>{
  let now=0,calls=0;const fetcher=mockSkinFetch({onRequest:()=>calls++}),service=new SkinService({fetcher,now:()=>now,ttl:100,maxEntries:2});
  await service.resolve('One');await service.resolve('Two');await service.resolve('Three');assert.equal(service.cache.size,2);now=101;await service.resolve('Three');assert.equal(calls,12);
  let failedCalls=0;const failing=new SkinService({now:()=>now,fetcher:async()=>{failedCalls++;return new Response(null,{status:429})}});
  await assert.rejects(failing.resolve('Limit'));await assert.rejects(failing.resolve('Limit'));assert.equal(failedCalls,1);
});
test('every classic, slim and legacy body face fits its atlas without applying one full image per cube',()=>{
  for(const legacy of [false,true])for(const model of ['classic','slim'])for(const part of parts(model,legacy))for(const origin of [part.base,part.layer].filter(Boolean))
    for(const [x,y,w,h]of faceRects(...origin,...part.size)){assert(x>=0&&y>=0&&w>0&&h>0);assert(x+w<=64);assert(y+h<=(legacy?32:64));}
  assert.equal(parts('slim').find(p=>p.name==='leftArm').size[0],3);assert.equal(parts('classic').find(p=>p.name==='leftArm').size[0],4);
});
