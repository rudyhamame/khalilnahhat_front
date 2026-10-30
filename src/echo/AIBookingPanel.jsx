import SpeechToText from './SpeechToText';
import OrderSignIn from './OrderSignIn';
import GuidedBookingFlow from './GuidedBookingFlow';
import {useCallback,useEffect,useRef,useState} from 'react';
import {MessageCircle,Phone,Send,Square,ArrowUpRight,History} from 'lucide-react';
import {apiBaseUrl,apiRequest} from '../lib/api';
import {createBookingConversationRecorder} from '../lib/bookingConversationRecorder';
import {useEventOrder} from './eventOrderContext';
import {aiOrderContext} from '../lib/eventOrderCore.mjs';
import {readBookingResponse,voiceConversationContext} from '../lib/aiBookingStream.mjs';
import {handleAvatarVoiceEvent} from '../lib/voiceAvatarMotion';
import {bookingFieldSection,scrollToAppSection,scrollToBookingField} from '../lib/bookingViewport';
import './aiBooking.css';

// Where each assistant's model comes from, shown to the customer. The model id carries its version (e.g. gpt-realtime-2.1-mini).
// Mono PCM16 capture at the context's 16 kHz, posted in 100 ms chunks for the Alibaba voice socket.
const PCM_WORKLET=`class P extends AudioWorkletProcessor{constructor(){super();this.b=new Int16Array(1600);this.n=0;}process(inputs){const x=inputs[0][0];if(!x)return true;for(let i=0;i<x.length;i++){const v=Math.max(-1,Math.min(1,x[i]));this.b[this.n++]=v<0?v*32768:v*32767;if(this.n===1600){this.port.postMessage(this.b.slice(0).buffer);this.n=0;}}return true;}}registerProcessor('pcm-capture',P);`;
const bytesToBase64=bytes=>{let text='';for(let index=0;index<bytes.length;index+=0x8000)text+=String.fromCharCode(...bytes.subarray(index,index+0x8000));return btoa(text);};
const AI_SOURCES={openai:'OpenAI',openrouter:'OpenRouter',alibaba:'Alibaba Cloud (Qwen)'};

