import {encodeWav} from './wavEncode';
import {encodeMp3} from './mp3Encode';

export const EXPORT_FORMATS=[{id:'mp3',label:'MP3',bitrateKbps:192},{id:'aac',label:'AAC (M4A)',bitrateKbps:160},{id:'wav',label:'WAV',description:'Uncompressed · 16-bit PCM'}];

// Cuts [from,to] seconds out of an audio source and encodes it in the browser (AAC is a WAV that the server compresses on save).
export async function trimAudioFile({src,from,to,exportFormat='mp3',alreadyTrimmed=false,signal}){
 const response=await fetch(src,{signal});if(!response.ok)throw Error('Audio could not be loaded.');
 const context=new (window.AudioContext||window.webkitAudioContext)();
 let buffer;
 try{buffer=await context.decodeAudioData(await response.arrayBuffer());}
 catch(problem){throw Error(problem.name==='EncodingError'?'This audio format could not be decoded. Try uploading a WAV or MP3 file.':'Audio could not be decoded.');}
 finally{context.close();}
 const first=Math.floor(Math.max(0,from)*buffer.sampleRate),last=Math.min(buffer.length,Math.ceil(Math.min(to,buffer.duration)*buffer.sampleRate));
 if(last-first<buffer.sampleRate*.05)throw Error('Keep at least a fraction of a second of audio.');
 const blob=exportFormat==='mp3'?await encodeMp3(buffer,first,last,signal):encodeWav(buffer,first,last);
 if(signal?.aborted)throw Error('Trimming was canceled.');
 const format=exportFormat==='mp3'?'mp3':'wav',trimmed=first>0||last<buffer.length;
 const file=new File([blob],`trimmed.${format}`,{type:blob.type});
 return {file,exportFormat,durationSeconds:(last-first)/buffer.sampleRate,audioMetadata:{format,sizeBytes:file.size,trimmed:trimmed||alreadyTrimmed}};
}

// Estimated size of the saved file for a given length (MP3/AAC at their fixed bitrates, WAV as 16-bit PCM).
export function estimateSizeMB(format,seconds,{sampleRate=44100,channels=2}={}){
 if(!Number.isFinite(seconds)||seconds<=0)return '';
 const option=EXPORT_FORMATS.find(item=>item.id===format);if(!option)return '';
 let bytes;
 if(format==='wav'){let ch=Math.min(channels,2);if(seconds*sampleRate*ch*2+44>95*1024*1024)ch=1;bytes=44+seconds*sampleRate*ch*2;}
 else bytes=seconds*option.bitrateKbps*1000/8;
 return `${(bytes/1000000).toFixed(bytes<1e7?2:1)} MB`;
}
