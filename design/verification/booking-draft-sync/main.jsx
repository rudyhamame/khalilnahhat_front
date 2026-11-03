import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {createVoiceDraftTools} from '/src/lib/voiceDraftTools.js';
import HomeAvailability from '/src/echo/HomeAvailability.jsx';
import {EventOrderContext} from '/src/echo/eventOrderContext.js';
import {createEventOrder,updateOrderField} from '/src/lib/eventOrderCore.mjs';
import '/src/echo/echo.css';
import '/src/echo/viewportFit.css';
// Isolated synthetic draft: never authenticates or writes to an account.
window.fetch=async input=>{
 const url=new URL(String(input),location.origin);
 if(url.pathname.endsWith('/availability'))return Response.json({year:Number(url.searchParams.get('year')),timezone:'America/Toronto',days:{}});
 if(url.pathname.endsWith('/setup-catalog'))return Response.json({items:[{id:'wedding',kind:'event',name:'Wedding',bookingType:'wedding',isActive:true}]});
 if(url.pathname.endsWith('/equipment'))return Response.json({items:[]});
 return Response.json({message:'Fixture does not make external requests'},{status:503});
};
function Fixture(){
 const [order,setOrder]=useState(createEventOrder());
 const update=(path,value)=>setOrder(previous=>updateOrderField(previous,path,value));
 const applyVoice=()=>{const tools=createVoiceDraftTools({execute:async item=>{for(const change of JSON.parse(item.arguments).updates)update(change.path,change.value);return {draftUpdated:true};},send:()=>{}});tools.begin();tools.run({name:'update_event_draft',call_id:'synthetic-voice',arguments:JSON.stringify({updates:[{path:'event.date',value:'2026-11-14'},{path:'event.type',value:'wedding'}]})});};
 const apply=()=>{for(const [path,value]of Object.entries({'event.date':'2027-11-14','event.startTime':'18:00','event.endTime':'01:00','event.type':'wedding','event.guestCount':200,'event.venue.name':'Draft venue','event.venue.address':'123 Example Street','event.venue.city':'Toronto'}))update(path,value);};
 return <EventOrderContext.Provider value={{order,signedIn:true,token:null,setField:update}}><div style={{position:'relative',zIndex:5,padding:12,display:'flex',gap:12,background:'#fff',color:'#000'}}><button onClick={apply}>Apply AI draft changes</button><button onClick={applyVoice}>Apply completed voice arguments</button><button onClick={()=>{update('event.startTime',null);update('event.endTime',null);}}>Clear draft times</button><button onClick={()=>{update('event.date',null);update('event.startTime',null);update('event.endTime',null);}}>Clear draft date</button><span>Synthetic booking regression</span></div><div className="echo" data-page="home" data-theme="dark"><main id="echo-main"><HomeAvailability lang={{lang:'en'}}/></main></div></EventOrderContext.Provider>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
