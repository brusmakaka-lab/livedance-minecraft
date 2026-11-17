import {chromium} from '@playwright/test';
import fs from 'node:fs/promises';
const output='C:/Users/Usuario/Documents/Codex/2026-11-04/referenced-chatgpt-conversation-this-is-an/outputs/live-dance-presentacion';
const browser=await chromium.launch({channel:'msedge',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:960}});
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('file:///'+output+'/Informe.html');
 await page.locator('img').evaluateAll(images=>Promise.all(images.map(i=>i.decode())));
 await page.locator('video').evaluateAll(async videos=>{await Promise.all(videos.map(async v=>{v.muted=true;await v.play();}));await new Promise(r=>setTimeout(r,1500));videos.forEach(v=>v.pause());});
 const check=await page.evaluate(()=>({title:document.title,overflow:document.documentElement.scrollWidth>innerWidth,images:[...document.images].every(i=>i.naturalWidth>0),video:[...document.querySelectorAll('video')].map(v=>({duration:v.duration,time:v.currentTime,frames:v.getVideoPlaybackQuality().totalVideoFrames,error:v.error?.message||null}))}));
 if(errors.length||check.overflow||!check.images||check.video.some(v=>v.error||v.frames<1))throw Error(JSON.stringify({errors,check}));
 await page.screenshot({path:output+'/Informe-vista.png',fullPage:true});
 await fs.writeFile(output+'/report-review.json',JSON.stringify({status:'PASS',...check,errors},null,2));
 console.log(JSON.stringify({status:'PASS',...check}));
 const studio=await browser.newPage({viewport:{width:1220,height:880}});
 await studio.goto('http://127.0.0.1:3000/estudio');
 await studio.waitForFunction(()=>document.querySelector('#tiktok-username')?.value==='Palermotusi'&&!document.querySelector('#tiktok-connect')?.disabled);
 const frame=studio.frames().find(f=>f!==studio.mainFrame());
 await frame.waitForFunction(()=>{const s=window.__LIVE_DANCE__?.inspect();return s?.ready&&s.connected&&s.connection.username==='Palermotusi';});
 const state=await frame.evaluate(()=>window.__LIVE_DANCE__.inspect());
 if(state.connection.connected||state.connection.username!=='Palermotusi'||state.connection.idleSeconds!==30)throw Error('Cambió el estado esperado del estudio conservado.');
 const activation={status:'PASS',version:(await(await fetch('http://127.0.0.1:3000/health')).json()).version,username:state.connection.username,connected:state.connection.connected,idleSeconds:state.connection.idleSeconds,scope:'Lectura del servidor local; no se intentó conectar a TikTok.'};
 await studio.screenshot({path:output+'/Estudio-activo.png',fullPage:true});
 await fs.writeFile(output+'/activation-review.json',JSON.stringify(activation,null,2));
 console.log(JSON.stringify(activation));
}finally{await browser.close();}
