import {CommunityFX} from './lib/community-fx.js';
import {WorldClock} from './lib/world-clock.js';
import {DanceDirector} from './lib/dance-director.js';

import {SocialInteractions} from './lib/social-interactions.js';

import {createTikTokConnector} from './lib/tiktok-connector.js';

import {ProviderKey} from './lib/provider-key.js';

import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';

import {LiveReception,connectionProblem,isFollow,isShare} from './lib/live-reception.js';

import {Contributions} from './lib/contributions.js';

import {launchCapture} from './lib/capture-launcher.js';

import {AMBIENT_DURATIONS,AmbientDirector} from './lib/ambient-director.js';

import express from 'express';

import { createServer } from 'node:http';

import { fileURLToPath, pathToFileURL } from 'node:url';

import path from 'node:path';

import { randomUUID } from 'node:crypto';

import { Server } from 'socket.io';

import { WebcastEvent, ControlEvent } from 'tiktok-live-connector';

import { Party, cleanText, sender } from './lib/events.js';

import { SkinService } from './lib/skins.js';

import { ArrivalQueue } from './lib/arrivals.js';

import { EffectDirector } from './lib/effects.js';

import { MusicLibrary } from './lib/music.js';

import {defaultPresentation,updatePresentation} from './lib/presentation-state.js';



const root = path.dirname(fileURLToPath(import.meta.url));

