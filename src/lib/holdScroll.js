// Keeps a scroll container where the user left it. Anything that moves it without a wheel, touch, key or drag in the last half second
// (a layout change elsewhere on the page shrinking and regrowing the content, a re-render) is undone, so the column never "kicks up" by itself.
export function holdScroll(element,{quiet=500}={}){
 if(!element)return()=>{};
 let wanted=element.scrollTop,lastInput=0,restoring=false;
 const touch=()=>{lastInput=performance.now();};
 const onScroll=()=>{
  if(restoring){restoring=false;return;}
  if(performance.now()-lastInput<quiet){wanted=element.scrollTop;return;}
  // Not caused by the user: put it back (if the content is long enough to hold that position).
  if(Math.abs(element.scrollTop-wanted)>2){restoring=true;element.scrollTop=wanted;}
 };
 const inputs=['wheel','touchstart','touchmove','pointerdown','keydown'];
 inputs.forEach(name=>element.addEventListener(name,touch,{passive:true}));
 element.addEventListener('scroll',onScroll,{passive:true});
 // Content that grows back after a momentary shrink is brought back to the remembered position too.
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(()=>{if(performance.now()-lastInput>=quiet&&Math.abs(element.scrollTop-wanted)>2&&element.scrollHeight>=wanted+element.clientHeight){restoring=true;element.scrollTop=wanted;}}):null;
 observer?.observe(element);for(const child of element.children)observer?.observe(child);
 return()=>{inputs.forEach(name=>element.removeEventListener(name,touch));element.removeEventListener('scroll',onScroll);observer?.disconnect();};
}
