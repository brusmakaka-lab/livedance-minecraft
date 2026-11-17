import {spawn} from 'node:child_process';import {createRequire} from 'node:module';import path from 'node:path';import fs from 'node:fs';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),require=createRequire(import.meta.url);
export function launchCapture(){
 const runtime=require('electron'),logdir=path.join(root,'work/logs');fs.mkdirSync(logdir,{recursive:true});const log=fs.openSync(path.join(logdir,'capture.log'),'a');
 const env={...process.env,TEMP:'E:/Codex/Temp/Usuario',TMP:'E:/Codex/Temp/Usuario'};delete env.ELECTRON_RUN_AS_NODE;delete env.LIVE_DANCE_CAPTURE_ORIGIN;delete env.LIVE_DANCE_CAPTURE_TEST;fs.mkdirSync(env.TEMP,{recursive:true});
 try{const child=spawn(runtime,[path.join(root,'capture/main.cjs')],{cwd:root,env,detached:true,windowsHide:false,stdio:['ignore',log,log]});child.on('error',error=>fs.appendFileSync(path.join(logdir,'capture.log'),error.message+'\n'));child.unref();return {ok:true,title:'Live Dance · Captura TikTok'};}finally{fs.closeSync(log);}
}
