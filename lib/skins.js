import { validMinecraftName } from './events.js';

export class SkinError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

/** Native fetch on the server: Mojang profile endpoints do not allow browser CORS. */
export class SkinService {
  constructor({ fetcher = fetch, now = Date.now, ttl = 600_000, maxEntries = 100 } = {}) {
    Object.assign(this, { fetcher, now, ttl, maxEntries });
    this.cache = new Map();
    this.pending = new Map();
    this.active = 0;
    this.queue = [];
  }
  async limited(task) {
    if (this.active >= 4) {
      if (this.queue.length >= 20) throw new SkinError('Hay muchas consultas de skins. Reintentá en unos segundos.', 429);
      await new Promise(resolve => this.queue.push(resolve));
    } else this.active++;
    try { return await task(); }
    finally { if (this.queue.length) this.queue.shift()(); else this.active--; }
  }
  async request(url, { json = false } = {}) {
    let response;
    try { response = await this.fetcher(url, { signal: AbortSignal.timeout(6000), redirect: 'error' }); }
    catch { throw new SkinError('El servicio de skins no respondió. Se conserva el avatar de respaldo.'); }
    if ([204, 404].includes(response.status)) throw new SkinError('No se encontró esa cuenta Minecraft.', 404);
    if (!response.ok) throw new SkinError(response.status === 429 ? 'Mojang limitó las consultas. Reintentá más tarde.' : 'Mojang no pudo resolver esta skin.', response.status === 429 ? 429 : 502);
    const chunks = []; let size = 0;
    for await (const chunk of response.body) {
      size += chunk.length;
      if (size > 262144) throw new SkinError('La respuesta de skin supera el tamaño admitido.');
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    if (!json) return buffer;
    try { return JSON.parse(buffer.toString('utf8')); }
    catch { throw new SkinError('Respuesta de perfil inválida.'); }
  }
  async resolve(name) {
    if (!validMinecraftName(name)) throw new SkinError('Nombre Minecraft inválido.', 400);
    const key = name.toLowerCase(), cached = this.cache.get(key);
    if (cached && cached.expires > this.now()) {
      this.cache.delete(key); this.cache.set(key, cached);
      if (cached.error) throw cached.error;
      return cached.value;
    }
    if (this.pending.has(key)) return this.pending.get(key);
    const task = this.limited(async () => {
      try {
        let profile;
        try { profile = await this.request(`https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(name)}`, { json: true }); }
        catch (error) {
          if (error.status && error.status !== 502) throw error;
          profile = await this.request(`https://api.minecraftservices.com/minecraft/profile/lookup/name/${encodeURIComponent(name)}`, { json: true });
        }
        if (!/^[a-f0-9]{32}$/i.test(profile.id)) throw new SkinError('UUID inválido en el perfil.');
        const session = await this.request(`https://sessionserver.mojang.com/session/minecraft/profile/${profile.id}`, { json: true });
        let texture;
        try { texture = JSON.parse(Buffer.from(session.properties.find(p => p.name === 'textures').value, 'base64').toString('utf8')).textures.SKIN; }
        catch { throw new SkinError('La cuenta no tiene una textura de skin disponible.', 404); }
        const url = new URL(texture.url);
        if (!['http:', 'https:'].includes(url.protocol) || url.hostname !== 'textures.minecraft.net' || url.port || url.username || url.password || !/^\/texture\/[a-f0-9]{32,128}$/i.test(url.pathname) || url.search || url.hash)
          throw new SkinError('Origen de textura no admitido.');
        url.protocol = 'https:';
        const png = await this.request(url.href);
        if (png.length < 33 || !png.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) || png.toString('ascii', 12, 16) !== 'IHDR') throw new SkinError('La textura no es un PNG válido.');
        const width = png.readUInt32BE(16), height = png.readUInt32BE(20);
        if (width !== 64 || ![32, 64].includes(height)) throw new SkinError('Se admiten skins Minecraft de 64×64 o 64×32.');
        const value = { name: profile.name || name, uuid: profile.id, model: texture.metadata?.model === 'slim' ? 'slim' : 'classic', png, width, height };
        this.put(key, { value, expires: this.now() + this.ttl });
        return value;
      } catch (error) {
        const failure = error instanceof SkinError ? error : new SkinError('No se pudo cargar la skin.');
        this.put(key, { error: failure, expires: this.now() + 30_000 });
        throw failure;
      }
    });
    this.pending.set(key, task);
    try { return await task; } finally { this.pending.delete(key); }
  }
  put(key, value) {
    this.cache.delete(key); this.cache.set(key, value);
    while (this.cache.size > this.maxEntries) this.cache.delete(this.cache.keys().next().value);
  }
}
