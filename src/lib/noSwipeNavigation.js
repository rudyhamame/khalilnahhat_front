// Stops the browser's two-finger sideways swipe from going back/forward in history.
// A sideways wheel gesture is let through only when something under the pointer can still scroll that way.
const canScrollSideways=(node,delta)=>{
 const style=getComputedStyle(node);
 if(!/(auto|scroll)/.test(style.overflowX)||node.scrollWidth<=node.clientWidth)return false;
 return delta>0?node.scrollLeft+node.clientWidth<node.scrollWidth-1:node.scrollLeft>0;
};
export function disableSwipeNavigation(){
 if(typeof window==='undefined')return;
 window.addEventListener('wheel',event=>{
  if(Math.abs(event.deltaX)<=Math.abs(event.deltaY)||event.ctrlKey)return;
  for(let node=event.target;node instanceof Element;node=node.parentElement)if(canScrollSideways(node,event.deltaX))return;
  event.preventDefault();
 },{passive:false});
}
