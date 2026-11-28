export function clientWorkspaceView(path, search='') {
  // Keep links to the former nested booking views working.
  if(path==='/dashboard/bookings') {
    const tab=new URLSearchParams(search).get('tab');
    if(tab==='conversations')return 'conversations';
    return 'bookings';
  }
  return ({
    '/dashboard/draft':'bookings',
    '/dashboard/meetings':'meetings',
    '/dashboard/bookings/contact':'contact',
    '/dashboard/conversations':'conversations',
    '/dashboard/services':'bookings',
    '/dashboard/planning':'planning',
    '/dashboard/payments':'payments',
    '/dashboard/profile':'profile',
  })[path]||'bookings';
}
