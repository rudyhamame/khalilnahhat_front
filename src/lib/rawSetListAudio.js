export const AUDIO_CONVERSION_STALE_MS=10*60*1000;
export function audioConversionPending(song,now=Date.now()){
 return song.audioPreparation==='converting'&&new Date(song.audioConversionStartedAt).getTime()>now-AUDIO_CONVERSION_STALE_MS;
}
export function rawAudioDownloadUrl(song){
 if(!song.audioUrl)return '';
 try{
  const url=new URL(song.audioUrl);
  if(!['http:','https:'].includes(url.protocol))return '';
  if(url.hostname==='res.cloudinary.com'&&url.pathname.includes('/upload/')){
   const name=(song.track||'raw-audio').replace(/[^a-zA-Z0-9_-]+/g,'-').slice(0,100)||'raw-audio';
   url.pathname=url.pathname.replace('/upload/',`/upload/fl_attachment:${name}/`);
  }
  return url.href;
 }catch{return '';}
}
