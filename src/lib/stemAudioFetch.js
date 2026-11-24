import {playbackMediaUrl} from './playbackMediaUrl.js';

// Signed storage and blob URLs need no API bearer token. Only relative API
// channel endpoints receive it, and OVH downloads use the local media proxy.
export async function fetchStemAudio(url,{apiBaseUrl='',token='',signal,development}={},request=globalThis.fetch){
 const direct=/^(https?:|blob:)/i.test(url),managed=String(url).startsWith('/khalil-media/');
 const address=direct||managed?url:apiBaseUrl.replace(/\/api$/,'')+url;
 const response=await request(playbackMediaUrl(address,{development}),{signal,...(!direct&&!managed&&token?{headers:{Authorization:`Bearer ${token}`}}:{})});
 if(!response.ok)throw Error(`Channel audio download failed (${response.status}).`);
 return response;
}
