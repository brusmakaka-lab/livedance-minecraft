// Local decorative drawings. Argentina's sun is intentionally simplified.
const horizontal=(id,name,colors,ratio=1.5,weights=null)=>({id,name,kind:'horizontal',colors,ratio,weights});
const vertical=(id,name,colors)=>({id,name,kind:'vertical',colors,ratio:1.5});
const nordic=(id,name,base,cross,ratio,outline=null)=>({id,name,kind:'cross',base,cross,ratio,outline});
export const COUNTRIES=[
 {id:'AR',name:'Argentina',kind:'argentina',ratio:1.6},
 {id:'CL',name:'Chile',kind:'chile',ratio:1.5},
 vertical('PE','Perú',['#d91023','#fff','#d91023']),
 horizontal('CO','Colombia',['#fcd116','#003893','#ce1126'],1.5,[2,1,1]),
 horizontal('BO','Bolivia',['#d52b1e','#f9e300','#007934']),
 vertical('FR','Francia',['#002654','#fff','#ed2939']),
 vertical('IT','Italia',['#009246','#fff','#ce2b37']),
 horizontal('DE','Alemania',['#171717','#d00','#ffce00'],5/3),
 horizontal('NL','Países Bajos',['#ae1c28','#fff','#21468b']),
 vertical('BE','Bélgica',['#171717','#fdda24','#ef3340']),
 horizontal('PL','Polonia',['#fff','#dc143c'],1.6),
 horizontal('AT','Austria',['#ed2939','#fff','#ed2939']),
 vertical('IE','Irlanda',['#169b62','#fff','#ff883e']),
 vertical('RO','Rumania',['#002b7f','#fcd116','#ce1126']),
 {id:'JP',name:'Japón',kind:'japan',ratio:1.5},
 nordic('SE','Suecia','#006aa7','#fecc00',1.6),
 nordic('FI','Finlandia','#fff','#003580',18/11),
 nordic('DK','Dinamarca','#c8102e','#fff',37/28),
 nordic('NO','Noruega','#ba0c2f','#00205b',22/16,'#fff'),
 {id:'CH',name:'Suiza',kind:'swiss',ratio:1}
];
function star(c,x,y,r,n=5){c.beginPath();for(let i=0;i<n*2;i++){const a=-Math.PI/2+i*Math.PI/n,d=i%2?r*.4:r;c.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);}c.closePath();c.fill();}
function paint(c,d){
 const w=256,h=w/d.ratio;c.fillStyle='#fff';c.fillRect(0,0,w,h);
 if(d.colors){let offset=0;const total=d.weights?.reduce((a,b)=>a+b,0)||d.colors.length;d.colors.forEach((color,i)=>{const span=(d.weights?.[i]||1)/total;c.fillStyle=color;if(d.kind==='vertical')c.fillRect(offset*w,0,span*w+1,h);else c.fillRect(0,offset*h,w,span*h+1);offset+=span;});}
 if(d.kind==='argentina'){c.fillStyle='#74acdf';c.fillRect(0,0,w,h/3);c.fillRect(0,h*2/3,w,h/3);c.save();c.translate(w/2,h/2);c.fillStyle='#f6b40e';c.strokeStyle='#bd8416';for(let i=0;i<32;i++){c.save();c.rotate(i*Math.PI/16);c.beginPath();c.moveTo(-.8,-6);c.lineTo(i%2?1.8:.2,-13);c.lineTo(1,-6);c.fill();c.restore();}c.beginPath();c.arc(0,0,6,0,Math.PI*2);c.fill();c.lineWidth=.5;c.stroke();c.fillStyle='#805522';for(const x of [-2,2]){c.beginPath();c.arc(x,-1,.6,0,Math.PI*2);c.fill();}c.restore();}
 if(d.kind==='chile'){c.fillStyle='#d52b1e';c.fillRect(0,h/2,w,h/2);c.fillStyle='#0039a6';c.fillRect(0,0,h/2,h/2);c.fillStyle='#fff';star(c,h/4,h/4,h*.145);}
 if(d.kind==='japan'){c.fillStyle='#bc002d';c.beginPath();c.arc(w/2,h/2,h*.3,0,Math.PI*2);c.fill();}
 if(d.kind==='cross'){c.fillStyle=d.base;c.fillRect(0,0,w,h);const x=w*(d.id==='FI'?6/18:d.id==='NO'?7/22: d.id==='DK'?14/37:6/16);const bar=h*(d.id==='FI'?3/11: d.id==='NO'?2/16: d.id==='DK'?4/28:2/10);if(d.outline){c.fillStyle=d.outline;c.fillRect(x-bar,0,bar*2,h);c.fillRect(0,h/2-bar,w,bar*2);}c.fillStyle=d.cross;c.fillRect(x-bar/2,0,bar,h);c.fillRect(0,(h-bar)/2,w,bar);}
 if(d.kind==='swiss'){c.fillStyle='#d52b1e';c.fillRect(0,0,w,h);c.fillStyle='#fff';c.fillRect(w*.4,h*.2,w*.2,h*.6);c.fillRect(w*.2,h*.4,w*.6,h*.2);}
}
export function buildCountryFlags(THREE){
 const group=new THREE.Group();group.name='Decoración · 20 países';
 const atlas=document.createElement('canvas');atlas.width=5*264;atlas.height=4*264;const ctx=atlas.getContext('2d');
 const poles=new THREE.InstancedMesh(new THREE.BoxGeometry(.09,1,.09),new THREE.MeshLambertMaterial({color:'#768896',fog:false}),20);
 const bases=new THREE.InstancedMesh(new THREE.BoxGeometry(.65,.22,.65),new THREE.MeshLambertMaterial({color:'#606e7c',fog:false}),20);
 const caps=new THREE.InstancedMesh(new THREE.SphereGeometry(.105,8,6),new THREE.MeshLambertMaterial({color:'#f6d77e',fog:false}),20);
 const matrix=new THREE.Object3D(),positions=[],uvs=[],wave=[],hoist=[],indices=[],placements=[];
 function instance(mesh,i,x,y,z,sx=1,sy=1,sz=1){matrix.position.set(x,y,z);matrix.scale.set(sx,sy,sz);matrix.updateMatrix();mesh.setMatrixAt(i,matrix.matrix);}
 COUNTRIES.forEach((country,i)=>{
  // One continuous arc; center countries first, then alternating toward the ends.
  const column=[9,10,8,11,7,12,6,13,5,14,4,15,3,16,2,17,1,18,0,19][i];
  const angle=(column/19-.5)*136*Math.PI/180,radius=19,height=7.5;
  const x=radius*Math.sin(angle),z=1-radius*Math.cos(angle),dx=Math.cos(angle),dz=Math.sin(angle);
  const clothWidth=2.05,clothHeight=clothWidth/country.ratio,lift=height-.08-.6-clothHeight,delay=.25+i*.12;
  placements.push({country:country.name,id:country.id,x,z,height,angle,clothHeight,lift,delay});
  instance(poles,i,x,height/2,z,1,height,1);instance(bases,i,x,.11,z);instance(caps,i,x,height+.06,z);
  const ax=(i%5)*264+4,ay=Math.floor(i/5)*264+4;ctx.save();ctx.translate(ax,ay);paint(ctx,country);ctx.restore();
  const first=positions.length/3,cols=20,rows=10;
  for(let r=0;r<=rows;r++)for(let col=0;col<=cols;col++){
   const u=col/cols,v=r/rows;positions.push(x+(.055+u*clothWidth)*dx,height-.08-v*clothHeight,z+(.055+u*clothWidth)*dz);
   uvs.push((ax+u*256)/atlas.width,1-(ay+v*256/country.ratio)/atlas.height);wave.push(u,v,i*.73);hoist.push(lift,delay,angle);
  }
  for(let r=0;r<rows;r++)for(let col=0;col<cols;col++){const a=first+r*(cols+1)+col,b=a+cols+1;indices.push(a,b,a+1,b,b+1,a+1);}
 });
 const texture=new THREE.CanvasTexture(atlas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=2;
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setAttribute('flagWave',new THREE.Float32BufferAttribute(wave,3));geometry.setAttribute('flagHoist',new THREE.Float32BufferAttribute(hoist,3));geometry.setIndex(indices);geometry.computeBoundingSphere();geometry.boundingSphere.radius+=8;
 let hoistStarted=0;const time={value:0},start={value:0},material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false,fog:false});
 material.onBeforeCompile=shader=>{shader.uniforms.flagTime=time;shader.uniforms.flagHoistStart=start;shader.vertexShader='uniform float flagTime;\nuniform float flagHoistStart;\nattribute vec3 flagWave;\nattribute vec3 flagHoist;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  float u=flagWave.x, v=flagWave.y, phase=flagWave.z;
  float wind=sin(flagTime*2.25-u*7.0+v*2.2+phase)+0.36*sin(flagTime*3.4-u*12.0-v*2.0+phase);
  // Wind bends along the normal of each flag; the hoist edge remains on its pole.
  float billow=u*(0.24*wind+0.09);
  transformed.x-=sin(flagHoist.z)*billow;
  transformed.z+=cos(flagHoist.z)*billow;
  float progress=clamp((flagTime-flagHoistStart-flagHoist.y)/3.2,0.0,1.0);
  float raised=progress*progress*(3.0-2.0*progress);
  transformed.y-=flagHoist.x*(1.0-raised);
  transformed.y+=u*(0.055*sin(flagTime*2.25-u*7.0+phase)-0.10);
 `);};material.customProgramCacheKey=()=> 'country-flags-arc-hoist-v2';
 const cloth=new THREE.Mesh(geometry,material);group.add(bases,poles,caps,cloth);
 const progress=p=>Math.max(0,Math.min(1,(time.value-hoistStarted-p.delay)/3.2));
 return {group,update:seconds=>{time.value=seconds;},
  setEnabled:(enabled,seconds)=>{if(enabled&&!group.visible){hoistStarted=seconds;start.value=seconds;}group.visible=enabled;},
  inspect:()=>({enabled:group.visible,layout:'arc',count:20,countries:placements.map(p=>{const t=progress(p),e=t*t*(3-2*t);return {...p,hoistProgress:t,clothTop:p.height-.08-p.lift*(1-e)};}),
   hoistComplete:placements.every(p=>progress(p)===1),hoistElapsed:time.value-hoistStarted,windTime:time.value,drawCalls:4,triangles:indices.length/3,pinnedAtPole:true})};
}
