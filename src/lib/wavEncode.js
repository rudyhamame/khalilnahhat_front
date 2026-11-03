const MAX_BYTES=95*1024*1024;
// 16-bit PCM WAV of [from,to) frames; stereo drops to mono when the file would not fit the upload limit.
export function encodeWav(decoded,from,to,maxBytes=MAX_BYTES){
 const frames=to-from;let channels=Math.min(decoded.numberOfChannels,2);
 if(frames*channels*2+44>maxBytes)channels=1;
 if(frames*channels*2+44>maxBytes)throw Error('The trimmed audio is still too large. Choose a shorter part.');
 const rate=decoded.sampleRate,view=new DataView(new ArrayBuffer(44+frames*channels*2));
 const text=(offset,value)=>[...value].forEach((char,index)=>view.setUint8(offset+index,char.charCodeAt(0)));
 text(0,'RIFF');view.setUint32(4,36+frames*channels*2,true);text(8,'WAVEfmt ');view.setUint32(16,16,true);view.setUint16(20,1,true);view.setUint16(22,channels,true);view.setUint32(24,rate,true);view.setUint32(28,rate*channels*2,true);view.setUint16(32,channels*2,true);view.setUint16(34,16,true);text(36,'data');view.setUint32(40,frames*channels*2,true);
 const sources=Array.from({length:decoded.numberOfChannels},(_,index)=>decoded.getChannelData(index));
 for(let i=0,offset=44;i<frames;i++){
  for(let c=0;c<channels;c++){
   // Mono is the average of every source channel.
   const sample=channels===1?sources.reduce((sum,data)=>sum+data[from+i],0)/sources.length:sources[c][from+i];
   view.setInt16(offset,Math.max(-1,Math.min(1,sample))*0x7fff,true);offset+=2;
  }
 }
 return new Blob([view],{type:'audio/wav'});
}