export default function AIBookingPanel({ar,user,token,onReview}){
  const orderDraft=useEventOrder();
  const orderRef=useRef(orderDraft?.order);
  useEffect(()=>{orderRef.current=orderDraft?.order;},[orderDraft?.order]);
  const setupShown=useRef(false);
  // Once the AI records services, bring the visitor to 04 / The Setup to pick equipment and quantities themselves.
  const patchOrder=(patch,{focus=true}={})=>{orderDraft?.patchAi(patch);if(focus&&!setupShown.current&&patch.some(item=>item.path==='services'&&item.value&&item.value!=='[]')){setupShown.current=true;scrollToAppSection('setup');}};
  const tr=(en,arabic)=>ar?arabic:en;
  const [available,setAvailable]=useState(null),[mode,setMode]=useState('chat');
  const [freeform,setFreeform]=useState(false);
  const [aiPolicy,setAiPolicy]=useState(null),[pricingAccepted,setPricingAccepted]=useState(false),[maxCallSeconds,setMaxCallSeconds]=useState(300);
  const retryRequest=useRef(null);
  const applyStatus=useCallback(status=>{setAvailable(status.configured);setAiPolicy(status.policy||null);setMaxCallSeconds(status.maxCallSeconds||300);},[]);
  useEffect(()=>setPricingAccepted(false),[aiPolicy?.revision,mode]);
  const [messages,setMessages]=useState([]),[input,setInput]=useState(''),[draft,setDraft]=useState(null);
  const [consent]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[call,setCall]=useState('idle');
  const [transcriptOpen,setTranscriptOpen]=useState(false);
  const [followPage,setFollowPage]=useState(true);
  const followPageRef=useRef(true);followPageRef.current=followPage;
  const [dictating,setDictating]=useState(false);
  const [saveError,setSaveError]=useState('');
  const [streamReply,setStreamReply]=useState(''),[reviewing,setReviewing]=useState(false);
  const recorder=useRef(null);
  const voiceMotion=useRef({});
  const wave=useRef(null);
  useEffect(()=>{
    const bars=wave.current?.children;
    if(!bars||mode!=='voice'||call!=='active'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    let frame=0,analyser=null,bins=null;
    const animate=()=>{
      const current=voiceMotion.current.analyser;
      if(current){
        if(current!==analyser){analyser=current;bins=new Uint8Array(analyser.frequencyBinCount);}
        analyser.getByteFrequencyData(bins);
        Array.from(bars).forEach((bar,index)=>{
          const start=Math.floor(index*bins.length/14),end=Math.max(start+1,Math.floor((index+1)*bins.length/14));
          let energy=0;for(let bin=start;bin<end;bin++)energy+=bins[bin];
          bar.style.setProperty('--voice-level',`${20+energy/(end-start)/255*120}px`);
        });
      }
      frame=requestAnimationFrame(animate);
    };
    frame=requestAnimationFrame(animate);
    return()=>{cancelAnimationFrame(frame);Array.from(bars).forEach(bar=>bar.style.removeProperty('--voice-level'));};
  },[mode,call]);
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
    if(alive.current)setReviewing(false);
    voiceMotion.current={};
    clearTimeout(current.timer);clearTimeout(current.reviewTimer);current.abort?.abort();
    current.remoteSource?.disconnect();current.analyser?.disconnect();current.meterContext?.close().catch(()=>{});
    current.channel?.close();current.peer?.close();current.stream?.getTracks().forEach(track=>track.stop());
    if(current.audio){current.audio.pause();current.audio.srcObject=null;}
    if(current.callId)fetch(`${apiBaseUrl}/ai-booking/voice/end`,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({callId:current.callId,usage:current.usage})}).catch(()=>{});
  },[token]);
  useEffect(()=>{
    alive.current=true;
    apiRequest('/ai-booking/status').then(status=>{if(alive.current)applyStatus(status);}).catch(()=>{if(alive.current)setAvailable(false);});
    const leave=()=>closeCall();window.addEventListener('pagehide',leave);
    return()=>{alive.current=false;request.current?.abort();closeCall();window.removeEventListener('pagehide',leave);};
  },[closeCall,applyStatus]);
  useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight,behavior:'instant'});},[messages,busy,streamReply]);
  const customerPrice=aiPolicy?.customerPricing?.policy==='manual_invoice'?aiPolicy.customerPricing[mode==='chat'?'chatReplyCents':'voiceSessionCents']:0;
  const permitted=available&&user&&token&&consent&&aiPolicy?.[mode]?.enabled!==false&&(!customerPrice||pricingAccepted);
  const pricingFields=pricingAccepted&&aiPolicy?{pricingConsentRevision:aiPolicy.revision}:{};
  const refreshPolicy=()=>apiRequest('/ai-booking/status').then(status=>{if(alive.current)applyStatus(status);}).catch(()=>{});
  const send=async(text)=>{
    if(!text.trim()||busy||dictating||!permitted)return;
    setBusy(true);setStreamReply('');setError('');setInput('');
    orderDraft?.begin('ai');
    setTranscriptOpen(true);
    const previous=history.current;
    const next=[...previous,{role:'user',content:text.trim().slice(0,2000)}].slice(-15).map(message=>({...message,content:message.content.slice(0,2000)}));
    const sent=append(next.at(-1),false);
    const requestId=retryRequest.current?.text===text?retryRequest.current.id:sent.id;retryRequest.current={text,id:requestId};
    const controller=new AbortController();request.current=controller;
    try{
      const response=await fetch(`${apiBaseUrl}/ai-booking/chat`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson',Authorization:`Bearer ${token}`},body:JSON.stringify({responseFormat:'patch',requestId,...pricingFields,messages:next,consent:true,...(orderRef.current?{order:aiOrderContext(orderRef.current)}:{})}),signal:controller.signal});
      const data=await readBookingResponse(response,delta=>{if(alive.current&&request.current===controller)setStreamReply(value=>(value+delta).slice(0,4000));});
      if(!alive.current)return;
      const reply=append({role:'assistant',content:data.reply},false);setDraft(data.draft||(Array.isArray(data.orderPatch)?{}:null));
      if(orderDraft){if(Array.isArray(data.orderPatch))patchOrder(data.orderPatch);else if(data.draft)orderDraft.applyLegacy(data.draft);}
      saveMessages([sent,reply]);retryRequest.current=null;
    }catch(problem){if(alive.current&&problem.name!=='AbortError'){setError(problem.message);if([402,409,503].includes(problem.status)){setPricingAccepted(false);refreshPolicy();}setMessages(previous);history.current=previous;setInput(text);}}
    finally{if(alive.current&&request.current===controller){setBusy(false);setStreamReply('');request.current=null;}}
  };
  // Shared by both transports: handles OpenAI-shaped events from the WebRTC data channel or the Alibaba socket bridge.
  const wireChannel=(channel,current)=>{
      const seen=new Set(),navigationResults=new Map();
      const navigate=argumentsJson=>{
        if(!followPageRef.current)return {shown:false,reason:'follow_disabled'};
        try{const args=JSON.parse(argumentsJson);return scrollToAppSection(args?.section,{source:'voice'});}catch{return {shown:false,reason:'invalid_arguments'};}
      };
      channel.onmessage=event=>{
        if(resources.current!==current)return;
        let data;try{data=JSON.parse(event.data);}catch{return;}
        handleAvatarVoiceEvent(voiceMotion.current,data);
        if(data.type==='response.created')current.responding=true;
        if(data.type==='response.function_call_arguments.done'&&data.name==='show_app_section'&&typeof data.call_id==='string'&&!seen.has(data.call_id)&&!navigationResults.has(data.call_id)){
          navigationResults.set(data.call_id,navigate(data.arguments));
        }
        if(data.type==='response.done'){
          current.responding=false;
          const id=data.response?.id,usage=data.response?.usage;
          if(id&&usage&&!seen.has('usage:'+id)){
            seen.add('usage:'+id);current.usage.responses++;
            for(const [target,value] of [['inputTokens',usage.input_tokens],['outputTokens',usage.output_tokens],['cachedInputTokens',usage.input_token_details?.cached_tokens]])if(Number.isInteger(value)&&value>=0)current.usage[target]+=value;
          }
        }
        if(data.type==='response.done'&&data.response?.status==='completed'){
          let updated=false;
          const output=data.response.output||[];
          const explicitNavigation=output.some(item=>item.type==='function_call'&&item.name==='show_app_section');
          for(const item of output){
            if(item.type!=='function_call'||!['update_event_draft','show_app_section'].includes(item.name)||seen.has(item.call_id))continue;
            seen.add(item.call_id);
            let result;
            if(item.name==='show_app_section'){
              result=navigationResults.get(item.call_id)||navigate(item.arguments);
              navigationResults.delete(item.call_id);
            }else{
              let accepted=false;
              try{const args=JSON.parse(item.arguments);if(Array.isArray(args.updates)){
                patchOrder(args.updates,{focus:false});accepted=true;
                if(followPageRef.current&&!explicitNavigation&&!navigationResults.size){
                  const field=args.updates.slice().reverse().find(change=>typeof change?.path==='string'&&bookingFieldSection(change.path));
                  if(field)scrollToBookingField(field.path,{source:'voice'});
                }
              }}catch{/* Incomplete or malformed function arguments cannot change the order. */}
              result={draftUpdated:accepted,submitted:false,reviewRequired:true};
            }
            channel.send(JSON.stringify({type:'conversation.item.create',item:{type:'function_call_output',call_id:item.call_id,output:JSON.stringify(result)}}));updated=true;
          }
          if(current.reviewRequested){completeReview();return;}
          if(updated)channel.send(JSON.stringify({type:'response.create'}));
        }
        if(data.type==='response.done'&&current.reviewRequested&&data.response?.status!=='completed'){completeReview();return;}
        if(data.type==='error'){setError(tr('The voice assistant encountered a problem. Please reconnect or use chat.','حدث خطأ في المساعد الصوتي. أعد الاتصال أو استخدم الدردشة.'));return;}
        const human=data.type==='conversation.item.input_audio_transcription.completed';
        const assistant=data.type==='response.output_audio_transcript.done';
        if((human||assistant)&&data.transcript){const id=data.event_id||`${data.type}:${data.item_id}`;if(seen.has(id))return;seen.add(id);append({role:human?'user':'assistant',content:data.transcript.slice(0,2000)});}
      };
      channel.onopen=()=>{if(resources.current!==current)return;setCall('active');channel.send(JSON.stringify({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:voiceConversationContext(history.current,orderRef.current?aiOrderContext(orderRef.current):{})}]}}));channel.send(JSON.stringify({type:'response.create',response:{instructions:ar?'عرّف نفسك كمساعد حجز آلي لإيكو واسأل عن التفاصيل الناقصة. استخدم update_event_draft لتحديث المسودة فقط.':'Introduce yourself as Echo’s AI booking assistant and ask for missing event details. Use update_event_draft for draft changes only.'}}));};
  };
  const startSocketCall=async(current,stream)=>{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext||!window.AudioWorkletNode)throw new Error(tr('Voice calls need a newer browser.','تتطلب المكالمات متصفحاً أحدث.'));
    const response=await fetch(`${apiBaseUrl}/ai-booking/voice`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({consent:true,requestId:crypto.randomUUID(),...pricingFields}),signal:current.abort.signal});
    const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.message||'Could not start the AI call.'),{status:response.status});
    current.callId=data.callId;
    if(resources.current!==current){fetch(`${apiBaseUrl}/ai-booking/voice/end`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({callId:data.callId})}).catch(()=>{});return;}
    const context=new AudioContext({sampleRate:16000});current.meterContext=context;context.resume().catch(()=>{});
    const analyser=context.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.25;current.analyser=analyser;
    const speaker=context.createGain();speaker.connect(analyser);analyser.connect(context.destination);
    voiceMotion.current={outputPlaying:false,listening:false,utterance:'',gesture:'neutral',analyser,audio:{paused:false,muted:false,volume:1}};
    const moduleUrl=URL.createObjectURL(new Blob([PCM_WORKLET],{type:'text/javascript'}));
    try{await context.audioWorklet.addModule(moduleUrl);}finally{URL.revokeObjectURL(moduleUrl);}
    if(resources.current!==current)return;
    const mic=new AudioWorkletNode(context,'pcm-capture');context.createMediaStreamSource(stream).connect(mic);
    const url=new URL(`${apiBaseUrl}/ai-booking/voice-ws`,window.location.href);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('ticket',data.wsTicket);
    const socket=new WebSocket(url);
    const channel={send:text=>{if(socket.readyState===1)socket.send(text);},close:()=>{try{socket.close();}catch{/* Already closed. */}},onopen:null,onmessage:null};
    current.channel=channel;wireChannel(channel,current);
    let playHead=0;const playing=new Set();
    const stopPlayback=()=>{for(const source of playing){try{source.stop();}catch{/* Already ended. */}}playing.clear();playHead=0;voiceMotion.current.outputPlaying=false;};
    const play=base64Audio=>{
      const bytes=Uint8Array.from(atob(base64Audio),char=>char.charCodeAt(0)),samples=new Int16Array(bytes.buffer,0,bytes.length>>1);
      const buffer=context.createBuffer(1,samples.length,24000),out=buffer.getChannelData(0);for(let index=0;index<samples.length;index++)out[index]=samples[index]/32768;
      const source=context.createBufferSource();source.buffer=buffer;source.connect(speaker);
      const at=Math.max(context.currentTime+.03,playHead);source.start(at);playHead=at+buffer.duration;playing.add(source);
      voiceMotion.current.outputPlaying=true;voiceMotion.current.listening=false;
      source.onended=()=>{playing.delete(source);if(!playing.size&&context.currentTime>=playHead-.05)voiceMotion.current.outputPlaying=false;};
    };
    mic.port.onmessage=event=>{if(current.live&&socket.readyState===1)socket.send(JSON.stringify({type:'input_audio_buffer.append',audio:bytesToBase64(new Uint8Array(event.data))}));};
    socket.onmessage=event=>{
      if(resources.current!==current)return;
      let message;try{message=JSON.parse(event.data);}catch{return;}
      if(message.type==='bridge.ready'){current.live=true;channel.onopen?.();return;}
      if(message.type==='response.output_audio.delta'){if(typeof message.delta==='string')play(message.delta);return;}
      if(message.type==='input_audio_buffer.speech_started')stopPlayback();
      channel.onmessage?.({data:event.data});
    };
    socket.onclose=()=>{if(resources.current===current){closeCall();if(alive.current){setCall('idle');setError(tr('Voice connection ended. You can reconnect or continue in chat.','انتهى الاتصال الصوتي. يمكنك إعادة الاتصال أو متابعة الدردشة.'));}}};
    current.timer=setTimeout(()=>{closeCall();if(alive.current){setCall('idle');setError(tr('The call time limit has been reached. Review your request or continue in chat.','انتهت مدة المكالمة المسموحة. راجع الطلب أو تابع بالدردشة.'));}},Math.min(data.maxCallSeconds||maxCallSeconds,900)*1000);
  };
  const startCall=async()=>{
    if(!permitted||call==='connecting'||call==='active')return;
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||(!window.RTCPeerConnection&&aiPolicy?.voice?.provider!=='alibaba')){setError(tr('Voice calls need HTTPS and a supported browser.','تتطلب المكالمات اتصالاً آمناً ومتصفحاً مدعوماً.'));return;}
    setError('');setCall('connecting');
    orderDraft?.begin('ai');
    window.dispatchEvent(new CustomEvent('echo:live-audio'));
    const current={abort:new AbortController(),usage:{responses:0,inputTokens:0,outputTokens:0,cachedInputTokens:0}};resources.current=current;
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:true,video:false});
      if(resources.current!==current){stream.getTracks().forEach(track=>track.stop());return;}
      current.stream=stream;
      if(aiPolicy?.voice?.provider==='alibaba'){await startSocketCall(current,stream);return;}
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
      wireChannel(channel,current);
      peer.onconnectionstatechange=()=>{if(['failed','disconnected'].includes(peer.connectionState)&&resources.current===current){closeCall();setCall('idle');setError(tr('Voice connection ended. You can reconnect or continue in chat.','انتهى الاتصال الصوتي. يمكنك إعادة الاتصال أو متابعة الدردشة.'));}};
      const offer=await peer.createOffer();await peer.setLocalDescription(offer);
      const response=await fetch(`${apiBaseUrl}/ai-booking/voice`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({sdp:offer.sdp,consent:true,requestId:crypto.randomUUID(),...pricingFields}),signal:current.abort.signal});
      const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.message||'Could not start the AI call.'),{status:response.status});
      current.callId=data.callId;
      if(resources.current!==current){fetch(`${apiBaseUrl}/ai-booking/voice/end`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({callId:data.callId})}).catch(()=>{});return;}
      await peer.setRemoteDescription({type:'answer',sdp:data.sdp});
      current.timer=setTimeout(()=>{closeCall();if(alive.current){setCall('idle');setError(tr('The call time limit has been reached. Review your request or continue in chat.','انتهت مدة المكالمة المسموحة. راجع الطلب أو تابع بالدردشة.'));}},Math.min(data.maxCallSeconds||maxCallSeconds,900)*1000);
    }catch(problem){if([402,409,503].includes(problem.status)){setPricingAccepted(false);refreshPolicy();}if(resources.current===current){closeCall();if(alive.current){setCall('idle');setError(problem.name==='NotAllowedError'?tr('Microphone permission was not granted. Chat is still available.','لم يُمنح إذن الميكروفون. يمكنك استخدام الدردشة.'):problem.name==='AbortError'?'':problem.message);}}}
  };
  const completeReview=()=>{
    closeCall();setCall('idle');setReviewing(false);
    onReview(orderDraft?{}:draft||{});
  };
  const review=()=>{
    closeCall();setCall('idle');
    onReview(orderDraft?{}:draft);
  };
  const showTranscript=transcriptOpen;
  const canReview=Boolean(draft)||messages.some(item=>item.role==='user');
  const caption=busy?tr('Putting your night together…','نرتّب تفاصيل ليلتك…'):call==='connecting'?tr('Connecting your conversation…','جارٍ توصيل محادثتك…'):messages.at(-1)?.content||tr('Hey, tell me about your event.','أخبرني عن الفعالية التي تتخيلها.');
  const callLabel=call==='active'?tr('End AI call','إنهاء المكالمة'):call==='connecting'?tr('Cancel connection','إلغاء الاتصال'):tr('Start AI voice call','ابدأ مكالمة مع المساعد');
  if(!user||!token)return <OrderSignIn ar={ar}/>;
  if(mode==='chat'&&orderDraft&&!freeform)return <GuidedBookingFlow ar={ar} onReview={()=>onReview({})} onVoice={()=>{setMode('voice');setTranscriptOpen(false);}} onAsk={()=>{setFreeform(true);setTranscriptOpen(messages.length>0);}}/>;
  return <div className="ai-booking-panel">
    {mode==='chat'&&orderDraft&&<button className="egb-return" type="button" disabled={busy} onClick={()=>setFreeform(false)}>← {tr('Back to guided booking','العودة للحجز الموجّه')}</button>}
    <div className={`ai-booking-surface${mode==='voice'?' is-voice':''}${busy?' is-thinking':''}${call==='active'?' is-connected':''}${showTranscript?' has-transcript':''}`}>
      <header className="ai-booking-heading" role="group" aria-label={tr('Conversation mode','طريقة المحادثة')}>
        <div className="ai-booking-side is-start"><button className="ai-booking-mode" type="button" aria-pressed={mode==='chat'} disabled={busy||reviewing||call!=='idle'} onClick={()=>{setMode('chat');setFreeform(false);setTranscriptOpen(messages.length>0);}}><MessageCircle size={13}/>{tr('Chat','دردشة')}</button></div>
        <div><span className="ai-booking-brand">Echo AI</span><h3 className="ai-booking-sr">{tr('AI event planner','مساعد تخطيط الفعاليات')}</h3></div>
        <div className="ai-booking-side is-end"><button className="ai-booking-mode" type="button" aria-pressed={mode==='voice'} disabled={busy||reviewing||call!=='idle'} onClick={()=>{setMode('voice');setTranscriptOpen(false);}}><Phone size={13}/>{tr('Voice','صوت')}</button>{messages.length>0&&<button className="ai-booking-history" type="button" aria-label={tr('Show conversation transcript','عرض نص المحادثة')} aria-expanded={showTranscript} onClick={()=>setTranscriptOpen(value=>!value)}><History size={16}/></button>}</div>
      </header>
      <div className="ai-booking-stage" aria-hidden={showTranscript}>
        <div className="ai-booking-wave" ref={wave} aria-hidden="true">{[20,68,132,88,64,54,20].map((height,i)=><span key={i} style={{'--idle-level':`${height}px`,'--wave-delay':`${i*.13}s`}}><i/></span>)}</div>
        <p className="ai-booking-caption" aria-live="polite">{caption}</p>
        {call==='active'&&<span className="ai-booking-live-label">{tr('LIVE CONVERSATION','محادثة مباشرة')}</span>}
      </div>
      <div id="ai-booking-transcript" className="ai-booking-messages" hidden={!showTranscript} ref={log} role="log" aria-label={tr('Booking conversation','محادثة الحجز')} aria-live="polite">
        {messages.map((message,i)=><div className={`ai-booking-message is-${message.role}`} key={i}><small>{message.role==='user'?tr('You','أنت'):'Echo AI'}</small><p>{message.content}</p></div>)}
        {busy&&streamReply&&<div className="ai-booking-message is-assistant"><small>Echo AI</small><p>{streamReply}</p></div>}
        {busy&&!streamReply&&<p className="ai-booking-typing" role="status">{tr('Thinking…','جارٍ التفكير…')}</p>}
      </div>
      <div className="ai-booking-surface-bottom">
        {mode==='chat'?<form className="ai-booking-composer" onSubmit={event=>{event.preventDefault();send(input);}}>
          <label className="ai-booking-sr" htmlFor="ai-booking-message">{tr('Your message','رسالتك')}</label>
          <input id="ai-booking-message" autoComplete="off" value={input} maxLength={2000} disabled={!permitted||busy} readOnly={dictating} onChange={event=>setInput(event.target.value)} placeholder={tr('Your event starts with a conversation…','تبدأ فعاليتك بمحادثة…')}/>
          <SpeechToText ar={ar} value={input} onChange={setInput} onListeningChange={setDictating} disabled={!permitted||busy||orderDraft?.panelOpen===false}/>
          <button className="ai-booking-orbit" type="submit" disabled={!permitted||busy||dictating||!input.trim()} aria-label={tr('Send to AI','أرسل للمساعد')}><Send size={16}/></button>
        </form>:<div className="ai-booking-voice-controls"><span>{call==='active'?tr('Listening · speak naturally','أستمع إليك · تحدّث بطبيعتك'):call==='connecting'?tr('Connecting…','جارٍ الاتصال…'):tr('A conversation, not a form.','محادثة، وليست استمارة.')}</span><button className="ai-booking-follow" type="button" aria-pressed={followPage} title={tr('Bring the section Echo is discussing into view','إظهار القسم الذي يناقشه إيكو')} onClick={()=>setFollowPage(value=>!value)}>{tr('Follow page','متابعة الصفحة')}<span aria-hidden="true">{followPage?' ✓':''}</span></button><button className={`ai-booking-orbit${call!=='idle'?' is-stop':''}`} type="button" disabled={(call==='idle'&&!permitted)||busy} aria-label={callLabel} title={callLabel} onClick={call==='idle'?startCall:()=>{closeCall();setCall('idle');}}>{call==='idle'?<Phone size={17}/>:<Square size={13} fill="currentColor"/>}</button></div>}
      <div className="ai-booking-support">
      {aiPolicy&&<p className="ai-booking-source" aria-label={tr('AI source and models in use','مصدر الذكاء الاصطناعي والنماذج المستخدمة')}>{[['chat',tr('Chat','دردشة'),aiPolicy.chat],['voice',tr('Voice','صوت'),aiPolicy.voice]].filter(([,,config])=>config?.model).map(([key,label,config])=><span key={key} className={mode===key?'is-active':undefined}><b>{label}</b> {config.enabled===false?tr('off','متوقف'):<>{AI_SOURCES[config.provider||'openai']||config.provider} · <code dir="ltr">{config.model}</code></>}</span>)}</p>}
      {available===null?<p className="ai-booking-status" role="status">{tr('Checking availability…','جارٍ التحقق من التوفر…')}</p>:!available?<p className="ai-booking-notice" role="status">{tr('AI booking is temporarily unavailable. Please use Personal Booking.','الحجز الذكي غير متاح حالياً. يرجى استخدام الحجز الشخصي.')}</p>:!user?<a className="ai-booking-signin" href="/login" onClick={()=>{try{localStorage.setItem('khalil-auth-return','/#how-to-book');}catch{/* Optional return path. */}}}>{tr('Sign in to start your conversation','سجّل الدخول لبدء محادثتك')}<ArrowUpRight size={13}/></a>:null}
      {aiPolicy?.[mode]?.enabled===false&&<p className="ai-booking-notice" role="status">{tr('This AI mode is currently disabled.','هذا الوضع غير متاح حالياً.')}</p>}
      {Boolean(customerPrice)&&<label className="ai-booking-consent ai-booking-pricing"><input type="checkbox" checked={pricingAccepted} disabled={busy||call!=='idle'} onChange={event=>setPricingAccepted(event.target.checked)}/><span>{tr(`I accept ${new Intl.NumberFormat('en-CA',{style:'currency',currency:aiPolicy.customerPricing.currency}).format(customerPrice/100)} ${aiPolicy.customerPricing.currency} per ${mode==='chat'?'completed Chat reply':`started Voice session (up to ${maxCallSeconds} seconds)`}, billed by manual invoice.`,`أوافق على دفع ${(customerPrice/100).toFixed(2)} ${aiPolicy.customerPricing.currency} لكل ${mode==='chat'?'رد دردشة مكتمل':`جلسة صوتية تبدأ (حتى ${maxCallSeconds} ثانية)`} عبر فاتورة يدوية.`)}</span></label>}
      {saveError&&<p className="ai-booking-notice" role="alert">{tr(saveError,'تعذر حفظ سجل المحادثة. أعد المحاولة قبل مغادرة الصفحة.')} <button type="button" onClick={()=>saveMessages()}>{tr('Retry saving','إعادة الحفظ')}</button></p>}
      {error&&<p className="ai-booking-notice" role="alert">{error}</p>}
      </div>
      </div>
    </div>
  </div>;
}
