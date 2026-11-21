export const STEM_CHANNELS = ['vocals', 'drums', 'bass', 'other'];
// Recordings split before the four-channel change also have guitar and piano files. They are not separate channels any more: they play through Other so nothing is lost.
export const STEM_FOLDED_INTO_OTHER = ['guitar', 'piano'];
export const STEM_REQUIRED = ['vocals', 'drums', 'bass', 'other'];
export const initialStemMix = () => Object.fromEntries(STEM_CHANNELS.map(name => [name,{volume:1,muted:false,solo:false}]));
export function stemGain(mix, name, master) {
  const channel = mix[name];
  const hasSolo = Object.values(mix).some(value => value.solo);
  if (!channel || channel.muted || (hasSolo && !channel.solo)) return 0;
  return Math.max(0,Math.min(1,Number(channel.volume)||0)) * Math.max(0,Math.min(1,Number(master)||0));
}

// All four sources start on the same audio-context tick and sample offset.
export function scheduleStemSources(context, buffers, outputs, offset, rate = 1) {
  const start = context.currentTime + .04;
  const sources = [];
  try {
    for (const name of [...STEM_CHANNELS, ...STEM_FOLDED_INTO_OTHER]) {
      if (!buffers[name]) continue;
      const source = context.createBufferSource();
      source.buffer = buffers[name];
      source.playbackRate.value = rate;
      source.connect(outputs[STEM_FOLDED_INTO_OTHER.includes(name) ? 'other' : name]);
      sources.push(source);
      source.start(start,Math.max(0,Math.min(source.buffer.duration-.001,offset+.04*rate)));
    }
  } catch(error) {
    for (const source of sources) { try {source.stop();} catch { /* Not started. */ } source.disconnect(); }
    throw error;
  }
  return sources;
}

// Bound full-length PCM retained by the optional four-channel mixer.
export const STEM_DECODE_LIMIT = 384 * 1024 * 1024;
// The mixer keeps its channels as full-length PCM, so a 3 to 5 minute song needs about 250 to 450 MB (older recordings with guitar and piano files need more).
// Phones keep the conservative limit; a computer is allowed more, scaled by the memory the browser reports.
export function stemDecodeLimit(nav = typeof navigator === 'undefined' ? {} : navigator) {
  const MB = 1024 * 1024;
  if (/Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || '')) return STEM_DECODE_LIMIT;
  const memory = Number(nav.deviceMemory);
  if (Number.isFinite(memory) && memory > 0) return memory >= 8 ? 1536 * MB : memory >= 4 ? 768 * MB : STEM_DECODE_LIMIT;
  return 768 * MB;
}
export function stemDecodeBytes(duration, sampleRate, channels = 4) {
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(sampleRate) || sampleRate <= 0) return Infinity;
  return duration * sampleRate * 2 * Float32Array.BYTES_PER_ELEMENT * channels;
}
