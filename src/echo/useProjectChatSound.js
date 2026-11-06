import { useCallback, useEffect, useRef, useState } from 'react';
import notificationSound from '../assets/audio/production-chat-notification.wav';

const preferenceKey = 'echo:chat-sound';
export default function useProjectChatSound({ userId, token }) {
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try { return localStorage.getItem(preferenceKey) !== 'off'; } catch { return true; }
  });
  const enabled = useRef(soundEnabled);
  const context = useRef(null);
  const buffer = useRef(null);
  const received = useRef(null);
  useEffect(() => { received.current = null; }, [userId, token]);
  useEffect(() => {
    enabled.current = soundEnabled;
    try { localStorage.setItem(preferenceKey, soundEnabled ? 'on' : 'off'); } catch { /* Optional preference storage. */ }
  }, [soundEnabled]);
  useEffect(() => {
    let disposed=false,decoding=null;
    const bytes=fetch(notificationSound).then(response=>{if(!response.ok)throw Error('Notification sound unavailable');return response.arrayBuffer();});
    bytes.catch(()=>{});
    const unlock = () => {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      try {
        context.current ||= new Audio();
        if (context.current.state === 'suspended') context.current.resume().catch(() => {});
        const audio=context.current;
        decoding ||= bytes.then(data=>audio.decodeAudioData(data.slice(0))).then(decoded=>{if(!disposed&&context.current===audio)buffer.current=decoded;}).catch(()=>{});
      } catch { /* Audio may be unavailable in this browser. */ }
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      disposed=true;buffer.current=null;
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
    if (!hasNew || !enabled.current || !audio || audio.state !== 'running' || !buffer.current) return;
    // One notification per incoming batch; preserve the chat's mute preference.
    try{
      const source=audio.createBufferSource(),gain=audio.createGain();
      source.buffer=buffer.current;gain.gain.value=.7;
      source.connect(gain);gain.connect(audio.destination);
      source.onended=()=>{source.disconnect();gain.disconnect();};source.start();
    }catch{/* Incoming messages remain available when audio cannot play. */}
  }, [userId]);
  return { soundEnabled, toggleSound: () => setSoundEnabled(value => !value), notifyIncoming };
}
