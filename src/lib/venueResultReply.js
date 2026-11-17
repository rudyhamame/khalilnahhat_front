// Results belong to the conversation, including after a history reload.
export function venueResultReply(text,messages,search){
 const latest=messages.findLast(message=>message.role==='assistant'&&message.venueResults?.length);
 const venueReply=messages.findLastIndex(message=>message.role==='assistant'&&(message.face==='venue'||/venue details|select.+map|تفاصيل المكان|اختر.+خريطة/iu.test(message.content||'')));
 const explicit=/\b(?:venue|restaurant|place)\s+(?:results|list|matches|options)\b|(?:نتائج|قائمة)\s*(?:الأماكن|المطاعم|المكان)/iu.test(text);
 const listRequest=/\b(?:(?:full|all|complete|whole)\b.{0,25}\b(?:list|results|matches|options)|(?:show|display|list|see|give|send)\b.{0,35}\b(?:results|matches|list|venues|options)|(?:list|results|matches|options)\b.{0,20}\b(?:all|full|complete))\b|(?:كل|جميع|كامل|كاملة|اعرض|أظهر).{0,30}(?:نتائج|النتائج|قائمة|القائمة|الأماكن)|(?:النتائج|القائمة).{0,20}(?:كلها|كاملة)/iu;
 const listing=listRequest.test(text);
 if(!explicit&&/\b(?:equipment|songs|services|speakers)\b|(?:المعدات|الأغاني|الخدمات)/iu.test(text))return null;
 if(!explicit&&!(listing&&(search||latest||venueReply>=0)))return null;
 if(search?.items?.length)return {items:search.items,query:search.query};
 if(latest)return {items:latest.venueResults,query:''};
 // Older saved replies did not include cards. Repeat their original search.
 const original=venueReply>=0?messages.slice(0,venueReply).findLast(message=>message.role==='user'&&!listRequest.test(message.content)):null;
 const query=search?.query||original?.content?.trim().replace(/^(?:venue|venue name|location|المكان|مكان الفعالية)\s*[:：]\s*/iu,'');
 return {items:[],query:query||''};
}
