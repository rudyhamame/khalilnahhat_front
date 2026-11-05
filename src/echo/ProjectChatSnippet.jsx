import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Crop, X } from 'lucide-react';

export default function ProjectChatSnippet({ disabled, onAttach, onError }) {
  const [source, setSource] = useState(null);
  const [selection, setSelection] = useState(null);
  const [capturing, setCapturing] = useState(false);
  const [cropError, setCropError] = useState('');
  const imageRef = useRef(null), dialogRef = useRef(null), buttonRef = useRef(null);
  const streamRef = useRef(null), mounted = useRef(true), drag = useRef(null), uploadRef = useRef(null);
  const stop = () => { streamRef.current?.getTracks().forEach(track => track.stop()); streamRef.current = null; document.documentElement.classList.remove('epc-capturing'); };
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; stop(); }; }, []);
  useEffect(() => {
    if (!source) return;
    const previous = document.activeElement;
    dialogRef.current?.focus();
    const key = event => {
      if (event.key === 'Escape') { event.preventDefault(); setSource(null); }
      if (event.key !== 'Tab') return;
      const elements = [...dialogRef.current.querySelectorAll('button:not(:disabled),input')];
      const first = elements[0], last = elements.at(-1);
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialogRef.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('keydown', key); previous?.focus?.(); };
  }, [source]);
  const snapshot = video => {
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 4096 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale); canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d').drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/png');
  };
  const capture = async () => {
    if (disabled || capturing) return;
    if (!navigator.mediaDevices?.getDisplayMedia) { uploadRef.current?.click(); return; }
    setCapturing(true); onError('');
    let video;
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false, preferCurrentTab: true, selfBrowserSurface: 'include' });
      if (!mounted.current) { stream.getTracks().forEach(track => track.stop()); return; }
      streamRef.current = stream;
      document.documentElement.classList.add('epc-capturing');
      video = document.createElement('video'); video.muted = true; video.srcObject = stream;
      await video.play();
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(Error('The screen capture timed out. Please try again.')), 8000);
        const ready = () => { clearTimeout(timer); resolve(); };
        if (video.requestVideoFrameCallback) video.requestVideoFrameCallback(ready);
        else setTimeout(ready, 300);
      });
      if (!video.videoWidth || !video.videoHeight) throw Error('No screen image was received.');
      const data = snapshot(video);
      if (mounted.current) { setSelection(null); setCropError(''); setSource(data); }
    } catch (error) {
      if (mounted.current && !['NotAllowedError', 'AbortError'].includes(error.name)) onError(error.message || 'Could not capture the screen. Try attaching a screenshot instead.');
    } finally {
      stop(); if (video) { video.pause(); video.srcObject = null; }
      if (mounted.current) setCapturing(false);
    }
  };
  const upload = event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (!/^image\/(png|jpeg|webp)$/.test(file.type) || file.size > 12_000_000) { onError('Choose a PNG, JPEG or WebP screenshot under 12 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (mounted.current) { setSelection(null); setCropError(''); setSource(reader.result); onError(''); } };
    reader.onerror = () => { if (mounted.current) onError('Could not open the screenshot.'); };
    reader.readAsDataURL(file);
  };
  const point = event => {
    const box = imageRef.current.getBoundingClientRect();
    return { x: Math.max(0, Math.min(1, (event.clientX - box.left) / box.width)), y: Math.max(0, Math.min(1, (event.clientY - box.top) / box.height)) };
  };
  const move = event => {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return;
    const end = point(event), start = drag.current;
    setSelection({ x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y) });
  };
  const attach = () => {
    const image = imageRef.current;
    if (!selection || !image?.naturalWidth) return;
    const sx = Math.round(selection.x * image.naturalWidth), sy = Math.round(selection.y * image.naturalHeight);
    const width = Math.min(image.naturalWidth - sx, Math.round(selection.width * image.naturalWidth));
    const height = Math.min(image.naturalHeight - sy, Math.round(selection.height * image.naturalHeight));
    if (width < 8 || height < 8) { setCropError('Select a slightly larger area for your snippet.'); return; }
    const canvas = document.createElement('canvas');
    const scale = Math.min(1, 2400 / Math.max(width, height));
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    canvas.getContext('2d').drawImage(image, sx, sy, width, height, 0, 0, canvas.width, canvas.height);
    let mimeType = 'image/png', data = canvas.toDataURL(mimeType);
    if (data.length > 5_200_000) { mimeType = 'image/jpeg'; data = canvas.toDataURL(mimeType, 0.85); }
    if (data.length > 5_200_000) { setCropError('This snippet is too large. Select a smaller area.'); return; }
    onAttach({ type: 'image', name: `Echo-bug-${Date.now()}.${mimeType === 'image/png' ? 'png' : 'jpg'}`, mimeType, data });
    setSource(null); onError('');
  };
  return <>
    <button ref={buttonRef} type="button" className="epc-tool" disabled={disabled || capturing} onClick={capture} title="Capture and crop a bug screenshot" aria-label="Capture screenshot snippet"><Crop size={17}/></button>
    <input ref={uploadRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} hidden />
    {capturing && <span className="epc-capture-status" role="status">Choose the app tab to capture…</span>}
    {source && createPortal(<div className="epc-snippet-backdrop"><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="epc-snippet-title" aria-describedby="epc-snippet-help" className="epc-snippet-dialog">
      <header><div><h2 id="epc-snippet-title">Capture the detail</h2><p id="epc-snippet-help">Drag over the bug to crop it. Your snippet will be attached for review before sending.</p></div><button type="button" aria-label="Cancel screenshot" onClick={() => setSource(null)}><X size={20}/></button></header>
      <div className="epc-snippet-scroll"><div className="epc-snippet-image" onPointerDown={event => { if (event.button !== 0) return; event.preventDefault(); drag.current = { ...point(event), pointerId: event.pointerId }; setSelection(null); event.currentTarget.setPointerCapture(event.pointerId); }} onPointerMove={move} onPointerUp={event => { move(event); drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
        <img ref={imageRef} src={source} alt="Captured screen. Drag to select an area." draggable="false"/>
        {selection && <div className="epc-snippet-selection" style={{ left: `${selection.x * 100}%`, top: `${selection.y * 100}%`, width: `${selection.width * 100}%`, height: `${selection.height * 100}%` }}/>}
      </div></div>
      {cropError && <p className="epc-snippet-error" role="alert">{cropError}</p>}
      <footer><button type="button" onClick={() => setSource(null)}>Cancel</button><button type="button" onClick={() => setSelection({x:0,y:0,width:1,height:1})}>Select all</button><button type="button" className="epc-snippet-attach" disabled={!selection || selection.width < 0.005 || selection.height < 0.005} onClick={attach}>Attach snippet</button></footer>
    </section></div>, document.body)}
  </>;
}
