import {apiBaseUrl} from '../lib/api';

export function connectProjectChatSocket({token,onChange,onError,Socket=globalThis.WebSocket,baseUrl=apiBaseUrl}) {
 let socket,timer,closed=false,attempt=0;
 const connect=()=>{
  if(closed)return;
  if(!Socket){onError?.('This browser does not support live chat connections.');return;}
  const url=new URL(`${baseUrl}/echo-project-chat/socket`,window.location.href);
  url.protocol=url.protocol==='https:'?'wss:':'ws:';
  socket=new Socket(url.href);
  socket.onopen=()=>socket.send(JSON.stringify({type:'authenticate',token}));
  socket.onmessage=event=>{
   if(closed)return;
   try{const message=JSON.parse(event.data);if(message.type==='ready'){attempt=0;onChange({reason:'connected'});}else if(message.type==='changed')onChange(message);}catch{/* Ignore malformed envelopes. */}
  };
  socket.onerror=()=>{}; // close handles reconnects without issuing history polls.
  socket.onclose=event=>{
   if(closed)return;
   if(event.code===4401){onError?.('Your chat session has expired. Sign in again.');return;}
   onError?.('Chat disconnected. Reconnecting…');
   timer=setTimeout(connect,Math.min(15000,500*2**attempt++));
  };
 };
 connect();
 return()=>{closed=true;clearTimeout(timer);if(socket){socket.onopen=socket.onmessage=socket.onclose=null;socket.close();}};
}
