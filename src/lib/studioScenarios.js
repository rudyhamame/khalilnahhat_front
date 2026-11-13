// The studio inputs are chosen as one scenario. Mixer = an external audio device (an audio interface or DJ mixer) on the IN channel;
// Mic = the optional voice microphone (the MIC channel). Two video sources are a later scenario family.
export const STUDIO_SCENARIOS=[
  {id:'camera',title:'Camera',video:'camera',mixer:false,parts:['1 camera','Optional mic']},
  {id:'camera-mixer',title:'Camera + Mixer',video:'camera',mixer:true,parts:['1 camera','1 mixer','Optional mic']},
  {id:'photo',title:'Photo viewer',video:'image',mixer:false,parts:['1 photo viewer','Optional mic']},
  {id:'photo-mixer',title:'Photo viewer + Mixer',video:'image',mixer:true,parts:['1 photo viewer','1 mixer','Optional mic']},
  {id:'photo-audio',title:'Photo viewer + Audio file',video:'image',mixer:false,audioFile:true,parts:['1 photo viewer','1 audio file','Optional mic']},
  {id:'video',title:'Video viewer',video:'video',mixer:false,parts:['1 video viewer','Video audio','Optional mic']},
  {id:'video-mixer',title:'Video viewer + Mixer',video:'video',mixer:true,parts:['1 video viewer','1 mixer','Optional mic']},
];
export const scenarioById=id=>STUDIO_SCENARIOS.find(item=>item.id===id)||null;
// Video viewers without a mixer use the video's own sound; the voice microphone is separate.
export const scenarioSetup=scenario=>({kind:scenario.video,audio:scenario.mixer?'mic':scenario.audioFile||scenario.video==='video'?'file':'none'});
