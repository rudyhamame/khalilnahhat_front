// Turns off the browser's suggestion list on every text-like field, including ones React adds later.
// Password fields and fields that name their own autocomplete purpose (login, address pickers) are left alone.
const SKIP=new Set(['password','hidden','checkbox','radio','file','range','color','submit','button']);
const mark=node=>{
  if(!(node instanceof Element))return;
  for(const field of node.matches('input,textarea')?[node,...node.querySelectorAll('input,textarea')]:node.querySelectorAll('input,textarea')){
    if(field.hasAttribute('autocomplete')||SKIP.has(field.type))continue;
    field.setAttribute('autocomplete','off');
  }
};
export function installNoAutofill(){
  mark(document.body);
  new MutationObserver(records=>records.forEach(record=>record.addedNodes.forEach(mark))).observe(document.body,{childList:true,subtree:true});
}
