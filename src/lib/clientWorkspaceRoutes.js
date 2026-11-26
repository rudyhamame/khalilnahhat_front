export function clientWorkspaceView(path, search='') {
  // Keep links to the former nested booking views working.
  if(path==='/dashboard/bookings') {
    const tab=new URLSearchParams(search).get('tab');
    if(tab==='draft')return 'draft';
    if(tab==='conversations')return 'conversations';
    return 'bookings';
  }
  return ({
    '/dashboard/draft':'draft',
    '/dashboard/meetings':'meetings',
    '/dashboard/conversations':'conversations',
    '/dashboard/services':'bookings',
    '/dashboard/planning':'planning',
    '/dashboard/payments':'payments',
    '/dashboard/profile':'profile',
  })[path]||'draft';
}
