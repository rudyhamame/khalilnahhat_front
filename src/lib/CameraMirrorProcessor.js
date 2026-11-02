import { normalizeCameraAppearance, cameraAppearanceFilter } from './cameraAppearance.js';
// LiveKit publishes this canvas track, so mirroring reaches every viewer/output.
// A single render loop handles mirroring, appearance and embedded branding.
export class CameraMirrorProcessor {
  name = 'echo-camera-mirror';
  constructor({ mirrored = true, appearance = {}, watermark = false } = {}) { this.watermark = watermark; this.configure({ mirrored, appearance }); }
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
      if(this.watermark){
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
        const width = video.videoWidth, height = video.videoHeight;
        if (!width || !height) return;
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        context.setTransform(this.mirrored ? -1 : 1, 0, 0, 1, this.mirrored ? width : 0, 0);
        const settings = this.appearance, amount = settings.strength / 100;
        context.globalAlpha = 1;
        context.globalCompositeOperation = 'source-over';
        context.filter = amount ? cameraAppearanceFilter(settings) : 'none';
        context.drawImage(video, 0, 0, width, height);
        // A subtle blended blur softens the whole image without pixel readbacks.
        if (amount && settings.smoothing) {
          context.globalAlpha = settings.smoothing / 100 * amount * .45;
          context.filter = `${cameraAppearanceFilter(settings)} blur(${Math.max(.4, width / 1280 * 1.4)}px)`;
          context.drawImage(video, 0, 0, width, height);
        }
        context.globalAlpha = 1;
        context.filter = 'none';
        if (amount && settings.warmth) {
          context.globalCompositeOperation = 'soft-light';
          context.fillStyle = settings.warmth > 0 ? '#ffb46b' : '#83baff';
          context.globalAlpha = Math.abs(settings.warmth) / 50 * amount * .25;
          context.fillRect(0, 0, width, height);
          context.globalCompositeOperation = 'source-over';
          context.globalAlpha = 1;
        }
        // Branding is composed after the camera transform and filters, never mirrored.
        if(this.logo){
          context.setTransform(1,0,0,1,0,0);
          const margin=Math.round(Math.min(width,height)*.025),logoWidth=Math.round(Math.min(width,height)*.20);
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
      const tick = () => {
        if (this.disposed) return;
        draw();
        if (video.requestVideoFrameCallback) this.frame = video.requestVideoFrameCallback(tick);
        else this.timer = setTimeout(tick, 1000 / 30);
      };
      tick();
    } catch (error) { await this.destroy(); throw error; }
  }
  async restart(options) { await this.destroy(); await this.init(options); }
  async destroy() {
    this.disposed = true;
    clearTimeout(this.timeout);
    clearTimeout(this.timer);
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
