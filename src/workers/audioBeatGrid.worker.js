import {analyzeAudioBeatGrid} from '../lib/audioBeatGrid.js';
self.onmessage=event=>{
 try{const grid=analyzeAudioBeatGrid(new Float32Array(event.data.samples),event.data.sampleRate,(stage,progress)=>self.postMessage({type:'progress',stage,progress}));self.postMessage({type:'result',grid});}
 catch{self.postMessage({type:'error',message:'Audio beat analysis could not finish.'});}
};
