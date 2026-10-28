import OrderSignIn from './OrderSignIn';
import {lazy,Suspense,useCallback,useEffect,useRef,useState} from 'react';
import {MessageCircle,Phone,Send,Square,ArrowUpRight,History} from 'lucide-react';
import {apiBaseUrl,apiRequest} from '../lib/api';
import {createBookingConversationRecorder} from '../lib/bookingConversationRecorder';
import {useEventOrder} from './eventOrderContext';
import {aiOrderContext} from '../lib/eventOrderCore.mjs';
import {handleAvatarVoiceEvent} from '../lib/voiceAvatarMotion';
import './aiBooking.css';
const EchoVoiceAvatar=lazy(()=>import('./EchoVoiceAvatar'));

export default function AIBookingPanel({ar,user,token,onReview}){
  const orderDraft=useEventOrder();
  const orderRef=useRef(orderDraft?.order);
  useEffect(()=>{orderRef.current=orderDraft?.order;},[orderDraft?.order]);
  const tr=(en,arabic)=>ar?arabic:en;
  const [available,setAvailable]=useState(null),[mode,setMode]=useState('chat');
  const [aiPolicy,setAiPolicy]=useState(null),[pricingAccepted,setPricingAccepted]=useState(false),[maxCallSeconds,setMaxCallSeconds]=useState(300);
  const [messages,setMessages]=useState([]),[input,setInput]=useState(''),[draft,setDraft]=useState(null);
  const [consent,setConsent]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[call,setCall]=useState('idle');
  const [transcriptOpen,setTranscriptOpen]=useState(false);
  const [saveError,setSaveError]=useState('');
  const recorder=useRef(null);
  const voiceMotion=useRef({});
  const resources=useRef({}),request=useRef(null),history=useRef([]),log=useRef(null),alive=useRef(true);
  const saveMessages=useCallback((items=[])=>{
    if(!token||!user||!consent)return;
    if(recorder.current?.token!==token){
      recorder.current={token,writer:createBookingConversationRecorder(async body=>{
        const response=await fetch(`${apiBaseUrl}/ai-booking/conversations`,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
        if(!response.ok)throw new Error('History save failed');
      })};
    }
    const writer=recorder.current.writer;
    (items.length?writer.save(items):writer.retry()).then(()=>{if(alive.current)setSaveError('');}).catch(()=>{if(alive.current)setSaveError('Conversation history could not be saved. Retry before leaving this page.');});
  },[token,user,consent]);
  const append=useCallback((message,save=true)=>{
    const item={...message,id:crypto.randomUUID(),mode};
    const next=[...history.current,item].slice(-32);history.current=next;setMessages(next);
    if(save)saveMessages([item]);
    return item;
  },[mode,saveMessages]);
  const closeCall=useCallback(()=>{
    const current=resources.current;resources.current={};
    voiceMotion.current={};
    clearTimeout(current.timer);current.abort?.abort();
    current.remoteSource?.disconnect();current.analyser?.disconnect();current.meterContext?.close().catch(()=>{});
    current.channel?.close();current.peer?.close();current.stream?.getTracks().forEach(track=>track.stop());
    if(current.audio){current.audio.pause();current.audio.srcObject=null;}
    if(current.callId)fetch(`${apiBaseUrl}/ai-booking/voice/end`,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({callId:current.callId})}).catch(()=>{});
  },[token]);
  useEffect(()=>{
    alive.current=true;
    apiRequest('/ai-booking/status').then(status=>{if(alive.current){setAvailable(status.configured);setAiPolicy(status.policy||null);setMaxCallSeconds(status.maxCallSeconds||300);}}).catch(()=>{if(alive.current)setAvailable(false);});
    const leave=()=>closeCall();window.addEventListener('pagehide',leave);
    return()=>{alive.current=false;request.current?.abort();closeCall();window.removeEventListener('pagehide',leave);};
  },[closeCall]);
  useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight,behavior:'instant'});},[messages,busy]);
  const customerPrice=aiPolicy?.customerPricing?.policy==='manual_invoice'?(aiPolicy.customerPricing[mode==='chat'?'chatReplyCents':'voiceSessionCents']||0):0;
  const pricingFields=customerPrice?{pricingConsentRevision:aiPolicy.revision}:{};
  useEffect(()=>setPricingAccepted(false),[mode,aiPolicy?.revision]);
  const permitted=available&&user&&token&&consent&&aiPolicy?.[mode]?.enabled!==false&&(!customerPrice||pricingAccepted);
  const send=async(text,review=false)=>{
    if(!text.trim()||busy||!permitted)return;
    setBusy(true);setError('');setInput('');
    orderDraft?.begin('ai');
    setTranscriptOpen(true);
    const previous=history.current;
    const next=[...previous,{role:'user',content:text.trim().slice(0,2000)}].slice(-15).map(message=>({...message,content:message.content.slice(0,2000)}));
    const sent=append(next.at(-1),false);
    const controller=new AbortController();request.current=controller;
    try{
      const response=await fetch(`${apiBaseUrl}/ai-booking/chat`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({messages:next,consent:true,requestId:crypto.randomUUID(),...pricingFields,...(orderRef.current?{order:aiOrderContext(orderRef.current)}:{})}),signal:controller.signal});
      const data=await response.json();
      if(!response.ok)throw new Error(data.message||tr('Could not reach the AI assistant.','تعذر الاتصال بالمساعد.'));
      if(!alive.current)return;
      const reply=append({role:'assistant',content:data.reply},false);setDraft(data.draft);
      if(orderDraft){if(Array.isArray(data.orderPatch))orderDraft.patchAi(data.orderPatch);else if(data.draft)orderDraft.applyLegacy(data.draft);}
      saveMessages([sent,reply]);
      if(review&&data.draft)onReview(orderDraft?{}:data.draft);
    }catch(problem){if(alive.current&&problem.name!=='AbortError'){setError(problem.message);setMessages(previous);history.current=previous;if(!review)setInput(text);}}
    finally{if(alive.current)setBusy(false);}
  };
  const startCall=async()=>{
    if(!permitted||call==='connecting'||call==='active')return;
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||!window.RTCPeerConnection){setError(tr('Voice calls need HTTPS and a supported browser.','تتطلب المكالمات اتصالاً آمناً ومتصفحاً مدعوماً.'));return;}
    setError('');setCall('connecting');
    orderDraft?.begin('ai');
    window.dispatchEvent(new CustomEvent('echo:live-audio'));
    const current={abort:new AbortController()};resources.current=current;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if(resources.current!==current){stream.getTracks().forEach(track=>track.stop());return;}
      current.stream=stream;
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      voiceMotion.current={outputPlaying:false,listening:false,utterance:'',gesture:'neutral'};
      if(AudioContext){
        const context=new AudioContext();current.meterContext=context;
        const analyser=context.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.25;current.analyser=analyser;
        voiceMotion.current.analyser=analyser;context.resume().catch(()=>{});
      }
      const peer=new RTCPeerConnection();current.peer=peer;
      const audio=new Audio();audio.autoplay=true;current.audio=audio;
      voiceMotion.current.audio=audio;
      audio.onplaying=()=>{if(resources.current===current)voiceMotion.current.outputPlaying=true;};
      audio.onpause=()=>{if(resources.current===current)voiceMotion.current.outputPlaying=false;};
      peer.ontrack=event=>{if(resources.current!==current)return;const remote=event.streams[0]||new MediaStream([event.track]);audio.srcObject=remote;if(current.meterContext&&current.analyser){current.remoteSource?.disconnect();current.remoteSource=current.meterContext.createMediaStreamSource(remote);current.remoteSource.connect(current.analyser);}audio.play().catch(()=>{if(alive.current)setError(tr('Your browser blocked AI audio. End the call and try again.','حظر المتصفح الصوت. أنهِ المكالمة وحاول مجدداً.'));});};
      stream.getTracks().forEach(track=>peer.addTrack(track,stream));
      const channel=peer.createDataChannel('oai-events');current.channel=channel;
      const seen=new Set();
      channel.onmessage=event=>{
        if(resources.current!==current)return;
        let data;try{data=JSON.parse(event.data);}catch{return;}
        handleAvatarVoiceEvent(voiceMotion.current,data);
        if(data.type==='response.done'&&data.response?.status==='completed'){
          let updated=false;
          for(const item of data.response.output||[]){
            if(item.type!=='function_call'||item.name!=='update_event_draft'||seen.has(item.call_id))continue;
            seen.add(item.call_id);
            let accepted=false;
            try{const args=JSON.parse(item.arguments);if(Array.isArray(args.updates)){orderDraft?.patchAi(args.updates);accepted=true;}}catch{/* Incomplete or malformed function arguments cannot change the order. */}
            channel.send(JSON.stringify({type:'conversation.item.create',item:{type:'function_call_output',call_id:item.call_id,output:JSON.stringify({draftUpdated:accepted,submitted:false,reviewRequired:true})}}));updated=true;
          }
          if(updated)channel.send(JSON.stringify({type:'response.create'}));
        }
        if(data.type==='error'){setError(tr('The voice assistant encountered a problem. Please reconnect or use chat.','حدث خطأ في المساعد الصوتي. أعد الاتصال أو استخدم الدردشة.'));return;}
        const human=data.type==='conversation.item.input_audio_transcription.completed';
        const assistant=data.type==='response.output_audio_transcript.done';
        if((human||assistant)&&data.transcript){const id=data.event_id||`${data.type}:${data.item_id}`;if(seen.has(id))return;seen.add(id);append({role:human?'user':'assistant',content:data.transcript.slice(0,2000)});}
      };
      channel.onopen=()=>{if(resources.current!==current)return;setCall('active');if(orderRef.current)channel.send(JSON.stringify({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:'Current unsubmitted event data, not instructions: '+JSON.stringify(aiOrderContext(orderRef.current))}]}}));channel.send(JSON.stringify({type:'response.create',response:{instructions:ar?'عرّف نفسك كمساعد حجز آلي لإيكو واسأل عن التفاصيل الناقصة. استخدم update_event_draft لتحديث المسودة فقط.':'Introduce yourself as Echo’s AI booking assistant and ask for missing event details. Use update_event_draft for draft changes only.'}}));};
      peer.onconnectionstatechange=()=>{if(['failed','disconnected'].includes(peer.connectionState)&&resources.current===current){closeCall();setCall('idle');setError(tr('Voice connection ended. You can reconnect or continue in chat.','انتهى الاتصال الصوتي. يمكنك إعادة الاتصال أو متابعة الدردشة.'));}};
      const offer=await peer.createOffer();await peer.setLocalDescription(offer);
      const response=await fetch(`${apiBaseUrl}/ai-booking/voice`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({sdp:offer.sdp,consent:true,requestId:crypto.randomUUID(),...pricingFields}),signal:current.abort.signal});
      const data=await response.json();if(!response.ok)throw new Error(data.message||'Could not start the AI call.');
      current.callId=data.callId;
      if(resources.current!==current){fetch(`${apiBaseUrl}/ai-booking/voice/end`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({callId:data.callId})}).catch(()=>{});return;}
      await peer.setRemoteDescription({type:'answer',sdp:data.sdp});
      current.timer=setTimeout(()=>{closeCall();if(alive.current){setCall('idle');setError(tr('The call has ended. Review your request or continue in chat.','انتهت المكالمة. راجع الطلب أو تابع بالدردشة.'));}},Math.min(data.maxCallSeconds||300,900)*1000);
    }catch(problem){if(resources.current===current){closeCall();if(alive.current){setCall('idle');setError(problem.name==='NotAllowedError'?tr('Microphone permission was not granted. Chat is still available.','لم يُمنح إذن الميكروفون. يمكنك استخدام الدردشة.'):problem.name==='AbortError'?'':problem.message);}}}
  };
  const review=()=>{
    closeCall();setCall('idle');
    onReview(orderDraft?{}:draft);
  };
  const showTranscript=transcriptOpen;
  const canReview=mode==='chat'?Boolean(draft):messages.some(item=>item.role==='user');
  const caption=busy?tr('Putting your night together…','نرتّب تفاصيل ليلتك…'):call==='connecting'?tr('Connecting your conversation…','جارٍ توصيل محادثتك…'):messages.at(-1)?.content||tr('Hey, tell me about your event.','أخبرني عن الفعالية التي تتخيلها.');
  const callLabel=call==='active'?tr('End AI call','إنهاء المكالمة'):call==='connecting'?tr('Cancel connection','إلغاء الاتصال'):tr('Start AI voice call','ابدأ مكالمة مع المساعد');
  if(!user||!token)return <OrderSignIn ar={ar}/>;
  return <div className="ai-booking-panel">
    <div className={`ai-booking-surface${mode==='voice'?' is-voice':''}${busy?' is-thinking':''}${call==='active'?' is-connected':''}${showTranscript?' has-transcript':''}`}>
      <header className="ai-booking-heading">
        <div><span className="ai-booking-brand">Echo AI</span><h3 className="ai-booking-sr">{tr('AI event planner','مساعد تخطيط الفعاليات')}</h3></div>
        <div className="ai-booking-header-tools">
          <div className="ai-booking-modes" role="group" aria-label={tr('Conversation mode','طريقة المحادثة')}>
            <button type="button" aria-pressed={mode==='chat'} disabled={call!=='idle'} onClick={()=>{setMode('chat');setTranscriptOpen(messages.length>0);}}><MessageCircle size={13}/>{tr('Chat','دردشة')}</button>
            <button type="button" aria-pressed={mode==='voice'} disabled={call!=='idle'} onClick={()=>{setMode('voice');setTranscriptOpen(false);}}><Phone size={13}/>{tr('Voice','صوت')}</button>
          </div>
          {messages.length>0&&<button className="ai-booking-history" type="button" aria-label={tr('Show conversation transcript','عرض نص المحادثة')} aria-expanded={showTranscript} onClick={()=>setTranscriptOpen(value=>!value)}><History size={16}/></button>}
        </div>
      </header>
      <div className="ai-booking-stage" aria-hidden={showTranscript}>
        {mode==='voice'?<Suspense fallback={<span className="ai-booking-typing" role="status">{tr('Preparing your assistant…','جارٍ تجهيز الشخصية…')}</span>}><EchoVoiceAvatar motion={voiceMotion} call={call} ar={ar}/></Suspense>:<div className="ai-booking-wave" aria-hidden="true">{[20,68,132,88,64,54,20].map((height,i)=><span key={i} style={{'--idle-level':`${height}px`,'--wave-delay':`${i*.13}s`}}><i/></span>)}</div>}
        <p className="ai-booking-caption" aria-live="polite">{caption}</p>
        {call==='active'&&<span className="ai-booking-live-label">{tr('LIVE CONVERSATION','محادثة مباشرة')}</span>}
      </div>
      <div id="ai-booking-transcript" className="ai-booking-messages" hidden={!showTranscript} ref={log} role="log" aria-label={tr('Booking conversation','محادثة الحجز')} aria-live="polite">
        {messages.map((message,i)=><div className={`ai-booking-message is-${message.role}`} key={i}><small>{message.role==='user'?tr('You','أنت'):'Echo AI'}</small><p>{message.content}</p></div>)}
        {busy&&<p className="ai-booking-typing" role="status">{tr('Thinking…','جارٍ التفكير…')}</p>}
      </div>
      <div className="ai-booking-surface-bottom">
        {mode==='chat'?<form className="ai-booking-composer" onSubmit={event=>{event.preventDefault();send(input);}}>
          <label className="ai-booking-sr" htmlFor="ai-booking-message">{tr('Your message','رسالتك')}</label>
          <input id="ai-booking-message" value={input} maxLength={2000} disabled={!permitted||busy} onChange={event=>setInput(event.target.value)} placeholder={tr('Your event starts with a conversation…','تبدأ فعاليتك بمحادثة…')}/>
          <button className="ai-booking-orbit" type="submit" disabled={!permitted||busy||!input.trim()} aria-label={tr('Send to AI','أرسل للمساعد')}><Send size={16}/></button>
        </form>:<div className="ai-booking-voice-controls"><span>{call==='active'?tr('Listening · speak naturally','أستمع إليك · تحدّث بطبيعتك'):call==='connecting'?tr('Connecting…','جارٍ الاتصال…'):tr('A conversation, not a form.','محادثة، وليست استمارة.')}</span><button className={`ai-booking-orbit${call!=='idle'?' is-stop':''}`} type="button" disabled={(call==='idle'&&!permitted)||busy} aria-label={callLabel} title={callLabel} onClick={call==='idle'?startCall:()=>{closeCall();setCall('idle');}}>{call==='idle'?<Phone size={17}/>:<Square size={13} fill="currentColor"/>}</button></div>}
      <div className="ai-booking-support">
      {available===null?<p className="ai-booking-status" role="status">{tr('Checking availability…','جارٍ التحقق من التوفر…')}</p>:!available?<p className="ai-booking-notice" role="status">{tr('AI booking is temporarily unavailable. Please use Personal Booking.','الحجز الذكي غير متاح حالياً. يرجى استخدام الحجز الشخصي.')}</p>:!user?<a className="ai-booking-signin" href="/login" onClick={()=>{try{localStorage.setItem('khalil-auth-return','/#how-to-book');}catch{/* Optional return path. */}}}>{tr('Sign in to start your conversation','سجّل الدخول لبدء محادثتك')}<ArrowUpRight size={13}/></a>:null}
      {Boolean(customerPrice)&&<label className="ai-booking-consent ai-booking-pricing"><input type="checkbox" checked={pricingAccepted} disabled={busy||call!=='idle'} onChange={event=>setPricingAccepted(event.target.checked)}/><span>{tr(`I accept ${new Intl.NumberFormat('en-CA',{style:'currency',currency:aiPolicy.customerPricing.currency}).format(customerPrice/100)} ${aiPolicy.customerPricing.currency} per ${mode==='chat'?'completed Chat reply':`started Voice session (up to ${maxCallSeconds} seconds)`}, billed by manual invoice.`,`أوافق على دفع ${(customerPrice/100).toFixed(2)} ${aiPolicy.customerPricing.currency} لكل ${mode==='chat'?'رد دردشة مكتمل':`جلسة صوتية تبدأ (حتى ${maxCallSeconds} ثانية)`} عبر فاتورة يدوية.`)}</span></label>}
      <label className="ai-booking-consent"><input type="checkbox" checked={consent} disabled={busy||call!=='idle'} onChange={event=>setConsent(event.target.checked)}/><span>{tr(`I agree to share chat messages with ${aiPolicy?.chat?.provider==='openrouter'?'OpenRouter and its selected model provider':'OpenAI'}, call audio with OpenAI, and save transcripts to my account. AI-generated voice. Call limit: ${maxCallSeconds} seconds.`,`أوافق على مشاركة رسائل الدردشة مع ${aiPolicy?.chat?.provider==='openrouter'?'OpenRouter ومزوّد النموذج المختار':'OpenAI'} وصوت المكالمة مع OpenAI وحفظ النص في حسابي. الصوت مولّد آلياً. مدة المكالمة ${maxCallSeconds} ثانية.`)}</span></label>
      {saveError&&<p className="ai-booking-notice" role="alert">{tr(saveError,'تعذر حفظ سجل المحادثة. أعد المحاولة قبل مغادرة الصفحة.')} <button type="button" onClick={()=>saveMessages()}>{tr('Retry saving','إعادة الحفظ')}</button></p>}
      {error&&<p className="ai-booking-notice" role="alert">{error}</p>}
      {canReview&&<button className="ai-booking-review" type="button" disabled={busy||call==='connecting'} onClick={review}>{tr('Review draft in new tab','راجع المسودة في تبويب جديد')}<ArrowUpRight size={15}/></button>}
      <details className="ai-booking-privacy"><summary>{tr('AI & privacy notice','الذكاء الاصطناعي والخصوصية')}</summary><p>{tr('This is AI, not a person. Keep contact details, exact addresses and payment information for the separate review form. Nothing is booked or submitted until you review the details and submit the request yourself.','هذا مساعد آلي وليس شخصاً. أدخل معلومات التواصل والعنوان الدقيق وبيانات الدفع في نموذج المراجعة المنفصل فقط. لا يُحجز أو يُرسل أي شيء قبل مراجعتك وإرسالك للطلب بنفسك.')}</p></details>
      </div>
      </div>
    </div>
  </div>;
}
