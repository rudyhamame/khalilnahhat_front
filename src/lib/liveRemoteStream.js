// A receiver may reconnect with new track IDs. Keep one current track per kind;
// otherwise the old audio can remain attached alongside the replacement.
export function clearRemoteStream(stream) {
  for (const track of stream.getTracks()) {
    stream.removeTrack(track);
    track.stop();
  }
}

export function replaceRemoteTrack(stream, track) {
  if (!track || track.readyState === 'ended') return false;
  for (const previous of stream.getTracks()) {
    if (previous === track) return false;
    if (previous.kind === track.kind) {
      stream.removeTrack(previous);
      previous.stop();
    }
  }
  stream.addTrack(track);
  return true;
}
