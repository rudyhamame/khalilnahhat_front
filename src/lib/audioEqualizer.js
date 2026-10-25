export const EQUALIZER_BANDS = [
  { key: 'sub', label: 'Sub', caption: '60 Hz', frequency: 60, type: 'lowshelf' },
  { key: 'bass', label: 'Bass', caption: '160 Hz', frequency: 160, type: 'peaking' },
  { key: 'body', label: 'Body', caption: '400 Hz', frequency: 400, type: 'peaking' },
  { key: 'mid', label: 'Mid', caption: '1 kHz', frequency: 1000, type: 'peaking' },
  { key: 'presence', label: 'Presence', caption: '2.5 kHz', frequency: 2500, type: 'peaking' },
  { key: 'treble', label: 'Treble', caption: '6 kHz', frequency: 6000, type: 'peaking' },
  { key: 'air', label: 'Air', caption: '12 kHz', frequency: 12000, type: 'highshelf' },
];
export const flatEqualizer = () => Object.fromEntries(EQUALIZER_BANDS.map(band => [band.key, 0]));
export const equalizerGain = value => Math.max(-12, Math.min(12, Number.isFinite(value) ? value : 0));

// Build the entire chain before replacing the existing direct sound path.
export function connectEqualizer(context, source, values) {
  const filters = Object.fromEntries(EQUALIZER_BANDS.map(band => {
    const filter = context.createBiquadFilter();
    filter.type = band.type;
    filter.frequency.value = Math.min(band.frequency, context.sampleRate * .45);
    filter.Q.value = 1;
    filter.gain.value = equalizerGain(values[band.key]);
    return [band.key, filter];
  }));
  const nodes = Object.values(filters);
  for (let index = 0; index < nodes.length - 1; index++) nodes[index].connect(nodes[index + 1]);
  nodes.at(-1).connect(context.destination);
  source.disconnect(context.destination);
  source.connect(nodes[0]);
  return { filters, output: nodes.at(-1) };
}
