export const STEM_CHANNELS = ['vocals', 'drums', 'bass', 'other'];
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
    for (const name of STEM_CHANNELS) {
      const source = context.createBufferSource();
      source.buffer = buffers[name];
      source.playbackRate.value = rate;
      source.connect(outputs[name]);
      sources.push(source);
      source.start(start,Math.max(0,Math.min(source.buffer.duration-.001,offset+.04*rate)));
    }
  } catch(error) {
    for (const source of sources) { try {source.stop();} catch { /* Not started. */ } source.disconnect(); }
    throw error;
  }
  return sources;
}
