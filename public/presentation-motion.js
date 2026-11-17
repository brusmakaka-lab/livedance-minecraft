const clamp=t=>Math.max(0,Math.min(1,t));
const smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export const DEPARTURE_SECONDS=3.6;
// Reverse the arrival's sky motif: anticipation, ascent, then a short dissolve.
// Position stays in its column, so departing owners never slide through a row.
export function departure(age){const t=Math.max(0,age),launch=smooth(t/.5),rise=clamp((t-.5)/(DEPARTURE_SECONDS-.5));return {done:t>=DEPARTURE_SECONDS,lift:14*rise*rise,anticipation:Math.sin(clamp(t/.5)*Math.PI),opacity:1-smooth((t-2.7)/.9),shadowOpacity:.3*(1-smooth((t-.4)/1.3)),scale:1-.025*Math.sin(launch*Math.PI)};}
export function manualEventFrame(view,receivedAt,now){const a=view?.active;if(!a)return null;const time=Math.max(0,(a.durationMs-a.remainingMs+(view.paused?0:Math.max(0,now-receivedAt)))/1000),duration=a.durationMs/1000;return {id:a.id,type:a.type,time,duration,manual:true,ended:time>=duration,opacity:smooth(time/1.5)*smooth((duration-time)/1.8)};}
