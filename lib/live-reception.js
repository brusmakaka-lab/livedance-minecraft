import {sender} from './events.js';

export function connectionProblem(error){
 const all=[];function visit(e,depth=0){if(!e||depth>3)return;all.push(String(e.constructor?.name||e.name||''),String(e.message||''),String(e.reason||''),String(e.code||''));for(const c of [...(e.config?.requestErrs||[]),e.config?.requestErr,e.exception,e.cause].filter(Boolean))visit(c,depth+1);}visit(error);const text=all.join(' ').toLowerCase();
 if(/cert_not_yet_valid|cert_has_expired|err_cert_date_invalid|certificate is not yet valid|certificate has expired/.test(text))return {code:'tls_date',message:'La fecha de un certificado HTTPS no es válida. Revisá y sincronizá fecha, hora y zona horaria de Windows; luego volvé a conectar.'};
 if(/ratelimit|rate.limit|429/.test(text))return {code:'rate_limit',message:'TikTok o el proveedor limitaron la conexión. Se reintentará más tarde.'};
 if(/lack of permission|premiumfeature|unauthorized|forbidden|invalid.{0,20}api.{0,5}key|status.?code.?[=: ]+(401|402|403)/.test(text))return {code:'provider',message:'Euler Stream rechazó la conexión. Revisá la clave API, sus permisos o el acceso de tu cuenta; luego volvé a conectar.'};
 if(/timeout|timedout|etimedout/.test(text))return {code:'timeout',message:'La conexión tardó demasiado. Se reintentará automáticamente.'};
 if(/signapi|signature|api.key/.test(text))return {code:'provider',message:'Euler Stream rechazó la conexión. Revisá la clave API, sus permisos o el acceso de tu cuenta; luego volvé a conectar.'};
 if(/useroffline|isn't online|not live|not online/.test(text))return {code:'offline',message:'La cuenta está fuera de directo. Se reintentará automáticamente.'};
 if(/user_not_found|invaliduniqueid|user not found/.test(text))return {code:'user_not_found',message:'TikTok no encontró ese @usuario. Comprobá el identificador del perfil.'};
 return {code:'connection',message:'No se pudo conectar con TikTok. Revisá la red y el @usuario.'};
}
export function isFollow(data){const marker=String(data.displayType||data.common?.displayText?.key||data.common?.displayText?.displayType||'').toLowerCase();return !marker.includes('unfollow')&&(marker.includes('follow')||!marker&&String(data.action)==='1');}
export class LiveReception{
 constructor(onChange=()=>{}){this.onChange=onChange;this.aliases=new Map();this.startedAt=Date.now();this.counts=Object.fromEntries(['member','follow','chat','like','gift','share'].map(k=>[k,{received:0,processed:0,missingIdentity:0}]));this.lastEventAt=null;this.lastKind=null;}
 receive(kind,raw,consume){
  raw=raw||{};const counter=this.counts[kind],identity=sender(raw);counter.received++;this.lastKind=kind;this.lastEventAt=Date.now();
  if(!identity){counter.missingIdentity++;this.onChange();return false;}
  const alias=identity.uniqueId?.toLowerCase(),id=alias&&this.aliases.get(alias)||identity.viewerId;if(alias){this.aliases.set(alias,id);if(this.aliases.size>8192)this.aliases.delete(this.aliases.keys().next().value);}
  const data={...raw,user:{...raw.user,id,userId:id,nickname:identity.username}};const result=consume(data);if(result!==false)counter.processed++;this.onChange();return result;
 }
 snapshot(){return {startedAt:this.startedAt,lastEventAt:this.lastEventAt,lastKind:this.lastKind,counts:JSON.parse(JSON.stringify(this.counts))};}
}

export function isShare(data){const marker=String(data.displayType||data.common?.displayText?.key||data.common?.displayText?.displayType||'').toLowerCase();return marker.includes('share')&&!marker.includes('unshare');}
