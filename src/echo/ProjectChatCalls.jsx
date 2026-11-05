import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { LoaderCircle, Mic, MicOff, Phone, PhoneIncoming, PhoneOff, Volume2, X } from 'lucide-react';
import { apiBaseUrl, apiRequest } from '../lib/api';
import { speechCapture, speechPublish } from './projectChatAudioSettings';

const root='/echo-project-chat/calls';
const elapsed = seconds => `${Math.floor(seconds/60)}:${String(seconds%60).padStart(2,'0')}`;
export default function ProjectChatCalls({userId,token,onlineAdmins,buttonTarget,soundEnabled,recording,onActiveChange}) {
  const [call,setCall]=useState(null),[choosing,setChoosing]=useState(false),[busy,setBusy]=useState(false);
  const [ready,setReady]=useState(false),[phase,setPhase]=useState('idle'),[error,setError]=useState('');
  const [muted,setMuted]=useState(false),[needsAudio,setNeedsAudio]=useState(false),[seconds,setSeconds]=useState(0);
  const clientId=useRef(crypto.randomUUID()),callRef=useRef(null),roomRef=useRef(null),audioMount=useRef(null);
  const alive=useRef(false),version=useRef(0),action=useRef(false),connection=useRef(0),lastContact=useRef(Date.now());
  const ending=useRef('');
  const ringtone=useRef(null),sound=useRef(soundEnabled); sound.current=soundEnabled;
  const owned = useCallback(value => value && (value.callerId===userId?value.callerClient:value.calleeClient)===clientId.current,[userId]);
  const apply=useCallback(value=>{callRef.current=value;setCall(value);},[]);
  const disconnect=useCallback(()=>{
    connection.current++;
    const room=roomRef.current;roomRef.current=null;
    if(room) { room.removeAllListeners(); room.disconnect().catch(()=>{}); }
    audioMount.current?.replaceChildren();
    setPhase('idle');setMuted(false);setNeedsAudio(false);
  },[]);
  const endRequest=useCallback(id=>apiRequest(`${root}/${id}/end`,{method:'POST',token}),[token]);
  useEffect(()=>{
    alive.current=true;
    const unlock=()=>{
      const Audio=window.AudioContext||window.webkitAudioContext;
      if(!Audio)return;
      try{ringtone.current ||= new Audio();if(ringtone.current.state==='suspended')ringtone.current.resume().catch(()=>{});}catch{/* Optional incoming-call sound. */}
    };
    window.addEventListener('pointerdown',unlock);window.addEventListener('keydown',unlock);
    const leave=()=>{
      const value=callRef.current;
      const id=ending.current||(owned(value)?value.id:'');
      if(id)fetch(`${apiBaseUrl}${root}/${id}/end`,{method:'POST',keepalive:true,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:'{}'}).catch(()=>{});
    };
    window.addEventListener('pagehide',leave);
    return()=>{
      alive.current=false;version.current++;leave();
      connection.current++;const room=roomRef.current;roomRef.current=null;room?.removeAllListeners();room?.disconnect().catch(()=>{});
      window.removeEventListener('pagehide',leave);window.removeEventListener('pointerdown',unlock);window.removeEventListener('keydown',unlock);
      ringtone.current?.close().catch(()=>{});ringtone.current=null;
    };
  },[token,owned]);
  useEffect(()=>{
    let stopped=false,pending=false;
    const poll=async()=>{
      if(pending||action.current||(!callRef.current&&document.hidden))return;
      pending=true;const epoch=version.current;
      try{
        if(ending.current){const id=ending.current;const result=await endRequest(id);if(result.ended===true&&ending.current===id)ending.current='';else return;}
        const result=await apiRequest(`${root}?clientId=${clientId.current}`,{token});
        if(stopped||epoch!==version.current)return;
        lastContact.current=Date.now();setReady(result.ready);apply(result.call);
        if(!result.call&&roomRef.current)disconnect();
      }catch(cause){
        if(!stopped&&epoch===version.current){
          if(callRef.current&&Date.now()-lastContact.current>30000){disconnect();apply(null);setError('Call disconnected because the server could not be reached.');}
          else if(callRef.current)setError('Reconnecting to call status…');
          if(cause.status===401||cause.status===403){disconnect();apply(null);}
        }
      }finally{pending=false;}
    };
    poll();const interval=setInterval(poll,3000);
    const visible=()=>{if(!document.hidden)poll();};document.addEventListener('visibilitychange',visible);
    return()=>{stopped=true;clearInterval(interval);document.removeEventListener('visibilitychange',visible);};
  },[token,apply,disconnect,endRequest]);
  useEffect(()=>{onActiveChange?.(Boolean(call&&owned(call)));return()=>onActiveChange?.(false);},[call?.id,call?.state,owned,onActiveChange]);
  const incoming=call?.state==='ringing'&&call.calleeId===userId;
  useEffect(()=>{
    if(!incoming)return;
    const ring=()=>{
      const context=ringtone.current;if(!sound.current||!context||context.state!=='running')return;
      [0,.22].forEach(offset=>{
        const oscillator=context.createOscillator(),gain=context.createGain(),start=context.currentTime+offset;
        oscillator.frequency.value=740;gain.gain.setValueAtTime(0,start);gain.gain.linearRampToValueAtTime(.045,start+.02);gain.gain.exponentialRampToValueAtTime(.001,start+.17);
        oscillator.connect(gain);gain.connect(context.destination);oscillator.start(start);oscillator.stop(start+.18);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
      });
    };
    ring();const timer=setInterval(ring,4000);return()=>clearInterval(timer);
  },[incoming,call?.id]);
  useEffect(()=>{
    if(call?.state!=='active'||!owned(call))return;
    const epoch=++connection.current;let currentRoom;
    const valid=()=>alive.current&&epoch===connection.current;
    setPhase('connecting');setError('');
    (async()=>{
      try{
        const [{Room,RoomEvent,Track},access]=await Promise.all([import('livekit-client'),apiRequest(`${root}/${call.id}/join`,{method:'POST',body:{clientId:clientId.current},token})]);
        if(!valid())return;
        const room=new Room({audioCaptureDefaults:speechCapture,publishDefaults:speechPublish});currentRoom=room;roomRef.current=room;
        room.on(RoomEvent.TrackSubscribed,track=>{
          if(!valid()||track.kind!==Track.Kind.Audio)return;
          const element=track.attach();element.autoplay=true;audioMount.current?.append(element);
          element.play().catch(()=>{if(valid())setNeedsAudio(true);});
        });
        room.on(RoomEvent.TrackUnsubscribed,track=>{track.detach().forEach(element=>element.remove());});
        room.on(RoomEvent.AudioPlaybackStatusChanged,()=>{if(valid())setNeedsAudio(!room.canPlaybackAudio);});
        room.on(RoomEvent.Reconnecting,()=>{if(valid())setPhase('reconnecting');});
        room.on(RoomEvent.Reconnected,()=>{if(valid())setPhase('connected');});
        room.on(RoomEvent.ParticipantConnected,()=>{if(valid())setPhase('connected');});
        room.on(RoomEvent.ParticipantDisconnected,()=>{if(valid())setPhase('waiting');});
        room.on(RoomEvent.Disconnected,()=>{
          if(!valid())return;
          disconnect();apply(null);setError('Voice call disconnected.');endRequest(call.id).catch(()=>{});
        });
        await room.connect(access.url,access.token);
        if(!valid()){await room.disconnect();return;}
        await room.startAudio().catch(()=>{if(valid())setNeedsAudio(true);});
        await room.localParticipant.setMicrophoneEnabled(true,speechCapture,speechPublish);
        if(!valid()){await room.disconnect();return;}
        setPhase(room.remoteParticipants.size?'connected':'waiting');
      }catch(cause){
        if(valid()){disconnect();apply(null);setError(cause.message||'Microphone access or voice connection failed.');endRequest(call.id).catch(()=>{});}
      }
    })();
    return()=>{
      if(connection.current===epoch)connection.current++;
      if(currentRoom){currentRoom.removeAllListeners();currentRoom.disconnect().catch(()=>{});if(roomRef.current===currentRoom)roomRef.current=null;}
      audioMount.current?.replaceChildren();
    };
  },[call?.id,call?.state,owned,token,disconnect,apply,endRequest]);
  useEffect(()=>{
    if(call?.state!=='active'){setSeconds(0);return;}
    const tick=()=>setSeconds(Math.max(0,Math.floor((Date.now()-new Date(call.acceptedAt).getTime())/1000)));
    tick();const timer=setInterval(tick,1000);return()=>clearInterval(timer);
  },[call?.state,call?.acceptedAt]);
  const run=async(fn)=>{
    if(action.current)return;action.current=true;version.current++;setBusy(true);setError('');
    try{await fn();}catch(cause){if(alive.current)setError(cause.message||'Could not update this call.');}
    finally{action.current=false;if(alive.current)setBusy(false);}
  };
  const start=other=>run(async()=>{
    if(ending.current)throw Error('The previous call is still ending. Please wait.');
    if(recording)throw Error('Stop recording your voice note before starting a call.');
    const result=await apiRequest(root,{method:'POST',body:{calleeId:other.id,clientId:clientId.current},token});
    if(!alive.current){endRequest(result.call.id).catch(()=>{});return;}
    apply(result.call);setChoosing(false);lastContact.current=Date.now();
  });
  const accept=()=>run(async()=>{
    if(recording)throw Error('Stop recording your voice note before answering.');
    const result=await apiRequest(`${root}/${call.id}/accept`,{method:'POST',body:{clientId:clientId.current},token});
    if(!alive.current){endRequest(result.call.id).catch(()=>{});return;}
    apply(result.call);lastContact.current=Date.now();
  });
  const end=()=>run(async()=>{
    const id=call.id;ending.current=id;disconnect();apply(null);
    const result=await endRequest(id);
    if(result.ended===true&&ending.current===id)ending.current='';
  });
  const toggleMute=()=>run(async()=>{
    const room=roomRef.current;if(!room)return;
    await room.localParticipant.setMicrophoneEnabled(muted,speechCapture,speechPublish);
    if(alive.current)setMuted(!muted);
  });
  const peers=onlineAdmins.filter(admin=>admin.id!==userId);
  const otherName=call?(call.callerId===userId?call.calleeName:call.callerName):'';
  const otherTab=call&&!incoming&&!owned(call);
  return <>
    <div ref={audioMount} className="epc-call-audio" aria-hidden="true"/>
    {buttonTarget&&createPortal(<button type="button" className={`epc-call-launch${call?' has-call':''}`} title="Voice call an administrator" aria-label="Voice call an administrator" onClick={()=>{setChoosing(value=>!value);setError('');}}><Phone size={17}/></button>,buttonTarget)}
    {(call||choosing||error)&&createPortal(<section className="epc-call-panel" aria-label="Admin voice call">
      <header><span className={`epc-call-symbol${incoming?' is-ringing':''}`}>{incoming?<PhoneIncoming size={20}/>:<Phone size={20}/>}</span><div><strong>{incoming?'Incoming voice call':call?'Voice call':'Start a voice call'}</strong><small>{call?otherName:'Private · Audio only'}</small></div>{!call&&<button type="button" className="epc-call-dismiss" aria-label="Close voice call panel" onClick={()=>{setChoosing(false);setError('');}}><X size={17}/></button>}</header>
      {call?<>
        <p className="epc-call-state" role="status">{incoming?'Would you like to answer?':otherTab?'Call active in another tab':call.state==='ringing'?'Calling…':phase==='connecting'?'Connecting microphone…':phase==='reconnecting'?'Reconnecting…':phase==='waiting'?'Waiting for the other administrator…':`${muted?'Microphone muted':'Connected'} · ${elapsed(seconds)}`}</p>
        <div className="epc-call-actions">{incoming?<button type="button" className="epc-call-answer" disabled={busy||recording} onClick={accept}><Phone size={16}/>Answer</button>:call.state==='active'&&!otherTab&&<button type="button" disabled={busy||!roomRef.current||phase==='connecting'} aria-pressed={muted} onClick={toggleMute}>{muted?<MicOff size={16}/>:<Mic size={16}/>} {muted?'Unmute':'Mute'}</button>}<button type="button" className="epc-call-end" disabled={busy} onClick={end}><PhoneOff size={16}/>{incoming?'Decline':call.state==='ringing'?'Cancel':'End call'}</button></div>
        {needsAudio&&<button type="button" className="epc-call-enable-audio" onClick={()=>roomRef.current?.startAudio().then(()=>setNeedsAudio(false)).catch(()=>setError('Tap again to enable call audio.'))}><Volume2 size={15}/>Enable call audio</button>}
      </>:choosing&&(!ready?<p className="epc-call-state">Voice calling requires LiveKit configuration on the API server.</p>:peers.length?<ul className="epc-call-people">{peers.map(admin=><li key={admin.id}><span><i/>{admin.name}</span><button type="button" disabled={busy||recording} onClick={()=>start(admin)} aria-label={`Call ${admin.name}`}>{busy?<LoaderCircle size={15}/>:<Phone size={15}/>}Call</button></li>)}</ul>:<p className="epc-call-state">No other administrators are online right now.</p>)}
      {recording&&<p className="epc-call-state">Stop your voice recording before joining a call.</p>}
      {error&&<p className="epc-call-error" role="alert">{error}</p>}
    </section>,document.body)}
  </>;
}
