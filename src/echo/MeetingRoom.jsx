import {useCallback,useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {Mic,MicOff,MessageCircle,Phone,PhoneOff,Send,Video,VideoOff,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import './meetingRoom.css';

// Online meeting between the client and Khalil: chat, voice call and video call (WebRTC, signalled through the server).
export default function MeetingRoom({meetingId,token,ar=false,onClose}){
  const tr=(en,arabic)=>ar?arabic:en;
  const base=`/meetings/${meetingId}/room`;
  const [info,setInfo]=useState(null),[error,setError]=useState(''),[peerOnline,setPeerOnline]=useState(false);
  const [messages,setMessages]=useState([]),[text,setText]=useState('');
  const [call,setCall]=useState({state:'idle',kind:'voice'}),[incoming,setIncoming]=useState(null),[notice,setNotice]=useState('');
  const [muted,setMuted]=useState(false),[cameraOff,setCameraOff]=useState(false);
  const pc=useRef(null),local=useRef(null),pendingCandidates=useRef([]),cursors=useRef({signal:0,message:0});
  const remoteVideo=useRef(null),localVideo=useRef(null),log=useRef(null),infoRef=useRef(null),incomingRef=useRef(null),callRef=useRef(call);
  callRef.current=call;incomingRef.current=incoming;infoRef.current=info;

  const send=useCallback((type,data)=>apiRequest(`${base}/signal`,{method:'POST',token,body:{type,data}}).catch(()=>{}),[base,token]);
  const cleanup=useCallback(()=>{
    pc.current?.close();pc.current=null;pendingCandidates.current=[];
    local.current?.getTracks().forEach(track=>track.stop());local.current=null;
    if(remoteVideo.current)remoteVideo.current.srcObject=null;if(localVideo.current)localVideo.current.srcObject=null;
    setMuted(false);setCameraOff(false);setCall({state:'idle',kind:'voice'});
  },[]);
  const media=async kind=>{
    const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:kind==='video'});
    local.current=stream;if(localVideo.current)localVideo.current.srcObject=stream;return stream;
  };
  const connection=kind=>{
    const peer=new RTCPeerConnection({iceServers:infoRef.current?.iceServers||[{urls:'stun:stun.l.google.com:19302'}]});
    pc.current=peer;
    local.current?.getTracks().forEach(track=>peer.addTrack(track,local.current));
    peer.onicecandidate=event=>{if(event.candidate)send('candidate',event.candidate.toJSON());};
    peer.ontrack=event=>{if(remoteVideo.current&&event.streams[0])remoteVideo.current.srcObject=event.streams[0];};
    peer.onconnectionstatechange=()=>{
      if(peer.connectionState==='connected')setCall({state:'active',kind});
      if(['failed','closed'].includes(peer.connectionState)&&pc.current===peer){cleanup();setNotice(tr('The call ended.','انتهت المكالمة.'));}
    };
    return peer;
  };
  const flushCandidates=async()=>{for(const candidate of pendingCandidates.current.splice(0))await pc.current?.addIceCandidate(candidate).catch(()=>{});};

  const startCall=async kind=>{
    if(callRef.current.state!=='idle')return;
    setNotice('');setError('');
    try{
      await media(kind);setCall({state:'calling',kind});
      const peer=connection(kind),offer=await peer.createOffer();await peer.setLocalDescription(offer);
      await send('offer',{sdp:offer.sdp,kind});
    }catch(e){cleanup();setError(e.name==='NotAllowedError'?tr('Allow the microphone (and camera) to call.','اسمح بالميكروفون (والكاميرا) للاتصال.'):tr('The call could not start.','تعذر بدء المكالمة.'));}
  };
  const accept=async()=>{
    const offer=incomingRef.current;if(!offer)return;
    setIncoming(null);setNotice('');
    try{
      await media(offer.kind);setCall({state:'connecting',kind:offer.kind});
      const peer=connection(offer.kind);await peer.setRemoteDescription({type:'offer',sdp:offer.sdp});await flushCandidates();
      const answer=await peer.createAnswer();await peer.setLocalDescription(answer);await send('answer',{sdp:answer.sdp});
    }catch(e){cleanup();send('decline');setError(e.name==='NotAllowedError'?tr('Allow the microphone (and camera) to answer.','اسمح بالميكروفون (والكاميرا) للرد.'):tr('The call could not connect.','تعذر الاتصال.'));}
  };
  const decline=()=>{setIncoming(null);send('decline');};
  const hangUp=()=>{send('hangup');cleanup();};
  const toggleMute=()=>{const track=local.current?.getAudioTracks()[0];if(track){track.enabled=!track.enabled;setMuted(!track.enabled);}};
  const toggleCamera=()=>{const track=local.current?.getVideoTracks()[0];if(track){track.enabled=!track.enabled;setCameraOff(!track.enabled);}};

  const handleSignal=async signal=>{
    const peer=pc.current;
    if(signal.type==='offer'){if(callRef.current.state==='idle')setIncoming({sdp:signal.data.sdp,kind:signal.data.kind==='video'?'video':'voice'});}
    else if(signal.type==='answer'&&peer&&!peer.currentRemoteDescription){await peer.setRemoteDescription({type:'answer',sdp:signal.data.sdp}).catch(()=>{});await flushCandidates();setCall(current=>({...current,state:'connecting'}));}
    else if(signal.type==='candidate'){if(peer?.remoteDescription)await peer.addIceCandidate(signal.data).catch(()=>{});else pendingCandidates.current.push(signal.data);}
    else if(signal.type==='hangup'){setIncoming(null);if(callRef.current.state!=='idle'){cleanup();setNotice(tr('The other person ended the call.','أنهى الطرف الآخر المكالمة.'));}}
    else if(signal.type==='decline'){cleanup();setNotice(tr('The call was declined.','تم رفض المكالمة.'));}
  };

  useEffect(()=>{let alive=true;apiRequest(base,{token}).then(result=>{if(alive)setInfo(result);}).catch(e=>{if(alive)setError(e.message);});return()=>{alive=false;};},[base,token]);
  useEffect(()=>{
    if(!info)return undefined;
    let stop=false,timer;
    const poll=async()=>{
      try{
        const result=await apiRequest(`${base}/poll?signal=${cursors.current.signal}&message=${cursors.current.message}`,{token});
        if(stop)return;
        setPeerOnline(result.peerOnline);
        if(result.messages.length){cursors.current.message=result.messages.at(-1).seq;setMessages(current=>[...current,...result.messages.filter(item=>!current.some(row=>row.seq===item.seq))]);}
        for(const signal of result.signals){cursors.current.signal=signal.seq;await handleSignal(signal);}
      }catch(e){if(!stop&&/opens|not found/i.test(e.message))setError(e.message);}
      finally{if(!stop)timer=setTimeout(poll,1000);}
    };
    poll();
    return()=>{stop=true;clearTimeout(timer);};
  // handleSignal reads fresh state through refs.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[info,base,token]);
  useEffect(()=>()=>{pc.current?.close();local.current?.getTracks().forEach(track=>track.stop());},[]);
  useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight});},[messages.length]);

  const submit=async event=>{
    event.preventDefault();const value=text.trim();if(!value)return;
    setText('');
    try{const result=await apiRequest(`${base}/message`,{method:'POST',token,body:{text:value}});cursors.current.message=Math.max(cursors.current.message,result.item.seq);setMessages(current=>current.some(row=>row.seq===result.item.seq)?current:[...current,result.item]);}
    catch(e){setError(e.message);}
  };
  const calling=call.state!=='idle',showVideo=calling&&call.kind==='video';
  const who=info?(info.role==='host'?info.meeting.clientName||tr('Client','العميل'):'Khalil'):'';
  return createPortal(<div className="meeting-room" role="dialog" aria-modal="true" aria-label={tr('Meeting room','غرفة الاجتماع')} dir={ar?'rtl':'ltr'}>
    <div className="meeting-room-panel">
      <header><div><strong>{tr('Online meeting','اجتماع عبر الإنترنت')}</strong>{info&&<small>{tr('with','مع')} {who} · {new Date(info.meeting.start).toLocaleString(ar?'ar-CA':'en-CA',{dateStyle:'medium',timeStyle:'short',timeZone:'America/Toronto'})}</small>}</div>
        <span className={`meeting-room-presence${peerOnline?' is-on':''}`}><i/>{peerOnline?tr('Here now','متصل الآن'):tr('Not here yet','لم ينضم بعد')}</span>
        <button type="button" aria-label={tr('Leave the meeting room','مغادرة الغرفة')} title={tr('Leave','مغادرة')} onClick={()=>{hangUp();onClose();}}><X size={18}/></button></header>
      {error&&<p className="meeting-room-error" role="alert">{error}</p>}
      <div className="meeting-room-body">
        <section className="meeting-room-call" aria-label={tr('Call','المكالمة')}>
          <div className={`meeting-room-stage${calling?' is-live':''}`}>
            <video ref={remoteVideo} autoPlay playsInline className={showVideo?'':'is-audio'}/>
            {showVideo&&<video ref={localVideo} autoPlay playsInline muted className="meeting-room-self"/>}
            {!calling&&!incoming&&<div className="meeting-room-idle"><Phone size={30} strokeWidth={1.4}/><p>{peerOnline?tr('Start a voice or video call, or just chat.','ابدأ مكالمة صوتية أو مرئية، أو تحدث كتابةً.'):tr('Waiting for the other person. You can chat now and call once they are here.','بانتظار الطرف الآخر. يمكنك الكتابة الآن والاتصال عند حضوره.')}</p></div>}
            {calling&&call.kind==='voice'&&<div className="meeting-room-idle"><Phone size={30} strokeWidth={1.4}/><p>{call.state==='active'?tr('Voice call connected','المكالمة الصوتية متصلة'):tr('Calling…','جارٍ الاتصال…')}</p></div>}
            {incoming&&<div className="meeting-room-incoming" role="alert"><p>{incoming.kind==='video'?tr('Incoming video call','مكالمة مرئية واردة'):tr('Incoming voice call','مكالمة صوتية واردة')}</p><div><button type="button" className="is-accept" onClick={accept}><Phone size={16}/>{tr('Accept','قبول')}</button><button type="button" className="is-decline" onClick={decline}><PhoneOff size={16}/>{tr('Decline','رفض')}</button></div></div>}
          </div>
          {notice&&<p className="meeting-room-notice" role="status">{notice}</p>}
          <div className="meeting-room-controls">
            {!calling?<>
              <button type="button" onClick={()=>startCall('voice')} disabled={Boolean(incoming)}><Phone size={16}/>{tr('Voice call','مكالمة صوتية')}</button>
              <button type="button" onClick={()=>startCall('video')} disabled={Boolean(incoming)}><Video size={16}/>{tr('Video call','مكالمة مرئية')}</button>
            </>:<>
              <button type="button" onClick={toggleMute} aria-pressed={muted} title={muted?tr('Unmute','إلغاء الكتم'):tr('Mute','كتم')}>{muted?<MicOff size={16}/>:<Mic size={16}/>}</button>
              {call.kind==='video'&&<button type="button" onClick={toggleCamera} aria-pressed={cameraOff} title={cameraOff?tr('Camera on','تشغيل الكاميرا'):tr('Camera off','إيقاف الكاميرا')}>{cameraOff?<VideoOff size={16}/>:<Video size={16}/>}</button>}
              <button type="button" className="is-decline" onClick={hangUp}><PhoneOff size={16}/>{tr('End call','إنهاء المكالمة')}</button>
            </>}
          </div>
        </section>
        <section className="meeting-room-chat" aria-label={tr('Chat','الدردشة')}>
          <h3><MessageCircle size={15}/>{tr('Chat','الدردشة')}</h3>
          <ol ref={log} aria-live="polite">{messages.length?messages.map(item=><li key={item.seq} className={item.from===info?.role?'is-mine':''}><small>{item.from===info?.role?tr('You','أنت'):item.name}</small><p>{item.text}</p></li>):<li className="is-empty">{tr('No messages yet.','لا توجد رسائل بعد.')}</li>}</ol>
          <form onSubmit={submit}><input value={text} maxLength={1000} placeholder={tr('Write a message…','اكتب رسالة…')} onChange={event=>setText(event.target.value)} aria-label={tr('Message','الرسالة')}/><button type="submit" disabled={!text.trim()} aria-label={tr('Send','إرسال')}><Send size={16}/></button></form>
        </section>
      </div>
    </div>
  </div>,document.body);
}
