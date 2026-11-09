// The language chooser is the entry screen. A browser dismissal or a tab
// restore must not leave it closed while the visitor has made no selection.
export function keepLanguageChooserOpen(dialog,Observer=MutationObserver){
 let active=true;
 const doc=dialog.ownerDocument,view=doc.defaultView;
 const show=()=>{if(active&&dialog.isConnected&&!dialog.open&&doc.visibilityState!=='hidden')dialog.showModal();};
 const cancel=event=>event.preventDefault();
 const observer=new Observer(show);
 observer.observe(dialog,{attributes:true,attributeFilter:['open']});
 dialog.addEventListener('close',show);dialog.addEventListener('cancel',cancel);
 doc.addEventListener('visibilitychange',show);view?.addEventListener('pageshow',show);
 show();
 return()=>{
  active=false;observer.disconnect();
  dialog.removeEventListener('close',show);dialog.removeEventListener('cancel',cancel);
  doc.removeEventListener('visibilitychange',show);view?.removeEventListener('pageshow',show);
  if(dialog.open)dialog.close();
 };
}
