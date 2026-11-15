export function dialectsForLanguages(dialects,languageIds){
 const languages=new Set(languageIds||[]);
 return (dialects||[]).filter(dialect=>[...(dialect.languageIds||[]),dialect.parentId].some(id=>id&&languages.has(id)));
}
