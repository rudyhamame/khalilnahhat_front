// LiveKit publishes this canvas track, so mirroring reaches every viewer/output.
// No canvas or render loop is allocated until the operator enables mirroring.
export class CameraMirrorProcessor {
  name = 'echo-camera-mirror';
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
      const canvas = this.canvas = document.createElement('canvas');
      if (!canvas.captureStream) throw new Error('Camera mirroring is unavailable in this browser.');
      const context = canvas.getContext('2d', { alpha: false });
      if (!context) throw new Error('Camera mirroring could not start.');
      const draw = () => {
        const width = video.videoWidth, height = video.videoHeight;
        if (!width || !height) return;
        if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
        context.setTransform(-1, 0, 0, 1, width, 0);
        context.drawImage(video, 0, 0, width, height);
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
    this.stream = null;
    this.processedTrack = undefined;
  }
}
