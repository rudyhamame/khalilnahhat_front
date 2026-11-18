// Add ?debug=layout to the address to see, live on screen, what resizes in the recording editor and what writes the inline styles that move things.
const PARTS='.ri-audio,.recording-info,.recording-basics,.recording-basics-main,.recording-detail-player,.transcription-audio-tape,.audio-tape-lanes,.stem-lanes,.recording-level-footer,.ontology-page-bar,.ontology-editor-body';
export function debugLayout(){
 if(typeof window==='undefined'||new URLSearchParams(window.location.search).get('debug')!=='layout'||window.__layoutDebug)return;
 window.__layoutDebug=true;
 const box=document.createElement('pre');
 box.style.cssText='position:fixed;left:8px;bottom:8px;z-index:99999;max-width:640px;max-height:46vh;margin:0;padding:8px 10px;overflow:auto;border-radius:8px;background:#000d;color:#9f9;font:11px/1.35 ui-monospace,monospace;white-space:pre-wrap;pointer-events:none';
 document.body.append(box);
 const lines=[],start=performance.now(),name=node=>node.nodeType===1?String(node.className||node.tagName).split(' ').slice(0,2).join('.'):'#text';
 const add=text=>{lines.unshift(`${((performance.now()-start)/1000).toFixed(2)}s ${text}`);if(lines.length>40)lines.length=40;box.textContent=lines.join('\n');};
 const sizes=new WeakMap();
 const ro=new ResizeObserver(entries=>{for(const entry of entries){const next=`${Math.round(entry.contentRect.width)}x${Math.round(entry.contentRect.height)}`,previous=sizes.get(entry.target);sizes.set(entry.target,next);if(previous&&previous!==next)add(`SIZE  ${name(entry.target)}  ${previous} -> ${next}`);}});
 const mo=new MutationObserver(records=>{for(const record of records){
  if(record.type==='attributes')add(`STYLE ${name(record.target)}  ${(record.oldValue||'').slice(0,70)}  ->  ${(record.target.getAttribute(record.attributeName)||'').slice(0,70)}`);
  else if(record.target.closest?.('.ri-audio')||record.target.closest?.('.recording-info'))add(`DOM   ${name(record.target)}  +${record.addedNodes.length} -${record.removedNodes.length}`);
 }});
 const attach=()=>{document.querySelectorAll(PARTS).forEach(node=>{if(!sizes.has(node)){ro.observe(node);sizes.set(node,'');mo.observe(node,{attributes:true,attributeFilter:['style','class'],attributeOldValue:true});}});};
 attach();new MutationObserver(attach).observe(document.body,{childList:true,subtree:true});
 mo.observe(document.body,{childList:true,subtree:true});
 window.__layoutLog=add;
 add('layout debug on');
}
