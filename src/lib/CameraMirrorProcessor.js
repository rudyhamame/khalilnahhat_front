import {startLiveFrameClock} from './liveFrameClock.js';
import { normalizeCameraAppearance } from './cameraAppearance.js';
import { paintLook } from './lookPaint.js';
// LiveKit publishes this canvas track, so mirroring reaches every viewer/output.
// A single render loop handles mirroring, appearance and embedded branding.
export class CameraMirrorProcessor {
  name = 'echo-camera-mirror';
  constructor({ mirrored = true, appearance = {}, watermark = false } = {}) { this.watermark = watermark; this.hasLogo = watermark; this.configure({ mirrored, appearance }); }
  configure({ mirrored = this.mirrored, appearance = this.appearance } = {}) {
    const next = normalizeCameraAppearance(appearance);
    if(this.context && next.strength > 0 && !('filter' in this.context)) throw new Error('Beauty and lighting filters are unavailable in this browser.');
    this.mirrored = mirrored; this.appearance = next;
  }
  async init({ track }) {
    this.disposed = false;
    const video = this.video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = new MediaStream([track]);
    try {
      await Promise.race([
        video.play(),
        new Promise((_, reject) => { this.timeout = setTimeout(() => reject(new Error('Camera mirror could not read the camera.')), 8000); }),
      ]);
      clearTimeout(this.timeout);
      if (this.disposed) throw new Error('Camera was closed.');
      if(this.hasLogo){
        this.logo = new Image();
        this.logo.src = '/echo/dj-khalil-nahhat-logo.svg';
        await Promise.race([this.logo.decode(),new Promise((_,reject)=>{this.timeout=setTimeout(()=>reject(new Error('Stream logo could not load. Retry preview.')),8000);})]);
        clearTimeout(this.timeout);
        if(this.disposed)throw new Error('Camera was closed.');
      }
      const canvas = this.canvas = document.createElement('canvas');
      if (!canvas.captureStream) throw new Error('Camera mirroring is unavailable in this browser.');
      const context = this.context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Camera effects could not start.');
      this.configure();
      const draw = () => {
        const width = this.frameSource?.displayWidth||video.videoWidth, height = this.frameSource?.displayHeight||video.videoHeight;
        if (!width || !height) return;
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        this.paintVideo(context, width, height);
        // Branding is composed after the camera transform and filters, never mirrored.
        if(this.logo&&this.watermark){
          context.setTransform(1,0,0,1,0,0);
          const margin=Math.round(Math.min(width,height)*.025),logoWidth=Math.round(Math.min(width,height)*(height>width ? .12 : .20));
          const logoHeight=logoWidth*this.logo.naturalHeight/this.logo.naturalWidth;
          context.globalAlpha=.9;
          context.shadowColor='#000c';context.shadowBlur=Math.max(2,width/640);
          context.drawImage(this.logo,margin,margin,logoWidth,logoHeight);
          context.shadowBlur=0;
          context.globalAlpha=1;
        }
      };
      draw();
      this.stream = canvas.captureStream(30);
      this.processedTrack = this.stream.getVideoTracks()[0];
      if (!this.processedTrack) throw new Error('Camera mirroring could not create video.');
      // Raw camera frames keep arriving even when a hidden video element stops
      // issuing presentation callbacks. Close every frame after composition.
      const fallback=()=>{
        const paint=()=>{if(!this.disposed){draw();this.processedTrack?.requestFrame?.();}};
        // Video callbacks give the foreground its natural cadence; the worker
        // also produces frames when those callbacks are suspended.
        let lastPresented=0;
        const tick=()=>{if(this.disposed)return;paint();lastPresented=Date.now();if(video.requestVideoFrameCallback)this.frame=video.requestVideoFrameCallback(tick);};
        tick();this.stopFrameClock=startLiveFrameClock(()=>{if(Date.now()-lastPresented>80)paint();});
      };
      if(typeof globalThis.MediaStreamTrackProcessor==='function'){
        try {
          this.frameReader=new globalThis.MediaStreamTrackProcessor({track}).readable.getReader();
          const reader=this.frameReader;
          void (async()=>{
            try {
              while(!this.disposed&&this.frameReader===reader){
                const {value:frame,done}=await reader.read();
                if(done)break;
                try{if(!this.disposed){this.frameSource=frame;draw();this.processedTrack?.requestFrame?.();}}
                finally{this.frameSource=null;frame.close();}
              }
            }catch{if(!this.disposed&&this.frameReader===reader)fallback();}
            finally{reader.releaseLock();}
          })();
        }catch{fallback();}
      }else fallback();
    } catch (error) { await this.destroy(); throw error; }
  }
  // The existing appearance pipeline, drawn into any context.
  paintVideo(context, width, height) { paintLook(context, this.frameSource||this.video, width, height, this.appearance, this.mirrored); }

  async restart(options) { await this.destroy(); await this.init(options); }
  async destroy() {
    this.disposed = true;
    clearTimeout(this.timeout);
    clearTimeout(this.timer);
    this.stopFrameClock?.();this.stopFrameClock=null;
    void this.frameReader?.cancel().catch(()=>{});this.frameReader=null;
    if (this.frame !== undefined) this.video?.cancelVideoFrameCallback?.(this.frame);
    this.stream?.getTracks().forEach(track => track.stop());
    if (this.video) { this.video.pause(); this.video.srcObject = null; }
    this.video = null;
    this.canvas = null;
    this.context = null;
    this.logo = null;
    this.stream = null;
    this.processedTrack = undefined;
  }
}
