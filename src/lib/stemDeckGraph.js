import {createDjChannelStrip} from './djChannelStrip.js';
// Full recording and decoded stems share one channel strip and crossfader route.
export function createStemDeckGraph(context,element,destination){
 const source=context.createMediaElementSource(element),originalGain=context.createGain(),stemInput=context.createGain();
 originalGain.gain.value=1;source.connect(originalGain);originalGain.connect(stemInput);
 const strip=createDjChannelStrip(context,stemInput,destination);let disconnected=false;
 return {context,element,source,originalGain,stemInput,strip,disconnect(){if(disconnected)return;disconnected=true;strip.disconnect();source.disconnect();originalGain.disconnect();stemInput.disconnect();}};
}
