import {fieldName} from './eventOrderCore.mjs';
// Plain-words explanation of draft values Echo could not apply: never a raw field name, and equipment gets its own friendly line.
export function rejectedFieldsNote(rejectedFields,ar=false){
 const tr=(en,arabic)=>ar?arabic:en,names=[...new Set(rejectedFields||[])];
 const gear=names.some(name=>name.startsWith('equipment')),notReady=names.includes('draft_unavailable');
 const others=names.filter(name=>!name.startsWith('equipment')&&name!=='draft_unavailable').map(name=>fieldName(name,ar)||name);
 return [gear?tr('That equipment isn’t available to add right now, so I left your equipment selection as it was.','هذه المعدات غير متاحة للإضافة الآن، لذلك تركتُ اختيار المعدات كما هو.'):'',others.length?tr(`I couldn’t save: ${others.join(', ')}.`,`تعذر حفظ: ${others.join('، ')}.`):'',notReady?tr('Your draft isn’t ready yet. Please try again in a moment.','المسودة ليست جاهزة بعد. يرجى المحاولة بعد لحظات.'):''].filter(Boolean).join(' ');
}
