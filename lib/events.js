import { randomUUID } from 'node:crypto';
import { characterById, characterForViewer, AUTO_CHARACTERS } from '../public/cast-data.js';

export const cleanText = (value, max = 40) => String(value ?? '')
  .replace(/[<>\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g, '').trim().slice(0, max);
export const validMinecraftName = name => /^[a-zA-Z0-9_]{3,16}$/.test(name);

export function sender(data = {}) {
  const user = data.user || {};
  const valid = value => !(typeof value==='number'&&!Number.isSafeInteger(value)) && value!==undefined && value!==null && cleanText(value,80)!=='' && cleanText(value,80)!=='0';
  const uniqueId = cleanText([user.uniqueId,user.displayId,data.uniqueId].find(valid)||'',64);
  const rawId = cleanText([user.userId,user.id,user.idStr,data.userId,uniqueId].find(valid)||'',80);
  if (!rawId || rawId === '0') return null;
  return { viewerId: rawId, username: cleanText(user.nickname || data.nickname || uniqueId || rawId, 32), uniqueId };
}

// SDKs may populate both fields, leaving one as an empty default.
export function chatText(data={}){return cleanText([data.comment,data.content].find(v=>typeof v==='string'&&v.trim())||'',160).normalize('NFKC');}
export const isChatAura=text=>/^!?aura$/i.test(text);
export const isJoinCommand=text=>/^!(?:m|me|yo)$/i.test(text);

/** One owner per viewer ID. Gift streaks are counted once, on their final update. */
export class Party {
  constructor(emit, { maxAvatars = 40, now = Date.now, protectedIds = () => new Set() } = {}) {
    this.emit = emit;
    this.maxAvatars = Math.max(1, Math.min(40, Math.floor(Number(maxAvatars) || 40)));
    this.now = now; this.protectedIds = protectedIds;
    this.roster = new Map();
    this.seen = new Set();
    this.sequence = 0;this.skinAssignments=new Map();this.skinLastUsed=new Map();this.skinClock=0;
  }
  accept(type, data) {
    const id = [data.common?.msgId,data.msgId,data.messageId].find(v=>v!==undefined&&v!==null&&String(v).trim()!==''&&String(v)!=='0'&&!(typeof v==='number'&&!Number.isSafeInteger(v)));
    if (!id) return true;
    const key = `${type}:${data.common?.roomId || ''}:${id}`;
    if (this.seen.has(key)) return false;
    this.seen.add(key);
    if (this.seen.size > 4096) this.seen.delete(this.seen.values().next().value);
    return true;
  }
  automaticSkin(viewerId){
    const occupied=new Set([...this.roster.values()].map(r=>r.characterId)),remembered=this.skinAssignments.get(viewerId);
    let chosen=remembered&&!occupied.has(remembered)&&characterById(remembered)?remembered:null;
    if(!chosen){const start=AUTO_CHARACTERS.findIndex(c=>c.id===characterForViewer(viewerId).id);let oldest=Infinity;for(let n=0;n<AUTO_CHARACTERS.length;n++){const c=AUTO_CHARACTERS[(start+n)%AUTO_CHARACTERS.length];if(occupied.has(c.id))continue;const age=this.skinLastUsed.get(c.id)||0;if(age<oldest){oldest=age;chosen=c.id;}}}
    chosen||=characterForViewer(viewerId).id;this.skinAssignments.set(viewerId,chosen);this.skinLastUsed.set(chosen,++this.skinClock);
    if(this.skinAssignments.size>4096)this.skinAssignments.delete(this.skinAssignments.keys().next().value);return chosen;
  }
  upsert(identity) {
    let record = this.roster.get(identity.viewerId);
    if (!record) {
      if (this.roster.size >= this.maxAvatars) {
        const candidates=[...this.roster.values()].filter(a=>!this.protectedIds().has(a.viewerId));
        const oldest = (candidates.length?candidates:[...this.roster.values()]).sort((a, b) => a.order - b.order)[0];
        this.roster.delete(oldest.viewerId);
        this.emit('remove-avatar', { viewerId: oldest.viewerId, reason:'capacity' });
      }
      const order = ++this.sequence, occupied = new Set([...this.roster.values()].map(a => a.slot));
      let slot = (order - 1) % this.maxAvatars;
      while (occupied.has(slot)) slot = (slot + 1) % this.maxAvatars;
      record = { ...identity, minecraftName: null, characterId: this.automaticSkin(identity.viewerId), order, slot };
      this.roster.set(identity.viewerId, record);
      this.reflow();
    }
    Object.assign(record, identity, { lastSeen: this.now() });
    return record;
  }
  chat(data) {
    const identity = sender(data);
    if (!identity || !this.accept('chat', data)) return false;
    const record = this.upsert(identity);
    const comment = chatText(data);
    if (/^mc\s/i.test(comment)) {
      const minecraftName = comment.slice(3).trim();
      if (!validMinecraftName(minecraftName)) {
        this.emit('spawn-normal', { ...record });
        this.emit('skin-error', { viewerId: record.viewerId, message: 'Usá mc seguido de un nombre Minecraft de 3–16 letras, números o guiones bajos.' });
        return false;
      }
      record.minecraftName = minecraftName;
      this.emit('spawn-mc-skin', { ...record });
    } else this.emit('spawn-normal', { ...record,...(isChatAura(comment)?{quiet:true}:{}) });
    if(isChatAura(comment))this.emit('chat-aura',{viewerId:record.viewerId});
    return true;
  }
  character(data, characterId) {
    const identity=sender(data);
    if(!identity||!characterById(characterId)||!this.accept('character',data))return false;
    const record=this.upsert(identity);record.characterId=characterId;record.minecraftName=null;this.skinAssignments.set(identity.viewerId,characterId);this.skinLastUsed.set(characterId,++this.skinClock);
    this.emit('spawn-normal',{...record});return true;
  }
  gift(data) {
    const giftType = Number(data.giftType ?? data.gift?.type ?? data.giftDetails?.giftType ?? 0);
    if (giftType === 1 && ![true, 1, '1'].includes(data.repeatEnd)) return false;
    const identity = sender(data);
    if (!identity || !this.accept('gift', data)) return false;
    // Some streams use a different msgId for the repeated final notification.
    const streakId = data.groupId || data.orderId;
    if (giftType === 1 && streakId && !this.accept('streak', { msgId: `${identity.viewerId}:${data.giftId}:${streakId}` })) return false;
    const record = this.upsert(identity);
    this.emit(record.minecraftName ? 'spawn-mc-skin' : 'spawn-normal', { ...record });
    const giftId = cleanText(data.giftId || data.gift?.id, 40);
    const giftName = cleanText(data.giftName || data.gift?.name || data.extendedGiftInfo?.name || data.giftDetails?.giftName || 'Regalo', 48);
    const normalized = giftName.toLowerCase().normalize('NFD').replace(/\p{Diacritic}/gu, '');
    const type = giftId === '5655' || /^(rose|rosa)$/.test(normalized) ? 'Rose'
      : /^(donut|donuts|doughnut|dona|donas)$/.test(normalized) ? 'Donut' : giftName;
    const effect = { viewerId: record.viewerId, username: record.username, type, giftName, giftId,
      count: Math.max(1, Math.min(999, Number(data.repeatCount) || 1)), eventId: randomUUID() };
    this.emit('trigger-effect', effect);
    return effect;
  }
  reflow(){let rank=0;for(const r of [...this.roster.values()].sort((a,b)=>b.order-a.order))r.rank=rank++;this.emit('roster-order',{order:[...this.roster.values()].map(r=>({viewerId:r.viewerId,rank:r.rank}))});}
  expireInactive(idleMs,protectedIds=this.protectedIds()) {
    if(!idleMs)return null;
    const record=[...this.roster.values()].filter(r=>!protectedIds.has(r.viewerId)&&this.now()-r.lastSeen>=idleMs).sort((a,b)=>a.lastSeen-b.lastSeen||a.order-b.order)[0];
    if(!record)return null;this.roster.delete(record.viewerId);this.emit('remove-avatar',{viewerId:record.viewerId,reason:'inactive'});this.reflow();return record.viewerId;
  }
  delayIdle(ms){for(const r of this.roster.values())r.lastSeen=Math.min(this.now(),r.lastSeen+ms);}
  snapshot() { return [...this.roster.values()].map(record => ({ ...record })); }
}
