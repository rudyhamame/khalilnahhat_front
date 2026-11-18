const choiceId=(languageId,dialectId=null)=>JSON.stringify([languageId,dialectId]);

// A choice is either a language without a specified dialect, or one language/dialect pair.
export function atomLanguageOptions(languages=[],vocabulary=[]){
 const names=new Map(vocabulary.map(row=>[row.id,row.name]));
 const choices=new Map();
 const add=(languageId,dialectId=null)=>{
  const id=choiceId(languageId,dialectId);
  choices.set(id,{id,languageId,dialectId,name:dialectId?`${names.get(languageId)||languageId} · ${names.get(dialectId)||dialectId}`:names.get(languageId)||languageId});
  return id;
 };
 for(const language of vocabulary.filter(row=>row.kind==='language'&&!row.archived)){
  add(language.id);
  for(const dialect of vocabulary.filter(row=>row.kind==='dialect'&&!row.archived&&row.parentId===language.id))add(language.id,dialect.id);
 }
 // Existing selections keep their schema association, even when vocabulary entries are archived or absent.
 const selected=languages.flatMap(row=>row.dialectIds?.length?row.dialectIds.map(id=>add(row.languageId,id)):[add(row.languageId)]);
 return {rows:[...choices.values()].sort((a,b)=>a.name.localeCompare(b.name)),selected};
}

export function selectedAtomLanguages(ids,rows){
 const choices=new Map(rows.map(row=>[row.id,row])),languages=new Map();
 for(const id of ids){
  const choice=choices.get(id);if(!choice)continue;
  if(!languages.has(choice.languageId))languages.set(choice.languageId,{languageId:choice.languageId,dialectIds:[]});
  const row=languages.get(choice.languageId);
  if(choice.dialectId&&!row.dialectIds.includes(choice.dialectId))row.dialectIds.push(choice.dialectId);
 }
 return [...languages.values()];
}
