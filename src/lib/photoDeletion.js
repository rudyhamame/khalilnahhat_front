const digits=value=>String(value||'').replace(/[٠-٩]/g,digit=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
const removal=/\b(?:delete|remove|discard)\b|(?:احذف|حذف|أزل|ازالة|إزالة)/iu;
const photo=/\b(?:inspiration\s+)?(?:photo|photos|image|images|picture|pictures)\b|(?:صور|صورة)/iu;
const document=/\b(?:event\s+)?(?:document|documents|file|files)\b|(?:مستند|مستندات|ملف|ملفات)/iu;
const bare=/^\s*(?:delete|remove)\s+(?:it|that|this|them)(?:\s+please)?[.!\s]*$|^\s*(?:احذف|أزل)\s+(?:هذه|هذا|ذلك|تلك|الصورة|الصور)[.!\s]*$/iu;

const everything=/\ball\b|\bevery(?:thing)?\b|(?:الكل|كل|جميع)/iu;
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
 if(everything.test(text))return {kind:'delete',indices:Array.from({length:count},(_,index)=>index)};
 const numbers=selectedNumbers(text);
 if(numbers.length){
  const indices=numbers.map(number=>number-1);
  return indices.every(index=>index>=0&&index<count)?{kind:'delete',indices}:{kind:'invalid'};
 }
 return {kind:'ask'};
}

export function documentDeletionRequest(message,{pending=false,documentContext=false,count=0}={}){
 const text=String(message||''),cancel=/^\s*(?:cancel|never mind|nevermind|stop|إلغاء|الغاء|تراجع)\b/iu.test(text);
 if(pending&&cancel)return {kind:'cancel'};
 const explicit=removal.test(text)&&document.test(text),contextual=bare.test(text)&&documentContext;
 if(!pending&&!explicit&&!contextual)return null;
 if(count<1)return {kind:'empty'};
 if(everything.test(text))return {kind:'delete',indices:Array.from({length:count},(_,index)=>index)};
 const numbers=selectedNumbers(text);
 if(numbers.length){const indices=numbers.map(number=>number-1);return indices.every(index=>index>=0&&index<count)?{kind:'delete',indices}:{kind:'invalid'};}
 return {kind:'ask'};
}

const formatSize=bytes=>!(bytes>0)?'—':bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;
// A markdown table (the chat renders it as a real table): number, item, size. Pipes in names are made safe. Links have no size column.
export function itemTable(items,ar=false,{numbers=null,size=true,label}={}){
 const name=item=>String(item.label).replace(/\|/g,'/'),head=ar?`| # | ${label||'الاسم'}${size?' | الحجم':''} |`:`| # | ${label||'Name'}${size?' | Size':''} |`;
 const rows=items.map((item,index)=>`| ${numbers?numbers[index]:index+1} | ${name(item)}${size?` | ${formatSize(item.size)}`:''} |`).join('\n');
 return `\n\n${head}\n| ${size?'--- | --- | ---':'--- | ---'} |\n${rows}\n\n`;
}
const photoName=(item,ar)=>{let fallback=ar?'صورة ملهمة':'Inspiration photo';try{fallback=new URL(item?.url||'').hostname||fallback;}catch{/* Use the generic label. */}return item?.name||fallback;};
const documentName=(item,ar)=>item?.name||(ar?'مستند فعالية':'Event document');
export const photoNames=(items,ar=false)=>(items||[]).map(item=>({label:photoName(item,ar),size:item?.size}));
export const documentNames=(items,ar=false)=>(items||[]).map(item=>({label:documentName(item,ar),size:item?.size}));

export function numberedPhotoChoices(items,ar=false){
 const table=itemTable(photoNames(items,ar),ar,{label:ar?'الصورة':'Photo'});
 return ar
  ? `أي صورة ملهمة تريد حذفها؟${table}أرسل رقم الصورة، أو «حذف الكل»، أو «إلغاء».`
  : `Which inspiration photo would you like to delete?${table}Reply with the photo number, “Delete All”, or “cancel”.`;
}

export function numberedDocumentChoices(items,ar=false){
 const table=itemTable(documentNames(items,ar),ar,{label:ar?'المستند':'Document'});
 return ar
  ? `أي مستند فعالية تريد حذفه؟${table}أرسل رقم المستند، أو «حذف الكل»، أو «إلغاء».`
  : `Which event document would you like to delete?${table}Reply with the document number, “Delete All”, or “cancel”.`;
}

// Buttons for the list above: one per number, Delete All, Cancel. `text` is what a click sends, the same as typing it.
export const deletionActions=(count,ar=false)=>[...Array.from({length:count},(_,index)=>({label:`#${index+1}`,text:String(index+1)})),{label:ar?'حذف الكل':'Delete All',text:ar?'حذف الكل':'Delete All',danger:true},{label:ar?'إلغاء':'Cancel',text:ar?'إلغاء':'cancel'}];
// "Add it manually": a button that takes you to that field's section in the app.
export const manualAction=(path,ar=false)=>({label:ar?'أضفه يدوياً':'Add manually',goto:path});
