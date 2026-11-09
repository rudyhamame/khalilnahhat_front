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
        const settings = this.appearance;
        if (settings.background !== 'off' && this.cutout(width, height)) {
          // Background replacement: background first, then the cut-out person with the same mirror and filters.
          this.paintBackground(context, width, height);
          this.paintVideo(this.layerContext, width, height);
          this.layerContext.setTransform(this.mirrored ? -1 : 1, 0, 0, 1, this.mirrored ? width : 0, 0);
          this.layerContext.globalCompositeOperation = 'destination-in';
          this.layerContext.filter = `blur(${Math.max(1.5, width / 640)}px)`;
          this.layerContext.drawImage(this.maskCanvas, 0, 0, width, height);
          this.layerContext.filter = 'none';
          this.layerContext.globalCompositeOperation = 'source-over';
          context.setTransform(1, 0, 0, 1, 0, 0);
          context.drawImage(this.layer, 0, 0);
        } else this.paintVideo(context, width, height);
        // Branding is composed after the camera transform and filters, never mirrored.
        if(this.logo){
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
      const tick = () => {
        if (this.disposed) return;
        draw();
        if (video.requestVideoFrameCallback) this.frame = video.requestVideoFrameCallback(tick);
        else this.timer = setTimeout(tick, 1000 / 30);
      };
      tick();
    } catch (error) { await this.destroy(); throw error; }
  }
  // The existing appearance pipeline, drawn into any context.
  paintVideo(context, width, height) {
    const video = this.video, settings = this.appearance, amount = settings.strength / 100;
    context.setTransform(this.mirrored ? -1 : 1, 0, 0, 1, this.mirrored ? width : 0, 0);
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    if (context === this.layerContext) context.clearRect(0, 0, width, height);
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
    if (settings.sideLight) {
      // Evens out one-sided light in screen space: lift the dark side, ease the bright side. Negative = light from the left.
      const k = Math.abs(settings.sideLight) / 100, left = settings.sideLight < 0;
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.globalCompositeOperation = 'soft-light';
      const lift = context.createLinearGradient(left ? width : 0, 0, left ? 0 : width, 0);
      lift.addColorStop(0, `rgba(255,255,255,${.7 * k})`); lift.addColorStop(.7, 'rgba(255,255,255,0)');
      context.fillStyle = lift; context.fillRect(0, 0, width, height);
      const ease = context.createLinearGradient(left ? 0 : width, 0, left ? width : 0, 0);
      ease.addColorStop(0, `rgba(0,0,0,${.3 * k})`); ease.addColorStop(.7, 'rgba(0,0,0,0)');
      context.fillStyle = ease; context.fillRect(0, 0, width, height);
      context.globalCompositeOperation = 'source-over';
    }
  }
  paintBackground(context, width, height) {
    const { background, bgBlur, bgColor } = this.appearance;
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    if (background === 'blur') {
      context.setTransform(this.mirrored ? -1 : 1, 0, 0, 1, this.mirrored ? width : 0, 0);
      context.filter = `blur(${Math.max(2, bgBlur / 100 * 28 * width / 1280)}px) brightness(.92)`;
      context.drawImage(this.video, 0, 0, width, height);
      context.filter = 'none';
    } else if (background === 'image' && this.bgImg?.complete && this.bgImg.naturalWidth) {
      context.setTransform(1, 0, 0, 1, 0, 0);
      const img = this.bgImg, scale = Math.max(width / img.naturalWidth, height / img.naturalHeight), w = img.naturalWidth * scale, h = img.naturalHeight * scale;
      context.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
    } else { context.setTransform(1, 0, 0, 1, 0, 0); context.fillStyle = bgColor; context.fillRect(0, 0, width, height); }
  }
  // Turns model confidences into the alpha cut-out: blended with the previous mask against shimmer.
  writeMask(data, width, height, matte) {
    const mc = this.maskCanvas ||= document.createElement('canvas');
    if (mc.width !== width || mc.height !== height) { mc.width = width; mc.height = height; this.maskImage = null; }
    const mctx = this.maskContext ||= mc.getContext('2d'), image = this.maskImage ||= mctx.createImageData(width, height), px = image.data;
    const prev = this.smooth?.length === data.length ? this.smooth : (this.smooth = new Float32Array(data.length).fill(-1));
    // Segmentation masks get a decisive smoothstep; matting output keeps its fine partial transparency (hair).
    const lo = matte ? .06 : .3, span = matte ? .88 : .4;
    for (let i = 0; i < data.length; i++) {
      const v = prev[i] < 0 ? data[i] : prev[i] * (matte ? .4 : .55) + data[i] * (matte ? .6 : .45);
      prev[i] = v;
      const t = Math.min(1, Math.max(0, (v - lo) / span));
      px[i * 4 + 3] = (matte ? t : t * t * (3 - 2 * t)) * 255;
    }
    mctx.putImageData(image, 0, 0); this.maskReady = true;
  }
  // High quality: MODNet portrait matting (Apache-2.0) via ONNX Runtime, WebGPU if present. Runs without blocking frames;
  // falls back to the fast segmenter while loading or when this device is too slow.
  cutoutHigh(width, height) {
    if (!this.matting && !this.matLoading && !this.matFailed) {
      this.matLoading = true;
      import('onnxruntime-web').then(async ort => {
        ort.env.wasm.wasmPaths = '/ort/'; ort.env.wasm.numThreads = 1;
        let session, provider = 'webgpu';
        try { session = await ort.InferenceSession.create('/mediapipe/modnet.onnx', { executionProviders: ['webgpu'] }); }
        catch { provider = 'wasm'; session = await ort.InferenceSession.create('/mediapipe/modnet.onnx', { executionProviders: ['wasm'] }); }
        if (this.disposed) { session.release?.(); return; }
        this.matting = { ort, session, provider, ms: 0, runs: 0 };
      }).catch(() => { this.matFailed = true; }).finally(() => { this.matLoading = false; });
    }
    const m = this.matting;
    if (!m) return false;
    if (!m.busy && this.video) {
      m.busy = true;
      const landscape = width >= height, W = landscape ? 384 : 224, H = landscape ? 224 : 384;
      const c = this.matCanvas ||= document.createElement('canvas');
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const cx = c.getContext('2d', { willReadFrequently: true });
      cx.drawImage(this.video, 0, 0, W, H);
      const d = cx.getImageData(0, 0, W, H).data, n = W * H, t = new Float32Array(3 * n);
      for (let i = 0; i < n; i++) { t[i] = d[i * 4] / 127.5 - 1; t[n + i] = d[i * 4 + 1] / 127.5 - 1; t[2 * n + i] = d[i * 4 + 2] / 127.5 - 1; }
      const t0 = performance.now();
      m.session.run({ [m.session.inputNames[0]]: new m.ort.Tensor('float32', t, [1, 3, H, W]) }).then(out => {
        if (this.disposed) return;
        this.writeMask(out[m.session.outputNames[0]].data, W, H, true);
        m.ms = m.runs++ ? m.ms * .7 + (performance.now() - t0) * .3 : performance.now() - t0;
        if (m.runs >= 3 && m.ms > 500) { this.matFailed = true; this.matting = null; this.smooth = null; m.session.release?.(); } // too slow here: stay on Fast
      }).catch(() => { this.matFailed = true; this.matting = null; }).finally(() => { m.busy = false; });
    }
    return this.maskReady && this.ensureLayer(width, height);
  }
  // Person cut-out from MediaPipe selfie segmentation, run on a small copy of the frame. False until the model is ready.
  cutout(width, height) {
    if (this.appearance.bgQuality === 'high' && !this.matFailed && this.cutoutHigh(width, height)) return true;
    const src = this.appearance.bgImage;
    if (this.bgSrc !== src) { this.bgSrc = src; this.bgImg = src ? Object.assign(new Image(), { src }) : null; }
    if (!this.segmenter) {
      if (!this.segLoading && !this.segFailed) {
        this.segLoading = true;
        import('@mediapipe/tasks-vision').then(async ({ FilesetResolver, ImageSegmenter }) => {
          const files = await FilesetResolver.forVisionTasks('/mediapipe/wasm');
          const make = delegate => ImageSegmenter.createFromOptions(files, { baseOptions: { modelAssetPath: width >= height ? '/mediapipe/selfie_segmenter_landscape.tflite' : '/mediapipe/selfie_segmenter.tflite', delegate }, runningMode: 'VIDEO', outputConfidenceMasks: true, outputCategoryMask: false });
          const segmenter = await make('GPU').catch(() => make('CPU'));
          if (this.disposed) segmenter.close(); else this.segmenter = segmenter;
        }).catch(() => { this.segFailed = true; }).finally(() => { this.segLoading = false; });
      }
      return false;
    }
    const small = this.small ||= document.createElement('canvas');
    const w = 256, h = Math.max(1, Math.round(256 * height / width));
    if (small.width !== w || small.height !== h) { small.width = w; small.height = h; }
    this.frameCount = (this.frameCount || 0) + 1;
    if (this.maskReady && this.frameCount % 2) return this.ensureLayer(width, height);
    small.getContext('2d').drawImage(this.video, 0, 0, w, h);
    try {
      this.segmenter.segmentForVideo(small, performance.now(), result => {
        const masks = result.confidenceMasks; if (!masks?.length) return;
        const mask = masks[masks.length > 1 ? 1 : 0];
        this.writeMask(mask.getAsFloat32Array(), mask.width, mask.height, false);
        mask.close?.();
      });
    } catch { this.segFailed = true; this.segmenter.close(); this.segmenter = null; return false; }
    return this.ensureLayer(width, height);
  }
  ensureLayer(width, height) {
    if (!this.maskReady) return false;
    if (!this.layer || this.layer.width !== width || this.layer.height !== height) { this.layer = document.createElement('canvas'); this.layer.width = width; this.layer.height = height; this.layerContext = this.layer.getContext('2d'); }
    return true;
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
    this.segmenter?.close(); this.segmenter = null; this.layer = this.layerContext = this.maskCanvas = this.small = this.smooth = this.matCanvas = null; this.matting?.session.release?.(); this.matting = null; this.maskReady = false;
    this.stream = null;
    this.processedTrack = undefined;
  }
}
