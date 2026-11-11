// Language pairs: [{language, dialect}], the first language is the main one. One language can carry several dialects.
export function languagesOf(pairs){return [...new Set((pairs||[]).map(pair=>pair.language))];}
export function dialectsOf(pairs,language){return (pairs||[]).filter(pair=>pair.language===language&&pair.dialect).map(pair=>pair.dialect);}
export function withLanguage(pairs,language,on){
 const list=pairs||[];
 if(on)return languagesOf(list).includes(language)?list:[...list,{language,dialect:''}];
 return list.filter(pair=>pair.language!==language);
}
export function withDialect(pairs,language,dialect){
 const list=pairs||[],current=dialectsOf(list,language),next=current.includes(dialect)?current.filter(item=>item!==dialect):[...current,dialect];
 const replacement=next.length?next.map(item=>({language,dialect:item})):[{language,dialect:''}];
 const at=list.findIndex(pair=>pair.language===language);
 if(at<0)return [...list,...replacement];
 return [...list.slice(0,at),...replacement,...list.slice(at).filter(pair=>pair.language!==language)];
}
// Make one language the main one by moving its pairs to the front.
export function makeMain(pairs,language){
 const list=pairs||[];
 return [...list.filter(pair=>pair.language===language),...list.filter(pair=>pair.language!==language)];
}
