import {useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {bookingsServiceStatus,noreplyServiceStatus} from './notificationServiceStatus.mjs';

export default function NotificationServiceStatus({token}){
 const [services,setServices]=useState(null),[loading,setLoading]=useState(true),[retry,setRetry]=useState(0);
 useEffect(()=>{
  let alive=true;setLoading(true);
  Promise.allSettled([apiRequest('/admin/mail/status',{token}),apiRequest('/admin/notifications/emails',{token})]).then(([mail,notifications])=>{
   if(alive)setServices({bookings:bookingsServiceStatus(mail.value,mail.status==='rejected'),noreply:noreplyServiceStatus(notifications.value?.provider,notifications.status==='rejected')});
  }).finally(()=>{if(alive)setLoading(false);});
  return()=>{alive=false;};
 },[token,retry]);
 return <div className="notification-service-status" role="group" aria-label="Email service status" aria-busy={loading}>
  <div className="notification-service-indicators" aria-live="polite">{['bookings','noreply'].map(name=>{
   const service=services?.[name]||{state:'unknown',label:'Checking…',detail:'Checking email configuration.'};
   return <div key={name} className={`notification-service is-${service.state}`} title={service.detail}><span className="notification-service-dot" aria-hidden="true"/><div><strong>{name}@djkhalilnahhat.ca</strong><span>{service.label}<small>{name==='bookings'&&service.state!=='unknown'?service.detail:''}</small></span></div></div>;
  })}</div>
  <button type="button" className="notification-service-refresh" aria-label="Refresh email service status" title="Refresh email service status" disabled={loading} onClick={()=>setRetry(value=>value+1)}><RefreshCw size={14} className={loading?'notification-spinner':''}/></button>
 </div>;
}
