import './obsBroadcast.css';
// The two picture options, written as OBS instructions. The relay forwards OBS's video as it is, so these are the real settings.
const OPTIONS=[
 {id:'720',title:'720p · lighter',resolution:'1280×720',bitrate:'3500–4500 Kbps',upload:'about 9 Mbps',note:'Best for viewers on phones or slow connections.'},
 {id:'1080',title:'1080p · sharper',resolution:'1920×1080',bitrate:'6000–8000 Kbps',upload:'about 16 Mbps',note:'Every viewer pulls this full rate. Use it for a good audience connection.'},
];
export default function ObsQualityGuide(){
 return <div className="obs-quality-guide" aria-label="OBS settings for 720p and 1080p">
  <div className="obs-quality-options">{OPTIONS.map(option=><section key={option.id} className="obs-quality-option">
   <h5>{option.title}</h5>
   <ol>
    <li><b>Settings → Video:</b> Base and Output resolution <b>{option.resolution}</b>, FPS <b>30</b>. Do this while not streaming.</li>
    <li><b>Camera:</b> double-click the camera source → Resolution <b>{option.resolution}</b>, Format <b>MJPEG</b>, 30 fps. Then press <b>Ctrl+F</b> so it fills the frame.</li>
    <li><b>Settings → Output → Streaming:</b> Bitrate <b>{option.bitrate}</b>.</li>
    <li><b>Upload needed:</b> {option.upload}.</li>
   </ol>
   <p className="obs-help">{option.note}</p>
  </section>)}</div>
  <section className="obs-quality-option">
   <h5>Both options · Settings → Output → Streaming (Output Mode: Advanced)</h5>
   <ol>
    <li><b>Encoder:</b> your GPU (FFmpeg VAAPI H.264), or x264 with CPU Usage Preset <b>ultrafast</b>.</li>
    <li><b>Profile:</b> <b>constrained baseline</b> (x264: <b>baseline</b>). The relay rejects any other profile.</li>
    <li><b>Rate Control:</b> <b>CBR</b>. <b>Keyframe Interval:</b> <b>2 s</b>. <b>Max B-frames:</b> <b>0</b> (x264 Options: <code>bframes=0</code>).</li>
    <li><b>Audio:</b> Opus, 128–160 Kbps.</li>
    <li><b>Every live:</b> Prepare OBS, paste the new Server and token (Settings → Stream, Service WHIP), then Start Streaming within 2 minutes.</li>
   </ol>
   <p className="obs-help">OBS cannot change the video size while it is streaming. Stop streaming, change the settings, then prepare a new connection.</p>
  </section>
 </div>;
}
