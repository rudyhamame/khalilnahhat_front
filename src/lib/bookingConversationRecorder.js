// Stable message IDs make retries idempotent; never write transcript text to logs.
export function createBookingConversationRecorder(write, id = crypto.randomUUID()) {
  const pending = [];
  let tail = Promise.resolve();
  const flush = () => {
    tail = tail.catch(() => {}).then(async () => {
      while (pending.length) {
        // Stay below fetch keepalive's body limit, including multibyte text.
        const messages = pending.slice(0, 2);
        await write({ id, consent: true, messages });
        pending.splice(0, messages.length);
      }
    });
    return tail;
  };
  return { id, save(messages) { pending.push(...messages.map(message => ({ ...message, id: message.id || crypto.randomUUID() }))); return flush(); }, retry: flush };
}
