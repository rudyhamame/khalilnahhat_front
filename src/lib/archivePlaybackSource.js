// Renewed access credentials identify the same media bytes, not a new song.
export function archiveAudioIdentity(value){
 try{
  const url=new URL(value,'https://archive.invalid');
  if(/^\/khalil-media\/(?:public|private)\/[a-f0-9]{64}\.[a-z0-9]+$/.test(url.pathname)||/^\/api\/music-archive\/media\/[a-f0-9-]{36}$/.test(url.pathname)){
   url.searchParams.delete('expires');url.searchParams.delete('signature');
  }
  return url.href;
 }catch{return value;}
}
export function retainArchiveSource(previous,track){
 const id=track?.id||'',url=track?.audioUrl||'';
 if(previous?.id===id&&previous?.url&&archiveAudioIdentity(previous.url)===archiveAudioIdentity(url))return previous;
 return {id,url};
}
