// Echo Studio desktop: the live studio page in its own window, no browser needed. Same code as the website, so it updates with every deploy.
const {app,BrowserWindow,session,shell,Menu,systemPreferences}=require('electron');
const STUDIO_URL=process.env.ECHO_STUDIO_URL||'https://djkhalilnahhat.ca/admin/live-studio';
const ORIGIN=new URL(STUDIO_URL).origin;

// A test address (npm run dev) gets its own profile, so it can run next to the real studio instead of handing over to it.
if(process.env.ECHO_STUDIO_URL)app.setPath('userData',app.getPath('userData')+'-dev');
if(!app.requestSingleInstanceLock())app.quit();
// Google refuses sign-in from browsers that call themselves Electron: present the plain Chromium name.
app.userAgentFallback=app.userAgentFallback.replace(/\s*Electron\/\S+/,'').replace(/\s*echo-studio-desktop\/\S+/,'');

async function askMac(kind){// macOS asks once for camera and microphone; Linux needs nothing
  if(process.platform!=='darwin')return;
  try{await systemPreferences.askForMediaAccess(kind);}catch{/* the page reports a blocked device */}
}

function createWindow(){
  const win=new BrowserWindow({width:1600,height:900,minWidth:1100,minHeight:700,backgroundColor:'#0b0f0e',title:'Echo Studio',autoHideMenuBar:true,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});// a live must not slow down when the window is covered
  win.loadURL(STUDIO_URL);
  // A page that fails to load (network blip, site restarting) is retried every 4 s instead of leaving a blank window.
  win.webContents.on('did-fail-load',(event,code,description,url,isMainFrame)=>{if(isMainFrame&&code!==-3&&!win.isDestroyed())setTimeout(()=>{if(!win.isDestroyed())win.loadURL(STUDIO_URL);},4000);});
  // Links to other sites open in the normal browser, never inside the studio.
  // Google sign-in opens its own pop-up: it stays inside the app (one window, and it can hand the result back); other sites open in the browser.
  const inApp=url=>{const u=new URL(url);return u.origin===ORIGIN||u.hostname==='accounts.google.com';};
  win.webContents.setWindowOpenHandler(({url})=>{if(inApp(url))return {action:'allow'};void shell.openExternal(url);return {action:'deny'};});
  win.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==ORIGIN){event.preventDefault();void shell.openExternal(url);}});
  return win;
}

app.whenReady().then(async()=>{
  // Camera, microphone, screen share and fullscreen are allowed for the studio's own origin only.
  const allowed=new Set(['media','display-capture','fullscreen','mediaKeySystem']);
  session.defaultSession.setPermissionRequestHandler((contents,permission,callback,details)=>callback(allowed.has(permission)&&new URL(details.requestingUrl||contents.getURL()).origin===ORIGIN));
  session.defaultSession.setPermissionCheckHandler((contents,permission,origin)=>allowed.has(permission)&&origin.startsWith(ORIGIN));
  await askMac('camera');await askMac('microphone');
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    {label:'Echo Studio',submenu:[{role:'reload'},{role:'forceReload'},{role:'togglefullscreen'},{role:'toggleDevTools'},{type:'separator'},{role:'quit'}]},
    {label:'Edit',submenu:[{role:'undo'},{role:'redo'},{type:'separator'},{role:'cut'},{role:'copy'},{role:'paste'},{role:'selectAll'}]}]));
  createWindow();
  app.on('activate',()=>{if(!BrowserWindow.getAllWindows().length)createWindow();});
});
app.on('second-instance',()=>{const win=BrowserWindow.getAllWindows()[0];if(win){if(win.isMinimized())win.restore();win.focus();}});
app.on('window-all-closed',()=>{if(process.platform!=='darwin')app.quit();});
