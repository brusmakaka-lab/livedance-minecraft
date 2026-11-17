import {skyCycle} from './world-cycle.js';
// Draw the sky after opaque geometry at far depth, so early depth rejection
// avoids shading sky pixels already covered by the large opaque ground.
// All visible celestial, cloud and star artwork is downloaded, unchanged PNG data.
export async function buildWorldSky(THREE,scene,{transparent=false,hemisphere,sun,fill}={}){
 const loader=new THREE.TextureLoader();const textures=await Promise.all(['sun.png','moon_phases.png','clouds.png','stars.png'].map(name=>loader.loadAsync('/assets/downloaded/sky/'+name)));
 for(const t of textures){t.colorSpace=THREE.SRGBColorSpace;t.magFilter=t.minFilter=THREE.NearestFilter;t.generateMipmaps=false;}
 textures[2].wrapS=THREE.MirroredRepeatWrapping;textures[2].wrapT=THREE.ClampToEdgeWrapping;textures[3].wrapS=THREE.RepeatWrapping;
 const uniforms={time:{value:0},night:{value:0},twilight:{value:0},celestial:{value:new THREE.Vector2(.5,.87)},aspect:{value:9/16},sunImage:{value:textures[0]},moonImage:{value:textures[1]},cloudImage:{value:textures[2]},starImage:{value:textures[3]}};
 const material=new THREE.ShaderMaterial({uniforms,depthTest:true,depthWrite:false,toneMapped:false,vertexShader:'varying vec2 skyUV;void main(){skyUV=uv;gl_Position=vec4(position.xy,1.0,1.0);}',fragmentShader:`
 precision highp float;varying vec2 skyUV;uniform float time,night,aspect,twilight;uniform vec2 celestial;uniform sampler2D sunImage,moonImage,cloudImage,starImage;
 void main(){vec2 p=skyUV;vec2 cloudUV=vec2(p.x*.82+time*.002,p.y*.90);vec4 authoredSky=texture2D(cloudImage,cloudUV);
  vec3 nightBase=mix(vec3(.085,.12,.20),vec3(.009,.018,.05),smoothstep(.1,1.0,p.y));
  vec4 stars=texture2D(starImage,vec2(fract(p.x*.82+time*.00012),p.y));float authoredStars=max(stars.r,stars.g)*stars.a;
  float authoredClouds=clamp((authoredSky.r-.29)*1.45,0.0,1.0)*authoredSky.a;
  vec3 nightSky=nightBase+vec3(.74,.83,1.0)*authoredStars;
  nightSky=mix(nightSky,vec3(.21,.27,.38),authoredClouds*.72);
  vec3 col=mix(authoredSky.rgb,nightSky,night);
  col=mix(col,vec3(.95,.42,.20),twilight*pow(1.0-p.y,3.0));vec2 uv=(p-celestial)*vec2(aspect,1.0)/.20+.5;
  if(uv.x>=0.0&&uv.x<=1.0&&uv.y>=0.0&&uv.y<=1.0){vec3 s=texture2D(sunImage,uv).rgb;vec3 m=texture2D(moonImage,vec2(uv.x*.25,uv.y*.5+.5)).rgb;col+=mix(s,m,night);}
  gl_FragColor=vec4(col,1.0);
 }`});
 const quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);quad.frustumCulled=false;quad.renderOrder=10000;quad.visible=!transparent;scene.add(quad);scene.background=null;
 const dayFog=new THREE.Color('#b5cde3'),nightFog=new THREE.Color('#202d47'),daySun=new THREE.Color('#fff8ec'),nightSun=new THREE.Color('#c5d8ff');scene.fog=transparent?null:new THREE.Fog(dayFog,80,240);let mode='cycle',lastTime=0,blend=0,cycle=skyCycle(0);
 return {setMode:(value,instant=false)=>{const next=['day','night','cycle'].includes(value)?value:'cycle';if(instant&&next!==mode)blend=Number(next==='night');mode=next;},update:(seconds,aspect,worldSeconds=seconds)=>{cycle=skyCycle(worldSeconds);const target=mode==='cycle'?cycle.night:Number(mode==='night');uniforms.celestial.value.fromArray(mode==='cycle'?cycle.position:skyCycle(worldSeconds*.15).position);uniforms.twilight.value=mode==='cycle'?cycle.twilight:0;const dt=Math.max(0,Math.min(.05,seconds-lastTime));lastTime=seconds;blend+=(target-blend)*(1-Math.exp(-dt*3.5));if(Math.abs(target-blend)<.001)blend=target;uniforms.time.value=worldSeconds;uniforms.night.value=blend;uniforms.aspect.value=aspect;
  if(scene.fog)scene.fog.color.copy(dayFog).lerp(nightFog,blend);if(hemisphere)hemisphere.intensity=2.2-.65*blend;if(sun){sun.intensity=2.5-1.65*blend;sun.color.copy(daySun).lerp(nightSun,blend);sun.position.set(Math.sin(cycle.angle)*14,6+Math.abs(cycle.elevation)*12,7);}if(fill)fill.intensity=.65+.15*blend;
 },inspect:()=>({mode,nightBlend:blend,time:uniforms.time.value,transparent,downloadedArtwork:true,sources:['Faithful 32x','Pixel Perfection CE'],cloudPhase:(uniforms.time.value*.004)%1,cycle,cycleSeconds:1200,sunPosition:uniforms.celestial.value.toArray()})};
}
