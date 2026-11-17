import {aiFields,decodePatchValue} from './eventOrderCore.mjs';
const definitions=aiFields.filter(field=>field.key.startsWith('music.'));
const escape=value=>value.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
const aliases=new Map();
for(const field of aiFields.filter(field=>!field.key.startsWith('planning.')))for(const label of [field.short,field.shortAr,field.label,field.ar])if(label)aliases.set(label.toLowerCase(),field);
for(const [label,key] of [['Languages','music.languagePairs'],['Genres','music.genres'],['Favourite artists','music.favouriteArtists'],['Favorite artists','music.favouriteArtists'],['Favorite songs','music.favouriteSongs'],['Suggested songs','music.suggestedSongs']])aliases.set(label.toLowerCase(),definitions.find(field=>field.key===key));
const labelPattern=[...aliases.keys()].sort((a,b)=>b.length-a.length).map(escape).join('|');
const list=text=>text.split(/\s*(?:[,;\n]|\band\b)\s*/iu).map(value=>value.trim()).filter(Boolean);
export function songMessageRows(text){
 return text.split(/\s*[;\n]\s*/u).map(text=>{
  const clean=text.replace(/\\([:./?=&_-])/g,'$1').trim();
  const url=clean.match(/https:\/\/[^\s<>]+/u);
  let name=(url?clean.slice(0,url.index):clean).replace(/\s*[.]+$/u,'').trim(),phase='';
  const moment=name.match(/^([^:]{1,80}):\s*(.+)$/u);if(moment){phase=moment[1];name=moment[2];}
  // Respect the two explicit input conventions: title — artist, artist - title.
  const titled=name.split(/\s+[–—]\s+/u),artistFirst=name.split(/\s+-\s+/u);
  const row={song:name,...(phase?{phase}:{})};
  if(titled.length===2){row.song=titled[0];row.artist=titled[1];}
  else if(artistFirst.length===2){row.artist=artistFirst[0];row.song=artistFirst[1];}
  if(url)row.link=url[0].replace(/[).,]+$/u,'');
  return row;
 }).filter(row=>row.song);
}
// Explicit labelled sections are presentation only; this never edits the draft.
export function musicMessageFields(content){
 const text=String(content||''),pattern=new RegExp(`(^|\\n|[.!?]\\s+|;\\s*)(${labelPattern})\\s*:\\s*`,'giu');
 const matches=[...text.matchAll(pattern)],music=[],rest=[];let cursor=0;
 for(let index=0;index<matches.length;index++){
  const match=matches[index],field=aliases.get(match[2].toLowerCase()),limit=matches[index+1]?.index??text.length;
  if(!field?.key.startsWith('music.'))continue;
  // A value ends at the next label, at a blank line, at a line that starts another subject (equipment, venue…), or, for one-line values such as artists, at the end of the line.
  // Without this, everything written after the last label (an equipment list, say) was swallowed into it.
  const valueStart=match.index+match[0].length,tail=text.slice(valueStart,limit);
  const stops=[tail.search(/\n[ \t]*\n/u),tail.search(/\n[ \t]*(?:[-*•][ \t]+)?(?:equipment|services?|rentals?|venue|address|date|time|guests?|budget|notes?|contact)\b[^\n]*:/iu),['tags','multi','pairs'].includes(field.type)?tail.search(/\n/u):-1].filter(position=>position>=0);
  const end=stops.length?valueStart+Math.min(...stops):limit;
  rest.push(text.slice(cursor,match.index));cursor=end;
  const value=text.slice(valueStart,end).trim().replace(/[.;]+$/u,'').trim();
  if(!value)continue;
  let parsed=value;
  if(['music.suggestedSongs','music.favouriteSongs'].includes(field.key))parsed=songMessageRows(value);
  else if(field.type==='pairs')parsed=list(value).map(part=>{const match=part.match(/^(.+?)\s*\(([^)]+)\)$/u);return {language:match?match[1]:part,dialect:match?match[2]:''};});
  else if(['tags','multi'].includes(field.type))parsed=list(value);
  music.push({path:field.key,value:parsed});
 }
 rest.push(text.slice(cursor));
 return {text:rest.join('\n').trim(),fields:music};
}
export function musicPatchFields(patch=[]){
 return patch.flatMap(change=>{const field=definitions.find(field=>field.key===change.path);return field?[{path:field.key,value:decodePatchValue(field,change.value)}]:[];});
}
