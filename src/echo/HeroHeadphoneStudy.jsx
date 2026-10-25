import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { performancePose } from '../lib/songPerformance';
import profile from './song-test-profile.json';
import './songPerformance.css';

const FRAME_COUNT = 8;
const FALLBACK = '/echo/khalil-fresh-natural-hands.webp';
const POSTER = '/echo/headphone-motion-cutout/pose-00.webp';
const FRAMES = Array.from({ length: FRAME_COUNT }, (_, index) => `/echo/headphone-motion-cutout/pose-${String(index).padStart(2, '0')}.webp`);

// Scroll-controlled character sequence; reduced motion keeps native scrolling.
export default function HeroHeadphoneStudy({ ar, clean = false }) {
  const frames = useMemo(() => clean ? Array.from({ length: FRAME_COUNT }, (_, index) => `/echo/headphone-motion-clean-v2/pose-${String(index).padStart(2, '0')}.webp`) : FRAMES, [clean]);
  const poster = clean ? FALLBACK : POSTER;
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [reduced, setReduced] = useState(() => matchMedia('(prefers-reduced-motion: reduce)').matches);
  const portrait = useRef(null);
  const [performance, setPerformance] = useState(null);
  const [entrance, setEntrance] = useState(false);
  const [returning, setReturning] = useState(false);
  const zoomStart = useRef(null);
  const zoomAnimation = useRef(null);
  useLayoutEffect(() => {
    if ((!entrance && !returning) || reduced || !zoomStart.current || !portrait.current) return;
    const element = portrait.current;
    const start = zoomStart.current;
    const end = element.getBoundingClientRect();
    zoomAnimation.current?.cancel();
    // Preserve the exact close-up on the first frame, then reveal the whole deck.
    zoomAnimation.current = element.animate([
      { transform: `translate(${start.left - end.left}px, ${start.top - end.top}px) scale(${start.width / end.width}, ${start.height / end.height})` },
      { transform: 'translate(0px, 0px) scale(1, 1)' },
    ], { duration: 5200, easing: 'cubic-bezier(.4, 0, .2, 1)' });
  }, [entrance, returning, reduced]);
  useEffect(() => () => zoomAnimation.current?.cancel(), []);
  const active = useRef(false);
  const worn = useRef(false);
  useEffect(() => {
    const images = [0,1,2,3,6,8,9,10,12,13].map(index => {
      const image = new Image();
      image.src = `/echo/song-test-performance-v1/pose-${String(index).padStart(2, '0')}.webp`;
      return image;
    });
    const assetsLoaded = Promise.all([...images.map(image => image.decode().catch(() => {})), ...frames.map(src => new Promise(resolve => {
      const image = new Image(); image.onload = resolve; image.onerror = resolve; image.src = src;
    }))]);
    let timer;
    let returnTimer;
    let takingOff = false;
    let request;
    let preparing = false;
    const finish = () => {
      preparing = false;
      worn.current = true;
      active.current = true;
      setEntrance(false);
      setPerformance(0);
      window.dispatchEvent(new CustomEvent('echo:performer-ready', { detail: { requestId: request } }));
    };
    const prepare = async event => {
      clearTimeout(timer);
      clearTimeout(returnTimer);
      takingOff = false;
      setReturning(false);
      request = event.detail.requestId;
      active.current = true;
      preparing = true;
      const pending = request;
      await assetsLoaded;
      if (request !== pending) return;
      if (worn.current || reduced) { finish(); return; }
      zoomStart.current = portrait.current?.getBoundingClientRect();
      zoomAnimation.current?.cancel();
      setEntrance(true);
      setPerformance(null);
      let index = Math.round(current.current * (FRAME_COUNT - 1));
      change(index / (FRAME_COUNT - 1));
      const advance = () => {
        index = Math.min(FRAME_COUNT - 1, index + 1);
        change(index / (FRAME_COUNT - 1));
        if (index >= FRAME_COUNT - 1) timer = setTimeout(finish, 220);
        else timer = setTimeout(advance, 220);
      };
      timer = setTimeout(advance, 220);
    };
    const takeOff = () => {
      if (takingOff || (!worn.current && !preparing)) return;
      request = null;
      preparing = false;
      takingOff = true;
      worn.current = false;
      clearTimeout(timer);
      clearTimeout(returnTimer);
      zoomStart.current = portrait.current?.getBoundingClientRect();
      zoomAnimation.current?.cancel();
      setEntrance(false);
      setPerformance(null);
      setReturning(!reduced);
      let index = Math.round(current.current * (FRAME_COUNT - 1));
      const retreat = () => {
        index = Math.max(0, index - 1);
        change(index / (FRAME_COUNT - 1));
        if (index > 0) timer = setTimeout(retreat, 220);
      };
      const settled = () => {
        change(0);
        takingOff = false;
        active.current = false;
        setReturning(false);
      };
      if (reduced) settled();
      else { timer = setTimeout(retreat, 220); returnTimer = setTimeout(settled, 5200); }
    };
    const cancel = () => takeOff();
    const music = event => {
      const detail = event.detail;
      if (!detail.playing) {
        if (detail.stopped) takeOff();
        return;
      }
      if (takingOff || preparing) return;
      worn.current = true;
      active.current = true;
      const photoBoundary = detail.measureLocked;
      setPerformance(previous => reduced ? 0 : photoBoundary ? performancePose(profile, detail) : previous ?? 6);
    };
    window.addEventListener('echo:performer-prepare', prepare);
    window.addEventListener('echo:performer-cancel', cancel);
    window.addEventListener('echo:music-frame', music);
    return () => {
      request = null;
      clearTimeout(timer);
      clearTimeout(returnTimer);
      window.removeEventListener('echo:performer-prepare', prepare);
      window.removeEventListener('echo:performer-cancel', cancel);
      window.removeEventListener('echo:music-frame', music);
      images.forEach(image => { image.onload = null; });
    };
  }, [frames, reduced]);
  const current = useRef(0);


  useEffect(() => {
    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(motion.matches);
    motion.addEventListener('change', update);
    let alive = true;
    setReady(false);
    Promise.all(frames.map((src) => new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = resolve;
      image.onerror = reject;
      image.src = src;
    }))).then(() => { if (alive) setReady(true); }).catch(() => { /* Keep original portrait and normal scrolling if any frame fails. */ });
    return () => { alive = false; motion.removeEventListener('change', update); };
  }, [frames]);

  useEffect(() => {
    if (!ready || reduced) return undefined;
    let frame=0;
    const update=()=>{
      frame=0;
      if(active.current)return;
      current.current=Math.max(0,Math.min(1,window.scrollY/Math.max(1,innerHeight*.65)));
      setProgress(current.current);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    window.addEventListener('scroll',schedule,{passive:true});
    update();
    return()=>{window.removeEventListener('scroll',schedule);cancelAnimationFrame(frame);};
  }, [ready, reduced]);

  return <img className={`echo-continuous-artist${entrance || performance !== null ? ' is-song-performance' : ''}${returning ? ' is-returning' : ''}`} data-echo-performer="true" data-performance-pose={performance ?? 'entrance'} ref={portrait}
    src={performance !== null ? `/echo/song-test-performance-v1/pose-${String(performance).padStart(2, '0')}.webp` : ready ? frames[Math.round(progress * (FRAME_COUNT - 1))] : poster}
    alt={ar ? 'صورة فنية لدي جي خليل عند الميكسر' : 'Illustrative portrait of DJ Khalil at his mixer'}
    width="1024" height="1536" fetchPriority="high"
    onError={(event) => { if (!event.currentTarget.src.endsWith(FALLBACK)) event.currentTarget.src = FALLBACK; }} />;
}
