// Lexical (word-based) ranking for venue search results: case-, accent- and punctuation-insensitive,
// every typed word must match the start of a word in the venue's name/address, best matches first.
const words=value=>String(value||'').normalize('NFKD').replace(/\p{M}/gu,'').toLowerCase().replace(/['’‘]s\b/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim().split(/\s+/).filter(Boolean);
// Edit distance, stopping early once it is above the limit.
function within(a,b,limit){
 if(Math.abs(a.length-b.length)>limit)return false;
 let row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=1;i<=a.length;i++){
  const next=[i];let best=i;
  for(let j=1;j<=b.length;j++){next[j]=Math.min(row[j]+1,next[j-1]+1,row[j-1]+(a[i-1]===b[j-1]?0:1));best=Math.min(best,next[j]);}
  if(best>limit)return false;row=next;
 }
 return row[b.length]<=limit;
}
// Spelling tolerance: 1 wrong letter for words of 3-5 letters, 2 for longer words ("kig" finds "keg"). The first letter must match (it is rarely the mistyped one). Compared with each name word and with its same-length start.
const typo=(word,parts)=>word.length>=3&&parts.some(part=>part[0]===word[0]&&((()=>{const limit=word.length>5?2:1;return within(word,part,limit)||(part.length>word.length&&within(word,part.slice(0,word.length),limit));})()));
export function venueScore(item,query){
 const typed=words(query);if(!typed.length)return 0;
 const name=words(item.name),nameText=name.join(' '),address=words(item.address);
 let score=0;
 for(const word of typed){
  if(name.includes(word))score+=10;               // whole word in the name
  else if(name.some(part=>part.startsWith(word)))score+=7;   // word prefix in the name (typing "tow" finds "tower")
  else if(address.includes(word))score+=4;        // whole word in the address
  else if(address.some(part=>part.startsWith(word)))score+=2;
  else if(typo(word,name))score+=3;               // a misspelt word of the name
  else return 0;                                  // a typed word matches nothing: not a match
 }
 const joined=typed.join(' ');
 if(nameText===joined)score+=30;                   // exact name
 else if(nameText.startsWith(joined))score+=15;    // name starts with what was typed
 else if(nameText.includes(joined))score+=8;       // typed words appear together, in order
 return score;
}
export function rankVenues(items,query){
 return items.map((item,index)=>({item,index,score:venueScore(item,query)})).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.index-b.index).map(row=>row.item);
}
