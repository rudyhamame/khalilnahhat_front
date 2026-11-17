// Echo Studio desktop: the live studio page in its own window, no browser needed. Same code as the website, so it updates with every deploy.
const {app,BrowserWindow,session,shell,Menu,systemPreferences}=require('electron');
const STUDIO_URL=process.env.ECHO_STUDIO_URL||'https://djkhalilnahhat.ca/admin/live-studio';
const ORIGIN=new URL(STUDIO_URL).origin;

if(!app.requestSingleInstanceLock())app.quit();

async function askMac(kind){// macOS asks once for camera and microphone; Linux needs nothing
  if(process.platform!=='darwin')return;
  try{await systemPreferences.askForMediaAccess(kind);}catch{/* the page reports a blocked device */}
}

function createWindow(){
  const win=new BrowserWindow({width:1600,height:900,minWidth:1100,minHeight:700,backgroundColor:'#0b0f0e',title:'Echo Studio',autoHideMenuBar:true,
    webPreferences:{contextIsolation:true,nodeIntegration:false,sandbox:true,backgroundThrottling:false}});// a live must not slow down when the window is covered
  win.loadURL(STUDIO_URL);
  // Links to other sites open in the normal browser, never inside the studio.
  win.webContents.setWindowOpenHandler(({url})=>{if(new URL(url).origin!==ORIGIN)void shell.openExternal(url);return {action:new URL(url).origin===ORIGIN?'allow':'deny'};});
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