export function createPartyServer({ env = process.env, initialState = null, publicDirectory = path.join(root,'public'), diagnosticsPath = null, interactionSettingsPath = path.join(root,'data','interactions.json'), goalSettingsPath = path.join(root,'data','likes-goal.json'), danceSettingsPath = path.join(root,'data','dance-settings.json'), captureLauncher = launchCapture, channelSettingsPath = path.join(root,'data','channel.json'), skinService = new SkinService(), musicDirectory = path.join(root,'data','music'), connectorFactory = null, providerKey = new ProviderKey({env,file:path.join(root,'data','euler-key.dpapi.json')}), providerKeyRequired = connectorFactory === null } = {}) {

  const makeConnector=connectorFactory||createTikTokConnector;

  const app = express(), http = createServer(app);

  const io = new Server(http, { maxHttpBufferSize: 8192, allowRequest(req, callback) {

    const origin = req.headers.origin;

    try { callback(null, !origin || new URL(origin).host === req.headers.host); }

    catch { callback(null, false); }

  } });

  let savedChannel={};try{if(channelSettingsPath)savedChannel=JSON.parse(readFileSync(channelSettingsPath,'utf8'));}catch{}

  let username=cleanText(env.TIKTOK_USERNAME&&env.TIKTOK_USERNAME!=='tu_usuario'?env.TIKTOK_USERNAME:savedChannel.username||'tu_usuario',64).replace(/^@/,'');

  let demoEnabled = env.DEMO_MODE === '1';

  let state = { mode: demoEnabled ? 'demo' : 'live', connected: false, status: 'unconfigured', username, demoEnabled, paused: false, idleSeconds:Math.max(0,Math.min(3600,Number(env.IDLE_SECONDS??120))) };

  let connector, retry, attempts = 0, closed = false, connecting = false;

  let contributionTimer=null;

  let savedGoal;try{if(goalSettingsPath)savedGoal=JSON.parse(readFileSync(goalSettingsPath,'utf8'));}catch{}

  const contributions=new Contributions({goalTarget:savedGoal?.target,onChange:()=>{if(closed||contributionTimer)return;contributionTimer=setTimeout(()=>{contributionTimer=null;io.emit('contributions-state',contributions.snapshot());},200);contributionTimer.unref();}});

  let receptionTimer=null,lastDiagnosticWrite=0;

  const reception=new LiveReception(()=>{if(closed||receptionTimer)return;receptionTimer=setTimeout(()=>{receptionTimer=null;io.emit('reception-state',reception.snapshot());saveDiagnostics();},200);receptionTimer.unref();});

  function saveDiagnostics(force=false){if(!diagnosticsPath||!force&&Date.now()-lastDiagnosticWrite<5000)return;lastDiagnosticWrite=Date.now();try{mkdirSync(path.dirname(diagnosticsPath),{recursive:true});writeFileSync(diagnosticsPath,JSON.stringify({savedAt:new Date().toISOString(),connection:state,reception:reception.snapshot()},null,2)+'\n');}catch{}}

  function contributionRoom(data){if(!demoEnabled&&!contributions.ended){if(contributions.beginLive(data?.common?.roomId||connector?.roomId||state.roomId||'',username)){interactions?.reset();community.reset();}}}

  let arrivalWasActive=false,arrivalHandoffUntil=0,arrivalHandoffTimer=null,arrivalHandoffPausedAt=null;

  function clearArrivalHandoff(){clearTimeout(arrivalHandoffTimer);arrivalHandoffTimer=null;arrivalWasActive=false;arrivalHandoffUntil=0;arrivalHandoffPausedAt=null;}

  let socialTurn=false,effects,interactions,pausedAt=0,resumeMusic=false,presentation=defaultPresentation();

  const community=new CommunityFX({onState:s=>io.emit('community-state',s)}),worldClock=new WorldClock();
  let worldSeed=Math.floor(Math.random()*1800);const presentationView=()=>({...presentation,worldSeed,worldClock:worldClock.snapshot()});
  const ambient=new AmbientDirector({onState:s=>{io.emit('ambient-state',s);syncAmbient();}});

  function syncAmbient(){if(closed)return;const now=Date.now(),entering=!!arrivals.active;if(arrivalWasActive&&!entering)arrivalHandoffUntil=now+1400;arrivalWasActive=entering;if(state.paused&&arrivalHandoffPausedAt===null)arrivalHandoffPausedAt=now;else if(!state.paused&&arrivalHandoffPausedAt!==null){if(arrivalHandoffUntil)arrivalHandoffUntil+=now-arrivalHandoffPausedAt;arrivalHandoffPausedAt=null;}const clearing=!entering&&now<arrivalHandoffUntil;if((!clearing||state.paused)&&arrivalHandoffTimer!==null){clearTimeout(arrivalHandoffTimer);arrivalHandoffTimer=null;}if(clearing&&!state.paused&&arrivalHandoffTimer===null){arrivalHandoffTimer=setTimeout(()=>{arrivalHandoffTimer=null;syncAmbient();},Math.max(1,arrivalHandoffUntil-now));arrivalHandoffTimer.unref();}const waiting=clearing||!!arrivals.active||effects.active.size>0||['individual','sector'].includes(presentation.camera);const held=waiting||!!presentation.focusId;interactions?.setHeld(state.paused,held||!!ambient.active);const ambientHeld=held||!!interactions?.active&&!ambient.active;ambient.setHeld(state.paused||ambientHeld,ambientHeld);if(!state.paused&&!interactions?.active&&(socialTurn||!interactions?.pending.size))arrivals.wake();}

  const protectedIds=()=>new Set([arrivals?.active?.viewerId,interactions?.active?.viewerId,...(effects?.active.keys()||[]),...(effects?.pending.keys()||[])]);

  let savedDances;try{if(danceSettingsPath)savedDances=JSON.parse(readFileSync(danceSettingsPath,'utf8'));}catch{}

  const dances=new DanceDirector({settings:savedDances,onState:s=>io.emit('dance-state',s),save:s=>{if(danceSettingsPath){mkdirSync(path.dirname(danceSettingsPath),{recursive:true});writeFileSync(danceSettingsPath,JSON.stringify(s,null,2)+'\n');}}});

  const party = new Party((event, data) => {if(event==='chat-aura')community.add(data.viewerId,'aura',8000);else if(event==='trigger-effect')effects.enqueue(data);else {if(event==='remove-avatar'){effects?.remove(data.viewerId);arrivals?.enrolled.delete(data.viewerId);if(presentation.focusId===data.viewerId){presentation={...presentation,focusId:null,camera:'auto',revision:presentation.revision+1};io.emit('presentation-state',presentationView());syncAmbient();}}io.emit(event,data);}}, { maxAvatars: env.MAX_AVATARS, protectedIds });

  const arrivals=new ArrivalQueue(party,{canReplay:()=>!effects.active.size&&!effects.pending.size&&!interactions?.active&&!ambient.active,canPump:()=>!interactions?.active&&(socialTurn||!interactions?.pending.size),chooseDance:()=>dances.choose('arrival'),trigger:env.JOIN_TRIGGER==='chat'?'chat':'member',onState:data=>{if(data.active)socialTurn=false;io.emit('arrival-state',data);syncAmbient();}});

  effects=new EffectDirector({chooseDance:type=>dances.choose(type),onEffect:e=>io.emit('trigger-effect',e),onState:s=>{io.emit('effect-state',s);syncAmbient();}});

  let savedInteractions;try{if(interactionSettingsPath)savedInteractions=JSON.parse(readFileSync(interactionSettingsPath,'utf8'));}catch{}

  interactions=new SocialInteractions({canStart:()=>!socialTurn||!arrivals.pending.size,chooseDance:type=>dances.choose(type==='solo'||type==='follow'?'solo':'likes'),settings:savedInteractions,onState:s=>{io.emit('interaction-state',s);syncAmbient();},onStart:e=>{socialTurn=true;if(e.vip)community.add(e.viewerId,'vip',45000);if(e.type==='follow')community.add(e.viewerId,'trail',6000);const fresh=!party.roster.has(e.viewerId),pending=arrivals.pending.get(e.viewerId),r=party.upsert({viewerId:e.viewerId,username:e.username,uniqueId:e.uniqueId});if(fresh){arrivals.removePending(e.viewerId);arrivals.enrolled.add(e.viewerId);io.emit(r.minecraftName?'spawn-mc-skin':'spawn-normal',{...r,entrySource:'likes'});if(pending?.chat)party.chat(pending.chat);}},saveSettings:s=>{if(interactionSettingsPath){mkdirSync(path.dirname(interactionSettingsPath),{recursive:true});writeFileSync(interactionSettingsPath,JSON.stringify(s,null,2)+'\n');}}});

  const shareObjects=new WeakSet();

  function handleFollow(data){const admitted=arrivals.follow(data),rewarded=interactions.follow(sender(data));return !!(admitted||rewarded);}

  function handleLike(data){const who=sender(data),before=who?contributions.people.get(who.viewerId)?.likes||0:0;if(!contributions.like(data))return false;const after=contributions.people.get(who.viewerId).likes;if(interactions.settings.enabled&&Math.floor(after/interactions.settings.likeStep)>Math.floor(before/interactions.settings.likeStep))community.add(who.viewerId,'vip',45000);interactions.like(who,before,after);return true;}

  function handleShare(data){if(data&&typeof data==='object'){if(shareObjects.has(data))return false;shareObjects.add(data);}return reception.receive('share',data,d=>{contributionRoom(d);if(!contributions.accept('share',d))return false;return interactions.shared(sender(d));});}

  const music=new MusicLibrary(musicDirectory,{onState:s=>io.emit('music-state',s)});

  const idleTimer=setInterval(()=>{if(!state.paused)party.expireInactive(state.idleSeconds*1000);},1000);idleTimer.unref();

  function status(update) { if(update.lastError)update={...update,lastFailure:update.lastError};state = { ...state, ...update };community.setPaused(state.paused);worldClock.setPaused(state.paused);if(Object.hasOwn(update,'paused'))io.emit('presentation-state',presentationView()); io.emit('connection-status', state);syncAmbient();saveDiagnostics(true); }

  app.disable('x-powered-by');

  app.use((_req, res, next) => { res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Referrer-Policy', 'no-referrer'); next(); });

  app.get(['/estudio','/captura'],(_req,res)=>res.sendFile(path.join(publicDirectory,'index.html')));

  app.get('/health', (_req, res) => res.json({ app: 'dance-party-clone', version:'1.27.0', pid: process.pid, root, ...state, provider:providerKey.snapshot(), avatars: party.roster.size, arrivals:arrivals.snapshot(), contributions:contributions.snapshot(),reception:reception.snapshot() }));

  // The credential is never returned, logged, emitted over sockets, or served as a file.

  app.get('/api/tiktok/provider',(_req,res)=>res.set('Cache-Control','no-store').json(providerKey.snapshot()));

  function privateProviderRequest(req,res,next){

    if(!['127.0.0.1','localhost','::1','[::1]'].includes(req.hostname)||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||req.headers.origin!==`${req.protocol}://${req.headers.host}`)return res.status(403).json({error:'Configurá la clave desde el estudio local.'});

    res.set('Cache-Control','no-store');next();

  }

  function changeProvider(req,res){

    if(connecting||retry||state.connected)return res.status(409).json({error:'Desconectá TikTok antes de cambiar la clave.'});

    try{const result=req.method==='DELETE'?providerKey.clear():providerKey.save(req.body?.key);io.emit('provider-state',result);if(state.status==='configuration_required')status({status:'unconfigured',lastError:null});res.json(result);}

    catch(e){res.status(400).json({error:e.message});}

  }

  app.post('/api/tiktok/provider',privateProviderRequest,express.json({limit:'8kb'}),changeProvider);

  app.delete('/api/tiktok/provider',privateProviderRequest,changeProvider);

  app.use('/api/tiktok/provider',(err,req,res,next)=>res.status(400).json({error:'Solicitud de configuración inválida.'}));

  function missingProvider(){

    if(!providerKeyRequired||providerKey.snapshot().configured)return false;

    status({connected:false,status:'configuration_required',retryInSeconds:0,lastError:{code:'missing_sign_key',message:'Falta configurar la clave API de Euler Stream en el estudio.',at:Date.now()}});return true;

  }

  let lastCapture=-Infinity;

  app.post('/api/capture/open',(req,res)=>{const origin=req.headers.origin;if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||origin&&origin!==`${req.protocol}://${req.headers.host}`)return res.sendStatus(403);if(Date.now()-lastCapture<3000)return res.status(429).json({error:'La ventana se está abriendo. Esperá un instante.'});try{const result=captureLauncher();lastCapture=Date.now();res.status(202).json(result);}catch{res.status(503).json({error:'No se pudo abrir la ventana. Revisá work/logs/capture.log o usá Abrir-Captura-TikTok.cmd.'});}});

  app.get('/api/skins/:name', async (req, res) => {

    try {

      const skin = await skinService.resolve(req.params.name);

      res.set('Cache-Control', 'public,max-age=600').json({ name: skin.name, uuid: skin.uuid, model: skin.model, width: skin.width, height: skin.height, textureUrl: `/api/skins/${encodeURIComponent(skin.name)}/texture` });

    } catch (error) { res.status(error.status || 502).json({ error: error.message }); }

  });

  app.get('/api/skins/:name/texture', async (req, res) => {

    try { const skin = await skinService.resolve(req.params.name); res.type('png').set('Cache-Control', 'public,max-age=600').send(skin.png); }

    catch (error) { res.status(error.status || 502).json({ error: error.message }); }

  });

  app.get('/api/music',(_req,res)=>res.json(music.snapshot()));

  app.post('/api/music',(req,res,next)=>{const origin=req.headers.origin;if(origin&&origin!==`${req.protocol}://${req.headers.host}`)return res.sendStatus(403);next();},express.raw({type:()=>true,limit:'80mb'}),async(req,res)=>{try{let name='Pista';try{name=decodeURIComponent(String(req.headers['x-file-name']||name));}catch{}const track=await music.upload(req.body,name);res.status(201).json({id:track.id,name:track.name});}catch(e){res.status(e.status||500).json({error:e.message});}});

  app.get('/api/music/:id/audio',(req,res)=>{const track=music.tracks.find(t=>t.id===req.params.id);if(!track)return res.sendStatus(404);res.type(track.type).sendFile(path.resolve(musicDirectory,track.file));});

  app.use(express.static(publicDirectory, { etag: true, maxAge: 0 }));
  if(path.resolve(publicDirectory)!==path.join(root,'public'))app.use(express.static(path.join(root,'public'),{etag:true,maxAge:0}));

  io.on('connection', socket => {

    socket.emit('party-state', { avatars: party.snapshot(), maxAvatars: party.maxAvatars, connection: state, provider:providerKey.snapshot(), arrivals:arrivals.snapshot(), effects:effects.snapshot(), presentation:presentationView(), community:community.snapshot(), contributions:contributions.snapshot(), reception:reception.snapshot(), interactions:interactions.snapshot(),dances:dances.snapshot() });

    socket.emit('provider-state',providerKey.snapshot());

    socket.emit('reception-state',reception.snapshot());

    socket.emit('contributions-state',contributions.snapshot());

    socket.on('goal-control',(input,ack=()=>{})=>{if(typeof ack!=='function')ack=()=>{};if(input?.action!=='reset')return ack({ok:false,error:'Acción inválida.'});const target=input.target===undefined?contributions.goal.target:Number(input.target);if(!contributions.goal.validTarget(target))return ack({ok:false,error:'Elegí una meta entera entre 100 y 1.000 millones.'});try{if(goalSettingsPath){mkdirSync(path.dirname(goalSettingsPath),{recursive:true});writeFileSync(goalSettingsPath,JSON.stringify({target})+'\n');}contributions.resetGoal(target);ack({ok:true});}catch{ack({ok:false,error:'No se pudo guardar la meta.'});}});

    socket.on('ranking-control',(input,ack=()=>{})=>{if(typeof ack!=='function')ack=()=>{};if(input?.action!=='reset'||!contributions.resetRankings(input.scope))return ack({ok:false,error:'Elegí tap taps, monedas o ambos rankings.'});ack({ok:true});});

    socket.on('contributions-checkpoint',(_input,ack)=>{if(typeof ack==='function')ack(contributions.exportState());});

    socket.emit('music-state',music.snapshot());

    socket.emit('presentation-state',presentationView());socket.emit('community-state',community.snapshot());

    socket.emit('ambient-state',ambient.snapshot());

    socket.emit('interaction-state',interactions.snapshot());

    socket.emit('dance-state',dances.snapshot());

    socket.on('dance-settings',(input,ack=()=>{})=>{if(typeof ack!=='function')ack=()=>{};try{if(!dances.configure(input?.pools))return ack({ok:false,error:'Elegí al menos un baile en Pista, Celebración y Solo; usá solamente bailes de la biblioteca.'});if(input.event==='normal'&&presentation.dance!=='auto'){presentation={...presentation,dance:'auto',revision:presentation.revision+1};io.emit('presentation-state',presentationView());}ack({ok:true,state:dances.snapshot()});}catch{ack({ok:false,error:'No se pudo guardar la selección de bailes.'});}});

    socket.on('interaction-control',(input,ack=()=>{})=>{if(typeof ack!=='function')ack=()=>{};try{ack(interactions.configure(input)?{ok:true}:{ok:false,error:'Elegí umbrales válidos; el solo debe ser múltiplo de la celebración.'});}catch{ack({ok:false,error:'No se pudo guardar la configuración.'});}});

    socket.on('presentation-control',(input,ack=()=>{})=>{if(typeof ack!=='function')ack=()=>{};const next=updatePresentation(presentation,input,id=>party.roster.has(id));if(!next)return ack({ok:false,error:'Presentación inválida.'});if(next!==presentation){presentation=next;io.emit('presentation-state',presentationView());}syncAmbient();ack({ok:true});});

    socket.on('ambient-control',(input,ack=()=>{})=>{if(typeof ack!=='function')ack=()=>{};if(input?.action==='stop'){ambient.stop();return ack({ok:true});}if(input?.action!=='start'||!Object.hasOwn(AMBIENT_DURATIONS,input.type))return ack({ok:false,error:'Escena inválida.'});presentation={...presentation,camera:'group',focusId:null,creatures:true,revision:presentation.revision+1};io.emit('presentation-state',presentationView());syncAmbient();ambient.start(input.type);ack({ok:true});});

    socket.on('music-control',(input,ack=()=>{})=>{if(typeof ack!=='function')ack=()=>{};if(state.paused&&['play','pause'].includes(input?.action))resumeMusic=false;ack({ok:!!input&&music.command(input)});});

    socket.on('music-duration',(input,ack=()=>{})=>{if(typeof ack!=='function')ack=()=>{};ack({ok:music.duration(input)});});
    socket.on('music-ended',(input,ack)=>{const ok=!!input?.id&&music.ended(input.id,input.playbackId);socket.emit('music-state',music.snapshot());if(typeof ack==='function')ack({ok});});

    socket.on('party-settings',(input,ack=()=>{})=>{if(typeof ack!=='function')ack=()=>{};const seconds=Number(input?.idleSeconds);if(!Number.isInteger(seconds)||(seconds!==0&&(seconds<30||seconds>3600)))return ack({ok:false,error:'Elegí entre 30 y 3600 segundos, o 0 para desactivar.'});status({idleSeconds:seconds});ack({ok:true});});

    let lastDemo = 0;

    const sessionControl = (input, acknowledge = () => {}) => {

      if (typeof acknowledge !== 'function') acknowledge = () => {};

      if (!['pause', 'resume', 'reset'].includes(input?.action)) return acknowledge({ ok: false, error: 'Acción inválida.' });

      if (input.action === 'reset') {

        clearArrivalHandoff();arrivals.reset();effects.reset();ambient.stop();interactions.reset();community.reset();resumeMusic=false;party.roster.clear(); party.seen.clear(); party.sequence = 0;

        presentation={...presentation,focusId:null,revision:presentation.revision+1};io.emit('presentation-state',presentationView());io.emit('party-reset'); status({ paused: false });

      } else {if(input.action==='pause'&&!state.paused){pausedAt=Date.now();arrivals.pause();effects.pause();resumeMusic=music.playing;if(resumeMusic)music.command({action:'pause'});}else if(input.action==='resume'&&state.paused){party.delayIdle(Date.now()-pausedAt);arrivals.resume();effects.resume();if(resumeMusic)music.command({action:'play'});resumeMusic=false;}status({ paused: input.action === 'pause' });}

      acknowledge({ ok: true });

    };

    socket.on('session-control',sessionControl);

    socket.on('demo-control',(input,ack=()=>{})=>{if(typeof ack!=='function')ack=()=>{};if(!demoEnabled)return ack({ok:false,error:'La simulación está desactivada en este servidor.'});sessionControl(input,ack);});

    socket.on('tiktok-control',(input,ack=()=>{})=>{if(typeof ack!=='function')ack=()=>{};void connectionControl(input).then(ack).catch(()=>ack({ok:false,error:'No se pudo configurar la conexión.'}));});



    socket.on('demo-event', (input, acknowledge = () => {}) => {

      if (typeof acknowledge !== 'function') acknowledge = () => {};

      if (!demoEnabled) return acknowledge({ ok: false, error: 'La simulación está desactivada en este servidor.' });

      if (Date.now() - lastDemo < 100) return acknowledge({ ok: false, error: 'Esperá un instante entre eventos.' });

      lastDemo = Date.now();

      if (!input || !['chat', 'gift', 'character', 'member', 'departure', 'like', 'contribution', 'follow', 'share'].includes(input.kind)) return acknowledge({ ok: false, error: 'Evento inválido.' });

      const id = cleanText(input.viewerId, 64);

      if (!id) return acknowledge({ ok: false, error: 'Falta el ID del remitente.' });

      const data = { common: { msgId: randomUUID(), roomId: 'local-demo' }, user: { id, displayId: id, nickname: cleanText(input.username || id, 32) } };

      if(input.kind==='departure'){if(protectedIds().has(id))return acknowledge({ok:false,error:'Esperá a que termine su entrada o regalo.'});if(!party.roster.has(id))return acknowledge({ok:false,error:'La persona no está en la pista.'});party.roster.delete(id);party.emit('remove-avatar',{viewerId:id,reason:'preview'});party.reflow();return acknowledge({ok:true});}

      if(input.kind==='like'){const count=Number(input.likeCount||10);if(!Number.isSafeInteger(count)||count<1||count>100000)return acknowledge({ok:false,error:'Cantidad de tap taps inválida.'});handleLike({...data,likeCount:count});}

      else if(input.kind==='share'){handleShare(data);}

      else if(input.kind==='contribution'){const coins=Number(input.coins);if(!Number.isSafeInteger(coins)||coins<1||coins>1000000)return acknowledge({ok:false,error:'Valor en monedas inválido.'});contributions.gift({...data,giftId:'prueba-monedas',giftType:0,diamondCount:coins,repeatCount:1});}

      else if(input.kind==='follow'){handleFollow(data);}

      else if (input.kind === 'member') {arrivals.member(data);

      } else if (input.kind === 'character') {

        arrivals.removePending(id);

        if(!party.character(data, input.characterId))return acknowledge({ok:false,error:'Personaje inválido.'});

      } else if (input.kind === 'chat') {const chat={...data,content:cleanText(input.comment||'¡A bailar!',160)};if(input.previewAdd===true){arrivals.removePending(id);party.chat(chat);}else {const processed=arrivals.chat(chat);if(processed===false)return acknowledge({ok:false,error:'No hubo ingreso. Usá !m, !me o !yo; para un aura leve, escribí aura.'});return acknowledge({ok:true,viewerId:id,queued:arrivals.pending.has(id)});}}

      else {const gift={ ...data, giftId: input.giftName === 'Rose' ? '5655' : 'demo-effect', gift: { name: ['Rose', 'Donut', 'VIP', 'Float'].includes(input.giftName) ? input.giftName : 'Donut', type: 0 }, repeatCount: 1,...(input.giftName==='Rose'?{diamondCount:1}:{}) };contributions.gift(gift);arrivals.gift(gift);}

      acknowledge({ ok: true });

    });

  });

  function reconnect() {

    if (closed || retry || state.status === 'configuration_required') return;

    const delay = state.lastError?.code==='offline'?5000:Math.min(60_000, 5000 * 2 ** Math.min(attempts++, 4));

    status({ connected: false, status: 'reconnecting', retryInSeconds: delay / 1000 });

    retry = setTimeout(() => { retry = null; void connect(); }, delay);

    retry.unref();

  }

  async function connect() {

    if (closed || connecting) return;

    const candidate=connector;if(!candidate)return;connecting = true; status({ status: 'connecting', connected: false });

    try {

      const connectedRoom=await candidate.connect();

      if (closed||connector!==candidate) { await candidate.disconnect(); return; }

      clearTimeout(retry); retry = null;

      const roomId=String(connectedRoom?.roomId||candidate.roomId||candidate.state?.roomId||'');if(contributions.beginLive(roomId,username)){interactions.reset();community.reset();}

      attempts = 0; status({ status: 'connected', connected: true, roomId, retryInSeconds: 0,lastError:null });

    } catch (error) {

      if(connector!==candidate||closed)return;

      const problem=connectionProblem(error);status({connected:false,lastError:{...problem,at:Date.now()}});console.error(`TikTok: ${problem.code}. ${problem.message}`);

      if(['provider','tls_date'].includes(problem.code)){clearTimeout(retry);retry=null;status({status:'configuration_required',retryInSeconds:0});}else reconnect();

    } finally { if(connector===candidate)connecting = false; }

  }

  function attachConnector(){

      connector = makeConnector(username.toLowerCase(), { fetchRoomInfoOnConnect:false, enableExtendedGiftInfo:false, processInitialData:true, ...(providerKey.value() ? { signApiKey: providerKey.value() } : {}) });

      connector.on(WebcastEvent.MEMBER,data=>reception.receive('member',data,d=>arrivals.member(d)));

      connector.on(WebcastEvent.FOLLOW,data=>reception.receive('follow',data,handleFollow));

      connector.on(WebcastEvent.SHARE,handleShare);

      connector.on(WebcastEvent.SOCIAL,data=>{if(isShare(data))handleShare(data);else if(isFollow(data))reception.receive('follow',data,handleFollow);});

      connector.on(WebcastEvent.CHAT, data => reception.receive('chat',data,d=>arrivals.chat(d)));

      connector.on(WebcastEvent.GIFT, data => reception.receive('gift',data,d=>{contributionRoom(d);contributions.gift(d);return arrivals.gift(d);}));

      connector.on(WebcastEvent.LIKE,data=>{contributionRoom(data);contributions.observeLikes(data);reception.receive('like',data,handleLike);});

      connector.on(ControlEvent.ERROR, error => status({lastError:{...connectionProblem(error),at:Date.now()}}));

      connector.on(ControlEvent.DISCONNECTED, reconnect);

      connector.on(WebcastEvent.STREAM_END,()=>{contributions.endLive();reconnect();});

  }

  async function connectionControl(input){

    if(closed)return {ok:false,error:'El servidor está cerrado.'};

    if(input?.action==='disconnect'){

      clearTimeout(retry);retry=null;attempts=0;connecting=false;const previous=connector;connector=null;previous?.removeAllListeners?.();status({connected:false,status:demoEnabled?'local':'unconfigured',lastError:null,retryInSeconds:0});

      if(previous)await Promise.race([Promise.resolve().then(()=>previous.disconnect()).catch(()=>{}),new Promise(resolve=>setTimeout(resolve,2000).unref())]);return {ok:true};

    }

    const name=String(input?.username||'').trim().replace(/^@/,'');if(input?.action!=='connect'||!/^[a-zA-Z0-9_.]{1,24}$/.test(name))return {ok:false,error:'Ingresá un usuario de TikTok válido.'};

    if(connecting||retry||state.connected)return {ok:false,error:'Ya hay una conexión en curso. Desconectala antes de cambiar de canal.'};

    if(missingProvider())return {ok:false,code:'missing_sign_key',error:state.lastError.message};

    if(channelSettingsPath){mkdirSync(path.dirname(channelSettingsPath),{recursive:true});writeFileSync(channelSettingsPath,JSON.stringify({username:name},null,2)+'\n');}

    const previous=connector;previous?.removeAllListeners?.();if(previous)void Promise.resolve().then(()=>previous.disconnect()).catch(()=>{});

    username=name;demoEnabled=false;clearArrivalHandoff();arrivals.reset();effects.reset();ambient.stop();interactions.reset();community.reset();party.roster.clear();party.seen.clear();party.sequence=0;resumeMusic=false;presentation={...presentation,focusId:null,revision:presentation.revision+1};io.emit('presentation-state',presentationView());io.emit('party-reset');status({username,mode:'live',demoEnabled:false,paused:false,connected:false,status:'connecting'});attachConnector();void connect();return {ok:true};

  }

  async function start(port = Number(env.PORT || 3000), host = env.HOST || '127.0.0.1') {

    await music.init();

    // An explicit local development handoff preserves the visible session while

    // updating the server. Normal launches do not load or persist a checkpoint.

    if(initialState){

      contributions.restore(initialState.contributions);

      const now=Date.now(),delta=Math.max(0,now-(initialState.capturedAt||now));

      for(const r of initialState.avatars||[]){if(!r.viewerId)continue;party.roster.set(r.viewerId,{...r,lastSeen:r.lastSeen+delta});party.skinAssignments.set(r.viewerId,r.characterId);party.skinLastUsed.set(r.characterId,++party.skinClock);party.sequence=Math.max(party.sequence,r.order||0);arrivals.enrolled.add(r.viewerId);}

      presentation=updatePresentation(presentation,initialState.presentation||{},id=>party.roster.has(id))||presentation;

      worldSeed=initialState.presentation?.worldSeed??worldSeed;worldClock.restore(initialState.presentation?.worldClock);community.restore(initialState.community);
      state.paused=!!initialState.connection?.paused;state.idleSeconds=Math.max(0,Math.min(3600,Number(initialState.connection?.idleSeconds??state.idleSeconds)));

      if(state.paused){pausedAt=now;arrivals.paused=true;effects.paused=true;effects.pausedAt=now;}

      const incoming=initialState.arrivals?.active;

      if(incoming){const remainingMs=incoming.remainingMs;arrivals.active={...incoming,startedAt:now-(incoming.durationMs-remainingMs),endsAt:now+remainingMs};arrivals.remaining=remainingMs;if(!state.paused)arrivals.arm(remainingMs);}

      for(const o of initialState.effects?.active||[]){effects.active.set(o.viewerId,{viewerId:o.viewerId,until:now+o.remainingMs,events:new Map(o.events.map(e=>[e.type,{...e,startedAt:now-(e.durationMs-e.remainingMs),endsAt:e.remainingMs>0?now+e.remainingMs:now-(e.sinceEndMs||0)}]))});}effects.arm();

      const m=initialState.music;if(m){if(music.tracks.some(t=>t.id===m.currentId))music.currentId=m.currentId;music.repeatAll=typeof m.repeatAll==='boolean'?m.repeatAll:music.repeatAll;music.finished=!!m.finished;music.playbackId=Number.isSafeInteger(m.playbackId)?m.playbackId:0;music.position=m.position||0;music.startedAt=now;music.volume=m.volume??.5;music.output=m.output==='stage'?'stage':'panel';music.playing=!!m.playing&&!state.paused;}

      syncAmbient();

    }

    await new Promise((resolve, reject) => { http.once('error', reject); http.listen(port, host, () => { http.off('error', reject); resolve(); }); });

    if (env.TIKTOK_ENABLED !== '0' && username && username !== 'tu_usuario') {

      if (!/^[a-zA-Z0-9_.]{1,24}$/.test(username)) { status({ status: 'unconfigured' }); return http.address(); }

      if(missingProvider())return http.address();

      attachConnector();

      void connect();

    } else status({ status: demoEnabled ? 'demo' : 'unconfigured', connected: false });

    return http.address();

  }

  async function close() {

    closed = true; music.close();clearArrivalHandoff();clearTimeout(retry);clearTimeout(contributionTimer);clearTimeout(receptionTimer);clearInterval(idleTimer);community.close();interactions.close();ambient.close();arrivals.close();effects.close();

    if (connector) await Promise.race([Promise.resolve().then(() => connector.disconnect()).catch(() => {}), new Promise(resolve => setTimeout(resolve, 2000).unref())]);

    await new Promise(resolve => io.close(resolve));

  }

  return { app, http, io, party, arrivals, effects, interactions, community, worldClock, dances, music, ambient, contributions, reception, connectionControl, start, close, status: () => ({ ...state }) };

}



if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {

  const server = createPartyServer({diagnosticsPath:path.join(root,'work','logs','tiktok-reception.json')});

  server.start().then(address => {

    console.log(`Live Dance · http://127.0.0.1:${address.port}/`);

    console.log(`OBS: navegador 1080 × 1920; fondo transparente. Estado: ${server.status().status}`);

    if (server.status().demoEnabled) console.log(`Estudio: http://127.0.0.1:${address.port}/estudio`);

    if (server.status().status === 'unconfigured') console.log('Configurá TIKTOK_USERNAME en .env o usá Iniciar-Demo.cmd.');

  }).catch(error => { console.error(error.code === 'EADDRINUSE' ? 'El puerto está ocupado. No se detuvo ningún otro servidor.' : error.message); process.exitCode = 1; });

  for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void server.close().then(() => process.exit(0)); });

}

