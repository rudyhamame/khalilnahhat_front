// Temporary local-only investigation instrumentation; removed after profiling.
const enabled=import.meta.env.DEV&&new URLSearchParams(location.search).has('playbackProfile');
const renders=new Map();
let commits=0,renderMs=0,slowTasks=0,slowMs=0,frames=0,gaps=0,maxGap=0,last=0;
export function playbackRender(_id,_phase,actual){if(enabled){commits++;renderMs+=actual;const row=renders.get(_id)||{ms:0,n:0};row.ms+=actual;row.n++;renders.set(_id,row);}}
if(enabled){
 const costs=new Map(),wrapped=new WeakMap();
 const wrap=(fn,kind)=>{if(wrapped.has(fn))return wrapped.get(fn);const key=kind+': '+(new Error().stack.split('\n').find(line=>line.includes('/src/')&&!line.includes('playbackProfile'))||fn.name||'anonymous');const call=function(...args){const start=performance.now();try{return fn.apply(this,args);}finally{const entry=costs.get(key)||{ms:0,n:0};entry.ms+=performance.now()-start;entry.n++;costs.set(key,entry);}};wrapped.set(fn,call);return call;};
 for(const name of ['ResizeObserver','MutationObserver']){const Original=window[name];window[name]=class extends Original{constructor(fn){super(wrap(fn,name));}};}
 const raf=window.requestAnimationFrame;window.requestAnimationFrame=fn=>raf(wrap(fn,'raf'));
 const without=new URLSearchParams(location.search).get('without');
 const rules={lighting:'.echo-party-lighting{display:none!important}',snow:'.global-seasonal-snow{display:none!important}',vinyl:'.home-archive-vinyl{animation-play-state:paused!important}',animations:'*,*::before,*::after{animation:none!important;transition:none!important}',artwork:'.home-archive-player.has-playing-artwork{background-image:none!important}',graphics:'.echo-party-lighting,.global-seasonal-snow{display:none!important}.home-archive-player.has-playing-artwork{background-image:none!important}*,*::before,*::after{animation:none!important;transition:none!important;filter:none!important;backdrop-filter:none!important;-webkit-backdrop-filter:none!important}'};
 if(rules[without]){const style=document.createElement('style');style.textContent=rules[without];document.head.append(style);}
 new PerformanceObserver(list=>{for(const item of list.getEntries()){slowTasks++;slowMs+=item.duration;}}).observe({type:'longtask',buffered:false});
 const frame=t=>{if(last){const gap=t-last;maxGap=Math.max(maxGap,gap);if(gap>50)gaps++;}frames++;last=t;requestAnimationFrame(frame);};requestAnimationFrame(frame);
 setInterval(()=>{const audio=document.querySelector('audio[data-track-id]');console.info('PLAYBACK_PROFILE '+JSON.stringify({renders:[...renders].map(([id,v])=>({id,ms:Math.round(v.ms),n:v.n})),without:without||'none',playing:audio?!audio.paused:false,time:audio?.currentTime,heapMiB:performance.memory?Math.round(performance.memory.usedJSHeapSize/1048576):null,commits,renderMs:Math.round(renderMs),slowTasks,slowMs:Math.round(slowMs),frames,gaps,maxGap:Math.round(maxGap),nodes:document.querySelectorAll('*').length,controllerNodes:document.querySelector('.ddj-host')?.querySelectorAll('*').length||0,callbacks:[...costs].sort((a,b)=>b[1].ms-a[1].ms).slice(0,10).map(([key,v])=>({key,ms:Math.round(v.ms),n:v.n}))}));commits=renderMs=slowTasks=slowMs=frames=gaps=maxGap=0;costs.clear();renders.clear();},5000);
}
