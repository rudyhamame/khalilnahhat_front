// Mono samples of an audio file at a modest sample rate (enough for pitch analysis); the last few files stay cached.
const cache=new Map();
export async function decodeMono(src,sampleRate=16000){
 const key=`${sampleRate}:${src}`;if(cache.has(key))return cache.get(key);
 const response=await fetch(src);if(!response.ok)throw Error('The audio could not be read.');
 const Context=window.OfflineAudioContext||window.webkitOfflineAudioContext;if(!Context)throw Error('Audio analysis is not supported in this browser.');
 const buffer=await new Context(1,1,sampleRate).decodeAudioData(await response.arrayBuffer());
 const result={samples:buffer.getChannelData(0),sampleRate:buffer.sampleRate};
 cache.set(key,result);if(cache.size>3)cache.delete(cache.keys().next().value);return result;
}
