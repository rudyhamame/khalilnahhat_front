// Text fields follow the language typed in them: Arabic (or Hebrew, etc.) makes the field right-to-left, Latin text left-to-right.
// dir="auto" does that per field, so it is set once on every free-text input and textarea (never on numbers, dates, emails, links or passwords).
const FREE_TEXT='input:not([type]),input[type=text],input[type=search],textarea';
export function autoDirection(root=document){
 const mark=target=>{const field=target?.closest?.(FREE_TEXT);if(field&&!field.hasAttribute('dir'))field.setAttribute('dir','auto');};
 // Fields already on the page, then any that appear later (React renders them on demand).
 root.querySelectorAll?.(FREE_TEXT).forEach(mark);
 const observer=new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes){if(node.nodeType!==1)continue;mark(node);node.querySelectorAll?.(FREE_TEXT).forEach(mark);}});
 observer.observe(root.documentElement||root,{childList:true,subtree:true});
 return()=>observer.disconnect();
}
