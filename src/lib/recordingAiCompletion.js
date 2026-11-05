const normalized=value=>String(value||'').normalize('NFKC').trim().toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
// Suggestions select existing catalog identities; they never silently create shared people or vocabulary.
export function applyRecordingCompletion(item,result,vocabulary){
 const missing=[];
 const find=(kind,name)=>vocabulary.find(row=>!row.archived&&(row.kind===kind||(kind==='lyricist'&&row.kind==='artist'))&&normalized(row.name)===normalized(name));
 const ids=(kind,names)=>[...new Set((names||[]).flatMap(name=>{const row=find(kind,name);if(!row){missing.push(`${kind}: ${name}`);return [];}return [row.id];}))];
 const credits=(kind,names)=>ids(kind,names).slice(0,100).map(artistId=>({artistId,detail:''}));
 const lyrics=item.lyrics||{},sound=item.sound||{};
 const languageIds=lyrics.languageIds??(lyrics.languageId?[lyrics.languageId]:[]);
 const languages=languageIds.length?languageIds:ids('language',result.languages);
 const dialectIds=lyrics.dialectIds??(lyrics.dialectId?[lyrics.dialectId]:[]);
 const dialects=dialectIds.length?dialectIds:ids('dialect',result.dialects).filter(id=>{const row=vocabulary.find(row=>row.id===id);return languages.length&&(!row.parentId||languages.includes(row.parentId));});
 const musicians=(result.musicians||[]).flatMap(credit=>{
  const person=find('musician',credit.name),instrument=credit.instrument?find('instrument',credit.instrument):null;
  if(!person||(credit.instrument&&!instrument)){missing.push(`musician: ${credit.name}${credit.instrument?' · '+credit.instrument:''}`);return [];}
  return [{artistId:person.id,instrumentId:instrument?.id||person.instrumentId||null,detail:''}];
 });
 return {item:{...item,name:(!item.name||/^Atom \d+$/.test(item.name))?(result.title||item.name||''):item.name,releaseDate:item.releaseDate||(!item.releaseYear?result.releaseDate:'')||'',releaseYear:item.releaseYear??(item.releaseDate?Number(item.releaseDate.slice(0,4)):result.releaseYear)??null,sound:{...sound,genreIds:sound.genreIds?.length?sound.genreIds:ids('genre',result.genres)},musicianCredits:item.musicianCredits.length?item.musicianCredits:musicians.slice(0,100),lyrics:{...lyrics,concept:lyrics.concept||result.concept,sentenceConcept:lyrics.sentenceConcept||result.summary,languageIds:languages,languageId:languages[0]||null,dialectIds:dialects,dialectId:dialects[0]||null,lyricistCredits:lyrics.lyricistCredits?.length?lyrics.lyricistCredits:credits('lyricist',result.lyricists),vocalistCredits:lyrics.vocalistCredits?.length?lyrics.vocalistCredits:credits('artist',result.vocalists)}},missing};
}
