import {apiRequest,apiBaseUrl} from './api';
// Same transports as the Echo voice assistant: OpenAI WebRTC or Alibaba PCM websocket.
const PCM_WORKLET=`class P extends AudioWorkletProcessor{constructor(){super();this.b=new Int16Array(1600);this.n=0;}process(inputs){const x=inputs[0][0];if(!x)return true;for(let i=0;i<x.length;i++){const v=Math.max(-1,Math.min(1,x[i]));this.b[this.n++]=v<0?v*32768:v*32767;if(this.n===1600){this.port.postMessage(this.b.slice(0).buffer);this.n=0;}}return true;}}registerProcessor('pcm-capture',P);`;
const base64=bytes=>{let text='';for(let index=0;index<bytes.length;index+=0x8000)text+=String.fromCharCode(...bytes.subarray(index,index+0x8000));return btoa(text);};
const endpoint='/admin/ai-administrator/voice';
export function createAdminRealtimeTransport({token,provider,sessionId,onEvent,onReady,onError}){
 let closed=false,stream,peer,audio,context,mic,socket,channel,timer,openingTimer,listeningTimer,callId,ready=false,microphoneReady=false,openingDone=null,playHead=0;const playing=new Set(),controller=new AbortController();
 const send=event=>{if(!closed&&channel?.readyState==='open')channel.send(JSON.stringify(event));};
 const stopPlayback=()=>{for(const source of playing){try{source.stop();}catch{}}playing.clear();playHead=0;};
 const stop=()=>{if(closed)return;closed=true;controller.abort();clearTimeout(timer);clearTimeout(openingTimer);clearTimeout(listeningTimer);stream?.getTracks().forEach(track=>track.stop());if(channel){channel.onopen=channel.onmessage=channel.onerror=null;channel.close();}if(socket){socket.onmessage=socket.onclose=socket.onerror=null;socket.close();}if(peer){peer.ontrack=peer.onconnectionstatechange=null;peer.close();}if(audio){audio.pause();audio.srcObject=null;}mic?.disconnect();stopPlayback();context?.close().catch(()=>{});if(callId)apiRequest(endpoint+'/end',{token,method:'POST',body:{callId}}).catch(()=>{});};
 const fail=error=>{if(closed)return;stop();onError(error instanceof Error?error:Error('The realtime call ended. Reconnect or continue in chat.'));};
 const receive=event=>{if(closed)return;let data;try{data=JSON.parse(event.data);}catch{return;}if(data.type==='error'){fail(Error(data.error?.message||'The realtime provider encountered an error.'));return;}onEvent(data);};
 const opened=()=>{if(closed||ready)return;clearTimeout(openingTimer);ready=true;if(provider!=='alibaba')onReady(callId);else listeningTimer=setTimeout(()=>{if(!closed&&!microphoneReady)fail(Error('The voice greeting could not switch to microphone input. End the call and reconnect.'));},30000);send({type:'response.create',response:{instructions:'Greet the administrator briefly and ask what they would like to manage. Use the selected chat history as context only. Do not repeat earlier requests or call any tools for this greeting.'}});};
 const connect=async body=>{
  const data=await apiRequest(endpoint,{token,method:'POST',body:{sessionId,consent:true,...body},signal:controller.signal});callId=data.callId;
  if(closed){apiRequest(endpoint+'/end',{token,method:'POST',body:{callId}}).catch(()=>{});return null;}
  timer=setTimeout(()=>fail(Error('The call time limit was reached. Continue in chat or reconnect.')),Math.min(data.maxCallSeconds||300,900)*1000);return data;
 };
 const start=async()=>{
  openingTimer=setTimeout(()=>fail(Error('The voice service did not connect in time. End the call and try again.')),60000);
  try{
   if(!isSecureContext||!navigator.mediaDevices?.getUserMedia)throw Error('Realtime voice needs HTTPS and microphone access.');
   stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true},video:false});if(closed){stream.getTracks().forEach(track=>track.stop());return;}
   if(provider==='alibaba'){
    const AudioContext=window.AudioContext||window.webkitAudioContext;if(!AudioContext||!window.AudioWorkletNode)throw Error('This browser does not support realtime voice audio.');
    const data=await connect({});if(!data)return;
    context=new AudioContext({sampleRate:16000});await context.resume();
    const url=URL.createObjectURL(new Blob([PCM_WORKLET],{type:'text/javascript'}));try{await context.audioWorklet.addModule(url);}finally{URL.revokeObjectURL(url);}if(closed)return;
    mic=new AudioWorkletNode(context,'pcm-capture');context.createMediaStreamSource(stream).connect(mic);
    const socketUrl=new URL(apiBaseUrl+'/admin/ai-administrator/voice-ws',window.location.href);socketUrl.protocol=socketUrl.protocol==='https:'?'wss:':'ws:';socketUrl.searchParams.set('ticket',data.wsTicket);socket=new WebSocket(socketUrl);
    channel={get readyState(){return socket.readyState===1&&ready?'open':'connecting';},send:text=>{if(socket.readyState===1)socket.send(text);},close:()=>socket.close()};
    mic.port.onmessage=event=>{if(ready&&microphoneReady&&!closed&&socket.readyState===1)socket.send(JSON.stringify({type:'input_audio_buffer.append',audio:base64(new Uint8Array(event.data))}));};
    socket.onmessage=event=>{
     if(closed)return;let data;try{data=JSON.parse(event.data);}catch{return;}
     if(data.type==='bridge.ready'){opened();return;}
     if(data.type==='bridge.listening'){clearTimeout(listeningTimer);microphoneReady=true;if(openingDone){onEvent(openingDone);openingDone=null;}onReady(callId);return;}
     if(data.type==='response.done'&&!microphoneReady){openingDone=data;return;}
     if(data.type==='response.output_audio.delta'&&typeof data.delta==='string'){
      clearTimeout(openingTimer);const bytes=Uint8Array.from(atob(data.delta),char=>char.charCodeAt(0)),samples=new Int16Array(bytes.buffer,0,bytes.length>>1);const buffer=context.createBuffer(1,samples.length,24000),out=buffer.getChannelData(0);for(let index=0;index<samples.length;index++)out[index]=samples[index]/32768;
      const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);const at=Math.max(context.currentTime+.03,playHead);playHead=at+buffer.duration;playing.add(source);source.onended=()=>playing.delete(source);source.start(at);return;
     }
     if(data.type==='input_audio_buffer.speech_started')stopPlayback();receive(event);
    };
    socket.onclose=()=>fail(Error('The realtime voice connection ended. Reconnect to continue.'));socket.onerror=()=>fail(Error('Could not connect to the realtime voice server.'));
   }else{
    if(!window.RTCPeerConnection)throw Error('This browser does not support WebRTC voice calls.');peer=new RTCPeerConnection();audio=new Audio();audio.autoplay=true;
    peer.ontrack=event=>{if(closed)return;audio.srcObject=event.streams[0]||new MediaStream([event.track]);audio.play().catch(()=>fail(Error('Your browser blocked AI audio. Reconnect and allow audio playback.')));};
    stream.getTracks().forEach(track=>peer.addTrack(track,stream));channel=peer.createDataChannel('oai-events');channel.onopen=opened;channel.onmessage=receive;channel.onerror=()=>fail(Error('The realtime data connection failed.'));
    peer.onconnectionstatechange=()=>{if(['failed','disconnected','closed'].includes(peer.connectionState)&&!closed)fail(Error('The WebRTC call disconnected. Reconnect or continue in chat.'));};
    const offer=await peer.createOffer();await peer.setLocalDescription(offer);const data=await connect({sdp:offer.sdp});if(!data)return;await peer.setRemoteDescription({type:'answer',sdp:data.sdp});
   }
  }catch(error){if(!closed)fail(error.name==='NotAllowedError'?Error('Microphone permission was not granted. You can still type.'):error);}
 };
 return {start,stop,send,get callId(){return callId;}};
}
