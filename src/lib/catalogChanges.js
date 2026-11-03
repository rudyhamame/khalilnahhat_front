export function notifyCatalogChanged(){
 try{localStorage.setItem('echo:catalog-revision',`${Date.now()}:${Math.random()}`);}catch{/* Same-tab refresh works when storage is unavailable. */}
 window.dispatchEvent(new Event('echo:setup-catalog-changed'));
}
