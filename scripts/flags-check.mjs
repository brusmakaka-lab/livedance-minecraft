import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createPartyServer} from '../server.js';import {FEATURED_CHARACTERS} from '../public/cast-data.js';
const out=path.resolve('test-results/banderas-arco');await fs.mkdir(out,{recursive:true});
const server=createPartyServer({env:{DEMO_MODE:'1',TIKTOK_ENABLED:'0',IDLE_SECONDS:'0'}});
for(let n=0;n<40;n++)server.party.character({user:{id:'flag-'+n,nickname:'Invitado '+n}},FEATURED_CHARACTERS[n%10].id);
const address=await server.start(0),url=`http://127.0.0.1:${address.port}/`;
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:1120,height:800},recordVideo:{dir:path.join(out,'raw'),size:{width:1120,height:800}}}),page=await context.newPage(),other=await browser.newContext({viewport:{width:540,height:960}}),clean=await other.newPage();
const result={status:'RUNNING',scope:'Simulación local Edge/WebGL; sin validación LIVE/OBS ni benchmark FPS.',checks:[],errors:[]};let stage;
for(const p of [page,clean]){p.on('pageerror',e=>result.errors.push(e.message));p.on('console',m=>{if(m.type()==='error'&&/shader|WebGLProgram/.test(m.text()))result.errors.push(m.text())});}
const state=()=>stage.evaluate(()=>window.__DANCE_PARTY__.inspect());
async function emit(event,data){return page.evaluate(({event,data})=>new Promise((resolve,reject)=>{const s=io();s.on('connect',()=>s.timeout(5000).emit(event,data,(e,r)=>{s.disconnect();e||!r?.ok?reject(Error(e?.message||r?.error)):resolve(r)}))}),{event,data});}
try{
 await page.goto(url+'?demo=1');stage=await(await page.waitForSelector('#preview')).contentFrame();await clean.goto(url);
 for(const view of [stage,clean])await view.waitForFunction(()=>window.__DANCE_PARTY__?.inspect().actors.length===40&&window.__DANCE_PARTY__.inspect().frameCount>20);
 for(const view of [stage,clean])await view.waitForFunction(()=>window.__DANCE_PARTY__.inspect().decoration.hoistComplete,null,{timeout:30000});
 let s=await state();assert.equal(s.decoration.count,20);assert.equal(new Set(s.decoration.countries.map(c=>c.id)).size,20);assert(s.decoration.countries.some(c=>c.id==='AR'));assert(s.decoration.countries.every(c=>c.z<0));assert(s.actors.every(a=>a.labelHidden));assert.equal(s.decoration.layout,'arc');const flags=s.decoration.countries;assert(flags.every(p=>Math.abs(Math.hypot(p.x,p.z-1)-19)<1e-8));assert(new Set(flags.map(p=>p.z.toFixed(3))).size>5);assert(Math.abs(flags.find(p=>p.id==='AR').x)<1.3);result.checks.push('Un solo arco de 136 grados, veinte astas de igual altura, Argentina central y ningún puesto de baile invadido.');
 await page.screenshot({path:path.join(out,'01-estudio-banderas.png')});await clean.screenshot({path:path.join(out,'02-banderas-vertical.png')});
 result.checks.push('20 países distintos, incluida Argentina; todas las astas detrás de las filas. Grupo de 40 sin nombres superpuestos.');
 await page.locator('#pause-party').click();await stage.waitForFunction(()=>window.__DANCE_PARTY__.inspect().paused);
 const frozen=await state();await page.waitForTimeout(650);assert.equal((await state()).decoration.windTime,frozen.decoration.windTime);
 const flagsOn=await clean.locator('#canvas3d').screenshot();await page.selectOption('#country-flags','off');
 for(const view of [stage,clean])await view.waitForFunction(()=>window.__DANCE_PARTY__.inspect().decoration.enabled===false);
 const off=await state();assert.equal(frozen.drawCalls-off.drawCalls,4);assert.deepEqual(off.camera,frozen.camera);assert.deepEqual(off.actors.map(a=>a.position),frozen.actors.map(a=>a.position));
 await page.screenshot({path:path.join(out,'03-comparacion-sin-banderas.png')});assert(!flagsOn.equals(await clean.locator('#canvas3d').screenshot()));
 await clean.reload();await clean.waitForFunction(()=>window.__DANCE_PARTY__?.inspect().decoration.enabled===false);await page.selectOption('#country-flags','on');await clean.waitForFunction(()=>window.__DANCE_PARTY__.inspect().decoration.enabled);assert((await state()).decoration.countries.every(p=>p.hoistProgress===0));const startHoist=await state();await page.waitForTimeout(400);assert.equal((await state()).decoration.hoistElapsed,startHoist.decoration.hoistElapsed);result.checks.push('Ocultar y activar repite el izado; al activarlo durante la pausa, la subida permanece detenida hasta reanudar.');
 result.checks.push('El control se comparte con el escenario y se recupera al recargar; agrega exactamente 4 llamadas de dibujo, sin mover cámara ni participantes.');
 await page.locator('#pause-party').click();await stage.waitForFunction(()=>!window.__DANCE_PARTY__.inspect().paused);await page.waitForTimeout(650);assert((await state()).decoration.windTime>frozen.decoration.windTime);
 result.checks.push('El reloj del viento avanza durante el baile, se congela al pausar y continúa al reanudar.');
 await emit('demo-event',{kind:'member',viewerId:'flag-entry',username:'Bienvenida con banderas'});
 await stage.waitForFunction(()=>{const s=window.__DANCE_PARTY__.inspect(),a=s.actors.find(a=>a.viewerId==='flag-entry');return s.mode==='arrival'&&a?.entryAge>1.7&&a.headVisible&&!a.headOccluded});
 await page.screenshot({path:path.join(out,'04-ingreso-con-fondo.png')});await emit('demo-event',{kind:'gift',viewerId:'flag-5',username:'Invitado 5',giftName:'Donut'});
 await stage.waitForFunction(()=>{const s=window.__DANCE_PARTY__.inspect(),a=s.actors.find(a=>a.viewerId==='flag-5');return s.mode==='duo'&&a?.scale>1.4});
 s=await state();assert(s.decoration.enabled);assert(s.foregroundIds.includes('flag-entry'));assert(s.foregroundIds.includes('flag-5'));assert(s.actors.filter(a=>!a.labelHidden).every(a=>s.foregroundIds.includes(a.viewerId)));await page.screenshot({path:path.join(out,'05-regalo-y-bienvenida.png')});await clean.screenshot({path:path.join(out,'06-regalo-vertical.png')});
 result.checks.push('Bienvenida desde el cielo y Donut simultáneo mantienen sus protagonistas y los nombres del fondo ocultos.');
 await page.locator('#pause-party').click();await stage.waitForFunction(()=>window.__DANCE_PARTY__.inspect().paused);
 result.final=await state();
 const fixture=await other.newPage();await fixture.setViewportSize({width:1100,height:720});fixture.on('pageerror',e=>result.errors.push(e.message));fixture.on('console',m=>{if(m.type()==='error')result.errors.push(m.text())});
 await fixture.route('**/flag-fixture',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body style="margin:0"><canvas id="flags"></canvas></body>'}));await fixture.goto(url+'flag-fixture');
 await fixture.evaluate(async()=>{const THREE=await import('https://cdn.jsdelivr.net/npm/three@0.187.0/build/three.module.js'),{buildCountryFlags}=await import('/country-flags.js');const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true});renderer.setSize(1100,720);renderer.setClearColor('#29445f');const scene=new THREE.Scene(),flags=buildCountryFlags(THREE);scene.add(flags.group,new THREE.HemisphereLight('#ffffff','#87929c',2.2));const camera=new THREE.OrthographicCamera(-22,22,14.4,-14.4,.1,150);camera.position.set(0,25,50);camera.lookAt(0,3,-11);window.flagState=()=>flags.inspect();window.drawFlags=t=>{flags.update(t);renderer.render(scene,camera);};window.drawFlags(0);});
 await fixture.screenshot({path:path.join(out,'07-inicio-izado.png')});const low=await fixture.evaluate(()=>window.flagState());assert(low.countries.every(p=>p.hoistProgress===0));
 const bottom=await fixture.locator('canvas').screenshot();await fixture.evaluate(()=>window.drawFlags(1.8));const mid=await fixture.evaluate(()=>window.flagState());assert(mid.countries[0].clothTop>low.countries[0].clothTop);assert(mid.countries.at(-1).hoistProgress===0);assert(!bottom.equals(await fixture.locator('canvas').screenshot()));await fixture.screenshot({path:path.join(out,'08-izado-escalonado.png')});
 await fixture.evaluate(()=>window.drawFlags(6.2));const raised=await fixture.evaluate(()=>window.flagState());assert(raised.hoistComplete);assert(raised.countries.every(p=>Math.abs(p.clothTop-(p.height-.08))<.001));await fixture.screenshot({path:path.join(out,'09-arco-izado-completo.png')});
 const still=await fixture.locator('canvas').screenshot();await fixture.evaluate(()=>window.drawFlags(7.4));assert(!still.equals(await fixture.locator('canvas').screenshot()));await fixture.close();result.checks.push('Render WebGL aislado: banderas bajas al inicio, subida escalonada hacia los extremos, final sin sobrepasar el remate y viento que continúa tras el izado.');
 assert.deepEqual(result.errors,[]);result.status='PASS';
}catch(e){result.status='FAIL';result.failure=e.stack;result.state=stage?await state().catch(()=>null):null;await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});console.error(e)}finally{await other.close();await context.close();await page.video().saveAs(path.join(out,'Arco-e-izado-de-banderas.webm'));await browser.close();await server.close();await fs.writeFile(path.join(out,'flags-results.json'),JSON.stringify(result,null,2));}
console.log(JSON.stringify({status:result.status,checks:result.checks,errors:result.errors,failure:result.failure}));if(result.status!=='PASS')process.exitCode=1;
