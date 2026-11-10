import {Check,LoaderCircle,TriangleAlert,Circle} from 'lucide-react';
const size=bytes=>bytes>=1024**3?`${(bytes/1024**3).toFixed(2)} GB`:`${Math.max(0,Math.round(bytes/1024**2))} MB`;
// Four stages of one recording: disk → live capture → upload to OVH → archive. Each shows a loader while it works.
export default function RecordingProgress({folder,live,recorded,saved,message,serverStatus}){
  const paused=/paused|pending|failed|could not|stopped/i.test(message||''),archiving=/preparing the archive/i.test(message||'')||serverStatus==='processing',ready=serverStatus==='ready';
  const uploadLeft=recorded>0&&saved<recorded;
  const steps=[
    {key:'disk',title:'Folder',state:folder?'done':'idle',hint:folder?`Parts are saved in “${folder}”.`:'Choose a folder before going live.'},
    {key:'capture',title:'Recording',state:live?'active':recorded>0?'done':'idle',hint:live?`Capturing to disk · ${size(recorded)}`:recorded>0?`${size(recorded)} captured.`:'Starts when you go live.'},
    {key:'upload',title:'Uploading to OVH',state:paused?'error':uploadLeft?'active':recorded>0&&!live?'done':'idle',hint:paused?message:uploadLeft?`${size(Math.min(saved,recorded))} of ${size(recorded)} sent. Keep Studio open.`:recorded>0&&!live?'All parts received by OVH.':'Parts upload while you stream.'},
    {key:'archive',title:'Archiving',state:ready?'done':archiving?'active':'idle',hint:ready?'Saved to Cloudinary. See Live Recordings.':archiving?'OVH is building the video and saving it to Cloudinary. You can close Studio.':'Starts after the upload finishes.'},
  ];
  if(!live&&!recorded&&!archiving&&!ready)return null;
  const focus=steps.find(step=>step.state==='error')||steps.find(step=>step.state==='active')||[...steps].reverse().find(step=>step.state==='done')||steps[0];
  return <div className="studio-recording-steps-wrap"><ol className="studio-recording-steps" aria-label="Recording progress">{steps.map(step=><li key={step.key} title={step.hint} className={`is-${step.state}`}><span className="studio-step-icon" aria-hidden="true">{step.state==='active'?<LoaderCircle size={14} className="studio-opening-spinner"/>:step.state==='done'?<Check size={14}/>:step.state==='error'?<TriangleAlert size={14}/>:<Circle size={12}/>}</span><strong>{step.title}</strong></li>)}</ol><p className="studio-step-hint" role="status" aria-live="polite">{focus.hint}</p></div>;
}
