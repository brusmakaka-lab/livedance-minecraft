import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),port=Number(process.env.PORT||3000);
try{
 const response=await fetch(`http://127.0.0.1:${port}/health`,{signal:AbortSignal.timeout(2000)}),health=await response.json();
 if(health.app!=='dance-party-clone'||path.resolve(health.root).toLowerCase()!==root.toLowerCase()||!Number.isInteger(health.pid))throw Error('El puerto pertenece a otra aplicación; no se detuvo ningún proceso.');
 process.kill(health.pid,'SIGTERM');console.log('Servidor Dance Party detenido.');
}catch(error){console.log(error.message==='fetch failed'?'No hay un servidor Dance Party accesible en ese puerto.':error.message);}
