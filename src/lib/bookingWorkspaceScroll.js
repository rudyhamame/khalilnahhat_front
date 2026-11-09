// Only overflowing content owns a gesture in the booking viewport. The former
// fixed aside must not claim the entire chapter, including its empty space.
export function bookingWorkspaceCanScroll(target,direction,{view=window}={}){
 const workspace=target?.closest?.('#echo-ai');
 if(!workspace)return null;
 for(let node=target;node&&node!==workspace;node=node.parentElement){
  const style=view.getComputedStyle(node);
  if(!/auto|scroll/.test(style.overflowY)||node.scrollHeight<=node.clientHeight+2)continue;
  if(direction<0?node.scrollTop>1:node.scrollTop+node.clientHeight<node.scrollHeight-1)return true;
 }
 return false;
}
