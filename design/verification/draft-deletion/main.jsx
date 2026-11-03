import React from 'react';
import {createRoot} from 'react-dom/client';
import {EventOrderProvider} from '/src/echo/EventOrderProvider.jsx';
import {useEventOrder} from '/src/echo/eventOrderContext.js';
import {createEventOrder,voiceGreetingInstructions} from '/src/lib/eventOrderCore.mjs';
const old=createEventOrder();Object.assign(old.event,{type:'birthday',date:'2026-11-12',startTime:'18:00',endTime:'02:30',guestCount:100});Object.assign(old.event.venue,{name:'Example Restaurant',city:'Toronto'});
const user={id:'synthetic-delete-regression',firstName:'Test',email:'test@example.invalid'},lang={lang:'en',t:{}};
let saved={draftId:'7e621c1c-1bc9-4adb-8ed6-65b4b9e4d557',version:1,order:old};
if(!new URLSearchParams(location.search).has('viewer')){localStorage.setItem('synthetic-draft-delete-server',JSON.stringify(saved));localStorage.setItem('echo-event-order:v1:'+user.id,JSON.stringify(old));}
window.fetch=async(input,options={})=>{
 const url=new URL(String(input),location.origin);
 if(url.pathname.endsWith('/event-draft')){
  saved=JSON.parse(localStorage.getItem('synthetic-draft-delete-server')||'null');
  if(options.method==='PUT'){saved.version=2;localStorage.setItem('synthetic-draft-delete-server',JSON.stringify(saved));return Response.json({message:'Draft changed elsewhere'},{status:409});}
  if(options.method==='DELETE'){if(Number(url.searchParams.get('version'))!==saved.version)return Response.json({message:'stale'},{status:409});saved=null;localStorage.setItem('synthetic-draft-delete-server','null');return Response.json({removed:true});}
  return Response.json({item:saved});
 }
 if(url.pathname.endsWith('/setup-catalog')||url.pathname.endsWith('/equipment'))return Response.json({items:[]});
 if(url.pathname.endsWith('/ai-booking/status'))return Response.json({configured:false,voiceConfigured:false});
 return Response.json({message:'Synthetic fixture blocks external requests'},{status:404});
};
function Controls(){const ctx=useEventOrder();return <main style={{padding:32,fontFamily:'sans-serif'}}><h1>Synthetic draft deletion</h1><button disabled={!ctx.cloudReady} onClick={()=>ctx.save()}>Cause save conflict</button> <button disabled={!ctx.cloudReady||ctx.clearing} onClick={()=>ctx.clear()}>Delete synthetic draft</button><p role="status">State: {ctx.saveState}</p><pre id="draft-values">{JSON.stringify({date:ctx.order.event.date,guests:ctx.order.event.guestCount,venue:ctx.order.event.venue.name,equipment:ctx.order.equipment,draftId:ctx.draftId},null,2)}</pre><p id="greeting">{voiceGreetingInstructions(ctx.order)}</p></main>;}
createRoot(document.getElementById('root')).render(<EventOrderProvider user={user} token="synthetic" lang={lang} isSessionReady><Controls/></EventOrderProvider>);
