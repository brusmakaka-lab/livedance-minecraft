const {app,BrowserWindow,screen,dialog}=require('electron');
const fs=require('node:fs');const path=require('node:path');
const project=path.resolve(__dirname,'..');
const origin=process.env.LIVE_DANCE_CAPTURE_ORIGIN||'http://127.0.0.1:3000';
let allowed;try{allowed=new URL(origin);if(allowed.protocol!=='http:'||!['127.0.0.1','localhost'].includes(allowed.hostname)||allowed.username||allowed.password)throw Error();}catch{throw Error('La captura solo abre el servidor local de Live Dance.');}
const profile=path.join(project,'data','capture-profile');fs.mkdirSync(profile,{recursive:true});app.setPath('userData',profile);app.setName('Live Dance Captura');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-features','CalculateNativeWinOcclusion');
let window;
const testing=process.env.LIVE_DANCE_CAPTURE_TEST==='1';
if(!testing&&!app.requestSingleInstanceLock()){app.quit();}
else{
 app.on('second-instance',()=>{if(window){if(window.isMinimized())window.restore();window.show();window.focus();}});
 app.whenReady().then(async()=>{
  const health=await(await fetch(allowed.origin+'/health',{signal:AbortSignal.timeout(3000)})).json();if(health.app!=='dance-party-clone')throw Error('No se encontró el servidor local de Live Dance.');
  const height=Math.min(960,Math.max(480,screen.getPrimaryDisplay().workAreaSize.height-90)),width=Math.round(height*9/16);
  window=new BrowserWindow({title:'Live Dance · Captura TikTok',width,height,useContentSize:true,backgroundColor:'#101722',autoHideMenuBar:true,minimizable:false,show:!testing,webPreferences:{backgroundThrottling:false,nodeIntegration:false,contextIsolation:true,sandbox:true,webSecurity:true}});
  window.setAspectRatio(9/16);window.setMenu(null);window.webContents.setBackgroundThrottling(false);
  window.webContents.on('before-input-event',(event,input)=>{if(input.type==='keyDown'&&(input.key==='F5'||input.control&&input.key.toLowerCase()==='r')){event.preventDefault();window.webContents.reloadIgnoringCache();}});
  window.on('page-title-updated',event=>{event.preventDefault();window.setTitle('Live Dance · Captura TikTok');});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==allowed.origin)event.preventDefault();});
  window.webContents.session.setPermissionRequestHandler((_contents,_permission,callback)=>callback(false));
  window.webContents.on('render-process-gone',(_e,details)=>{if(!testing)dialog.showErrorBox('Live Dance · captura','La ventana de captura se cerró ('+details.reason+'). Podés volver a abrirla desde el estudio.');});
  await window.loadURL(allowed.origin+'/captura?capture=1');
 }).catch(error=>{if(!testing)dialog.showErrorBox('Live Dance · captura',error.message);console.error(error.message);app.exit(1);});
 app.on('window-all-closed',()=>app.quit());
}
