// Keep gestures inside reachable chapter/panel content, and stop them at the
// document boundary so the next viewport cannot drift partially into view.
export function canScrollWithinViewport(target,delta,axis='y'){
 const doc=target?.ownerDocument;
 if(!doc||!delta)return false;
 for(let node=target;node&&node!==doc.body&&node!==doc.documentElement;node=node.parentElement){
  const style=getComputedStyle(node),vertical=axis==='y';
  if(!/auto|scroll/.test(vertical?style.overflowY:style.overflowX))continue;
  const size=vertical?node.clientHeight:node.clientWidth,total=vertical?node.scrollHeight:node.scrollWidth;
  const rtl=!vertical&&style.direction==='rtl';
  const position=vertical?node.scrollTop:rtl?-node.scrollLeft:node.scrollLeft,direction=rtl?-delta:delta;
  if(total>size+2&&(direction<0?position>1:position+size<total-1))return true;
 }
 return false;
}
