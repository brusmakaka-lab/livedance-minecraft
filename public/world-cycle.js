const smooth=(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);};
export function skyCycle(seconds){const phase=((seconds/1200)%1+1)%1,angle=phase*Math.PI*2,elevation=Math.cos(angle);return {phase,angle,elevation,night:1-smooth(-.18,.16,elevation),twilight:(1-Math.min(1,Math.abs(elevation)*4))*.6,position:[.5+Math.sin(angle)*.62,.25+Math.abs(elevation)*.62]};}
