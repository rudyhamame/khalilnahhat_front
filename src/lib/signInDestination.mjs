export function signInDestination(user,returnPath){
  const local=typeof returnPath==='string'&&returnPath.startsWith('/')&&!returnPath.startsWith('//')&&!returnPath.includes('\\');
  if(user?.isAdmin)return local?returnPath:'/admin/live-stream';
  // Clients land on the main app; retain an explicitly requested homepage
  // section such as the live player or their booking draft.
  if(local){
    const url=new URL(returnPath,'https://echo.invalid');
    if(url.pathname==='/')return url.pathname+url.search+url.hash;
  }
  return '/';
}
