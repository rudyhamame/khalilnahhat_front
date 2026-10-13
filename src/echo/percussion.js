// Short, original synthesized percussion. Audio starts only after a pad press.
export function playPercussion(context, index, { volume = .6, tone = 1 } = {}) {
  if (volume <= 0) return;
  const time = context.currentTime;
  const gain = context.createGain();
  gain.connect(context.destination);
  gain.gain.setValueAtTime(.0001, time);
  gain.gain.exponentialRampToValueAtTime(.25 * volume, time + .005);
  gain.gain.exponentialRampToValueAtTime(.0001, time + .32);
  if ([1, 2, 4].includes(index)) {
    const buffer = context.createBuffer(1, context.sampleRate * .32, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let n = 0; n < samples.length; n++) samples[n] = Math.random() * 2 - 1;
    const noise = context.createBufferSource();
    noise.buffer = buffer;
    const filter = context.createBiquadFilter();
    filter.type = index === 1 ? 'bandpass' : 'highpass';
    filter.frequency.value = [0, 1800, 7000, 0, 3500][index] * tone;
    noise.connect(filter); filter.connect(gain);
    gain.gain.exponentialRampToValueAtTime(.0001, time + (index === 2 ? .065 : .18));
    noise.start(time); noise.stop(time + .33);
    noise.onended = () => { noise.disconnect(); filter.disconnect(); gain.disconnect(); };
  } else {
    const oscillator = context.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime([155, 0, 0, 270, 0, 440][index] * tone, time);
    oscillator.frequency.exponentialRampToValueAtTime([48, 0, 0, 105, 0, 220][index] * tone, time + .22);
    oscillator.connect(gain); oscillator.start(time); oscillator.stop(time + .33);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
}
