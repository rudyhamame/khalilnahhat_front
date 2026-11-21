// Both decks use the same signal chain, with the crossfader after channel processing.
export function createDjChannelStrip(context, input, destination) {
  const trim = context.createGain();
  const filters = [['lowshelf', 250], ['peaking', 1000], ['highshelf', 4000]].map(([type, hz]) => {
    const node = context.createBiquadFilter();
    node.type = type;
    node.frequency.value = hz;
    return node;
  });
  const color = context.createBiquadFilter();
  color.type = 'allpass';
  const level = context.createGain();
  const gain = context.createGain();
  const nodes = [trim, ...filters, color, level, gain];
  let previous = input;
  for (const node of nodes) {
    previous.connect(node);
    previous = node;
  }
  gain.connect(destination);
  const echo = context.createDelay(4);
  const feedback = context.createGain();
  const wet = context.createGain();
  echo.delayTime.value = .375;
  feedback.gain.value = .3;
  wet.gain.value = 0;
  color.connect(echo);
  echo.connect(feedback);
  feedback.connect(echo);
  echo.connect(wet);
  wet.connect(level);
  const cue = context.createGain();
  cue.gain.value = 0;
  color.connect(cue);
  const meter = context.createAnalyser();
  meter.fftSize = 256;
  level.connect(meter);
  return {
    gain, cue, meter,
    set(name, value) {
      const time = context.currentTime;
      if (name === 'color') {
        color.type = value < 0 ? 'lowpass' : value > 0 ? 'highpass' : 'allpass';
        color.frequency.setTargetAtTime(value < 0 ? 20000 * 0.004 ** -value : 20 * 200 ** value, time, .015);
        return;
      }
      const param = { echo:wet.gain, delay:echo.delayTime, feedback:feedback.gain, cue:cue.gain, trim: trim.gain, low: filters[0].gain, mid: filters[1].gain, hi: filters[2].gain, level: level.gain }[name];
      param?.setTargetAtTime(name === 'trim' ? 2 ** (value * 2) : value, time, .015);
    },
    disconnect() {
      input.disconnect(trim);
      [...nodes, echo, feedback, wet, cue, meter].forEach(node => node.disconnect());
    }
  };
}
