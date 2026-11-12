import { STEM_CHANNELS } from '../lib/stemMix';
import './stemChannels.css';
const labels={vocals:'Vocals',drums:'Drums',bass:'Bass',piano:'Piano',guitar:'Guitar',other:'Other music'};
export function StemChannelControls({stems}) {
  const processing=stems.status.status==='processing';
  const message=stems.notice||(stems.loading?'Loading channels…':processing?`${stems.status.stage||'Preparing separated channels…'} This can take several minutes.`:stems.status.stage||(stems.status.canSeparate?(stems.active?'Preparing mixer channels…':'Open Mixer to prepare separated channels.'):'Separated channels are not available for this recording yet.'));
  return <div className="echo-stem-controls">{!stems.mode&&<p role="status">{message}</p>}</div>;

}

export default function StemChannels({stems}) {
  const present=(stems.status.channels||[]).map(channel=>channel.name);
  return <>{STEM_CHANNELS.filter(name=>!present.length||present.includes(name)).map(name=>{
    const channel=stems.mix[name];
    return <div key={name} className={`echo-channel-strip echo-channel-stem${stems.mode?' is-active':''}`}>
      <h3>{labels[name]}</h3>
      <div className="echo-channel-fader">
        <div className="echo-channel-meter" ref={node=>{if(stems.levelRefs)stems.levelRefs.current[name]=[node];}} aria-hidden="true"><i /></div>
        <input aria-label={`${labels[name]} channel volume`} aria-orientation="vertical" type="range" min="0" max="1" step=".01" value={channel.volume} disabled={!stems.mode} onChange={event=>stems.change(name,{volume:Number(event.target.value)})} />
        <span className="echo-channel-scale" aria-hidden="true">100<br />75<br />50<br />25<br />0</span>
      </div>
      <output>{Math.round(channel.volume*100)}<small>%</small></output>
      <div className="echo-stem-buttons">
        <button type="button" disabled={!stems.mode} title={`Mute ${labels[name]}`} aria-label={`Mute ${labels[name]}`} aria-pressed={channel.muted} onClick={()=>stems.change(name,{muted:!channel.muted})}>M</button>
        <button type="button" disabled={!stems.mode} title={`Solo ${labels[name]}`} aria-label={`Solo ${labels[name]}`} aria-pressed={channel.solo} onClick={()=>stems.change(name,{solo:!channel.solo})}>S</button>
      </div>
    </div>;
  })}</>;
}
