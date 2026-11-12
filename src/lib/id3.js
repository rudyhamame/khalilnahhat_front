// Minimal ID3v2 reader (MP3 title, artist, album, year, genre). Anything unreadable just returns an empty result.
const decode=(bytes,encoding)=>{
 try{
  if(encoding===1||encoding===2){const bom=bytes[0]===0xFF&&bytes[1]===0xFE,little=encoding===1?bom||bytes[0]!==0xFE:false;return new TextDecoder(little?'utf-16le':'utf-16be').decode(bytes.slice(bytes[0]===0xFF||bytes[0]===0xFE?2:0));}
  return new TextDecoder(encoding===3?'utf-8':'iso-8859-1').decode(bytes);
 }catch{return '';}
};
const FRAMES={TIT2:'title',TPE1:'artist',TALB:'album',TYER:'year',TDRC:'year',TCON:'genre'};
export function parseId3(buffer){
 const view=new Uint8Array(buffer);
 if(view.length<10||view[0]!==0x49||view[1]!==0x44||view[2]!==0x33)return {};
 const major=view[3],size=((view[6]&127)<<21)|((view[7]&127)<<14)|((view[8]&127)<<7)|(view[9]&127),end=Math.min(view.length,10+size),tags={};
 let at=10;
 while(at+10<=end){
  const id=String.fromCharCode(...view.slice(at,at+4));if(!/^[A-Z0-9]{4}$/.test(id))break;
  const length=major===4?((view[at+4]&127)<<21)|((view[at+5]&127)<<14)|((view[at+6]&127)<<7)|(view[at+7]&127):(view[at+4]<<24)|(view[at+5]<<16)|(view[at+6]<<8)|view[at+7];
  if(length<=0||at+10+length>view.length)break;
  const key=FRAMES[id];
  if(key&&!tags[key]){const body=view.slice(at+11,at+10+length),text=decode(body,view[at+10]).replace(/\0+/g,'').trim();if(text)tags[key]=key==='year'?text.slice(0,4):text;}
  at+=10+length;
 }
 return tags;
}
export async function readId3(file){
 try{return parseId3(await file.slice(0,262144).arrayBuffer());}catch{return {};}
}
