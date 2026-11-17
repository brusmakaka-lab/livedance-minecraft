const clamp=t=>Math.max(0,Math.min(1,t)),smooth=t=>{t=clamp(t);return t*t*(3-2*t);};
export function giantScale(age){const t=Math.max(0,age);return t>=1?1.6:1+.6*(1-Math.exp(-6*t)*Math.cos(8*t));}
export function companionPresentation(age,remaining,beat,side=1){const opacity=smooth(age/.28)*smooth(remaining/.4);return {opacity,x:side*1.45,y:.025+Math.abs(Math.sin(beat*Math.PI))*.025,z:.2,phase:beat/2,yaw:Math.sin(beat*Math.PI*.5)*.065};}
