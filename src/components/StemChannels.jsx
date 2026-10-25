import { STEM_CHANNELS } from '../lib/stemMix';
import './stemChannels.css';
const labels={vocals:'Vocals',drums:'Drums',bass:'Bass',other:'Other music'};
export function StemChannelControls({stems}) {
  const ready=stems.status.status==='ready', busy=stems.loading || stems.status.status==='processing';
  return <div className="echo-stem-controls">
    {!ready && <button className="echo-stem-action" type="button" onClick={stems.separate} disabled={busy || !stems.status.canSeparate}>{busy?'Separating…':'Separate song'}</button>}
    <p role="status">{stems.notice || (stems.mode?'Channels active':stems.loading?'Loading channels…':stems.status.status==='processing' ? `${stems.status.stage}. This can take several minutes.` : stems.status.stage || 'Separate this song to mix its channels.')}</p>
  </div>;
}

export default function StemChannels({stems}) {
  return <>{STEM_CHANNELS.map(name=>{
    const channel=stems.mix[name];
    return <div key={name} className={`echo-channel-strip echo-channel-stem${stems.mode?' is-active':''}`}>
      <h3>{labels[name]}</h3>
      <div className="echo-channel-fader">
        <div className="echo-channel-meter" style={{'--channel-level':stems.levels[name]||0}} aria-hidden="true"><i /></div>
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
