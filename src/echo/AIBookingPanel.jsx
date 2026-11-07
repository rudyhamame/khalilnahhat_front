import {createAiTaskWriter} from '../lib/bookingDraftEdits';
import {findVenues} from '../lib/venueSearch';
import {venueSelectionChanges} from '../lib/bookingFlow.mjs';
import {venueArea} from '../lib/addressSearch';
import {speakCallText} from '../lib/piperSpeech';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import {numberedRentalCatalog} from '../lib/numberedRentalCatalog';
import {currentBookingSubject,fieldSubject,sameBookingSubject,subjectName,bookingTransitionIntent} from '../lib/bookingSubject';
import {explicitEquipmentQuantities} from '../lib/equipmentQuantityIntent';
import {aiMessageViewport} from '../lib/aiMessageViewport';
import {useAiTaskNotification} from '../lib/useAiTaskNotification';
import {formatAiDraftTask,resolveAiTaskChange,resolveAiTaskChanges,formatAiTaskNote,aiTaskNoteText,presentAiTask} from '../lib/aiTaskPresentation';
import {explicitEventChoice} from '../lib/explicitEventChoice';
import {bookingNextStep} from '../lib/bookingNextStep';
import SpeechToText from './SpeechToText';
import AiTaskReview from './AiTaskReview';
import ConversationSegmentSeparator from '../components/ConversationSegmentSeparator';
import EchoChatMessage from './EchoChatMessage';
import {aiTaskHistoryKey,readAiTaskHistory,saveAiTaskHistory} from '../lib/aiTaskHistory';
import OrderSignIn from './OrderSignIn';
import GuidedBookingFlow from './GuidedBookingFlow';
import {Fragment,useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {Phone,Send,Square,Pause,Play,Mic,MicOff,ArrowUpRight,History,X,ClipboardList,Hand} from 'lucide-react';
import {apiBaseUrl,apiRequest} from '../lib/api';
import {createBookingConversationRecorder} from '../lib/bookingConversationRecorder';
import {useEventOrder} from './eventOrderContext';
import {aiOrderContext,applyOrderPatch,aiFields,decodePatchValue,validValue,getPath,missingOrderFields,hasEventDraftContent,voiceGreetingInstructions,voiceGreetingText} from '../lib/eventOrderCore.mjs';
import {createVoiceDraftTools} from '../lib/voiceDraftTools';
import {readBookingResponse,voiceConversationContext,claimsDraftChange} from '../lib/aiBookingStream.mjs';
import {handleAvatarVoiceEvent} from '../lib/voiceAvatarMotion';
import {APP_VIEWPORT_TARGETS,scrollToAppSection,scrollToBookingField} from '../lib/bookingViewport';
import './aiBooking.css';
import './compactBooking.css';
import './bookingFlip.css';

// Where each assistant's model comes from, shown to the customer. The model id carries its version (e.g. gpt-realtime-2.1-mini).
// Mono PCM16 at 16 kHz, sent every 20 ms. The output stays silent (no microphone monitoring).
const PCM_WORKLET=`class P extends AudioWorkletProcessor{constructor(){super();this.b=new Int16Array(320);this.n=0;}process(inputs,outputs){for(const output of outputs)for(const channel of output)channel.fill(0);const x=inputs[0]?.[0];if(!x)return true;for(let i=0;i<x.length;i++){const v=Math.max(-1,Math.min(1,x[i]));this.b[this.n++]=v<0?v*32768:v*32767;if(this.n===320){this.port.postMessage(this.b.slice(0).buffer);this.n=0;}}return true;}}registerProcessor('pcm-capture',P);`;
const bytesToBase64=bytes=>{let text='';for(let index=0;index<bytes.length;index+=0x8000)text+=String.fromCharCode(...bytes.subarray(index,index+0x8000));return btoa(text);};
const AI_SOURCES={openai:'OpenAI',openrouter:'OpenRouter',poe:'Poe',alibaba:'Alibaba Cloud (Qwen)',ollama:'Ollama Cloud'};
// Show event choices when the question is asked, independently of draft confirmation.
function showEventChoices(message){
  if(message.role!=='assistant')return false;
  const text=String(message.content||'');
  const question=text.match(/[^?؟]*[?؟]/gu)?.at(-1)||text.split('\n').at(-1);
  const asksEvent=message.fieldPath==='event.type'||/\b(?:what|which)\s+(?:(?:kind|type|sort)\s+of\s+)?(?:event|occasion)\b|(?:ما نوع|أي نوع|ما هي نوع|ما هي الفعالية|أي فعالية|نوع (?:الفعالية|الحفل|المناسبة))/iu.test(question);
  if(!asksEvent)return false;
  const shown=scrollToBookingField('event.type',{source:'assistant-question',keepAssistant:true}).shown===true;
  if(shown)window.dispatchEvent(new Event('echo:event-choices-hint'));
  return shown;
}

function TaskNote({text}){
  const colon=text.indexOf(':');
  if(colon<0)return <div className="ai-booking-task-note" role="note">{text}</div>;
  const field=text.slice(0,colon).trim(),rest=text.slice(colon+1).trim();
  const attribution=rest.match(/\s+(confirmed by .+|marked incorrect by .+|— (?:تم تأكيد المهمة بواسطة|تم الإبلاغ عن خطأ بواسطة) .+)$/u);
  const value=attribution?rest.slice(0,attribution.index).trim():rest;
  return <div className="ai-booking-task-note" role="note"><span className="ai-task-note-field"><span>{field}</span><span className="ai-task-note-value" dir="auto">{value}</span></span>{attribution&&<span className="ai-task-note-attribution">{attribution[1].replace(/^— /u,'')}</span>}</div>;
}

export default function AIBookingPanel({ar,user,token,draftId,onReview,onClose,assistantRequest=0}){
  const orderDraft=useEventOrder();
  const {equipment:activeEquipment,catalog:activeCatalog=[]}=useRentalCatalog();
  const numberedCatalog=useMemo(()=>numberedRentalCatalog(activeCatalog,activeEquipment),[activeCatalog,activeEquipment]);
  const orderRef=useRef(orderDraft?.order);
  const draftContextRef=useRef(orderDraft);draftContextRef.current=orderDraft;
  useEffect(()=>{orderRef.current=orderDraft?.order;},[orderDraft?.order]);
  const tr=(en,arabic)=>ar?arabic:en;
  const [available,setAvailable]=useState(null),[mode,setMode]=useState('chat');
  const [assistantFace,setAssistantFace]=useState(false),[flipSettled,setFlipSettled]=useState(true);
  const flipTimer=useRef(null),flipFrames=useRef([]),flipRoot=useRef(null);
  const flipFace=next=>{clearTimeout(flipTimer.current);flipFrames.current.forEach(cancelAnimationFrame);setFlipSettled(false);flipFrames.current=[requestAnimationFrame(()=>{flipFrames.current.push(requestAnimationFrame(()=>setAssistantFace(next)));})];};
  useEffect(()=>{if(flipSettled)return;flipTimer.current=setTimeout(()=>{setFlipSettled(true);flipRoot.current?.querySelector(assistantFace?'.ai-booking-form-toggle':'.egb-chat-toggle')?.focus({preventScroll:true});},650);return()=>clearTimeout(flipTimer.current);},[assistantFace]);
  useEffect(()=>()=>{flipFrames.current.forEach(cancelAnimationFrame);clearTimeout(flipTimer.current);},[]);
  useEffect(()=>{const review=()=>{if(assistantFace)flipFace(false);};window.addEventListener('echo:booking-review',review);window.addEventListener('echo:booking-form-show',review);return()=>{window.removeEventListener('echo:booking-review',review);window.removeEventListener('echo:booking-form-show',review);};},[assistantFace]);
  const [aiPolicy,setAiPolicy]=useState(null),[pricingAccepted,setPricingAccepted]=useState(false),[maxCallSeconds,setMaxCallSeconds]=useState(300);
  const retryRequest=useRef(null);
  const applyStatus=useCallback(status=>{setAvailable(status.configured);setAiPolicy(status.policy||null);setMaxCallSeconds(status.maxCallSeconds||300);},[]);
  useEffect(()=>setPricingAccepted(false),[aiPolicy?.revision,mode]);
  const [messages,setMessages]=useState([]),[input,setInput]=useState(''),[draft,setDraft]=useState(null),[historyLoading,setHistoryLoading]=useState(Boolean(user&&token&&draftId));
  const [consent]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[call,setCall]=useState('idle');
  const [micMuted,setMicMuted]=useState(false);
  const [voiceLanguage,setVoiceLanguage]=useState(()=>{try{const saved=localStorage.getItem('echo-voice-language');return ['en-CA','ar-SA'].includes(saved)?saved:(ar?'ar-SA':'en-CA');}catch{return ar?'ar-SA':'en-CA';}});
  const [hearing,setHearing]=useState('');
  const [voicePickerOpen,setVoicePickerOpen]=useState(false);
  const voicePicker=useRef(null);
  useEffect(()=>{const dialog=voicePicker.current;if(!dialog)return;if(voicePickerOpen&&!dialog.open)dialog.showModal();else if(!voicePickerOpen&&dialog.open)dialog.close();},[voicePickerOpen]);
  const [browserListening,setBrowserListening]=useState(false),[browserSpeaking,setBrowserSpeaking]=useState(false);
  const endingCall=useRef(Promise.resolve(true));
  const retryEndingCall=useRef(null);
  const [transcriptOpen,setTranscriptOpen]=useState(false);
  useEffect(()=>{if(assistantRequest>0){setAssistantFace(true);setTranscriptOpen(true);}},[assistantRequest]);
  const [dictating,setDictating]=useState(false);
  const [draftChoiceOpen,setDraftChoiceOpen]=useState(false),[startingFresh,setStartingFresh]=useState(false),[draftChoiceError,setDraftChoiceError]=useState('');
  const draftChoice=useRef(null),draftChoicePending=useRef(false),assistantOpening=useRef({visible:false,request:assistantRequest,needsGreeting:false});
  useEffect(()=>{
    // Switching between the form and chat is still the same assistant visit.
    // Only closing the whole panel ends the visit.
    if(orderDraft?.panelOpen===false){assistantOpening.current.visible=false;assistantOpening.current.needsGreeting=false;draftChoicePending.current=false;setDraftChoiceOpen(false);return;}
    // Voice navigation can reopen the assistant or switch its face. Neither
    // event is permission to interrupt an ongoing call with a draft choice.
    if(mode==='voice'||call!=='idle'||voicePickerOpen){
      assistantOpening.current={visible:true,request:assistantRequest,needsGreeting:false};
      draftChoicePending.current=false;setDraftChoiceOpen(false);return;
    }
    if(!assistantFace)return;
    if(!orderDraft?.cloudReady)return;
    const session=orderDraft.assistantSession?.current;
    if(session?.allowDraftChoice!==true){draftChoicePending.current=false;setDraftChoiceOpen(false);}
    const opening=assistantOpening.current;
    if(opening.visible&&opening.request===assistantRequest)return;
    assistantOpening.current={visible:true,request:assistantRequest,needsGreeting:true};
    if(session?.allowDraftChoice===true&&!(session?.draftId===draftId&&session.started)&&orderDraft.active&&hasEventDraftContent(orderDraft.order)){draftChoicePending.current=true;setDraftChoiceError('');setDraftChoiceOpen(true);}
  },[assistantFace,assistantRequest,orderDraft?.panelOpen,orderDraft?.cloudReady,orderDraft?.active,orderDraft?.order,mode,call,voicePickerOpen,draftId]);
  useEffect(()=>{
    const dialog=draftChoice.current;if(!dialog)return;
    const show=draftChoiceOpen&&mode==='chat'&&call==='idle'&&!voicePickerOpen;
    if(show&&!dialog.open)dialog.showModal();else if(!show&&dialog.open)dialog.close();
  },[draftChoiceOpen,mode,call,voicePickerOpen]);
  const continueDraft=()=>{draftChoicePending.current=false;setDraftChoiceOpen(false);};
  const startFreshDraft=async()=>{
    if(startingFresh||busy)return;
    setStartingFresh(true);setDraftChoiceError('');
    try{
      const cleared=await draftContextRef.current?.clear?.();
      if(cleared!==true)throw Error(tr('Your draft could not be cleared. Please retry or continue with it.','تعذر مسح المسودة. حاول مجدداً أو تابع العمل عليها.'));
      draftContextRef.current?.openAssistant?.();
    }catch(problem){setDraftChoiceError(problem.message);setStartingFresh(false);}
  };
  const [saveError,setSaveError]=useState('');
  const taskKey=aiTaskHistoryKey(user?.id||user?._id,draftId);
  const [taskHistory,setTaskHistory]=useState(()=>({key:taskKey,tasks:readAiTaskHistory(taskKey)}));
  const [taskSaveFailed,setTaskSaveFailed]=useState(false);
  const taskSession=useRef({key:taskKey,id:crypto.randomUUID()});
  if(taskSession.current.key!==taskKey)taskSession.current={key:taskKey,id:crypto.randomUUID()};
  const aiTasks=taskHistory.key===taskKey?taskHistory.tasks:[];
  const setAiTasks=update=>setTaskHistory(current=>{const tasks=current.key===taskKey?current.tasks:readAiTaskHistory(taskKey);return {key:taskKey,tasks:typeof update==='function'?update(tasks):update};});
  useEffect(()=>{if(taskHistory.key!==taskKey)setTaskHistory({key:taskKey,tasks:readAiTaskHistory(taskKey)});},[taskKey,taskHistory.key]);
  useEffect(()=>{if(taskHistory.key===taskKey)setTaskSaveFailed(!saveAiTaskHistory(taskKey,taskHistory.tasks));},[taskKey,taskHistory]);
  const notifyTaskReady=useAiTaskNotification();
  const noteTasks=labels=>{if(labels.length){setAiTasks(current=>[...current,...labels.map(task=>({id:crypto.randomUUID(),...(typeof task==='string'?{label:task}:task),confirmed:typeof task==='object'&&task.confirmed===true?true:null,createdAt:new Date().toISOString(),sessionId:taskSession.current.id}))]);notifyTaskReady();}};
  const aiTaskWriter=useRef(null);
  if(!aiTaskWriter.current)aiTaskWriter.current=createAiTaskWriter();
  const applyAndSaveAiTasks=tasks=>{
    const scope=taskKey;
    return aiTaskWriter.current.enqueue(tasks.map(task=>({task,changes:resolveAiTaskChanges(task)})),{
      isCurrent:()=>taskSession.current.key===scope,
      commit:changes=>applyVoiceUpdates(changes,{confirmed:true}),
      record:noteTasks,
      onError:problem=>setError(problem.message),
    }).then(result=>{
      if(taskSession.current.key===scope&&!result.saved&&tasks.length)setError(tr('Your draft changes could not be saved. Retry the pending AI task.','تعذر حفظ تغييرات المسودة. أعد محاولة المهمة المعلّقة.'));
      return result;
    });
  };
  const [confirmingTask,setConfirmingTask]=useState(null);
  const taskConfirmation=useRef(null);
  const taskModification=useRef(null);
  const pendingSubject=useRef(null),pendingEquipmentQuantity=useRef(null);
  const approvedTransition=useRef(null);
  const waitingTransition=()=>{
    if(pendingSubject.current)return pendingSubject.current;
    const last=history.current.findLast(message=>message.role==='assistant');
    if(last&&/would you like to keep working|هل تريد متابعة/iu.test(last.content)&&Object.hasOwn(APP_VIEWPORT_TARGETS,last.section))return {target:{section:last.section,face:last.face},step:{section:last.section,face:last.face}};
    return null;
  };

  const conversationSubject=()=>{
    const visual=currentBookingSubject(),approved=approvedTransition.current;
    if(!approved)return visual;
    if(sameBookingSubject(visual,approved.target)){approvedTransition.current=null;return visual;}
    if(!visual||sameBookingSubject(visual,approved.from))return approved.target;
    approvedTransition.current=null;return visual;
  };
  const transitionQuestion=transition=>{
    const pending=(sharedContext.current?.tasks||[]).filter(task=>task.confirmed===null).flatMap(resolveAiTaskChanges);
    const order=applyOrderPatch(orderRef.current,pending),next=bookingNextStep(order,ar);
    if(next.path&&sameBookingSubject(fieldSubject(next.path),transition.target))return next;
    if(transition.step.path&&sameBookingSubject(fieldSubject(transition.step.path),transition.target)&&[null,undefined,''].includes(getPath(order,transition.step.path)))return transition.step;
    const target=transition.target;
    const defaults=target.section==='availability'?(target.face==='venue'?['event.venue.name','What is the venue name or address?','ما اسم مكان الفعالية أو عنوانه؟']:['event.type','What kind of event are you planning?','ما نوع الفعالية التي تخطط لها؟']):({work:['music.djRequested','Would you like to add DJ Khalil service?','هل تريد إضافة خدمة دي جي خليل؟'],setup:['music.mcRequested','Would you like MC hosting and announcements?','هل تريد خدمة تقديم الحفل والإعلانات؟'],simulation:['event.setup.requirements','What would you like for the room setup?','ماذا تريد لتجهيز المكان؟'],booking:['customer.fullName','What name should we use for your booking?','ما الاسم الذي تريد استخدامه للحجز؟']})[target.section];
    if(defaults&&[null,undefined,''].includes(getPath(order,defaults[0])))return {path:defaults[0],text:defaults[ar?2:1]};
    return {text:tr(`What would you like to add or change in ${subjectName(target)}?`,`ماذا تريد إضافته أو تغييره في ${subjectName(target,true)}؟`),section:target.section,face:target.face};
  };
  const approveTransition=transition=>{
    approvedTransition.current={from:conversationSubject(),target:transition.target};
    pendingSubject.current=null;
    if(transition.step.path)scrollToBookingField(transition.step.path,{source:'client-approved',keepAssistant:true});
    else scrollToAppSection(transition.target.section,{source:'client-approved',face:transition.target.face});
  };
  useEffect(()=>{approvedTransition.current=null;pendingSubject.current=null;},[taskKey]);
  const prepareQuestion=(step,userText='')=>{
    const target=step.path?fieldSubject(step.path):step.section&&step.section!=='none'?{section:step.section,face:step.face}:null;
    const current=conversationSubject();
    if(current&&target&&!sameBookingSubject(current,target)){
      if(bookingTransitionIntent(userText,target)==='continue'){
        approveTransition({target,step});return step;
      }
      pendingSubject.current={target,step};
      return {...step,path:undefined,section:target.section,face:target.face,blocked:true,text:tr(`Would you like to keep working on ${subjectName(current)}, or shall we continue to ${subjectName(target)}?`,`هل تريد متابعة ${subjectName(current,true)}، أم ننتقل إلى ${subjectName(target,true)}؟`)};
    }
    return step;
  };
  const [venueSearch,setVenueSearch]=useState(null);
  const venueSearchAbort=useRef(null);
  useEffect(()=>{venueSearchAbort.current?.abort();setVenueSearch(null);return()=>venueSearchAbort.current?.abort();},[taskKey]);
  const runVenueSearch=async query=>{
    const clean=query.trim().slice(0,160);venueSearchAbort.current?.abort();
    const controller=new AbortController();venueSearchAbort.current=controller;const searchId=crypto.randomUUID();
    approveTransition({target:{section:'availability',face:'venue'},step:{path:'event.venue.name'}});
    setVenueSearch({id:searchId,query:clean,items:[],busy:true,error:'',mode});setTranscriptOpen(true);
    try{
      const items=await findVenues(clean,{token,signal:controller.signal});
      if(controller.signal.aborted)return null;
      setVenueSearch({id:searchId,query:clean,items,busy:false,mode,error:items.length?'':tr('No matching places found. Try a shorter name or add the street or city.','لا توجد نتائج مطابقة. جرّب اسماً أقصر أو أضف الشارع أو المدينة.')});
      return items.length?tr('Which result in Venue Details matches your venue? Select it on the map, then press Send to AI to add it to your draft.','أي نتيجة في تفاصيل المكان تطابق مكان فعاليتك؟ اخترها على الخريطة ثم اضغط إرسال للمساعد لإضافتها إلى المسودة.'):tr('I could not find a matching venue. Refine the venue name or address in Find a venue in Venue Details.','لم أجد مكاناً مطابقاً. عدّل اسم المكان أو عنوانه في تفاصيل المكان.');
    }catch(problem){
      if(controller.signal.aborted)return null;
      setVenueSearch({id:searchId,query:clean,items:[],busy:false,mode,error:problem.message});
      return tr('The venue search could not finish. Retry Find a venue in Venue Details; your draft has not changed.','تعذر إكمال البحث عن المكان. أعد المحاولة في تفاصيل المكان؛ لم تتغير المسودة.');
    }
  };
  const chooseVenueResult=place=>{
    if(!draftAvailable()||busy||taskConfirmation.current)return;
    const venueFields=venueSelectionChanges(place,venueArea(place));
    if(venueFields.some(change=>!aiFields.some(field=>field.key===change.path&&validValue(field,change.value)))){setError(tr('This result has incomplete or invalid location data. Refine your search.','تحتوي النتيجة على بيانات موقع غير صالحة. عدّل البحث.'));return;}
    const formatted=formatAiDraftTask(venueFields[0],{ar});
    const valueText=[place.name,place.address].filter(Boolean).join(' · ').slice(0,Math.max(0,298-formatted.field.length));
    const task={...formatted,valueText,label:`${formatted.field}: ${valueText}`,venueFields};
    void applyAndSaveAiTasks([task]).then(result=>{
      if(result.saved&&result.draftUpdated){
        const next=prepareQuestion(bookingNextStep(result.order,ar));
        const content=tr(`Venue added: ${place.name}. You can modify it in AI tasks.`,`تمت إضافة المكان: ${place.name}. يمكنك تعديله في مهام المساعد.`)+'\n\n'+next.text;
        const current=resources.current,sourceMode=venueSearch?.mode||mode;
        if(sourceMode==='voice'&&current.replyToSelection){
          current.replyToSelection(content,result.order);
        }else{
          append({role:'assistant',content,mode:sourceMode,fieldPath:next.path||undefined,section:next.section||'availability',face:next.face||'venue'});
          if(sourceMode==='voice')void current.speakReply?.(content);
        }
        if(next.path&&!next.blocked)scrollToBookingField(next.path,{source:'assistant',keepAssistant:true});
      }
    }).catch(problem=>setError(problem.message));
    taskModification.current=null;setModifyingTask(null);
    setVenueSearch(null);
    return true;
  };
  const venuePublisher=orderDraft?.setAiVenueSearch,venueChoiceBridge=orderDraft?.aiVenueChoice;
  useEffect(()=>{
    venuePublisher?.({...venueSearch,draftId,canSend:!busy&&!confirmingTask&&!historyLoading});
  },[venuePublisher,venueSearch,draftId,busy,confirmingTask,historyLoading]);
  useEffect(()=>{
    if(!venueChoiceBridge)return;
    venueChoiceBridge.current=chooseVenueResult;
    return()=>{if(venueChoiceBridge.current===chooseVenueResult)venueChoiceBridge.current=null;};
  },[venueChoiceBridge,chooseVenueResult]);
  useEffect(()=>()=>venuePublisher?.(null),[venuePublisher,taskKey]);
  const [modifyingTask,setModifyingTask]=useState(null);
  useEffect(()=>{taskModification.current=null;setModifyingTask(null);},[taskKey]);
  const clientName=[user?.firstName,user?.lastName].filter(Boolean).join(' ')||user?.fullName||user?.name||tr('Client','العميل');
  const reviewTask=async(id,confirmed)=>{
    if(busy||taskConfirmation.current)return;
    const task=aiTasks.find(item=>item.id===id);
    if(!task||(!confirmed&&task.confirmed===confirmed))return;
    const scope=taskKey;
    if(confirmed){
      const changes=resolveAiTaskChanges(task),change=changes[0];
      if(!change){setError(tr('This older task does not contain an exact editable value. Ask Echo to make the change again.','لا تحتوي هذه المهمة السابقة على قيمة دقيقة قابلة للتعديل. اطلب من إيكو إجراء التغيير مجدداً.'));return;}
      taskConfirmation.current=id;setConfirmingTask(id);setError('');
      try{
        const result=await applyVoiceUpdates(changes,{confirmed:true});
        if(taskSession.current.key!==scope)return;
        if(result.rejectedFields.length||!changes.every(change=>result.updatedFields.some(field=>field.path===change.path)))throw Error(tr('The draft change could not be applied.','تعذر تطبيق التغيير على المسودة.'));
        const saved=result.saved;
        if(taskSession.current.key!==scope)return;
        if(saved!==true)throw Error(tr('The change is visible, but could not be saved to your account. Please retry confirming it.','ظهر التغيير لكن تعذر حفظه في حسابك. حاول تأكيده مجدداً.'));
      }catch(problem){if(taskSession.current.key===scope)setError(problem.message);return;}
      finally{taskConfirmation.current=null;setConfirmingTask(null);}
    }
    setAiTasks(current=>current.map(item=>item.id===id?{...item,confirmed}:item));
    if(task.confirmed===confirmed)return;
    const content=formatAiTaskNote(task,confirmed,clientName,ar);
    append({role:'user',content});
    if(!confirmed){modifyTask(id,{incorrect:true});return;}
    if(confirmed){
      const remaining=(sharedContext.current.tasks||[]).filter(item=>item.id!==id&&item.confirmed===null).flatMap(resolveAiTaskChanges);
      let next=bookingNextStep(applyOrderPatch(orderRef.current,remaining),ar);
      if(!next.path&&remaining.length)next.text=tr('Please confirm the remaining AI tasks, then we can review your booking request.','يرجى تأكيد مهام المساعد المتبقية، ثم يمكننا مراجعة طلب الحجز.');
      next=prepareQuestion(next);
      setTranscriptOpen(true);
      const lastAssistant=history.current.findLastIndex(message=>message.role==='assistant');
      const alreadyAsked=lastAssistant>=0&&history.current[lastAssistant].content.trim().endsWith(next.text)&&!history.current.slice(lastAssistant+1).some(message=>message.role==='user'&&!aiTaskNoteText(message.content,clientName,ar));
      if(alreadyAsked)return;
      append({role:'assistant',content:next.text,mode:'chat',fieldPath:next.path||undefined,section:next.section,face:next.face});
      if(next.path&&!next.blocked)scrollToBookingField(next.path,{source:'assistant',keepAssistant:true});
    }
  };
  const modifyTask=(id,{incorrect=false}={})=>{
    if(busy||taskConfirmation.current||historyLoading||browserSpeaking||call==='connecting')return;
    const task=aiTasks.find(item=>item.id===id);
    if(!task||(!incorrect&&task.confirmed===null))return;
    const change=resolveAiTaskChange(task),view=presentAiTask(task,ar);
    pendingSubject.current=null;pendingEquipmentQuantity.current=null;
    const modification={key:taskKey,id,path:change?.path};
    taskModification.current=modification;setModifyingTask(modification);
    const field=view.field||view.label;
    const content=incorrect||task.confirmed===false?tr(`What is the correct ${field.toLowerCase()}?`,`ما القيمة الصحيحة لحقل ${field}؟`):tr(`What would you like to use for ${field} instead?`,`ما القيمة الجديدة التي تريد استخدامها لحقل ${field}؟`);
    setError('');setTranscriptOpen(true);
    append({role:'assistant',content,mode:'chat',fieldPath:change?.path});
    requestAnimationFrame(()=>document.getElementById('ai-booking-message')?.focus({preventScroll:true}));
  };
  const [liveBookingData,setLiveBookingData]=useState(null);
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
  const sharedContext=useRef(null);
  sharedContext.current={tasks:aiTasks,sessionId:taskSession.current.id,modification:modifyingTask?.key===taskKey?modifyingTask:null,liveBookingData,equipment:activeEquipment,numberedCatalog,selectedServiceId:orderDraft?.rentalServiceId,venueSearch:venueSearch?{query:venueSearch.query,busy:venueSearch.busy,awaitingClientChoice:true}:null,nextBookingQuestion:bookingNextStep(applyOrderPatch(orderRef.current,(aiTasks||[]).filter(task=>task.confirmed===null).flatMap(resolveAiTaskChanges)),ar),currentSubject:conversationSubject(),pendingSubject:pendingSubject.current?.target||null,quantityRequired:pendingEquipmentQuantity.current};
  const assistantContext=()=>voiceConversationContext(history.current,{...(orderRef.current?aiOrderContext(orderRef.current):{}),activeCatalog:sharedContext.current.equipment.map(({id,name,minQuantity,availableQuantity,availabilityStatus,isSet,setItems})=>({id,name,minQuantity,availableQuantity,availabilityStatus,isSet,setItems}))},sharedContext.current);
  const availabilityYear=Number(orderDraft?.order.event.date?.slice(0,4))||new Date().getFullYear();
  useEffect(()=>{
    if(call!=='active')return;let current=true;
    const load=()=>apiRequest('/ai-booking/booking-data?'+new URLSearchParams({year:availabilityYear}),{token}).then(data=>{if(current)setLiveBookingData(data);}).catch(()=>{if(current)setLiveBookingData({year:availabilityYear,status:'unavailable'});});
    load();const timer=setInterval(load,60000);window.addEventListener('focus',load);
    return()=>{current=false;clearInterval(timer);window.removeEventListener('focus',load);};
  },[call,availabilityYear,token]);
  useEffect(()=>{
    const channel=resources.current?.channel;if(call!=='active'||!channel)return;
    try{channel.send(JSON.stringify({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:assistantContext()}]}}));}catch{/* A closing call cannot block a draft edit. */}
  },[orderDraft?.order,orderDraft?.rentalServiceId,numberedCatalog,activeEquipment,call,liveBookingData,messages,aiTasks,modifyingTask]);
  const saveMessages=useCallback((items=[])=>{
    if(!token||!user||!consent)return;
    if(recorder.current?.token!==token||recorder.current?.draftId!==draftId){
      recorder.current={token,draftId,writer:createBookingConversationRecorder(async body=>{
        const response=await fetch(`${apiBaseUrl}/ai-booking/conversations`,{method:'POST',keepalive:true,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify(body)});
        if(!response.ok)throw new Error('History save failed');
      },draftId||undefined)};
    }
    const writer=recorder.current.writer;
    (items.length?writer.save(items):writer.retry()).then(()=>{if(alive.current)setSaveError('');}).catch(()=>{if(alive.current)setSaveError('Conversation history could not be saved. Retry before leaving this page.');});
  },[token,user,consent,draftId]);
  const conversationSegment=useRef({id:crypto.randomUUID(),mode:null,lastAt:0,interrupted:false});
  useEffect(()=>{if(orderDraft?.panelOpen===false&&!['active','connecting'].includes(call))conversationSegment.current.interrupted=true;},[orderDraft?.panelOpen,call]);
  const append=useCallback((message,save=true)=>{
    const messageMode=['chat','voice'].includes(message.mode)?message.mode:mode,now=Date.now();
    const segment=conversationSegment.current;
    if(segment.interrupted||segment.mode&&segment.mode!==messageMode||segment.lastAt&&now-segment.lastAt>15*60*1000)segment.id=crypto.randomUUID();
    segment.mode=messageMode;segment.lastAt=now;segment.interrupted=false;
    const item={...message,id:crypto.randomUUID(),mode:messageMode,segmentId:segment.id,createdAt:new Date(now).toISOString()};
    const next=[...history.current,item].slice(-1000);history.current=next;setMessages(next);
    showEventChoices(item);
    if(save)saveMessages([item]);
    return item;
  },[mode,saveMessages]);
  useEffect(()=>{
    if(!user||!token||!draftId)return;
    let current=true;history.current=[];setMessages([]);setHistoryLoading(true);setError('');
    apiRequest(`/ai-booking/conversations/${encodeURIComponent(draftId)}`,{token}).then(({item})=>{
      if(!current)return;
      const restored=(item.messages||[]).slice(-1000).map(message=>({...message,id:message.id||crypto.randomUUID()}));
      history.current=restored;setMessages(restored);
    }).catch(problem=>{if(current&&problem.status!==404)setError(tr('This draft’s chat history could not be loaded. Please retry.','تعذر تحميل سجل محادثة هذه المسودة. يرجى إعادة المحاولة.'));})
      .finally(()=>{if(current)setHistoryLoading(false);});
    return()=>{current=false;};
  },[user,token,draftId]);
  useEffect(()=>{
    const opening=assistantOpening.current;
    if(!opening.visible||!opening.needsGreeting||mode!=='chat'||historyLoading||draftChoicePending.current||draftChoiceOpen||!orderDraft?.cloudReady||available!==true||aiPolicy?.chat?.enabled===false||busy)return;
    opening.needsGreeting=false;
    const session=orderDraft.assistantSession?.current;
    if(session?.draftId===draftId&&(session.started||session.greeted))return;
    if(orderDraft.assistantSession)orderDraft.assistantSession.current={...session,draftId,greeted:true};
    const order=orderRef.current;
    const continuing=hasEventDraftContent(order)||history.current.length>0;
    const name=user?.firstName?.trim();
    const greeting=continuing?tr('Let’s continue planning your event.','لنتابع التخطيط لفعاليتك.'):tr(`Hi${name?' '+name:''}! I’m Echo’s AI booking assistant. I’ll help you plan your event.`,`مرحباً${name?' '+name:''}! أنا مساعد الحجز الآلي لإيكو. سأساعدك في التخطيط لفعاليتك.`);
    const pending=(sharedContext.current.tasks||[]).filter(task=>task.confirmed===null).flatMap(resolveAiTaskChanges);
    const next=bookingNextStep(applyOrderPatch(order,pending),ar);
    if(!next.path&&pending.length)next.text=tr('Please confirm your pending AI tasks before reviewing the booking request.','يرجى تأكيد مهام المساعد المعلّقة قبل مراجعة طلب الحجز.');
    setTranscriptOpen(true);
    append({role:'assistant',content:[greeting,next.text].filter(Boolean).join('\n\n'),mode:'chat',fieldPath:next.path||undefined});
  },[assistantFace,assistantRequest,orderDraft?.panelOpen,orderDraft?.cloudReady,historyLoading,draftChoiceOpen,mode,available,aiPolicy,busy,append,user,ar]);
  const closeCall=useCallback(()=>{
    const current=resources.current;resources.current={};
    if(alive.current){setReviewing(false);setHearing('');setBrowserListening(false);setBrowserSpeaking(false);}
    voiceMotion.current={};
    clearTimeout(current.timer);clearTimeout(current.voiceReplyTimer);clearTimeout(current.nativeReadyTimer);clearTimeout(current.readyWarmTimer);clearTimeout(current.speechTimer);clearTimeout(current.reviewTimer);clearTimeout(current.openingTimer);current.abort?.abort();
    if(current.ttsSource){try{current.ttsSource.stop();}catch{}current.ttsSource=null;}
    current.stopPlayback?.();current.mic?.disconnect();current.micSource?.disconnect();
    current.recognition?.stop?.();if(current.speechSynthesis)window.speechSynthesis?.cancel();
    current.remoteSource?.disconnect();current.analyser?.disconnect();current.meterContext?.close().catch(()=>{});current.cueContext?.close().catch(()=>{});
    if(current.channel){current.channel.onopen=null;current.channel.onmessage=null;current.channel.close();}current.peer?.close();current.stream?.getTracks().forEach(track=>track.stop());
    if(current.audio){current.audio.pause();current.audio.srcObject=null;}
    if(current.callId){
      retryEndingCall.current=()=>{
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
        return fetch(`${apiBaseUrl}/ai-booking/voice/end`,{method:'POST',keepalive:true,signal:controller.signal,headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({callId:current.callId,usage:current.usage})}).then(response=>response.ok).catch(()=>false).finally(()=>clearTimeout(timer));
      };
      endingCall.current=retryEndingCall.current();
    }
    return endingCall.current;
  },[token]);
  const conversationStatus=useRef(null);conversationStatus.current={busy,historyLoading};
  useEffect(()=>draftContextRef.current?.registerConversationSaver?.(async()=>{
    if(conversationStatus.current.busy||conversationStatus.current.historyLoading||taskConfirmation.current)throw new Error(tr('Wait for Echo to finish before submitting your booking.','انتظر حتى ينتهي إيكو قبل إرسال طلب الحجز.'));
    await closeCall();setCall('idle');
    await aiTaskWriter.current.flush();
    const current=recorder.current;
    if(current?.draftId===draftId)await current.writer.retry();
  }),[draftId,closeCall]);
  useEffect(()=>{
    alive.current=true;
    apiRequest('/ai-booking/status').then(status=>{if(alive.current)applyStatus(status);}).catch(()=>{if(alive.current)setAvailable(false);});
    const leave=()=>closeCall();window.addEventListener('pagehide',leave);
    return()=>{alive.current=false;request.current?.abort();closeCall();window.removeEventListener('pagehide',leave);};
  },[closeCall,applyStatus]);
  useEffect(()=>{log.current?.scrollTo({top:log.current.scrollHeight,behavior:'instant'});},[messages,busy,streamReply]);
  useEffect(()=>{if(orderDraft?.clearing){request.current?.abort();closeCall();setCall('idle');}},[orderDraft?.clearing,closeCall]);
  const customerPrice=aiPolicy?.customerPricing?.policy==='manual_invoice'?aiPolicy.customerPricing[mode==='chat'?'chatReplyCents':'voiceSessionCents']:0;
  const permitted=available&&user&&token&&consent&&(!orderDraft||(orderDraft.cloudReady&&!orderDraft.clearing&&!['conflict','delete-conflict','load-failed'].includes(orderDraft.saveState)))&&aiPolicy?.[mode]?.enabled!==false&&(!customerPrice||pricingAccepted);
  const chatPrice=aiPolicy?.customerPricing?.policy==='manual_invoice'?aiPolicy.customerPricing.chatReplyCents:0;
  const chatPermitted=Boolean(available&&user&&token&&consent&&aiPolicy?.chat?.enabled!==false&&(!chatPrice||pricingAccepted));
  const draftAvailable=()=>{const context=draftContextRef.current;return !context||(context.cloudReady&&!context.clearing&&!['conflict','delete-conflict','load-failed'].includes(context.saveState));};
  const pricingFields=pricingAccepted&&aiPolicy?{pricingConsentRevision:aiPolicy.revision}:{};
  const refreshPolicy=()=>apiRequest('/ai-booking/status').then(status=>{if(alive.current)applyStatus(status);}).catch(()=>{});
  const send=async(text,messageMode='chat')=>{
    if(!text.trim()||busy||taskConfirmation.current||draftChoicePending.current||dictating||historyLoading||!chatPermitted)return null;
    const transition=waitingTransition();
    if(transition){
      const intent=bookingTransitionIntent(text,transition.target);
      if(intent==='continue'){
        append({role:'user',content:text,mode:messageMode});
        const question=transitionQuestion(transition);
        approveTransition({...transition,step:question});
        const reply=question.text;
        append({role:'assistant',content:reply,mode:messageMode,fieldPath:question.path,section:transition.target.section,face:transition.target.face});setInput('');return reply;
      }else if(intent==='stay'){
        pendingSubject.current=null;append({role:'user',content:text,mode:messageMode});
        const current=conversationSubject(),reply=tr(`Of course. What else would you like to add or change in ${subjectName(current)}?`,`بالتأكيد. ماذا تريد إضافته أو تغييره في ${subjectName(current,true)}؟`);
        append({role:'assistant',content:reply,mode:messageMode,section:current?.section,face:current?.face});setInput('');return reply;
      }else pendingSubject.current=null;
    }
    draftContextRef.current?.markAssistantConversationStarted?.();
    setBusy(true);setStreamReply('');setError('');setInput('');
    setTranscriptOpen(true);
    const previous=history.current;
    const next=[...previous,{role:'user',content:text.trim().slice(0,2000)}].slice(-15).map(message=>({...message,content:message.content.slice(0,2000)}));
    const sent=append({...next.at(-1),mode:messageMode},false);
    const requestId=retryRequest.current?.text===text?retryRequest.current.id:sent.id;retryRequest.current={text,id:requestId};
    const controller=new AbortController();request.current=controller;
    try{
      const latestQuestion=previous.findLast(message=>message.role==='assistant');
      const explicitVenue=/^(?:venue|venue name|location|المكان|مكان الفعالية)\s*[:：]/iu.test(text.trim());
      const answeringVenue=(latestQuestion?.fieldPath==='event.venue.name'||taskModification.current?.path==='event.venue.name')&&!/^(?:yes|no|not sure|i don.t know|skip|cancel|نعم|لا|لا أعرف|إلغاء)[.!\s]*$/iu.test(text.trim());
      if(explicitVenue||answeringVenue){
        const query=text.trim().replace(/^(?:venue|venue name|location|المكان|مكان الفعالية)\s*[:：]\s*/iu,'');
        if(query.length>=3){const content=await runVenueSearch(query);if(!content)return null;const reply=append({role:'assistant',content,mode:messageMode,section:'availability',face:'venue'},false);saveMessages([sent,reply]);retryRequest.current=null;return content;}
      }
      const modification=taskModification.current?.key===taskKey?taskModification.current:null;
      const eventType=(!modification?.path||modification.path==='event.type')?explicitEventChoice(text,activeCatalog,aiFields.find(field=>field.key==='event.type')?.options||[]):null;
      const directFields=eventType?[{path:'event.type',value:eventType}]:[];
      const waitingQuantity=pendingEquipmentQuantity.current,counts=explicitEquipmentQuantities(text);
      if(waitingQuantity?.items.length===1&&counts.length===1&&/^(?:[\d٠-٩]+|one|two|three|four|five|six|seven|eight|nine|ten|واحد|واحدة|اثنين|اثنان|ثلاثة|ثلاث|اربعة|خمسة)[.!\s]*$/iu.test(text.trim())){
        const id=waitingQuantity.items[0];
        directFields.push({path:'equipment',value:[...waitingQuantity.base.filter(row=>row.id!==id),{id,quantity:counts[0]}]});
      }
      const response=await fetch(`${apiBaseUrl}/ai-booking/chat`,{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson',Authorization:`Bearer ${token}`},body:JSON.stringify({responseFormat:'patch',requestId,...pricingFields,messages:next,context:assistantContext(),consent:true,...(draftAvailable()&&orderRef.current?{order:aiOrderContext(orderRef.current)}:{})}),signal:controller.signal});
      const data=await readBookingResponse(response);
      if(!alive.current)return;
      setDraft(data.draft||(Array.isArray(data.orderPatch)?{}:null));
      let proposedFields=[],rejectedFields=[],quantityQuestion=null,venueQuestion=null,changesSaved=false;
      const responsePatch=Array.isArray(data.orderPatch)?data.orderPatch.filter(change=>!directFields.some(field=>field.path===change.path)):[];
      const changes=[...directFields,...responsePatch];
      if(changes.length){
        const result=await applyVoiceUpdates(changes,{userText:text});
        changesSaved=result.saved===true;proposedFields=result.proposedFields||[];rejectedFields=result.rejectedFields;quantityQuestion=result.quantityQuestion;venueQuestion=result.venueQuestion;
      }
      if(!proposedFields.length&&!rejectedFields.length&&!quantityQuestion&&!venueQuestion&&claimsDraftChange(data.reply))throw new Error(tr('Echo described a change but did not return a reviewable AI task. Your draft was not changed. Please retry your message.','وصف إيكو تغييراً لكنه لم يُرجع مهمة قابلة للمراجعة. لم تتغير المسودة. يرجى إعادة إرسال رسالتك.'));
      // Acknowledge completed edits only after applying and saving their exact values.
      let replyText=rejectedFields.length?tr('I could not apply these changes: ','تعذر تطبيق هذه التغييرات: ')+[...new Set(rejectedFields)].join(', '):proposedFields.length?(changesSaved?tr('Your draft is updated. You can modify these details in AI tasks.','تم تحديث المسودة. يمكنك تعديل هذه التفاصيل في مهام المساعد.'):tr('Your changes could not be saved. Retry the pending AI task.','تعذر حفظ التغييرات. أعد محاولة المهمة المعلّقة.')):data.reply;
      const pending=(sharedContext.current.tasks||[]).filter(task=>task.confirmed===null).flatMap(resolveAiTaskChanges);
      let nextStep=proposedFields.length&&!rejectedFields.length&&orderRef.current?bookingNextStep(applyOrderPatch(orderRef.current,[...pending,...proposedFields]),ar):null;
      if(nextStep&&!nextStep.path&&pending.length)nextStep.text=tr('Please confirm your pending AI tasks before reviewing the booking request.','يرجى تأكيد مهام المساعد المعلّقة قبل مراجعة طلب الحجز.');
      if(venueQuestion){nextStep={section:'availability',face:'venue'};replyText=(proposedFields.length?replyText+'\n\n':'')+venueQuestion;}
      else if(quantityQuestion){nextStep=null;replyText=(proposedFields.length?replyText+'\n\n':'')+quantityQuestion;}
      else if(nextStep){nextStep=prepareQuestion(nextStep,text);replyText+=`\n\n${nextStep.text}`;}
      else{const inferred=aiMessageViewport({role:'assistant',content:replyText},ar),prepared=prepareQuestion({text:replyText,section:inferred?.section||data.section,face:inferred?.face||data.face},text);if(prepared.blocked){nextStep=prepared;replyText=prepared.text;}}
      const reply=append({role:'assistant',content:replyText,mode:messageMode,fieldPath:nextStep?.path||undefined,section:quantityQuestion?'setup':nextStep?.section||data.section,face:nextStep?.face||data.face},false);
      // Explicit presentation requests take precedence over field-following.
      // Proposal navigation never applies values to the draft.
      if(!quantityQuestion&&!venueQuestion&&!nextStep?.blocked){
        if(nextStep?.path)scrollToBookingField(nextStep.path,{source:'assistant',keepAssistant:true});
        else if(data.section&&data.section!=='none'){
          const here=conversationSubject(),target={section:data.section,face:data.face};
          if(!here||sameBookingSubject(here,target))scrollToAppSection(data.section,{source:'assistant',face:data.face});
        }
      }
      saveMessages([sent,reply]);retryRequest.current=null;
      return replyText;
    }catch(problem){if(alive.current&&problem.name!=='AbortError'){setError(problem.message);if([402,409,503].includes(problem.status)){setPricingAccepted(false);refreshPolicy();}setMessages(previous);history.current=previous;setInput(current=>current.trim()?current:text);}return null;}
    finally{if(alive.current&&request.current===controller){setBusy(false);setStreamReply('');request.current=null;}}
  };
  // Validate client-provided edits, apply and save them, then record completed AI tasks.
  const applyVoiceUpdates=async(updates,{confirmed=false,userText=''}={})=>{
    const context=draftContextRef.current;
    const rejectedFields=[],accepted=new Map();
    if(!context?.signedIn||!draftAvailable()||!Array.isArray(updates))return {draftUpdated:false,updatedFields:[],rejectedFields:Array.isArray(updates)?updates.map(change=>String(change?.path||'unknown')):[],proposedFields:[],reason:'draft_unavailable',submitted:false,reviewRequiredForSubmission:true};
    for(const change of updates.slice(0,40)){
      const field=aiFields.find(field=>field.key===change?.path);
      const value=field?decodePatchValue(field,change?.value):undefined;
      if(!field||!validValue(field,value)){rejectedFields.push(String(change?.path||'unknown'));continue;}
      accepted.set(field.key,value);
    }
    let patch=[...accepted].map(([path,value])=>({path,value})),quantityQuestion=null,venueQuestion=null;
    if(!confirmed){
      const venueName=patch.find(change=>change.path==='event.venue.name'&&typeof change.value==='string'&&change.value.trim());
      if(venueName){
        const city=patch.find(change=>change.path==='event.venue.city')?.value;
        const query=[venueName.value,city&&!venueName.value.toLowerCase().includes(String(city).toLowerCase())?city:null].filter(Boolean).join(' ');
        venueQuestion=await runVenueSearch(query);
        patch=patch.filter(change=>!change.path.startsWith('event.venue.')||change.path==='event.venue.setting');
      }
      const equipmentChange=patch.find(change=>change.path==='equipment');
      if(equipmentChange){
        const previous=(sharedContext.current.tasks||[]).findLast(task=>task.path==='equipment'&&task.confirmed===null)?.value||getPath(orderRef.current,'equipment')||[];
        const changed=equipmentChange.value.filter(row=>!previous.some(old=>old.id===row.id&&old.quantity===row.quantity));
        const counts=explicitEquipmentQuantities(userText);
        const requiringQuantity=changed.length?changed:!counts.length&&equipmentChange.value.length>=previous.length?equipmentChange.value:[];
        if(requiringQuantity.some(row=>!counts.includes(row.quantity))){
          pendingEquipmentQuantity.current={items:requiringQuantity.map(row=>row.id),base:previous};
          const names=requiringQuantity.map(row=>activeEquipment.find(item=>item.id===row.id)?.name||row.id).join(', ');
          quantityQuestion=tr(`How many of ${names} would you like? I need your quantity before creating the equipment task.`,`كم قطعة تريد من ${names}؟ أحتاج إلى تحديد الكمية قبل إنشاء مهمة المعدات.`);
          patch=patch.filter(change=>change.path!=='equipment');
        }else pendingEquipmentQuantity.current=null;
      }
      const applied=patch.length?await applyAndSaveAiTasks(patch.map(change=>formatAiDraftTask(change,{ar,equipment:activeEquipment}))):{draftUpdated:false,updatedFields:[],rejectedFields:[],saved:false};
      rejectedFields.push(...applied.rejectedFields);
      const modification=taskModification.current;
      if(modification?.key===taskKey&&patch.some(change=>change.path===modification.path)){
        taskModification.current=null;setModifyingTask(null);
      }
      if(rejectedFields.length)setError(tr('Some proposed values were invalid: ','بعض القيم المقترحة غير صالحة: ')+[...new Set(rejectedFields)].join(', '));
      return {...applied,proposedFields:patch,rejectedFields,quantityQuestion,venueQuestion,awaitingVenueSelection:Boolean(venueQuestion),awaitingQuantity:Boolean(quantityQuestion),awaitingConfirmation:patch.length>0&&!applied.saved,message:venueQuestion||quantityQuestion||(applied.saved?'Changes have been applied and saved to the draft automatically. Completed tasks can be modified at any time.':'The changes could not be saved. Explain the error and retry the pending task; do not claim success.'),submitted:false,reviewRequiredForSubmission:true};
    }
    const result=await context.commitAi(patch);
    return {...result,rejectedFields:[...new Set([...rejectedFields,...result.rejectedFields])],submitted:false,reviewRequiredForSubmission:true};
  };
  // Shared by both transports: handles OpenAI-shaped events from the WebRTC data channel or the Alibaba socket bridge.
  const wireChannel=(channel,current)=>{
      const seen=new Set();
      const sendEvent=event=>{
        if(resources.current!==current)return;
        if(event.type==='response.create'&&current.nativeVoice){
          if(current.responding||current.responseRequested){current.queuedVoiceReply=true;return;}
          current.responseRequested=true;current.queuedVoiceReply=false;current.blockMic();
          clearTimeout(current.voiceReplyTimer);
          current.voiceReplyTimer=setTimeout(()=>{
            if(resources.current!==current||!current.responseRequested)return;
            setError(tr('Echo has not started its reply. End and reconnect the call; your draft and conversation are saved.','لم يبدأ إيكو الرد. أنهِ المكالمة وأعد الاتصال؛ المسودة والمحادثة محفوظتان.'));
          },15000);
        }
        channel.send(JSON.stringify(event));
      };
      current.replyToSelection=(content,order)=>{
        sendEvent({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:'Client selected the venue in the map UI. The app applied and saved this exact current draft: '+JSON.stringify(aiOrderContext(order))}]}});
        sendEvent({type:'response.create',response:{instructions:'Acknowledge this saved venue selection and ask this one next question in the client-selected language. Do not repeat your introduction or perform more edits. Say: '+content}});
      };
      const navigate=argumentsJson=>{
        try{
          const args=JSON.parse(argumentsJson),target={section:args?.section,face:args?.face},here=conversationSubject();
          if(!Object.hasOwn(APP_VIEWPORT_TARGETS,target.section))return {shown:false,reason:'unknown_section'};
          if(here&&target.section&&!sameBookingSubject(here,target)){
            if(bookingTransitionIntent(current.lastUserText||'',target)==='continue'){
              approveTransition({target,step:{section:target.section,face:target.face}});
              return {shown:true,section:target.section,face:target.face,clientApproved:true};
            }
            pendingSubject.current={target,step:{section:target.section,face:target.face}};
            return {shown:false,requiresClientPermission:true,currentSubject:here,target,message:`Ask whether the client has finished with ${subjectName(here)} and wants to move to ${subjectName(target)}. Do not ask the next section's booking question yet. Wait for explicit permission.`};
          }
          return scrollToAppSection(args?.section,{source:'voice',face:args?.face});
        }catch{return {shown:false,reason:'invalid_arguments'};}
      };
      const tools=createVoiceDraftTools({isCurrent:()=>resources.current===current,send:sendEvent,execute:async item=>{
        if(item.name==='show_app_section')return navigate(item.arguments);
        const args=JSON.parse(item.arguments);
        if(item.name==='read_booking_data'){
          try{const data=await apiRequest('/ai-booking/booking-data?'+new URLSearchParams({year:args.year}),{token});if(resources.current!==current)return {status:'unavailable'};return {...data,numberedCatalog:sharedContext.current.numberedCatalog,selectedServiceId:sharedContext.current.selectedServiceId,draft:aiOrderContext(orderRef.current||{}),missingRequiredFields:missingOrderFields(orderRef.current||{}).map(field=>({path:field.key,label:field.label}))};}
          catch{return {status:'unavailable',message:'Live booking data could not be loaded. Retry; do not infer availability.'};}
        }
        const result=await applyVoiceUpdates(args.updates,{userText:current.lastUserText||''});
        return result;
      }});
      channel.onmessage=async event=>{
        if(resources.current!==current)return;
        let data;try{data=JSON.parse(event.data);}catch{return;}
        if(data.type==='input_audio_buffer.speech_started')current.lastUserText='';
        handleAvatarVoiceEvent(voiceMotion.current,data);
        if(data.type==='response.output_audio_transcript.delta'&&!current.eventChoicesShown){
          current.eventChoicesShown=showEventChoices({role:'assistant',content:voiceMotion.current.utterance});
        }
        if(data.type==='response.created'){
          current.eventChoicesShown=false;
          clearTimeout(current.voiceReplyTimer);current.responseRequested=false;current.responding=true;current.blockMic?.();tools.begin();
          if(current.nativeVoice)current.voiceReplyTimer=setTimeout(()=>{
            if(resources.current===current&&current.responding)setError(tr('Echo is taking too long to finish its reply. Reconnect the call or continue in text chat.','استغرق إيكو وقتاً طويلاً لإكمال الرد. أعد الاتصال أو تابع في الدردشة النصية.'));
          },45000);
        }
        if(data.type==='output_audio_buffer.started'){current.outputActive=true;current.blockMic?.();setBrowserSpeaking(true);}
        if(data.type==='output_audio_buffer.stopped'||data.type==='output_audio_buffer.cleared'){
          current.outputActive=false;setBrowserSpeaking(false);current.readyMic?.();
        }
        if(data.type==='response.function_call_arguments.done')await tools.run(data);
        if(data.type==='response.output_item.done'&&data.item?.type==='function_call')await tools.run(data.item);
        if(data.type==='response.done'){
          clearTimeout(current.voiceReplyTimer);current.responding=false;current.responseRequested=false;
          const id=data.response?.id,usage=data.response?.usage;
          if(id&&usage&&!seen.has('usage:'+id)){
            seen.add('usage:'+id);current.usage.responses++;
            for(const [target,value] of [['inputTokens',usage.input_tokens],['outputTokens',usage.output_tokens],['cachedInputTokens',usage.input_token_details?.cached_tokens]])if(Number.isInteger(value)&&value>=0)current.usage[target]+=value;
          }
        }
        if(data.type==='response.done'){
          const actions=(data.response?.output||[]).filter(item=>item.type==='function_call').map(item=>tools.run(item));
          tools.finish(data.response?.status);
          await Promise.all(actions);
          // Generation completion is not playback completion. Only silent responses can release here.
          const hasAudio=(data.response?.output||[]).some(item=>item.content?.some(part=>part.type==='audio'||part.type==='output_audio'));
          if(current.nativeVoice&&current.queuedVoiceReply&&!current.responseRequested)sendEvent({type:'response.create'});
          if(data.response?.status==='failed'||data.response?.status==='incomplete'){
            setError(data.response.status_details?.error?.message||tr('Echo could not finish its reply. Please repeat your last message or reconnect.','تعذر إكمال رد إيكو. يرجى تكرار رسالتك الأخيرة أو إعادة الاتصال.'));
          }
          if((!hasAudio||current.clientInterrupted)&&!current.responseRequested&&!current.outputActive){current.clientInterrupted=false;current.readyMic?.();}
          if(resources.current!==current)return;
          if(current.reviewRequested){completeReview();return;}
        }
        if(data.type==='response.done'&&current.reviewRequested&&data.response?.status!=='completed'){completeReview();return;}
        if(data.type==='conversation.item.input_audio_transcription.failed'){
          setError(tr('Your speech could not be transcribed. Please try again.','تعذر تحويل كلامك إلى نص. يرجى المحاولة مجدداً.'));current.readyMic?.();return;
        }
        if(data.type==='error'){current.responseRequested=false;clearTimeout(current.voiceReplyTimer);if(!current.responding&&!current.outputActive)current.readyMic?.();setError(data.error?.message||tr('The voice assistant encountered a problem. Please reconnect or use chat.','حدث خطأ في المساعد الصوتي. أعد الاتصال أو استخدم الدردشة.'));return;}
        const human=data.type==='conversation.item.input_audio_transcription.completed';
        const assistant=data.type==='response.output_audio_transcript.done';
        if(human&&!data.transcript?.trim()){
          setError(tr('I could not make out your words. Please say that again after the beep.','لم أفهم كلماتك. يرجى تكرارها بعد الصافرة.'));current.readyMic?.();return;
        }
        if((human||assistant)&&data.transcript){
          const id=data.event_id||`${data.type}:${data.item_id}`;if(seen.has(id))return;seen.add(id);
          if(human){
            current.lastUserText=data.transcript;
            const transition=waitingTransition();
            if(transition&&bookingTransitionIntent(data.transcript,transition.target)==='continue'){
              approveTransition(transition);
            }else if(transition)pendingSubject.current=null;
          }
          append({role:human?'user':'assistant',content:data.transcript.slice(0,2000),mode:'voice'});
          // Manual native turns wait for the transcript, so permissions and tool input are current.
          if(human&&current.manualTurns)sendEvent({type:'response.create'});
        }
      };
      channel.onopen=()=>{if(resources.current!==current)return;setCall('active');channel.send(JSON.stringify({type:'conversation.item.create',item:{type:'message',role:'user',content:[{type:'input_text',text:assistantContext()}]}}));sendEvent({type:'response.create',response:{instructions:(current.resuming?tr('The user resumed a paused call. Briefly acknowledge that you are back and continue from the conversation context and current booking draft. Do not repeat your introduction, earlier requests, or completed actions.','استأنف المستخدم مكالمة متوقفة مؤقتاً. أكّد عودتك بإيجاز وتابع من سياق المحادثة ومسودة الحجز الحالية. لا تكرر المقدمة أو الطلبات السابقة أو الإجراءات المكتملة.'):voiceGreetingInstructions(orderRef.current||{},current.language?.startsWith('ar')))+` Speak only ${current.language?.startsWith('ar')?'Arabic':'English'}, as explicitly selected by the client. Ignore apparent language changes in old transcripts. Do not mention equipment number tags in the call introduction. Explain them only when the client wants to add equipment.`}});if(channel.watchOpening)channel.watchOpening();};
  };
  const startSocketCall=async(current,stream)=>{
    const AudioContext=window.AudioContext||window.webkitAudioContext;
    if(!AudioContext||!window.AudioWorkletNode)throw new Error(tr('Voice calls need a newer browser.','تتطلب المكالمات متصفحاً أحدث.'));
    const response=await fetch(`${apiBaseUrl}/ai-booking/voice`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({consent:true,language:current.language,requestId:crypto.randomUUID(),...pricingFields}),signal:current.abort.signal});
    const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.message||'Could not start the AI call.'),{status:response.status});
    current.callId=data.callId;
    if(resources.current!==current){fetch(`${apiBaseUrl}/ai-booking/voice/end`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({callId:data.callId})}).catch(()=>{});return;}
    const context=new AudioContext({sampleRate:16000});current.meterContext=context;await context.resume();if(resources.current!==current)return;
    const analyser=context.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.25;current.analyser=analyser;
    const speaker=context.createGain();speaker.connect(analyser);analyser.connect(context.destination);
    voiceMotion.current={outputPlaying:false,listening:false,utterance:'',gesture:'neutral',analyser,audio:{paused:false,muted:false,volume:1}};
    const moduleUrl=URL.createObjectURL(new Blob([PCM_WORKLET],{type:'text/javascript'}));
    try{await context.audioWorklet.addModule(moduleUrl);}finally{URL.revokeObjectURL(moduleUrl);}
    if(resources.current!==current)return;
    const mic=new AudioWorkletNode(context,'pcm-capture',{channelCount:1,channelCountMode:'explicit',outputChannelCount:[1]});current.mic=mic;current.micSource=context.createMediaStreamSource(stream);current.micSource.connect(mic);mic.connect(context.destination);
    const url=new URL(`${apiBaseUrl}/ai-booking/voice-ws`,window.location.href);url.protocol=url.protocol==='https:'?'wss:':'ws:';url.searchParams.set('ticket',data.wsTicket);
    const socket=new WebSocket(url);
    const channel={send:text=>{if(socket.readyState===1)socket.send(text);},close:()=>{try{socket.close();}catch{/* Already closed. */}},onopen:null,onmessage:null};
    current.channel=channel;wireChannel(channel,current);
    let playHead=0;const playing=new Set();
    const stopPlayback=()=>{for(const source of playing){try{source.stop();}catch{/* Already ended. */}}playing.clear();playHead=0;voiceMotion.current.outputPlaying=false;};
    current.stopPlayback=stopPlayback;
    const play=base64Audio=>{
      const bytes=Uint8Array.from(atob(base64Audio),char=>char.charCodeAt(0)),samples=new Int16Array(bytes.buffer,0,bytes.length>>1);
      const buffer=context.createBuffer(1,samples.length,24000),out=buffer.getChannelData(0);for(let index=0;index<samples.length;index++)out[index]=samples[index]/32768;
      const source=context.createBufferSource();source.buffer=buffer;source.connect(speaker);
      const at=Math.max(context.currentTime+.03,playHead);source.start(at);playHead=at+buffer.duration;playing.add(source);
      voiceMotion.current.outputPlaying=true;voiceMotion.current.listening=false;
      source.onended=()=>{playing.delete(source);if(!playing.size&&context.currentTime>=playHead-.05)voiceMotion.current.outputPlaying=false;};
    };
    mic.port.onmessage=event=>{if(resources.current===current&&current.live&&!current.muted&&socket.readyState===1)socket.send(JSON.stringify({type:'input_audio_buffer.append',audio:bytesToBase64(new Uint8Array(event.data))}));};
    // The model speaks the opening greeting itself. If no audio arrives, say so instead of falling back to the browser's voice.
    channel.watchOpening=()=>{current.openingTimer=setTimeout(()=>{if(resources.current===current&&!current.heard)setError(tr('The assistant did not start speaking. You can start talking, or reconnect.','لم يبدأ المساعد بالكلام. يمكنك التحدث الآن أو إعادة الاتصال.'));},9000);};
    socket.onmessage=event=>{
      if(resources.current!==current)return;
      let message;try{message=JSON.parse(event.data);}catch{return;}
      if(message.type==='bridge.ready'){current.live=true;channel.onopen?.();return;}
      if(message.type==='response.output_audio.delta'){if(typeof message.delta==='string'){current.heard=true;play(message.delta);}return;}
      if(message.type==='input_audio_buffer.speech_started')stopPlayback();
      channel.onmessage?.({data:event.data});
    };
    socket.onclose=event=>{if(resources.current===current){closeCall();if(alive.current){setCall('idle');setError(previous=>previous||(event.code===1006?tr('The connection to the voice server was lost. Reconnect to continue.','انقطع الاتصال بخادم الصوت. أعد الاتصال للمتابعة.'):tr(`Voice connection ended (code ${event.code}). Reconnect or continue in chat.`,`انتهى الاتصال الصوتي (الرمز ${event.code}). أعد الاتصال أو تابع بالدردشة.`)));}}};
    current.timer=setTimeout(()=>{closeCall();if(alive.current){setCall('idle');setError(tr('The call time limit has been reached. Review your request or continue in chat.','انتهت مدة المكالمة المسموحة. راجع الطلب أو تابع بالدردشة.'));}},Math.min(data.maxCallSeconds||maxCallSeconds,900)*1000);
  };
  const startCall=async()=>{
    if(!permitted||historyLoading||draftChoicePending.current||call==='connecting'||call==='active')return;
    draftContextRef.current?.markAssistantConversationStarted?.();
    conversationSegment.current.interrupted=true;
    const usePiper=aiPolicy?.tts?.provider==='piper',browserVoice=usePiper||aiPolicy?.voice?.provider==='openrouter',SpeechRecognition=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(browserVoice&&(!window.isSecureContext||!SpeechRecognition||!window.speechSynthesis)){setError(tr('Voice calls need HTTPS and browser speech recognition and playback.','تتطلب المكالمات اتصالاً آمناً ودعم المتصفح للتعرف على الكلام وتشغيله.'));return;}
    if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia||(!browserVoice&&!window.RTCPeerConnection&&aiPolicy?.voice?.provider!=='alibaba')){setError(tr('Voice calls need HTTPS and a supported browser.','تتطلب المكالمات اتصالاً آمناً ومتصفحاً مدعوماً.'));return;}
    setError('');setCall('connecting');
    window.dispatchEvent(new CustomEvent('echo:live-audio'));
    const current={abort:new AbortController(),language:voiceLanguage,muted:micMuted,resuming:call==='paused',usage:{responses:0,inputTokens:0,outputTokens:0,cachedInputTokens:0}};resources.current=current;
    try{
      if(browserVoice){
        const CueContext=window.AudioContext||window.webkitAudioContext;
        if(CueContext){current.cueContext=new CueContext();current.cueContext.resume().catch(()=>{});}
      }
      let ended=await endingCall.current;
      if(!ended&&retryEndingCall.current){endingCall.current=retryEndingCall.current();ended=await endingCall.current;}
      if(resources.current!==current)return;
      if(!ended)throw new Error(tr('The previous call could not be ended on the server. Please try again shortly.','تعذر إنهاء المكالمة السابقة على الخادم. حاول مجدداً بعد قليل.'));
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:{ideal:true},noiseSuppression:{ideal:true},autoGainControl:{ideal:true},channelCount:{ideal:1},sampleRate:{ideal:48000}},video:false});
      if(resources.current!==current){stream.getTracks().forEach(track=>track.stop());return;}
      current.stream=stream;
      stream.getAudioTracks().forEach(track=>{track.enabled=(browserVoice||aiPolicy?.voice?.provider==='alibaba')&&!current.muted;if('contentHint' in track)track.contentHint='speech';});
      if(browserVoice){
        const recognition=new SpeechRecognition();current.recognition=recognition;current.speechSynthesis=true;current.busy=false;
        recognition.continuous=true;recognition.interimResults=true;current.language=voiceLanguage;recognition.lang=current.language;
        if('unspokenPunctuation' in recognition)recognition.unspokenPunctuation=true;
        current.recognitionRunning=false;current.recognitionStarting=false;current.audioReady=false;current.finalThrough=0;current.pendingSpeech=[];
        const announceReady=async()=>{
          if(resources.current!==current||current.muted||current.busy||!current.audioReady||!current.recognitionRunning||current.readyCue)return;
          const cue={};current.readyCue=cue;setBrowserListening(false);
          // Let the camera microphone and recognizer settle before announcing readiness.
          // Capture stays live so speech beginning with the beep retains its first words.
          if(!current.captureSettled){
            await new Promise(resolve=>{current.readyWarmTimer=setTimeout(resolve,500);});
            if(resources.current!==current||current.readyCue!==cue||current.muted||current.busy||!current.audioReady)return;
            current.captureSettled=true;
          }
          try{
            const context=current.cueContext;
            if(context){
              await context.resume();
              if(resources.current!==current||current.readyCue!==cue||current.muted||current.busy||!current.audioReady)return;
              // Do not mute for this tone: the ready signal must follow live capture.
              await new Promise(resolve=>{
                const oscillator=context.createOscillator(),gain=context.createGain(),at=context.currentTime;
                oscillator.frequency.value=880;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.07,at+.012);gain.gain.linearRampToValueAtTime(0,at+.13);
                oscillator.connect(gain);gain.connect(context.destination);oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();resolve();};oscillator.start(at);oscillator.stop(at+.14);
              });
            }
          }catch{/* Text readiness remains available if sound is unavailable. */}
          if(resources.current===current&&current.readyCue===cue&&!current.muted&&!current.busy&&current.audioReady){stream.getAudioTracks().forEach(track=>{track.enabled=true;});setBrowserListening(true);}
        };
        const listen=()=>{
          if(resources.current!==current||current.muted||current.busy)return;
          stream.getAudioTracks().forEach(track=>{track.enabled=true;});
          if(current.recognitionRunning){announceReady();return;}
          if(current.recognitionStarting)return;
          current.recognitionStarting=true;current.audioReady=false;current.readyCue=false;current.captureSettled=false;setBrowserListening(false);
          recognition.lang=current.language;
          try{recognition.start(stream.getAudioTracks()[0]);}
          catch(problem){
            if(problem.name==='InvalidStateError')return;
            // Older engines can only recognize their default microphone.
            if(problem.name==='TypeError')try{recognition.start();return;}catch(fallback){if(fallback.name==='InvalidStateError')return;}
            closeCall();setCall('idle');setError(tr('Speech recognition could not start. Check your microphone permission and reconnect.','تعذر بدء التعرف على الكلام. تحقّق من إذن الميكروفون وأعد الاتصال.'));
          }
        };
        current.listen=listen;
        const speak=text=>speakCallText({text,current,token,usePiper,isCurrent:()=>resources.current===current,onFallback:()=>setError(tr('Piper is unavailable · using the browser voice.','صوت بايبر غير متاح · نستخدم صوت المتصفح.'))});
        current.speakReply=async text=>{
          if(resources.current!==current)return;
          current.busy=true;current.readyCue=false;setBrowserListening(false);setBrowserSpeaking(true);
          try{await speak(text);}catch{if(resources.current===current)setError(tr('Voice playback failed. You can read the reply in the chat.','تعذر تشغيل الصوت. يمكنك قراءة الرد في الدردشة.'));}
          finally{if(resources.current===current){current.busy=false;setBrowserSpeaking(false);listen();}}
        };
        recognition.onstart=()=>{if(resources.current!==current)return;current.recognitionRunning=true;current.recognitionStarting=false;current.finalThrough=0;announceReady();};
        recognition.onaudiostart=()=>{
          if(resources.current!==current)return;
          current.audioReady=true;setCall('active');announceReady();
        };
        recognition.onaudioend=()=>{if(resources.current!==current)return;current.audioReady=false;setBrowserListening(false);};
        const finishTurn=async()=>{
          if(resources.current!==current||current.muted||current.busy||!current.pendingSpeech.length)return;
          const transcript=current.pendingSpeech.join(' ').trim();current.pendingSpeech=[];
          current.busy=true;current.readyCue=false;setBrowserListening(false);setHearing('');
          // Keep the device warm; ignore recognition events while Echo answers.
          const answer=await send(transcript,'voice');
          if(resources.current!==current)return;
          if(answer)await current.speakReply(answer);
          else if(resources.current===current){current.busy=false;setBrowserSpeaking(false);listen();}
        };
        recognition.onspeechstart=()=>{if(resources.current===current)clearTimeout(current.speechTimer);};
        recognition.onresult=event=>{
          if(resources.current!==current)return;
          const results=Array.from(event.results||[]),fresh=results.slice(current.finalThrough);
          current.finalThrough=results.reduce((last,row,index)=>row.isFinal?index+1:last,current.finalThrough);
          if(current.muted||current.busy)return;
          clearTimeout(current.speechTimer);
          current.pendingSpeech.push(...fresh.filter(row=>row.isFinal).map(row=>row[0]?.transcript||'').filter(Boolean));
          const interim=fresh.filter(row=>!row.isFinal).map(row=>row[0]?.transcript||'').join(' ');
          setHearing([...current.pendingSpeech,interim].filter(Boolean).join(' ').trim());
          // Keep a thinking pause inside the same turn; new speech cancels this deadline.
          if(!interim&&current.pendingSpeech.length)current.speechTimer=setTimeout(finishTurn,3000);
        };
        recognition.onerror=event=>{if(resources.current===current&&event.error!=='no-speech'&&event.error!=='aborted')setError(tr('Browser speech recognition failed. You can continue by typing.','تعذر التعرف على الكلام في المتصفح. يمكنك المتابعة بالكتابة.'));};
        recognition.onend=()=>{
          if(resources.current!==current)return;
          current.recognitionRunning=false;current.recognitionStarting=false;current.audioReady=false;current.readyCue=false;setBrowserListening(false);
          listen();
        };
        current.timer=setTimeout(()=>{closeCall();if(alive.current){setCall('idle');setError(tr('The call time limit has been reached. Review your request or continue in chat.','انتهت مدة المكالمة المسموحة. راجع طلبك أو تابع بالدردشة.'));}},Math.min(maxCallSeconds,900)*1000);
        voiceMotion.current={outputPlaying:false,listening:false,utterance:'',gesture:'neutral'};
        listen();
        if(resources.current!==current)return;
        // Start the conversation once, before the ready beep or any client speech.
        current.busy=true;setBrowserSpeaking(true);setBrowserListening(false);
        const arabic=current.language.startsWith('ar');
        const opening=current.resuming?(arabic?'عدت معك. لنكمل من حيث توقفنا.':'I’m back. Let’s continue where we left off.'):voiceGreetingText(draftAvailable()?orderRef.current||{}:{},arabic);
        append({role:'assistant',content:opening,mode:'voice'});
        try{await speak(opening);}catch{if(resources.current===current)setError(tr('Voice playback failed. You can read the greeting in the chat.','تعذر تشغيل الصوت. يمكنك قراءة التحية في الدردشة.'));}
        if(resources.current===current){current.busy=false;setBrowserSpeaking(false);listen();}
        return;
      }
      if(aiPolicy?.voice?.provider==='alibaba'){await startSocketCall(current,stream);return;}
      const AudioContext=window.AudioContext||window.webkitAudioContext;
      voiceMotion.current={outputPlaying:false,listening:false,utterance:'',gesture:'neutral'};
      if(AudioContext){
        const context=new AudioContext();current.meterContext=context;
        const analyser=context.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.25;current.analyser=analyser;
        voiceMotion.current.analyser=analyser;context.resume().catch(()=>{});
      }
      // Speaker-safe turns: keep capture blocked until actual WebRTC playback drains.
      current.nativeVoice=true;current.micBlocked=true;
      current.blockMic=()=>{
        clearTimeout(current.nativeReadyTimer);current.micBlocked=true;
        stream.getAudioTracks().forEach(track=>{track.enabled=false;});
        setBrowserListening(false);voiceMotion.current.listening=false;
      };
      current.readyMic=()=>{
        clearTimeout(current.nativeReadyTimer);
        current.nativeReadyTimer=setTimeout(async()=>{
          if(resources.current!==current||current.responding||current.responseRequested||current.outputActive)return;
          // Allow the last speaker audio and room echo to decay before accepting input.
          const context=current.meterContext;
          try{
            await context?.resume();
            if(resources.current!==current||current.responding||current.responseRequested||current.outputActive)return;
            if(context&&!current.muted){
              const tone=context.createOscillator(),gain=context.createGain(),at=context.currentTime;
              tone.frequency.value=880;gain.gain.setValueAtTime(0,at);gain.gain.linearRampToValueAtTime(.05,at+.01);gain.gain.linearRampToValueAtTime(0,at+.10);
              tone.connect(gain);gain.connect(context.destination);tone.start(at);tone.stop(at+.11);
              tone.onended=()=>{tone.disconnect();gain.disconnect();};
            }
          }catch{/* Visual readiness still works when audio cues are unavailable. */}
          if(resources.current!==current||current.responding||current.responseRequested||current.outputActive)return;
          current.micBlocked=false;
          stream.getAudioTracks().forEach(track=>{track.enabled=!current.muted;});
          setBrowserListening(!current.muted);voiceMotion.current.listening=!current.muted;
        },450);
      };
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
      const response=await fetch(`${apiBaseUrl}/ai-booking/voice`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({sdp:offer.sdp,consent:true,manualTurns:true,language:current.language,requestId:crypto.randomUUID(),...pricingFields}),signal:current.abort.signal});
      const data=await response.json();if(!response.ok)throw Object.assign(new Error(data.message||'Could not start the AI call.'),{status:response.status});
      current.callId=data.callId;
      if(resources.current!==current){fetch(`${apiBaseUrl}/ai-booking/voice/end`,{method:'POST',headers:{'Content-Type':'application/json',Authorization:`Bearer ${token}`},body:JSON.stringify({callId:data.callId})}).catch(()=>{});return;}
      current.manualTurns=data.manualTurns===true;
      await peer.setRemoteDescription({type:'answer',sdp:data.sdp});
      current.timer=setTimeout(()=>{closeCall();if(alive.current){setCall('idle');setError(tr('The call time limit has been reached. Review your request or continue in chat.','انتهت مدة المكالمة المسموحة. راجع الطلب أو تابع بالدردشة.'));}},Math.min(data.maxCallSeconds||maxCallSeconds,900)*1000);
    }catch(problem){if([402,409,503].includes(problem.status)){setPricingAccepted(false);refreshPolicy();}if(resources.current===current){closeCall();if(alive.current){setCall('idle');setError(problem.name==='NotAllowedError'?tr('Microphone permission was not granted. Chat is still available.','لم يُمنح إذن الميكروفون. يمكنك استخدام الدردشة.'):problem.name==='AbortError'?'':problem.message);}}}
  };
  const stopCall=()=>{closeCall();setCall('idle');setMicMuted(false);setMode('chat');setTranscriptOpen(true);};
  const pauseCall=async()=>{
    if(call!=='active')return;
    const ended=closeCall();setCall('paused');
    if(!await ended&&alive.current)setError(tr('Your microphone and connection are closed, but the server could not confirm the call ended. Resume will retry ending it before reconnecting.','أُغلق الميكروفون والاتصال، لكن تعذر تأكيد انتهاء المكالمة على الخادم. سيحاول الاستئناف إنهاءها قبل إعادة الاتصال.'));
  };
  const interruptCall=()=>{
    const current=resources.current;
    if(!current.nativeVoice||call!=='active')return;
    // The server clears buffered playback and truncates unheard audio from its conversation.
    current.queuedVoiceReply=false;current.clientInterrupted=true;
    if(current.responding)current.channel.send(JSON.stringify({type:'response.cancel'}));
    current.channel.send(JSON.stringify({type:'output_audio_buffer.clear'}));
    current.blockMic();
    current.muted=false;setMicMuted(false);
    // Wait for output_audio_buffer.cleared before reopening capture.
  };
  const toggleMic=()=>{
    const current=resources.current;if(call!=='active')return;
    current.muted=!current.muted;
    if(current.stream)current.stream.getAudioTracks().forEach(track=>{track.enabled=!current.muted&&!current.micBlocked;});
    if(current.nativeVoice){setBrowserListening(!current.muted&&!current.micBlocked);if(!current.muted)current.readyMic?.();}
    if(current.recognition){clearTimeout(current.speechTimer);current.pendingSpeech=[];current.readyCue=false;current.captureSettled=false;setHearing('');setBrowserListening(false);if(!current.muted)current.listen?.();}
    if(current.muted){try{current.channel?.send(JSON.stringify({type:'input_audio_buffer.clear'}));}catch{/* The call may be closing. */}}
    setMicMuted(current.muted);
  };
  const chooseVoiceLanguage=value=>{
    if(!['en-CA','ar-SA'].includes(value))return;
    draftContextRef.current?.lang?.setLanguage?.(value.startsWith('ar')?'ar':'en');
    setVoiceLanguage(value);setHearing('');
    try{localStorage.setItem('echo-voice-language',value);}catch{/* Storage is optional. */}
    const current=resources.current;current.language=value;
    if(current.recognition){clearTimeout(current.speechTimer);current.pendingSpeech=[];current.readyCue=false;setBrowserListening(false);current.recognition.abort();}
  };
  const completeReview=()=>{
    closeCall();setCall('idle');setReviewing(false);
    onReview(orderDraft?{}:draft||{});
  };
  const review=()=>{
    closeCall();setCall('idle');
    onReview(orderDraft?{}:draft);
  };
  const showTranscript=mode==='chat'||transcriptOpen;
  const canReview=Boolean(draft)||messages.some(item=>item.role==='user');
  const caption=busy?tr('Putting your night together…','نرتّب تفاصيل ليلتك…'):call==='connecting'?tr('Connecting your conversation…','جارٍ توصيل محادثتك…'):messages.at(-1)?.content||tr('Hey, tell me about your event.','أخبرني عن الفعالية التي تتخيلها.');
  const callLabel=call!=='idle'?tr('Stop AI call','إيقاف المكالمة'):tr('Start AI voice call','ابدأ مكالمة مع المساعد');
  // Keep both faces mounted so switching views preserves the draft, chat and call.
  const autoStart=useRef(false);
  const enterVoice=()=>{continueDraft();draftContextRef.current?.markAssistantConversationStarted?.();autoStart.current=true;setMode('voice');setTranscriptOpen(true);};
  const requestVoiceCall=()=>{continueDraft();draftContextRef.current?.markAssistantConversationStarted?.();setVoicePickerOpen(true);};
  const startInLanguage=language=>{chooseVoiceLanguage(language);setVoicePickerOpen(false);enterVoice();};
  useEffect(()=>{
    document.documentElement.classList.remove('echo-ai-expanded','echo-ai-split');
    document.documentElement.classList.toggle('echo-ai-single',Boolean(orderDraft));
    window.dispatchEvent(new Event('echo:order-layout-changing'));
    return()=>document.documentElement.classList.remove('echo-ai-single');
  },[Boolean(orderDraft)]);
  useEffect(()=>{if(mode==='voice'&&autoStart.current&&call==='idle'&&user&&token){autoStart.current=false;startCall();}});
  if(!user||!token)return <OrderSignIn ar={ar}/>;
  const guided=orderDraft?<GuidedBookingFlow ar={ar} onClose={onClose} onReview={()=>onReview({})} onAsk={()=>{orderDraft.openAssistant?.();setTranscriptOpen(true);flipFace(true);}}/>:null;
  const chatPanel=<div className="ai-booking-panel">
    <dialog ref={draftChoice} className="ai-booking-language-dialog ai-booking-draft-choice" aria-labelledby="echo-draft-choice-title" onCancel={event=>{event.preventDefault();if(!startingFresh)continueDraft();}}>
      <h2 id="echo-draft-choice-title">{tr('Continue your draft?','هل تريد متابعة مسودتك؟')}</h2>
      <p>{tr('You have an existing event draft. Would you like to continue with it or start from scratch?','لديك مسودة فعالية حالية. هل تريد متابعتها أم البدء من الصفر؟')}</p>
      <div className="ai-booking-draft-choice-actions">
        <button type="button" autoFocus disabled={startingFresh} onClick={continueDraft}>{tr('Continue this draft','متابعة هذه المسودة')}</button>
        <button type="button" disabled={startingFresh||busy||Boolean(confirmingTask)} onClick={startFreshDraft}>{startingFresh?tr('Starting fresh…','جارٍ البدء من جديد…'):tr('Start from scratch','البدء من الصفر')}</button>
      </div>
      <p className="ai-booking-draft-choice-hint">{tr('Starting from scratch clears the current draft’s event details and equipment.','البدء من الصفر يمسح تفاصيل الفعالية والمعدات من المسودة الحالية.')}</p>
      {draftChoiceError&&<p role="alert">{draftChoiceError}</p>}
    </dialog>
    <div className={`ai-booking-surface${mode==='voice'?' is-voice':''}${busy?' is-thinking':''}${call==='active'?' is-connected':''}${showTranscript?' has-transcript':''}`}>
      <header className="ai-booking-heading" role="group" aria-label={tr('Conversation mode','طريقة المحادثة')}>
        <div className="ai-booking-side is-start">{guided&&orderDraft?.active&&!orderDraft?.clearing&&<button type="button" className="ai-booking-form-toggle" onClick={()=>flipFace(false)} aria-label={tr('Back to Plan your event','العودة إلى تخطيط فعاليتك')} data-tooltip={tr('Back to event form','العودة لنموذج الفعالية')} aria-controls="booking-form-face"><ClipboardList size={18}/></button>}</div>
        <div className="ai-booking-title">{mode==='voice'&&call!=='idle'&&<span className={`ai-booking-call-orb${call==='paused'?' is-paused':''}`} role="img" aria-label={call==='paused'?tr('AI call paused','المكالمة متوقفة مؤقتاً'):tr('AI call is on','مكالمة إيكو قيد التشغيل')}/>}<span className="ai-booking-brand">Echo AI</span><h3 className="ai-booking-sr">{tr('AI event planner','مساعد تخطيط الفعاليات')}</h3></div><div className="ai-booking-call-actions" role="group" aria-label={tr('AI call controls','التحكم بمكالمة المساعد')}>
          <button className="ai-booking-mode ai-booking-voice-icon ai-booking-call-toggle" type="button" aria-label={callLabel} aria-pressed={call!=='idle'} data-tooltip={callLabel} disabled={call==='idle'&&(busy||reviewing||historyLoading||!available||aiPolicy?.voice?.enabled===false)} onClick={()=>{if(call!=='idle')stopCall();else requestVoiceCall();}}>{call!=='idle'?<Square size={17} fill="currentColor"/>:<Phone size={22}/>}</button>
          {call!=='idle'&&<div className="ai-booking-call-secondary">
            {call==='active'&&resources.current.nativeVoice&&browserSpeaking&&<button className="ai-booking-mode ai-booking-voice-icon" type="button" aria-label={tr('Interrupt Echo and speak','مقاطعة إيكو والتحدث')} data-tooltip={tr('Interrupt Echo and speak','مقاطعة إيكو والتحدث')} onClick={interruptCall}><Hand size={19}/></button>}
            <button className="ai-booking-mode ai-booking-voice-icon ai-booking-pause" type="button" aria-label={call==='paused'?tr('Resume AI call','استئناف المكالمة'):tr('Pause AI call','إيقاف المكالمة مؤقتاً')} data-tooltip={call==='paused'?tr('Resume AI call','استئناف المكالمة'):tr('Pause AI call','إيقاف المكالمة مؤقتاً')} aria-pressed={call==='paused'} disabled={call==='connecting'||(call==='paused'&&!permitted)} onClick={call==='paused'?startCall:pauseCall}>{call==='paused'?<Play size={18}/>:<Pause size={18}/>}</button>
            <button className="ai-booking-mode ai-booking-voice-icon ai-booking-mute" type="button" aria-label={micMuted?tr('Unmute microphone','إلغاء كتم الميكروفون'):tr('Mute microphone','كتم الميكروفون')} data-tooltip={micMuted?tr('Unmute microphone','إلغاء كتم الميكروفون'):tr('Mute microphone','كتم الميكروفون')} aria-pressed={micMuted} disabled={call!=='active'} onClick={toggleMic}>{micMuted?<MicOff size={19}/>:<Mic size={19}/>}</button>
          </div>}
        </div>
        {onClose&&<button type="button" className="ai-booking-close" onClick={onClose} aria-label={tr('Close Echo AI','إغلاق إيكو')} data-tooltip={tr('Close','إغلاق')}><X size={16}/></button>}
      </header>
      <dialog ref={voicePicker} className="ai-booking-language-dialog" aria-labelledby="echo-voice-language-title" onCancel={event=>{event.preventDefault();setVoicePickerOpen(false);}} onClose={()=>setVoicePickerOpen(false)} onClick={event=>{if(event.target===event.currentTarget){const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)setVoicePickerOpen(false);}}}>
        <h2 id="echo-voice-language-title">{tr('Spoken language','لغة التحدث')}</h2>
        <p>{tr('Choose a language to start your voice call.','اختر لغة لبدء المكالمة الصوتية.')}</p>
        <div className="ai-booking-language-options"><button type="button" lang="en" autoFocus={voiceLanguage==='en-CA'} onClick={()=>startInLanguage('en-CA')}>English</button><button type="button" lang="ar" autoFocus={voiceLanguage==='ar-SA'} onClick={()=>startInLanguage('ar-SA')}>العربية</button></div>
        <button type="button" className="ai-booking-language-cancel" onClick={()=>setVoicePickerOpen(false)}>{tr('Cancel','إلغاء')}</button>
      </dialog>
      {hearing&&<p className="ai-booking-hearing" dir="auto">{hearing}</p>}
      <div className="ai-booking-stage" aria-hidden={showTranscript}>
        <div className="ai-booking-wave" ref={wave} aria-hidden="true">{[20,68,132,88,64,54,20].map((height,i)=><span key={i} style={{'--idle-level':`${height}px`,'--wave-delay':`${i*.13}s`}}><i/></span>)}</div>
        <p className="ai-booking-caption" aria-live="polite">{caption}</p>
        {call==='active'&&<span className="ai-booking-live-label">{tr('LIVE CONVERSATION','محادثة مباشرة')}</span>}
      </div>
      <div id="ai-booking-transcript" className="ai-booking-messages" hidden={!showTranscript} ref={log} role="log" aria-label={tr('Booking conversation','محادثة الحجز')} aria-live="polite">
        {historyLoading&&<p className="ai-booking-typing" role="status">{tr('Loading this draft’s chat…','جارٍ تحميل محادثة هذه المسودة…')}</p>}
        {messages.map((message,i)=>{const note=aiTaskNoteText(message.content,clientName,ar);return <Fragment key={message.id||i}><ConversationSegmentSeparator message={message} previous={messages[i-1]} ar={ar}/>{note?<TaskNote text={note}/>:<EchoChatMessage message={message} ar={ar}/>}</Fragment>;})}
        {busy&&streamReply&&<EchoChatMessage message={{role:'assistant',content:streamReply,mode}} ar={ar}/>}
        {busy&&!streamReply&&<p className="ai-booking-typing" role="status">{tr('Thinking…','جارٍ التفكير…')}</p>}
      </div>
      <div className="ai-booking-surface-bottom">
        {mode==='chat'?<form className="ai-booking-composer" onSubmit={event=>{event.preventDefault();send(input);}}>
          <label className="ai-booking-sr" htmlFor="ai-booking-message">{tr('Your message','رسالتك')}</label>
          <input id="ai-booking-message" autoComplete="off" value={input} maxLength={2000} readOnly={dictating} onChange={event=>setInput(event.target.value)} placeholder={tr('Ask Echo…','اسأل إيكو…')}/>
          <SpeechToText ar={ar} value={input} onChange={setInput} onListeningChange={setDictating} disabled={!chatPermitted||busy||orderDraft?.panelOpen===false}/>
          <button className="ai-booking-send" type="submit" disabled={!chatPermitted||busy||Boolean(confirmingTask)||historyLoading||dictating||!input.trim()} aria-label={tr('Send to AI','أرسل للمساعد')}><Send size={16}/></button>
        </form>:<div className="ai-booking-voice-controls" role="status"><span>{call==='paused'?tr('Call paused · resume when ready.','المكالمة متوقفة مؤقتاً · استأنف عندما تكون جاهزاً.'):call==='active'?(micMuted?tr('Microphone muted · you can still hear Echo.','الميكروفون مكتوم · ما زلت تسمع إيكو.'):(aiPolicy?.tts?.provider==='piper'||aiPolicy?.voice?.provider==='openrouter')?(browserListening?tr('Listening now · pauses up to 3 seconds are okay','أستمع الآن · يمكنك التوقف للتفكير حتى ٣ ثوانٍ'):browserSpeaking?tr('Echo is speaking…','إيكو يتحدث…'):busy?tr('Thinking…','أفكر…'):tr('Getting ready to listen…','أستعد للاستماع…')):(browserSpeaking?tr('Echo is speaking · tap the hand to interrupt','إيكو يتحدث · اضغط اليد للمقاطعة'):browserListening?tr('Listening · speak naturally','أستمع إليك · تحدّث بطبيعتك'):tr('Getting ready to listen…','أستعد للاستماع…'))):call==='connecting'?tr('Starting microphone · wait for the beep','جارٍ تشغيل الميكروفون · انتظر الصافرة'):tr('A conversation, not a form.','محادثة، وليست استمارة.')}</span>{call==='paused'&&Boolean(customerPrice)&&<small>{tr('Resume starts a new voice session at the price below.','الاستئناف يبدأ جلسة صوتية جديدة بالسعر أدناه.')}</small>}</div>}
      <AiTaskReview tasks={aiTasks} sessionId={taskSession.current.id} saveFailed={taskSaveFailed} confirmingId={confirmingTask} modifyingId={modifyingTask?.key===taskKey?modifyingTask.id:null} ar={ar} disabled={busy||Boolean(confirmingTask)||historyLoading||browserSpeaking||call==='connecting'} onReview={reviewTask} onModify={modifyTask}/>
      <div className="ai-booking-support">
      {aiPolicy&&<p className="ai-booking-source" aria-label={tr('AI source and models in use','مصدر الذكاء الاصطناعي والنماذج المستخدمة')}>{[['chat',tr('Chat','دردشة'),aiPolicy.chat],['voice',tr('Voice','صوت'),aiPolicy.voice]].filter(([,,config])=>config?.model).map(([key,label,config])=><span key={key} className={mode===key?'is-active':undefined}><b>{label}</b> {config.enabled===false?tr('off','متوقف'):<>{key==='voice'&&aiPolicy.tts?.provider==='piper'?'Piper · browser fallback':AI_SOURCES[config.provider||'openai']||config.provider} · <code dir="ltr">{key==='voice'&&aiPolicy.tts?.provider==='piper'?aiPolicy.chat?.model:config.model}</code></>}</span>)}</p>}
      {available===null?<p className="ai-booking-status" role="status">{tr('Checking availability…','جارٍ التحقق من التوفر…')}</p>:!available?<p className="ai-booking-notice" role="status">{tr('AI booking is temporarily unavailable. Please use Personal Booking.','الحجز الذكي غير متاح حالياً. يرجى استخدام الحجز الشخصي.')}</p>:!user?<a className="ai-booking-signin" href="/login" onClick={()=>{try{localStorage.setItem('khalil-auth-return','/#event-order');}catch{/* Optional return path. */}}}>{tr('Sign in to start your conversation','سجّل الدخول لبدء محادثتك')}<ArrowUpRight size={13}/></a>:null}
      {aiPolicy?.[mode]?.enabled===false&&<p className="ai-booking-notice" role="status">{tr('This AI mode is currently disabled.','هذا الوضع غير متاح حالياً.')}</p>}
      {Boolean(customerPrice)&&<label className="ai-booking-consent ai-booking-pricing"><input type="checkbox" checked={pricingAccepted} disabled={busy||call==='active'||call==='connecting'} onChange={event=>setPricingAccepted(event.target.checked)}/><span>{tr(`I accept ${new Intl.NumberFormat('en-CA',{style:'currency',currency:aiPolicy.customerPricing.currency}).format(customerPrice/100)} ${aiPolicy.customerPricing.currency} per ${mode==='chat'?'completed Chat reply':`started Voice session (up to ${maxCallSeconds} seconds)`}, billed by manual invoice.`,`أوافق على دفع ${(customerPrice/100).toFixed(2)} ${aiPolicy.customerPricing.currency} لكل ${mode==='chat'?'رد دردشة مكتمل':`جلسة صوتية تبدأ (حتى ${maxCallSeconds} ثانية)`} عبر فاتورة يدوية.`)}</span></label>}
      {saveError&&<p className="ai-booking-notice" role="alert">{tr(saveError,'تعذر حفظ سجل المحادثة. أعد المحاولة قبل مغادرة الصفحة.')} <button type="button" onClick={()=>saveMessages()}>{tr('Retry saving','إعادة الحفظ')}</button></p>}
      {error&&<p className="ai-booking-notice" role="alert">{error}{orderDraft&&!draftAvailable()&&<button type="button" onClick={()=>orderDraft.retrySync?.()}>{tr('Reload draft','إعادة تحميل المسودة')}</button>}</p>}
      </div>
      </div>
    </div>
  </div>;
  return guided?<div ref={flipRoot} className={`ai-booking-split ai-booking-flip${assistantFace?' is-flipped':''}${flipSettled?' is-settled':''}`}>
    <div className="ai-booking-flip-inner">
      <div id="booking-form-face" className="ai-booking-flip-face is-front" inert={assistantFace} aria-hidden={assistantFace||undefined}>{guided}</div>
      <div id="booking-assistant-face" className="ai-booking-flip-face is-back" inert={!assistantFace} aria-hidden={!assistantFace||undefined}>{chatPanel}</div>
    </div>
  </div>:chatPanel;
}
