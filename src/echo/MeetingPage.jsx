import { useCallback, useEffect, useState } from 'react';
import { apiBaseUrl, apiRequest } from '../lib/api';
import { usePageMeta } from './meta';
import MeetingRoom from './MeetingRoom';
import './clientMeetings.css';
import ClientMeetingWorkspace from './ClientMeetingWorkspace';

const RETURN_KEY = 'khalil-auth-return';

export default function MeetingPage({ lang={lang:'en'}, user, token, isSessionReady, embedded=false }) {
  const L = (en, ar) => (lang.lang === 'ar' ? ar : en);
  usePageMeta('Book a Meeting | Echo Event Entertainment', 'Book an online or in-person consultation with DJ Khalil and Echo Event Entertainment.',!embedded);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [slots, setSlots] = useState([]);
  const [mine, setMine] = useState([]);
  const [topic, setTopic] = useState('');
  const [msg, setMsg] = useState('');
  const [moving, setMoving] = useState('');
  const [roomId, setRoomId] = useState('');

  const load = useCallback(async (quiet=false) => {
    if(quiet!==true)setLoading(true);
    try {
      const [available,booked]=await Promise.all([apiRequest('/meetings/slots'),token&&user?apiRequest('/meetings/mine',{token}):Promise.resolve({items:[]})]);
      setSlots(available.items);setMine(booked.items);
    } catch(error) {setMsg(error.message||'Meetings could not be loaded. Please try again.');}
    finally {if(quiet!==true)setLoading(false);}
  }, [token, user]);
  useEffect(() => {load();const timer=setInterval(()=>{if(!document.hidden)load(true);},30000);return()=>clearInterval(timer);},[load]);

  const fmt = (d) => new Intl.DateTimeFormat(lang.lang === 'ar' ? 'ar-CA' : 'en-CA', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Toronto' }).format(new Date(d));
  const mode = (m) => ({phone:L('Phone call','مكالمة هاتفية'),'whatsapp-voice':L('WhatsApp voice call','مكالمة واتساب صوتية'),'whatsapp-video':L('WhatsApp video call','مكالمة واتساب مرئية')}[m] || (m === 'online' ? L('Online', 'عبر الإنترنت') : L('In person', 'حضورياً')));
  const act = async (fn) => {
    setMsg('');setBusy(true);
    try { await fn(); await load(); } catch (e) { setMsg(e.message); await load(); } finally {setBusy(false);}
  };
  const signIn = () => {
    try { window.localStorage.setItem(RETURN_KEY, embedded?'/dashboard/meetings':'/dates'); } catch { /* storage unavailable */ }
    window.location.href = '/login';
  };
  const downloadIcs = async (id) => {
    const r = await fetch(`${apiBaseUrl}/meetings/${id}/ics`, { headers: { Authorization: `Bearer ${token}` } });
    const url = URL.createObjectURL(await r.blob());
    Object.assign(document.createElement('a'), { href: url, download: 'meeting.ics' }).click();
    URL.revokeObjectURL(url);
  };

  if(embedded)return <>
    {roomId&&<MeetingRoom meetingId={roomId} token={token} ar={lang.lang==='ar'} onClose={()=>{setRoomId('');load();}}/>}
    <ClientMeetingWorkspace ar={lang.lang==='ar'} loading={loading} busy={busy} slots={slots} meetings={mine} topic={topic} error={msg} onTopicChange={setTopic} onRefresh={()=>{setMsg('');load();}} onJoin={setRoomId}
      onBook={id=>act(()=>apiRequest(`/meetings/${id}/book`,{method:'POST',token,body:{topic}}))}
      onCancel={id=>act(()=>apiRequest(`/meetings/${id}/cancel`,{method:'POST',token}))}
      onReschedule={(id,toSlotId)=>act(()=>apiRequest(`/meetings/${id}/reschedule`,{method:'POST',token,body:{toSlotId}}))} onCalendar={downloadIcs}/>
  </>;

  return (
    <section className={embedded?"client-meetings":"echo-section"} aria-busy={loading}>
      {roomId && <MeetingRoom meetingId={roomId} token={token} ar={lang.lang === 'ar'} onClose={()=>{setRoomId('');load();}} />}
      <h1 className="echo-h1">{embedded?L('Meet Echo','لقاء إيكو'):L('Book a Meeting', 'احجز اجتماعاً')}</h1>
      <p>{embedded?L('Book a time, then join us here for a browser voice or video call. No app download is needed. All meeting times are Toronto time.','احجز موعداً ثم انضم إلينا هنا لمكالمة صوتية أو مرئية في المتصفح، دون تنزيل تطبيق. جميع الأوقات بتوقيت تورونتو.'):L('Pick a time for an online or in-person consultation. Times are shown in Toronto time.', 'اختر وقتاً لاستشارة عبر الإنترنت أو حضورية. الأوقات بتوقيت تورونتو.')}</p>
      {msg && <div role="alert" className="echo-error"><p>{msg}</p><button type="button" className="secondary-button" disabled={loading} onClick={()=>{setMsg('');load();}}>{L('Retry','إعادة المحاولة')}</button></div>}
      {loading&&<p role="status">{L('Loading meetings…','جارٍ تحميل الاجتماعات…')}</p>}

      {mine.length > 0 && (
        <>
          <h2>{L('My meetings', 'اجتماعاتي')}</h2>
          {mine.map((m) => (
            <div className="echo-card" key={m.id}>
              <strong>{fmt(m.start)}</strong>
              <span>{mode(m.mode)}{m.mode === 'online' && m.link ? <> · <a href={m.link}>{L('Join link', 'رابط الانضمام')}</a></> : m.location ? ` · ${m.location}` : ''}</span>
              {embedded&&m.mode==='online'&&<small>{L('The room opens 30 minutes before your meeting. Microphone and camera access are requested when you start or accept a call.','تفتح الغرفة قبل الموعد بثلاثين دقيقة. يُطلب إذن الميكروفون والكاميرا عند بدء المكالمة أو قبولها.')}</small>}
              <div className="echo-ctas">
                <MeetingRoomJoinButton meeting={m} onJoin={setRoomId} ar={lang.lang==='ar'} embedded={embedded}/>
                <button type="button" className="echo-link" onClick={() => downloadIcs(m.id)}>{L('Add to calendar', 'إضافة إلى التقويم')}</button>
                <button type="button" className="echo-link" onClick={() => act(() => apiRequest(`/meetings/${m.id}/cancel`, { method: 'POST', token }))}>{L('Cancel', 'إلغاء')}</button>
                <button type="button" className="echo-link" onClick={() => setMoving(moving === m.id ? '' : m.id)}>{L('Reschedule', 'إعادة جدولة')}</button>
              </div>
              {moving === m.id && (
                <select defaultValue="" onChange={(e) => e.target.value && act(async () => {
                  await apiRequest(`/meetings/${m.id}/reschedule`, { method: 'POST', token, body: { toSlotId: e.target.value } });
                  setMoving('');
                })}>
                  <option value="" disabled>{L('Choose a new time', 'اختر وقتاً جديداً')}</option>
                  {slots.map((s) => <option key={s.id} value={s.id}>{fmt(s.start)}</option>)}
                </select>
              )}
            </div>
          ))}
        </>
      )}

      <h2>{L('Available times', 'الأوقات المتاحة')}</h2>
      {isSessionReady && !user && <p><button type="button" className="echo-btn" onClick={signIn}>{L('Sign in / Register to book', 'سجّل الدخول للحجز')}</button></p>}
      {user && <label className="echo-form"><span>{L('What would you like to discuss? (optional)', 'ما الذي تود مناقشته؟ (اختياري)')}</span>
        <textarea rows="2" value={topic} onChange={(e) => setTopic(e.target.value)} /></label>}
      {!loading&&!msg&&!slots.length && <p className="echo-muted">{L('No times are open right now. Please check back soon or request a quote.', 'لا توجد أوقات متاحة حالياً. تحقق لاحقاً أو اطلب عرض سعر.')}</p>}
      <div className="echo-grid">
        {slots.map((s) => (
          <article className="echo-card" key={s.id}>
            <strong>{fmt(s.start)}</strong>
            <span className="echo-muted">{s.mode==='online'?L('Browser voice / video','صوت / فيديو في المتصفح'):mode(s.mode)} · {s.durationMin} {L('min', 'دقيقة')}</span>
            {user && (['phone','whatsapp-voice','whatsapp-video'].includes(s.mode) ? <a className="echo-link" href="/dashboard/bookings">{L('Schedule from your accepted booking', 'حدد الموعد من حجزك المقبول')}</a> : <button type="button" className="echo-btn" onClick={() => act(() => apiRequest(`/meetings/${s.id}/book`, { method: 'POST', token, body: { topic } }))}>{L('BOOK', 'احجز')}</button>)}
          </article>
        ))}
      </div>
    </section>
  );
}

// Both dashboard and public meeting page open the same room used by the admin and Android apps.
export function MeetingRoomJoinButton({meeting,onJoin,ar=false,embedded=false}){
 if(meeting.mode!=='online')return null;
 const label=embedded?(ar?'الانضمام لاجتماع صوتي / مرئي في المتصفح':'Join browser voice / video meeting'):(ar?'فتح غرفة الاجتماع':'Open meeting room');
 return <button type="button" className="echo-btn" onClick={()=>onJoin(meeting.id)}>{label}</button>;
}
