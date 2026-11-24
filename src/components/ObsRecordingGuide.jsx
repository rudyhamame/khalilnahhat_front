// Recommended OBS recording settings for the Echo studio laptop (Linux, Intel UHD 620 graphics, hardware H.264), in the order OBS shows them (Settings → Output → Advanced → Recording).
const SETTINGS=[
 ['Output Mode','Advanced','Needed to see the Recording tab and choose the format and encoder.'],
 ['Recording Path','A fast, always-connected drive','Your /media/rudy/PLUGIN/LIVE works if the drive is on a USB 3 port and has 50 GB free or more. If the disk is slow or sleeps, record to the laptop disk and copy the file after.'],
 ['Recording Format','Matroska Video (.mkv)','Safe: if OBS or the laptop stops suddenly the file is still playable. (MP4 would be lost.)'],
 ['Video Encoder','FFmpeg VAAPI H.264','Right choice for your Intel graphics: it uses the graphics chip, so the CPU stays free for the live. Do not use the software x264 encoder on this laptop.'],
 ['Rate Control / Quality','CQP, quality level 21','Constant quality: sharp picture without guessing a bitrate. Lower number = better quality and a bigger file (20 to 23 is the useful range). If the file is too big use 23.'],
 ['Profile / Keyframes','High, keyframe every 2 seconds','Best compatibility and easy to seek or cut afterwards.'],
 ['Audio Encoder','AAC, 192 kbps','Clean sound for music; your libfdk AAC is fine (use the standard AAC if it is missing).'],
 ['Audio Track','Track 1 only','Tick only 1. It must carry the mixed live sound (music + microphone).'],
 ['Rescale Output','Disabled','Keeps the exact canvas size. Set the canvas in Settings → Video to 1920x1080 at 30 FPS (the laptop does not need more). If it runs hot or drops frames, use 1280x720 at 30 FPS.'],
 ['Automatic File Splitting','Off (turn on only for lives over 2 hours)','For very long lives, split by time every 60 minutes so one problem cannot ruin everything.'],
];
const STEPS=[
 'Settings → Output → Output Mode: Advanced → Recording tab. Apply the table above, then click Apply and OK.',
 'Do a 10 second test recording and play it back: check picture and sound in the saved file.',
 'For the real live: prepare OBS in Echo Live Studio, paste the server and bearer token into OBS, then start streaming in OBS. Press Go live in the Studio. If you want a local copy, also press Start Recording in OBS.',
 'When the live ends: disconnect OBS in the Studio and stop streaming in OBS. If you recorded locally, press Stop Recording in OBS too.',
 'Your .mkv stays in the Recording Path on your computer. The app does not record or upload live sessions.',
];
export default function ObsRecordingGuide(){
 return <div className="obs-guide">
  <p className="obs-guide-lead">The app does not record or archive live sessions. To keep a local copy, record in OBS. These are the settings I recommend for this laptop (Intel UHD 620, hardware H.264):</p>
  <table className="obs-guide-table"><thead><tr><th scope="col">OBS setting</th><th scope="col">Use</th><th scope="col">Why</th></tr></thead>
   <tbody>{SETTINGS.map(([name,value,why])=><tr key={name}><th scope="row">{name}</th><td><b>{value}</b></td><td>{why}</td></tr>)}</tbody></table>
  <h4>Every live</h4>
  <ol>{STEPS.map((text,index)=><li key={index}><span className="obs-guide-n" aria-hidden="true">{index+1}</span><p>{text}</p></li>)}</ol>
 </div>;
}
