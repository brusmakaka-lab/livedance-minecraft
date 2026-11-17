import {LOCAL_CLIPS} from './local-dance-clips.js';import {USER_CLIPS} from './user-dance-clips.js';
export const DANCE_CLIPS=Object.freeze({...LOCAL_CLIPS,...USER_CLIPS});
export const DANCE_CATALOG=Object.entries(DANCE_CLIPS).map(([id,c])=>({id,name:c.label,detail:c.source||'Biblioteca LiveDance',beats:c.beats,duration:c.duration}));
