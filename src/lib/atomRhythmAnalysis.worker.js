import {analyzeRhythmSamples} from './atomRhythmAnalysis.js';
self.onmessage=({data})=>{try{self.postMessage({result:analyzeRhythmSamples(data.channels,data.sampleRate,{offset:data.offset})});}catch(error){self.postMessage({error:error.message});}};
