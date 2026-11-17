import fs from 'node:fs/promises';import path from 'node:path';
const url='http://127.0.0.1:3000',health=async()=>await(await fetch(url+'/health')).json(),before=await health();let sent=false,ack,ws;
try{
 if(before.provider?.configured&&!before.connected&&!['connecting','reconnecting'].includes(before.status)&&before.avatars===0){
  ws=new WebSocket('ws://127.0.0.1:3000/socket.io/?EIO=4&transport=websocket');
  ack=await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('No hubo respuesta del servidor local.')),6000);ws.addEventListener('error',()=>{clearTimeout(timer);reject(Error('No se pudo abrir el socket local.'));});ws.addEventListener('message',event=>{const m=String(event.data);if(m.startsWith('0'))ws.send('40');else if(m==='2')ws.send('3');else if(m.startsWith('40')){sent=true;ws.send('421'+JSON.stringify(['tiktok-control',{action:'connect',username:before.username}]));}else if(m.startsWith('431')){clearTimeout(timer);resolve(JSON.parse(m.slice(3))[0]);}});});
 }
 let after=await health();const limit=Date.now()+30000;while(Date.now()<limit&&!after.connected&&!after.lastError){await new Promise(r=>setTimeout(r,500));after=await health();}
 const result={attemptRequested:sent,ack,version:after.version,providerConfigured:after.provider.configured,connected:after.connected,status:after.status,lastError:after.lastError||null,reception:after.reception?.counts,scope:'Intento real acotado con la configuración del estudio. No emite regalos, comentarios ni eventos de prueba.'};await fs.writeFile(path.resolve('test-results/conexion-provider/active-connection-result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{ws?.close();}
