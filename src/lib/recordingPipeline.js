// One place that decides where a recording is: folder → capture → upload to OVH → archive to Cloudinary.
// Pure and testable; the Studio panels only draw what this returns.
export const formatSize=bytes=>bytes>=1024**3?`${(bytes/1024**3).toFixed(2)} GB`:`${Math.max(0,Math.round(bytes/1024**2))} MB`;
const TROUBLE=/paused|pending|failed|could not|stopped/i,ARCHIVING=/preparing the archive/i;
export function recordingPipeline({folder='',live=false,recorded=0,saved=0,message='',serverStatus=''}={}){
  const sent=Math.min(saved,recorded),sending=recorded>0&&sent<recorded;
  const trouble=TROUBLE.test(message)||['failed','upload_failed'].includes(serverStatus);
  const stored=serverStatus==='ready'||serverStatus==='partial';
  const archiving=!stored&&(ARCHIVING.test(message)||serverStatus==='processing');
  // Once OVH is archiving or done it already holds every part, even if this page was refreshed and its counters reset.
  const past=archiving||stored;
  const captured=recorded>0||past,uploaded=(recorded>0&&!live&&!sending)||past;
  const stages=[
    {key:'disk',title:'Folder',state:folder?'done':'idle',hint:folder?`Parts are saved in “${folder}”.`:'Choose a folder before going live.'},
    {key:'capture',title:'Recording',state:live?'active':captured?'done':'idle',hint:live?`Capturing to disk · ${formatSize(recorded)}`:recorded>0?`${formatSize(recorded)} captured.`:past?'Capture finished.':'Starts when you go live.'},
    {key:'upload',title:'Uploading to OVH',state:trouble?'error':sending?'active':uploaded?'done':'idle',hint:trouble?(message||'Upload needs attention.'):sending?`${formatSize(sent)} of ${formatSize(recorded)} sent. Keep Studio open.`:uploaded?'All parts received by OVH.':'Parts upload while you stream.'},
    {key:'archive',title:'Archiving',state:stored?'done':archiving?'active':'idle',hint:stored?'Saved to Cloudinary. See Live Recordings.':archiving?'OVH is building the video and saving it to Cloudinary. You can close Studio.':'Starts after the upload finishes.'},
  ];
  // A finished stage is named in the past tense.
  const DONE={capture:'Recorded',upload:'Uploaded to OVH',archive:'Archived'};
  for(const stage of stages)if(stage.state==='done'&&DONE[stage.key])stage.title=DONE[stage.key];
  const idle=!live&&!captured&&!archiving&&!stored;
  const [label,tone]=trouble?['Needs attention','is-failed']:live?['Recording','is-live']:sending?['Uploading','is-disk']:archiving?['Archiving','is-disk']:stored?['Stored','is-sent']:recorded>0?['Captured','is-sent']:['Idle','is-idle'];
  const focus=stages.find(s=>s.state==='error')||stages.find(s=>s.state==='active')||[...stages].reverse().find(s=>s.state==='done')||stages[0];
  return {idle,label,tone,stages,focus,sent,percent:recorded?Math.round(sent/recorded*100):0,sending};
}
