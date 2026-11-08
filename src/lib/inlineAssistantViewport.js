// Pan the document without changing the active vertical chapter or page width.
export function revealInlineAssistant(view=window){
 const panel=view.document.getElementById('event-order-panel');
 if(!panel||panel.hidden)return false;
 const {left}=panel.getBoundingClientRect();
 view.scrollBy({left,top:0,behavior:view.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
 return true;
}
export function assistantAvailableBelowIntro(hero){
 return !hero||hero.getBoundingClientRect().bottom<=1;
}
