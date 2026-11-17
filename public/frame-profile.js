// Opt-in measurements. WebGL submission time is CPU time; GPU queries are separate.
export function createFrameProfile(renderer,enabled=false){
 const gl=renderer.getContext(),ext=enabled&&gl.getExtension('EXT_disjoint_timer_query_webgl2'),samples=[],pending=[];let frameStart=0,stamp=0,lastFrame=null,current={},query=null;
 const percentile=(a,p)=>a.length?a.slice().sort((a,b)=>a-b)[Math.min(a.length-1,Math.floor(a.length*p))]:null;
 return {
  begin(){if(!enabled)return;const now=performance.now();current={interval:lastFrame===null?0:now-lastFrame};lastFrame=now;frameStart=stamp=now;},
  mark(name){if(!enabled)return;const now=performance.now();current[name]=now-stamp;stamp=now;},
  render(scene,camera){if(!enabled){renderer.render(scene,camera);return;}if(ext&&pending.length<5){query=gl.createQuery();gl.beginQuery(ext.TIME_ELAPSED_EXT,query);}renderer.render(scene,camera);if(query){gl.endQuery(ext.TIME_ELAPSED_EXT);pending.push(query);query=null;}this.mark('renderCpu');},
  end(){if(!enabled)return;current.cpu=performance.now()-frameStart;current.calls=renderer.info.render.calls;current.triangles=renderer.info.render.triangles;if(ext){while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){const q=pending.shift();if(!gl.getParameter(ext.GPU_DISJOINT_EXT))current.gpu=gl.getQueryParameter(q,gl.QUERY_RESULT)/1e6;gl.deleteQuery(q);}}samples.push(current);if(samples.length>1800)samples.shift();},
  reset(){samples.length=0;lastFrame=null;},
  inspect(){const stats={};for(const key of ['interval','cpu','motion','ambient','renderCpu','labels','gpu','calls','triangles']){const a=samples.map(s=>s[key]).filter(n=>Number.isFinite(n)&&n>0);stats[key]={mean:a.length?a.reduce((n,v)=>n+v,0)/a.length:null,p50:percentile(a,.5),p95:percentile(a,.95),samples:a.length};}const debug=gl.getExtension('WEBGL_debug_renderer_info');return {enabled,frames:samples.length,fps:stats.interval.mean?1000/stats.interval.mean:null,gpuTimerAvailable:!!ext,renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),stats};}
 };
}
