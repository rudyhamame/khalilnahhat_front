import React,{useEffect,useState} from 'react';
import {Bot,MousePointer2,X} from 'lucide-react';
import {administratorActivityType,administratorDestination,isAdministratorViewer} from './administratorActivity';
import './administratorWorkView.css';
const readable=value=>String(value||'Waiting').replaceAll('_',' ').toLowerCase();
export default function AdministratorWorkView(){
 const [enabled,setEnabled]=useState(isAdministratorViewer),[activity,setActivity]=useState(null),[point,setPoint]=useState(null);
 useEffect(()=>{
  if(!enabled)return;
  sessionStorage.setItem('echo-admin-work-view','1');
  document.documentElement.dataset.echoWorkView='true';
  const receive=event=>{
   if(event.origin!==window.location.origin||event.source!==window.opener||event.data?.type!==administratorActivityType)return;
   const next=event.data.payload;if(next===null){setActivity(null);setPoint(null);return;}if(!next||typeof next.id!=='string'||!Array.isArray(next.actions))return;
   setActivity(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
  };
  window.addEventListener('message',receive);
  return()=>{window.removeEventListener('message',receive);delete document.documentElement.dataset.echoWorkView;};
 },[enabled]);
 const action=activity?.actions?.at(-1),destination=administratorDestination(action?.name);
 useEffect(()=>{
  if(!enabled||!activity)return;
  if(destination){
   const current=window.location.pathname+window.location.search;
   if(current!==destination.url){window.history.pushState({},'',destination.url);window.dispatchEvent(new PopStateEvent('popstate'));}
  }
  // Reload only this dedicated view after a verified mutation, so cards show persisted data.
  const lastWrite=activity.actions.filter(item=>item.state==='VERIFIED'&&/_(save|update|create|note)$/.test(item.name)).at(-1);
  if(lastWrite&&['COMPLETED','FAILED','CANCELLED'].includes(activity.state)){
   const key='echo-admin-view-refreshed:'+activity.id;
   if(sessionStorage.getItem(key)!==lastWrite.id){sessionStorage.setItem(key,lastWrite.id);window.location.reload();}
  }
 },[enabled,activity,destination?.url]);
 useEffect(()=>{
  if(!enabled||!destination){setPoint(null);return;}
  let target;
  const locate=()=>{
   target?.classList.remove('echo-work-target');
   const links=[...document.querySelectorAll('.aw-tools a[href]')];
   const link=links.find(item=>item.pathname+item.search===destination.url);
   const headings=[...document.querySelectorAll('#admin-workspace-main h1, #admin-workspace-main h2')];
   target=headings.find(item=>item.textContent.trim().toLowerCase()===destination.label.toLowerCase())||document.querySelector('#admin-workspace-main h1')||link||document.querySelector('#admin-workspace-main .aw-breadcrumb');
   if(!target)return;
   target.classList.add('echo-work-target');const rect=target.getBoundingClientRect();
   setPoint({x:Math.min(Math.max(rect.left+Math.min(rect.width/2,90),16),window.innerWidth-180),y:Math.min(Math.max(rect.bottom+5,90),window.innerHeight-80)});
  };
  locate();const timer=setInterval(locate,1000);window.addEventListener('resize',locate);window.addEventListener('scroll',locate,true);
  return()=>{clearInterval(timer);window.removeEventListener('resize',locate);window.removeEventListener('scroll',locate,true);target?.classList.remove('echo-work-target');};
 },[enabled,action?.id,action?.state,destination?.url]);
 if(!enabled)return null;
 return <><aside className="echo-work-status" aria-label="Echo live activity"><Bot size={20}/><div><strong>Echo · Live work view</strong><span role="status">{destination?.label||(action?'No matching workspace view':'Administrator')} · {action?`${readable(action.name)} · ${readable(action.state)}`:activity?readable(activity.state):'Waiting for your request…'}</span><small>Live API activity · pointer marks the working section. Approvals stay in your chat.</small></div><button type="button" aria-label="Stop following activity" onClick={()=>{sessionStorage.removeItem('echo-admin-work-view');setEnabled(false);setPoint(null);const url=new URL(window.location.href);url.searchParams.delete('echoWorkView');window.history.replaceState({},'',url.pathname+url.search);}}> <X size={17}/></button></aside>{point&&<div className="echo-work-pointer" style={{transform:`translate(${point.x}px, ${point.y}px)`}} aria-hidden="true"><MousePointer2 size={25} fill="currentColor"/><span>Echo · {readable(action?.state)}</span></div>}</>;
}
