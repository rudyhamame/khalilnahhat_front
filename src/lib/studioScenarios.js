// The studio inputs are chosen as one scenario. Mixer = an external audio device (an audio interface or DJ mixer) on the IN channel;
// Mic = the optional voice microphone (the MIC channel). 'cameras' = two live cameras: Camera 1 fills the 16:9 frame, Camera 2 is a cut-out overlay.
export const STUDIO_SCENARIOS=[
  {id:'camera',title:'Camera',video:'camera',mixer:false,parts:['1 camera','Optional mic']},
  {id:'camera-mixer',title:'Camera + Mixer',video:'camera',mixer:true,parts:['1 camera','1 mixer','Optional mic']},
  {id:'cameras-mixer',title:'2 Cameras + Mixer · Collab',video:'cameras',mixer:true,parts:['1 landscape camera','1 portrait camera (placed inside the landscape picture)','1 mixer','Optional mic']},
  {id:'cameras-windows-mixer',title:'2 Cameras + Mixer · 2 windows',video:'cameras',windows:true,mixer:true,parts:['1 landscape camera → landscape window','1 portrait camera → portrait window','1 mixer','Optional mic']},
  {id:'photo',title:'Photo viewer',video:'image',mixer:false,parts:['1 photo viewer','Optional mic']},
  {id:'photo-mixer',title:'Photo viewer + Mixer',video:'image',mixer:true,parts:['1 photo viewer','1 mixer','Optional mic']},
  {id:'photo-audio',title:'Photo viewer + Audio file',video:'image',mixer:false,audioFile:true,parts:['1 photo viewer','1 audio file','Optional mic']},
  {id:'photo-setlist',title:'Photo viewer + Set list',video:'image',mixer:false,setlist:true,parts:['1 photo viewer','Set list songs (play them here)','Optional mic']},
  {id:'video',title:'Video viewer',video:'video',mixer:false,parts:['1 video viewer','Video audio','Optional mic']},
  {id:'video-mixer',title:'Video viewer + Mixer',video:'video',mixer:true,parts:['1 video viewer','1 mixer','Optional mic']},
  {id:'video-setlist',title:'Video viewer (no sound) + Set list',video:'video',mixer:false,setlist:true,parts:['1 video viewer (its sound is not used)','Set list songs (play them here)','Optional mic']},
];
export const scenarioById=id=>STUDIO_SCENARIOS.find(item=>item.id===id)||null;
// Moving a device to one window leaves the other window empty, never shared.
export function assignStudioCamera(cameraId,overlayId,target,deviceId){
  return target==='portrait'
    ?{cameraId:cameraId===deviceId?'none':cameraId,overlayId:deviceId}
    :{cameraId:deviceId,overlayId:overlayId===deviceId?'none':overlayId};
}
// Video viewers without a mixer use the video's own sound; the voice microphone is separate.
export const scenarioSetup=scenario=>({kind:scenario.video,audio:scenario.mixer?'mic':scenario.setlist?'setlist':scenario.audioFile||scenario.video==='video'?'file':'none',...(scenario.windows?{windows:true}:{})});
