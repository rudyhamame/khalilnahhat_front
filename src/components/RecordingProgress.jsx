import {Check,LoaderCircle,TriangleAlert,Circle} from 'lucide-react';
import {recordingPipeline,formatSize} from '../lib/recordingPipeline';
// Draws the stages that recordingPipeline() decides. No status logic lives here.
export default function RecordingProgress(props){
  const pipeline=recordingPipeline(props);
  if(pipeline.idle)return <p className="rec-idle">Nothing recording yet. Progress appears here when you go live.</p>;
  return <div className="studio-recording-steps-wrap"><ol className="studio-recording-steps" aria-label="Recording progress">{pipeline.stages.map(step=><li key={step.key} title={step.hint} className={`is-${step.state}`}><span className="studio-step-icon" aria-hidden="true">{step.state==='active'?<LoaderCircle size={14} className="studio-opening-spinner"/>:step.state==='done'?<Check size={14}/>:step.state==='error'?<TriangleAlert size={14}/>:<Circle size={12}/>}</span><strong>{step.title}</strong></li>)}</ol>{pipeline.sending&&<div className="studio-step-bar" role="progressbar" aria-label="Upload progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow={pipeline.percent}><i style={{width:`${pipeline.percent}%`}}/></div>}<p className="studio-step-hint" role="status" aria-live="polite">{pipeline.focus.hint}</p></div>;
}

// One-glance summary: where the recording is, how much is safe on disk, how much OVH already holds.
export function RecordingStats(props){
  const pipeline=recordingPipeline(props),{recorded}=props;
  return <div className="rec-stats"><div><small>Status</small><b className={`studio-local-chip ${pipeline.tone}`}>{pipeline.label}</b></div><div><small>On disk</small><strong>{recorded?formatSize(recorded):'—'}</strong></div><div><small>Sent to OVH</small><strong>{recorded?`${formatSize(pipeline.sent)} · ${pipeline.percent}%`:'—'}</strong></div></div>;
}
