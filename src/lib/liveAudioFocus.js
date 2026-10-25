// Prevent delayed copies of the same live feed playing in multiple tabs/players.
// BroadcastChannel is origin-scoped; the DOM event also coordinates one page.
export function createLiveAudioFocus({ onLoseFocus, target = window, Channel = globalThis.BroadcastChannel }) {
  const id = Array.from(globalThis.crypto.getRandomValues(new Uint32Array(4)), value => value.toString(16)).join('-');
  let closed = false;
  let channel;
  const receive = (message) => {
    if (!closed && message?.type === 'claim' && message.id !== id) onLoseFocus();
  };
  const local = event => receive(event.detail);
  target.addEventListener('echo:live-audio-focus', local);
  try {
    if (Channel) {
      channel = new Channel('echo-live-audio-v1');
      channel.onmessage = event => receive(event.data);
    }
  } catch { /* This browser can still coordinate players within the page. */ }
  return {
    claim() {
      if (closed) return;
      const message = { type: 'claim', id };
      target.dispatchEvent(new CustomEvent('echo:live-audio-focus', { detail: message }));
      channel?.postMessage(message);
    },
    close() {
      closed = true;
      target.removeEventListener('echo:live-audio-focus', local);
      channel?.close();
    },
  };
}
