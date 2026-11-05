import {Mp3Encoder} from '@breezystack/lamejs';

self.onmessage=({data:{channels,sampleRate}})=>{
 try{
  const rate=44100,frames=Math.floor(channels[0].length*rate/sampleRate),encoder=new Mp3Encoder(channels.length,rate,192),chunks=[];
  for(let offset=0;offset<frames;offset+=1152){
   const length=Math.min(1152,frames-offset);
   const pcm=channels.map(source=>{
    const samples=new Int16Array(length);
    for(let i=0;i<length;i++){
     const position=(offset+i)*sampleRate/rate,index=Math.floor(position),fraction=position-index;
     const sample=source[index]*(1-fraction)+source[Math.min(index+1,source.length-1)]*fraction;
     samples[i]=Math.max(-1,Math.min(1,sample))*32767;
    }
    return samples;
   });
   const encoded=encoder.encodeBuffer(pcm[0],pcm[1]);if(encoded.length)chunks.push(new Uint8Array(encoded));
  }
  const final=encoder.flush();if(final.length)chunks.push(new Uint8Array(final));
  self.postMessage({blob:new Blob(chunks,{type:'audio/mpeg'})});
 }catch(error){self.postMessage({error:error.message||'MP3 encoding failed.'});}
};
