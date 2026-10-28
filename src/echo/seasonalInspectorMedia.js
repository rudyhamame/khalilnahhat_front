export function treeVideoSource(value){
 try{
  const url=new URL(value,'https://echo-khalil.onrender.com');
  if(!['http:','https:'].includes(url.protocol))return null;
  const host=url.hostname.replace(/^(www\.|m\.)/,'');
  if(['youtube.com','youtube-nocookie.com','youtu.be'].includes(host)){
   const id=host==='youtu.be'?url.pathname.split('/')[1]:url.searchParams.get('v')||url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1];
   return /^[a-zA-Z0-9_-]{11}$/.test(id||'')?{kind:'embed',src:`https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1`}:null;
  }
  if(['vimeo.com','player.vimeo.com'].includes(host)){
   const id=url.pathname.match(/^\/(?:video\/)?(\d+)(?:\/|$)/)?.[1];
   return id?{kind:'embed',src:`https://player.vimeo.com/video/${id}?dnt=1`}:null;
  }
  return {kind:'video',src:value};
 }catch{return null;}
}
