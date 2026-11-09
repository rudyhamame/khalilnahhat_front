// A local monitor uses the captured track directly. It never enters a media
// element, network connection, processor, or the outgoing source/mic mixer.
export function createMicrophoneMonitor(track, {
  AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext,
  MediaStreamClass = globalThis.MediaStream,
  level=1,
} = {}) {
  if (!track || track.readyState === 'ended') throw new Error('Open the microphone before monitoring.');
  if (!AudioContextClass) throw new Error('Low-latency monitoring is unavailable in this browser.');
  // A numeric zero asks for the minimum device buffer; "interactive" can
  // still select a larger buffer (512 frames in Chromium on this system).
  const context = new AudioContextClass({latencyHint:0});
  let input, gain, closed = false;
  const stop = () => {
    if (closed) return;
    closed = true;
    input?.disconnect();
    gain?.disconnect();
    void context.close().catch(() => {});
  };
  try {
    input = context.createMediaStreamSource(new MediaStreamClass([track]));
    gain=context.createGain();gain.gain.setValueAtTime(level,context.currentTime);
    input.connect(gain);gain.connect(context.destination);
    // Called synchronously from the speaker click to retain user activation.
    const ready = Promise.resolve(context.resume()).then(() => {
      if (!closed && context.state !== 'running') throw new Error('The browser paused microphone monitoring. Try again.');
    }).catch(error => { stop(); throw error; });
    return {ready, stop,setLevel(value){gain.gain.cancelScheduledValues(context.currentTime);gain.gain.setTargetAtTime(value,context.currentTime,.01);}};
  } catch (error) { stop(); throw error; }
}
