// Only unambiguous, direct event choices qualify. Questions, negations and
// multiple alternatives remain with the assistant for clarification.
export function explicitEventChoice(message,catalog=[],allowed=[]){
 const normalize=value=>String(value||'').normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f\u0670]/g,'').replace(/\s+/g,' ').trim();
 let text=normalize(message).replace(/[.!،؛。]+$/u,'').trim();
 text=text.replace(/^(?:please\s+)?(?:(?:set|select|choose|change)(?:\s+(?:it|the event|event type|my event))?(?:\s+to)?|(?:it(?:'s| is)|the event is|my event is))\s+/u,'');
 text=text.replace(/^(?:اختر|اختار|حدد|اجعلها|اجعله|غيرها إلى|غيره إلى|الفعالية هي|المناسبة هي)\s+/u,'');
 const candidates=new Map(allowed.map(value=>[normalize(value),value]));
 for(const event of catalog){
  if(event.kind!=='event'||!event.isActive||!allowed.includes(event.bookingType))continue;
  for(const label of [event.name,event.nameAr])if(label)candidates.set(normalize(label),event.bookingType);
 }
 return candidates.get(text)||null;
}
