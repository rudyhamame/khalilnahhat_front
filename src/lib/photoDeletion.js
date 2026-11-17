const digits=value=>String(value||'').replace(/[٠-٩]/g,digit=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
const removal=/\b(?:delete|remove|discard)\b|(?:احذف|حذف|أزل|ازالة|إزالة)/iu;
const photo=/\b(?:inspiration\s+)?(?:photo|photos|image|images|picture|pictures)\b|(?:صور|صورة)/iu;
const bare=/^\s*(?:delete|remove)\s+(?:it|that|this|them)(?:\s+please)?[.!\s]*$|^\s*(?:احذف|أزل)\s+(?:هذه|هذا|ذلك|تلك|الصورة|الصور)[.!\s]*$/iu;

function selectedNumbers(message){
 const normalized=digits(message),found=[...normalized.matchAll(/(?:#|\b)(\d{1,2})\b/g)].map(match=>Number(match[1]));
 const ordinals={first:1,second:2,third:3,fourth:4,fifth:5,sixth:6,seventh:7,eighth:8,ninth:9,tenth:10};
 for(const [word,value] of Object.entries(ordinals))if(new RegExp(`\\b${word}\\b`,'i').test(normalized))found.push(value);
 return [...new Set(found)];
}

export function photoDeletionRequest(message,{pending=false,photoContext=false,count=0}={}){
 const text=String(message||''),cancel=/^\s*(?:cancel|never mind|nevermind|stop|إلغاء|الغاء|تراجع)\b/iu.test(text);
 if(pending&&cancel)return {kind:'cancel'};
 const explicit=removal.test(text)&&photo.test(text),contextual=bare.test(text)&&photoContext;
 if(!pending&&!explicit&&!contextual)return null;
 if(count<1)return {kind:'empty'};
 const numbers=selectedNumbers(text);
 if(numbers.length){
  const indices=numbers.map(number=>number-1);
  return indices.every(index=>index>=0&&index<count)?{kind:'delete',indices}:{kind:'invalid'};
 }
 return {kind:'ask'};
}

export function numberedPhotoChoices(items,ar=false){
 const rows=(items||[]).map((item,index)=>{let fallback=ar?'صورة ملهمة':'Inspiration photo';try{fallback=new URL(item?.url||'').hostname||fallback;}catch{/* Use the generic label. */}return `${index+1}. ${item?.name||fallback}`;});
 return ar
  ? `أي صورة ملهمة تريد حذفها؟\n${rows.join('\n')}\nأرسل رقم الصورة فقط، أو اكتب «إلغاء».`
  : `Which inspiration photo would you like to delete?\n${rows.join('\n')}\nReply with the photo number, or say “cancel”.`;
}
