// Audio is optional: neither autoplay policy nor a stalled play promise can gate entry.
export function enterAfterPreflight(audio, reveal) {
  reveal();
  try {
    audio?.play()?.catch(() => {});
  } catch {
    // Some browsers throw synchronously when audio playback is unavailable.
  }
}
