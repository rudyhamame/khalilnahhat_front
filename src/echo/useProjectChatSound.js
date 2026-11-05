import { useCallback, useEffect, useRef, useState } from 'react';

const preferenceKey = 'echo:chat-sound';
export default function useProjectChatSound({ userId, token }) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem(preferenceKey) !== 'off'; } catch { return true; }
  });
  const enabled = useRef(soundEnabled);
  const context = useRef(null);
  const received = useRef(null);
  useEffect(() => { received.current = null; }, [userId, token]);
  useEffect(() => {
    enabled.current = soundEnabled;
    try { localStorage.setItem(preferenceKey, soundEnabled ? 'on' : 'off'); } catch { /* Optional preference storage. */ }
  }, [soundEnabled]);
  useEffect(() => {
    const unlock = () => {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      try {
        context.current ||= new Audio();
        if (context.current.state === 'suspended') context.current.resume().catch(() => {});
      } catch { /* Audio may be unavailable in this browser. */ }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      context.current?.close().catch(() => {});
      context.current = null;
    };
  }, []);
  const notifyIncoming = useCallback(items => {
    const ids = items.filter(item => item.senderId !== userId).map(item => item.id);
    const previous = received.current;
    const hasNew = previous && ids.some(id => !previous.has(id));
    received.current = new Set([...(previous || []), ...ids].slice(-600));
    const audio = context.current;
    if (!hasNew || !enabled.current || !audio || audio.state !== 'running') return;
    // One quiet two-note chime per incoming batch; never replay the initial history.
    [660, 880].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      const start = audio.currentTime + index * 0.12;
      oscillator.type = 'sine'; oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.065, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);
      oscillator.connect(gain); gain.connect(audio.destination);
      oscillator.start(start); oscillator.stop(start + 0.26);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    });
  }, [userId]);
  return { soundEnabled, toggleSound: () => setSoundEnabled(value => !value), notifyIncoming };
}
