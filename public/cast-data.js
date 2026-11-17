import {LIBRARY_SKINS} from './library-skins.js';
import {DOWNLOADED_SKINS} from './downloaded-skins.js';
export const AUTO_CHARACTERS=Object.freeze([...LIBRARY_SKINS,...DOWNLOADED_SKINS]);
export const CHARACTERS=Object.freeze([...LIBRARY_SKINS.map(c=>({...c,source:'livedance'})),...DOWNLOADED_SKINS]);
export const characterById=id=>CHARACTERS.find(c=>c.id===id)||null;
export function characterForViewer(id){let h=2166136261;for(const c of String(id))h=Math.imul(h^c.charCodeAt(0),16777619);return AUTO_CHARACTERS[(h>>>0)%AUTO_CHARACTERS.length];}
export const FEATURED_CHARACTERS=LIBRARY_SKINS.slice(0,10);
