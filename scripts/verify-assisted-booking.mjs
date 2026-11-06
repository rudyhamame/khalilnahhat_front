// Explicitly authorized live QA only. Uses a separately registered test client;
// never accepts a normal client's draft and never confirms or pays a booking.
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createEventOrder,aiOrderContext,validateEventOrder} from '../src/lib/eventOrderCore.mjs';
import {prepareBookingDraftEdit} from '../src/lib/bookingDraftEdits.js';
import {venueSelectionChanges} from '../src/lib/bookingFlow.mjs';
import {numberedRentalCatalog} from '../src/lib/numberedRentalCatalog.js';
import {readBookingResponse,voiceConversationContext} from '../src/lib/aiBookingStream.mjs';
import {buildQuoteItems} from '../src/echo/quoteItems.js';

if(!process.argv.includes('--submit')||!process.env.ECHO_QA_SESSION)throw Error('Requires --submit and ECHO_QA_SESSION pointing to an isolated QA client session file.');
const session=JSON.parse(await fs.readFile(process.env.ECHO_QA_SESSION,'utf8'));
assert.match(session.user.lastName,/QA TEST ONLY/,'Refuse to use a real client account.');
const base=process.env.ECHO_QA_API||'https://echo-khalil-api.onrender.com/api';
const headers={'Content-Type':'application/json',Authorization:`Bearer ${session.token}`};
async function api(path,body,method=body?'POST':'GET'){
 const response=await fetch(base+path,{method,headers,...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(60000)});
 const result=await response.json();if(!response.ok)throw Error(`${method} ${path}: HTTP ${response.status}: ${result.message}`);return result;
}
const existing=await api('/ai-booking/event-draft');if(existing.item)assert.equal(existing.item.order.event.type,'graduation','Only resume this script’s graduation QA draft.');
const prior=(await api('/service-requests/mine')).items.find(row=>row.order?.additional?.notes?.includes('QA TEST ONLY'));
assert.ok(prior?.order?.event?.venue?.sourceId,'First finish the browser venue-selection test.');
const live=await api('/ai-booking/booking-data?year=2027');assert.equal(live.catalog.status,'ready');assert.equal(live.equipment.status,'ready');
const equipment=live.equipment.data,catalog=live.catalog.data,numbers=numberedRentalCatalog(catalog,equipment);
const pick=numbers.flatMap(service=>service.equipment.map(item=>({...item,service}))).find(row=>{const item=equipment.find(item=>item.id===row.id);return !row.isSet&&item?.availableQuantity>=Math.max(2,item.minQuantity||1);});
assert.ok(pick,'An active numbered equipment item with a known stock count is required.');
const quantity=Math.max(2,equipment.find(item=>item.id===pick.id).minQuantity||1);
const draftId=existing.item?.draftId||randomUUID(),segmentId=randomUUID(),messages=[],timings=[],tasks=[];let version=existing.item?.version||0,order=existing.item?.order||createEventOrder();
Object.assign(order.customer,{fullName:`${session.user.firstName} ${session.user.lastName}`,email:session.user.email,phone:'4165550100'});
async function apply(changes){
 const result=prepareBookingDraftEdit(order,changes,{catalog,equipment});assert.deepEqual(result.rejectedFields,[]);
 const saved=await api('/ai-booking/event-draft',{version,draftId,order:result.order},'PUT');version=saved.item.version;order=saved.item.order;
 tasks.push(...result.updatedFields.map(change=>({...change,id:randomUUID(),confirmed:true,label:change.path,sessionId:draftId})));
}
async function remember(role,content){
 const message={id:randomUUID(),role,content:content.slice(0,4000),mode:'chat',segmentId};messages.push(message);
 await api('/ai-booking/conversations',{consent:true,id:draftId,messages:[message]});
}
async function chat(text,currentSubject){
 await remember('user',text);
 const start=Date.now();
 const response=await fetch(base+'/ai-booking/chat',{method:'POST',headers:{...headers,Accept:'application/x-ndjson'},signal:AbortSignal.timeout(75000),body:JSON.stringify({consent:true,responseFormat:'patch',requestId:randomUUID(),order:aiOrderContext(order),messages:messages.slice(-15),context:voiceConversationContext(messages,aiOrderContext(order),{tasks,sessionId:draftId,numberedCatalog:numbers,currentSubject})})});
 const result=await readBookingResponse(response);timings.push(Date.now()-start);
 let patch=result.orderPatch||[];
 const venue=patch.find(change=>change.path==='event.venue.name');
 if(venue){
  const results=await api('/venue-map/search?'+new URLSearchParams({q:venue.value,bounds:'-95.2,41.6,-74.3,56.9'}));
  const chosen=results.items.find(row=>row.sourceId===prior.order.event.venue.sourceId)||results.items.find(row=>row.name===prior.order.event.venue.name);
  assert.ok(chosen,'The client’s explicitly chosen venue must be present in real search results.');
  await apply(venueSelectionChanges(chosen,prior.order.event.venue.area));
  patch=patch.filter(change=>!change.path.startsWith('event.venue.')||change.path==='event.venue.setting');
 }
 if(patch.length)await apply(patch);
 await remember('assistant',result.reply);
 console.log(`Arabic QA turn ${timings.length}: ${patch.map(change=>change.path).join(', ')||'clarification'} (${timings.at(-1)} ms)`);
}
await chat('هذا اختبار QA TEST ONLY وليس حجزاً حقيقياً. الفعالية حفل تخرج بتاريخ 15 ديسمبر 2027 من الخامسة مساءً إلى التاسعة مساءً، وعدد الضيوف 50.',{section:'availability',face:'calendar'});
assert.equal(order.event.type,'graduation');assert.equal(order.event.date,'2027-12-15');assert.equal(order.event.startTime,'17:00');assert.equal(order.event.endTime,'21:00');assert.equal(order.event.guestCount,50);
await chat(`أريد الانتقال إلى تفاصيل المكان. اخترت ${prior.order.event.venue.name} في تورونتو من نتائج البحث. الفعالية داخلية.`,{section:'availability',face:'venue'});
assert.equal(order.event.venue.name,prior.order.event.venue.name);
if(order.event.venue.setting!=='indoor')await chat('الفعالية داخلية، احفظ event.venue.setting = indoor.',{section:'availability',face:'venue'});
await chat('انتقل إلى خدمة دي جي خليل. لا أريد خدمة دي جي. انتقل إلى القسم الرابع؛ لا أريد تقديم حفل MC، لكن أريد تأجير معدات.',{section:'setup'});
assert.equal(order.music.djRequested,false);assert.equal(order.music.mcRequested,false);assert.equal(order.rental.requested,true);
await chat(`أريد إضافة المعدات بالرقم ${pick.tag} (${pick.name})، والكمية ${quantity} قطع.`,{section:'setup'});
assert.ok(order.equipment.some(item=>item.id===pick.id&&item.quantity===quantity),'The numbered choice and explicit quantity must reach the draft.');
await chat('انتقل إلى بيانات التواصل والمراجعة. وسيلة التواصل البريد الإلكتروني، ورقم الهاتف 4165550100. احفظ additional.notes بالنص التالي بالضبط: QA TEST ONLY — Arabic automated workflow test; no real event; do not quote or contact. لا تستخدم أي قسيمة خصم.',{section:'booking'});
if(!order.additional.notes?.includes('QA TEST ONLY'))await chat('Set additional.notes exactly to: QA TEST ONLY — Arabic automated workflow test; no real event; do not quote or contact.',{section:'booking'});
if(order.customer.contactMethod!=='email')await chat('Use email for customer.contactMethod. This is my explicit answer for the contact preference, not a request to change chapters.',{section:'booking'});
assert.equal(order.customer.contactMethod,'email');assert.ok(order.additional.notes.includes('QA TEST ONLY'));assert.equal(order.additional.voucherCode,null);assert.deepEqual(validateEventOrder(order,{submission:true}),[]);
const names={dj:'DJ',sound:'Sound',lighting:'Lighting',led:'LED',fx:'Special effects',rental:'Rental',corporate:'Corporate'};
const cart=Object.fromEntries(order.equipment.map(row=>{const item=equipment.find(item=>item.id===row.id);return [row.id,{...item,quantity:row.quantity}];}));
const payload={clientSubmissionId:randomUUID(),draftId,order,items:buildQuoteItems(cart,order.services,names,order.event.type)};
const result=await api('/service-requests',payload);assert.equal(result.item.status,'pending');assert.ok(result.item.requestNumber);
const retry=await api('/service-requests',payload);assert.equal(retry.item.id,result.item.id);assert.equal(retry.replayed,true);
const saved=(await api('/service-requests/mine')).items.find(item=>item.id===result.item.id);assert.ok(saved);assert.equal(saved.order.equipment[0].quantity,quantity);
const removed=await api(`/ai-booking/event-draft?version=${version}&draftId=${draftId}`,undefined,'DELETE');assert.equal(removed.conversationRemoved,true);assert.equal((await api('/ai-booking/event-draft')).item,null);
const report={reference:result.item.requestNumber,id:result.item.id,event:order.event.type,date:order.event.date,equipment:order.equipment,numberedTag:pick.tag,testOnly:true,requestStatus:saved.status,conversationMessages:messages.length,idempotentRetry:true,draftRetired:true,replyTimesMs:timings,voiceTransport:'covered by automated transport tests; no physical microphone QA'};
await fs.mkdir('artifacts/booking-refactor-20261106',{recursive:true});await fs.writeFile('artifacts/booking-refactor-20261106/arabic-live-qa.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report,null,2));
