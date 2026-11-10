// One place that decides where a recording is: folder → capture → upload to OVH → archive to Cloudinary.
// Pure and testable; the Studio panels only draw what this returns.
export const formatSize=bytes=>bytes>=1024**3?`${(bytes/1024**3).toFixed(2)} GB`:`${Math.max(0,Math.round(bytes/1024**2))} MB`;
const TROUBLE=/paused|pending|failed|could not|stopped/i,ARCHIVING=/preparing the archive/i;
/**
 * `local` is the truth from the folder: {count: parts on disk, uploaded: parts OVH acknowledged, done: OVH accepted the
 * finish after checking the part count and total size}. "Uploaded to OVH" is only shown when `done` is true.
 * Without `local` (nothing known about the folder) the byte counters are the fallback.
 */
export function recordingPipeline({folder='',live=false,recorded=0,saved=0,message='',serverStatus='',serverError='',local=null,cloudParts=0}={}){
  const stored=serverStatus==='ready'||serverStatus==='partial';
  const archiving=!stored&&(ARCHIVING.test(message)||serverStatus==='processing');
  const past=archiving||stored;
  const total=local?local.count:0,partsSent=local?Math.min(local.uploaded||0,total):0;
  const verified=local?Boolean(local.done):false;
  const sending=local?(!verified&&partsSent<total):(recorded>0&&Math.min(saved,recorded)<recorded);
  // OVH moved on (archiving or stored) although the folder still holds parts it never confirmed.
  const closedEarly=Boolean(local)&&past&&!verified&&partsSent<total;
  // OVH failed to save the finished video to Cloudinary: that is an archive problem, not an upload from the Studio.
  const archiveFailed=['failed','upload_failed'].includes(serverStatus);
  const trouble=closedEarly||TROUBLE.test(message);
  const captured=local?total>0:(recorded>0||past);
  const uploaded=local?verified:((recorded>0&&!live&&!sending)||past);
  const sent=local?partsSent:Math.min(saved,recorded),all=local?total:recorded;
  const unit=local?n=>`${n} part${n===1?'':'s'}`:formatSize;
  const progress=`${unit(sent)} of ${unit(all)}`;
  // Part-relative: when the folder is known, every number is a count of parts (the unit the Studio actually moves).
  const metaCapture=all?(local?unit(total):formatSize(recorded)):'',metaUpload=all?(local?`${sent} / ${total}`:`${formatSize(sent)}`):'';
  const stages=[
    {key:'disk',title:'Folder',state:folder?'done':'idle',hint:folder?`Parts are saved in “${folder}”.`:'Choose a folder before going live.'},
    {key:'capture',meta:metaCapture,title:'Recording',state:live?'active':captured?'done':'idle',hint:live?`Capturing to disk · ${local?unit(total):formatSize(recorded)}`:captured?`${local?unit(total):formatSize(recorded)} captured.`:'Starts when you go live.'},
    {key:'upload',meta:metaUpload,title:'Uploading to OVH',state:trouble?'error':live&&all>0||sending?'active':uploaded?'done':'idle',
      hint:closedEarly?`OVH closed this recording with ${progress}. The rest is safe in your folder; end this live and start a new one.`:trouble?(message||'Upload needs attention.'):sending||live&&all>0?`${progress} on OVH. Keep Studio open.`:uploaded?(local?`All ${unit(total)} confirmed by OVH.`:'All parts received by OVH.'):'Parts upload while you stream.'},
    {key:'archive',meta:cloudParts>0?`${cloudParts} stored`:'',title:'Archiving in Cloudinary',state:archiveFailed?'error':stored?'done':archiving&&!closedEarly?'active':'idle',hint:archiveFailed?`OVH could not finish saving this to Cloudinary${serverError?`: ${serverError}`:'.'} It retries by itself; if it keeps failing, use Retry in Live Recordings. Your parts are safe in your folder.`:stored?`Saved to Cloudinary${cloudParts>0?` · ${cloudParts} part${cloudParts===1?'':'s'}`:''}. See Live Recordings.`:archiving?`OVH is building the video and saving it to Cloudinary${cloudParts>0?` · ${cloudParts} part${cloudParts===1?'':'s'} stored so far`:''}. You can close Studio.`:'Starts after the upload finishes.'},
  ];
  // A finished stage is named in the past tense.
  const DONE={capture:'Recorded',upload:'Uploaded to OVH',archive:'Archived in Cloudinary'};
  for(const stage of stages)if(stage.state==='done'&&DONE[stage.key])stage.title=DONE[stage.key];
  const idle=!live&&!captured&&!archiving&&!stored&&!archiveFailed;
  const [label,tone]=trouble||archiveFailed?['Needs attention','is-failed']:live?['Recording','is-live']:sending?['Uploading','is-disk']:archiving?['Archiving','is-disk']:stored?['Stored','is-sent']:captured?['Captured','is-sent']:['Idle','is-idle'];
  const focus=stages.find(s=>s.state==='error')||stages.find(s=>s.state==='active')||[...stages].reverse().find(s=>s.state==='done')||stages[0];
  return {idle,label,tone,stages,focus,sent,all,parts:local?total:0,bytes:local?(local.bytes||0):recorded,sentLabel:all?progress:'',percent:all?Math.round(sent/all*100):0,sending};
}
