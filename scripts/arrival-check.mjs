import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';import path from 'node:path';import assert from 'node:assert/strict';
import {createPartyServer} from '../server.js';
const out=path.resolve('test-results/ingresos');await fs.mkdir(out,{recursive:true});
const server=createPartyServer({env:{DEMO_MODE:'1',TIKTOK_ENABLED:'0'}}),address=await server.start(0),url=`http://127.0.0.1:${address.port}/`;
const browser=await chromium.launch({channel:'msedge',headless:true}),context=await browser.newContext({viewport:{width:1120,height:760},recordVideo:{dir:path.join(out,'raw'),size:{width:1120,height:760}}}),page=await context.newPage();
const result={status:'RUNNING',scope:'Simulated MEMBER events on the real Socket.io transport, two Edge WebGL clients, real five-second server clock. No TikTok LIVE or OBS validation.',checks:[],starts:[],errors:[]};
const publish=server.arrivals.onState;let last=null;server.arrivals.onState=data=>{publish(data);if(data.active&&data.active.viewerId!==last){last=data.active.viewerId;result.starts.push({id:last,at:Date.now()})}};
page.on('pageerror',e=>result.errors.push(e.message));let stage,obs,observer;
const inspect=()=>stage.evaluate(()=>window.__DANCE_PARTY__.inspect());
async function emit(kind,id,name,extra={}){const data={kind,viewerId:id,username:name,...extra};return page.evaluate(data=>new Promise((resolve,reject)=>{const s=io();s.on('connect',()=>s.timeout(5000).emit('demo-event',data,(err,r)=>{s.disconnect();err||!r?.ok?reject(Error(err?.message||r?.error)):resolve(r)}))}),data)}
try{
 await page.goto(url+'?demo=1');await page.locator('#preview').waitFor();stage=await (await page.$('#preview')).contentFrame();await stage.waitForFunction(()=>window.__DANCE_PARTY__?.inspect().ready&&window.__DANCE_PARTY__.inspect().connected);
 await emit('chat','silent-comment','Solo comenta',{comment:'hola'});await page.waitForTimeout(250);assert.equal(server.party.roster.size,0);result.checks.push('An unseen ordinary chat message does not join under the default MEMBER rule');
 await page.locator('#cast-tour').click();await stage.waitForFunction(()=>window.__DANCE_PARTY__.inspect().actors.length===10);await page.waitForTimeout(350);await page.selectOption('#camera-mode','auto');
 observer=await browser.newContext();obs=await observer.newPage();obs.on('pageerror',e=>result.errors.push(e.message));await obs.setViewportSize({width:540,height:960});await obs.goto(url+'?quality=540');await obs.waitForFunction(()=>window.__DANCE_PARTY__?.inspect().actors.length===10);
 await emit('member','arrival-mia','Mia');await emit('member','arrival-finn','Finn');await emit('member','arrival-skye','Skye');
 await stage.waitForFunction(()=>window.__DANCE_PARTY__.inspect().arrival?.pendingCount===2&&window.__DANCE_PARTY__.inspect().selectedId==='arrival-mia');assert.equal(server.party.roster.size,11);
 await emit('member','arrival-finn','Finn');await emit('member','arrival-mia','Mia');assert.equal(server.arrivals.snapshot().pendingCount,2);
 await page.waitForTimeout(1000);await page.screenshot({path:path.join(out,'estudio-bienvenida.png')});await obs.screenshot({path:path.join(out,'escenario-bienvenida.png')});result.checks.push('First entry is immediate; repeated MEMBER events do not duplicate roster or queue');
 await page.locator('#pause-party').click();const remaining=server.arrivals.snapshot().active.remainingMs;await page.waitForTimeout(650);assert.equal(server.arrivals.snapshot().active.remainingMs,remaining);result.checks.push('Pause freezes the server admission clock and resume preserves the remaining duration');
 await obs.reload();await obs.waitForFunction(()=>window.__DANCE_PARTY__?.inspect().arrival?.active?.viewerId==='arrival-mia');assert.equal(server.party.roster.size,11);assert.equal((await obs.evaluate(()=>window.__DANCE_PARTY__.inspect())).arrival.pendingCount,2);result.checks.push('Reload restores current presentation and queued viewers without replaying admissions');await page.locator('#pause-party').click();
 await stage.waitForFunction(()=>window.__DANCE_PARTY__.inspect().arrival?.active?.viewerId==='arrival-finn',null,{timeout:12000});await obs.waitForFunction(()=>window.__DANCE_PARTY__.inspect().selectedId==='arrival-finn');assert.equal(server.party.roster.size,12);
 await stage.waitForFunction(()=>window.__DANCE_PARTY__.inspect().arrival?.active?.viewerId==='arrival-skye',null,{timeout:10000});await obs.waitForFunction(()=>window.__DANCE_PARTY__.inspect().selectedId==='arrival-skye');assert.equal(server.party.roster.size,13);await page.waitForTimeout(900);await page.screenshot({path:path.join(out,'estudio-tercer-ingreso.png')});
 assert.equal(result.starts.length,3);const gaps=result.starts.slice(1).map((s,i)=>s.at-result.starts[i].at);assert(gaps.every(ms=>ms>=4990));result.measuredGapsMs=gaps;result.checks.push('Three FIFO admissions stay at least five seconds apart and both WebGL clients focus the same owner');
 await emit('chat','arrival-skye','Skye',{comment:'hola otra vez'});await emit('member','arrival-finn','Finn');assert.equal(server.arrivals.snapshot().pendingCount,0);assert.equal(server.party.roster.size,13);
 await stage.waitForFunction(()=>!window.__DANCE_PARTY__.inspect().arrival.active,null,{timeout:9000});assert.deepEqual(result.errors,[]);result.checks.push('After the final five-second welcome, the queue empties and the automatic camera continues');result.status='PASS';result.final=await inspect();
}catch(e){result.status='FAIL';result.failure=e.stack;console.error(e)}
finally{await observer?.close();await context.close();await page.video().saveAs(path.join(out,'Ingresos-cada-5-segundos.webm'));await browser.close();await server.close();await fs.writeFile(path.join(out,'arrival-results.json'),JSON.stringify(result,null,2))}
console.log(JSON.stringify({status:result.status,checks:result.checks,measuredGapsMs:result.measuredGapsMs,errors:result.errors,failure:result.failure}));if(result.status!=='PASS')process.exitCode=1;

