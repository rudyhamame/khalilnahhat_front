import {useEffect} from 'react';
// Migrate tabs left open by the former live-work view back to the normal workspace.
export default function AdministratorWorkView(){
 useEffect(()=>{
  sessionStorage.removeItem('echo-admin-work-view');
  const url=new URL(window.location.href);
  if(url.searchParams.has('echoWorkView')){url.searchParams.delete('echoWorkView');window.history.replaceState({},'',url.pathname+url.search+url.hash);window.dispatchEvent(new PopStateEvent('popstate'));}
 },[]);
 return null;
}
