// Singing needs the shortest capture path; speech cleanup can add buffering and
// alter sustained notes. These are preferences, allowing hardware to negotiate.
export function microphoneCapture({ deviceId, sampleRate } = {}) {
  return {
    channelCount: { ideal: 1 },
    latency: { ideal: 0 },
    echoCancellation: false,
    noiseSuppression: false,
    autoGainControl: false,
    ...(sampleRate ? { sampleRate: { ideal: sampleRate } } : {}),
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  };
}

export function createMicrophoneMonitor(context, source, micGain) {
  const gain = context.createGain();
  const analyser = context.createAnalyser();
  analyser.fftSize = 512;
  const output = context.createGain();
  gain.gain.value = micGain;
  output.gain.value = 0; // Listening always requires a deliberate Monitor mic click.
  source.connect(gain);
  gain.connect(output);
  output.connect(context.destination);
  gain.connect(analyser); // Observe in parallel, outside the monitoring path.
  return { gain, analyser, output };
}
