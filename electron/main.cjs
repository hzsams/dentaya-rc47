const {readAyaEnvironment,saveAyaConnection}=require("./aya-config.cjs");
const { LOGOS, updateDesktopIcon } = require("./desktop-brand.cjs");
const { app, BrowserWindow, Menu, shell, dialog, ipcMain, safeStorage } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");
const http = require("http");

const LOCAL_PORT = 3210;
const DEV_URL = process.env.DENTAYA_URL || "http://localhost:3010";
const BASE_URL = app.isPackaged
  ? `http://127.0.0.1:${LOCAL_PORT}`
  : DEV_URL;

// Eski Electron cache kilitleriyle karışmaması için ayrı uygulama verisi.
const desktopUserData = app.commandLine.getSwitchValue("user-data-dir")
  ? path.resolve(app.commandLine.getSwitchValue("user-data-dir"))
  : path.join(app.getPath("appData"), "DentAYA-Desktop");
app.setPath("userData", desktopUserData);
app.commandLine.appendSwitch("disable-http-cache");

let mainWindow = null;
let cadWindow = null;
let serverProcess = null;
let lastHubUrl = `${BASE_URL}/workspace`;
let restoringHub = false;
let desktopLocale = 'tr', desktopEntries = new Map(), languageActivation = 0;
const normalizeUi = source => source.trim().replace(/\s+/g,' ').toLocaleLowerCase('tr');
const menuText = source => desktopEntries.get(normalizeUi(source)) || source;
function syncApplicationMenu() {
 Menu.setApplicationMenu(Menu.buildFromTemplate([
  {label:'DentAYA',submenu:[{label:menuText('Logo ve görünüm ayarları'),accelerator:'CmdOrCtrl+,',click:()=>{const win=BrowserWindow.getFocusedWindow();if(win&&isSameOrigin(win.webContents.getURL()))win.webContents.send('dentaya:preferences');}},{type:'separator'},{role:'quit',label:menuText('Çıkış')}]},
  {label:menuText('Düzenle'),submenu:[{role:'undo',label:menuText('Geri al')},{role:'redo',label:menuText('Yinele')},{type:'separator'},{role:'cut',label:menuText('Kes')},{role:'copy',label:menuText('Kopyala')},{role:'paste',label:menuText('Yapıştır')},{role:'selectAll',label:menuText('Tümünü seç')}]},
  {label:menuText('Görünüm'),submenu:[{role:'resetZoom',label:menuText('Yakınlaştırmayı sıfırla')},{role:'zoomIn',label:menuText('Yakınlaştır')},{role:'zoomOut',label:menuText('Uzaklaştır')},{role:'togglefullscreen',label:menuText('Tam ekran')}]},
 ]));
}
async function activateDesktopLanguage(locale,persist=true) {
 const allowed=require('./aya/language-packs.cjs').LANGUAGES;
 if(typeof locale!=='string'||!Object.hasOwn(allowed,locale))return {ok:false,error:'INVALID_LOCALE'};
 const activation=++languageActivation,pack=locale==='tr'?null:await languagePacks.get(locale);if(activation!==languageActivation)return {ok:true};desktopLocale=locale;
 desktopEntries=new Map(Object.entries(pack?.entries||{}).map(([key,value])=>[normalizeUi(key),value]));syncApplicationMenu();
 if(persist)try{fs.mkdirSync(app.getPath('userData'),{recursive:true});fs.writeFileSync(path.join(app.getPath('userData'),'interface-language.json'),JSON.stringify({locale}),{mode:0o600});}catch{return {ok:false,error:'PACK_SAVE_FAILED'};}
 return {ok:true};
}
async function translationFor(locale) {
 const pack=locale==='tr'?null:await languagePacks.get(locale),entries=new Map(Object.entries(pack?.entries||{}).map(([key,value])=>[normalizeUi(key),value]));
 return source=>entries.get(normalizeUi(source))||source;
}

function normalizeUrl(url) {
  try { return new URL(url, BASE_URL).toString(); }
  catch { return BASE_URL; }
}

function isSameOrigin(url) {
  try { return new URL(url, BASE_URL).origin === new URL(BASE_URL).origin; }
  catch { return false; }
}

function openSafeExternal(url) {
  try {
    const target = new URL(url);
    if (target.protocol === "https:" || target.protocol === "http:") {
      void shell.openExternal(target.toString());
    }
  } catch {}
}

function isCadUrl(url) {
  try {
    const p = new URL(url, BASE_URL).pathname;
    return p === "/cad" || p.startsWith("/cad/") ||
           p === "/design" || p.startsWith("/design/");
  } catch {
    return false;
  }
}

function browserPreferences() {
  return {
    preload: path.join(__dirname, "preload.cjs"),
    nodeIntegration: false,
    contextIsolation: true,
    sandbox: true,
    webSecurity: true,
  };
}

// Only packaged, allowlisted logos can change the window icon.
function syncWindowLogo(win) {
  const allowed = new Set(LOGOS);
  win.webContents.on("page-favicon-updated", (_event, urls) => {
    for (const value of urls) {
      try {
        const url = new URL(value);
        if (!isSameOrigin(url.href)) continue;
        const match = url.pathname.match(/^\/logos\/([a-z0-9_]+)_icon\.svg$/);
        if (!match || !allowed.has(match[1])) continue;
        const file = path.join(__dirname, "logos", `${match[1]}_icon.ico`);
        if (fs.existsSync(file) && !win.isDestroyed()) win.setIcon(file);
      } catch {}
    }
  });
}

function focusWindow(win) {
  if (!win || win.isDestroyed()) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.focus();
}

function waitForServer(url, timeoutMs = 90000) {
  return new Promise((resolve) => {
    const started = Date.now();

    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        resolve(true);
      });

      req.on("error", () => {
        if (Date.now() - started >= timeoutMs) {
          resolve(false);
          return;
        }
        setTimeout(check, 400);
      });

      req.setTimeout(2500, () => req.destroy());
    };

    check();
  });
}

async function startPackagedServer() {
  if (!app.isPackaged) return;

  const serverPath = path.join(process.resourcesPath, "app-next", "server.js");
  if (!fs.existsSync(serverPath)) {
    throw new Error(`DentAYA server.js bulunamadı:\n${serverPath}`);
  }

  const logPath = path.join(app.getPath("userData"), "dentaya-server.log");
  fs.mkdirSync(path.dirname(logPath), { recursive: true });

  const logStream = fs.createWriteStream(logPath, { flags: "a" });
  logStream.write(`\n--- DentAYA start ${new Date().toISOString()} ---\n`);

  // Paketli Electron exe'sini Node olarak çalıştır.
  // Böylece kullanıcıda ayrıca Node.js açık olmak zorunda değildir.
  serverProcess = spawn(process.execPath, [serverPath], {
    cwd: path.dirname(serverPath),
    env: {
      ...process.env,
      ...readAyaEnvironment({directory:app.getPath("userData"),safeStorage}),
      ELECTRON_RUN_AS_NODE: "1",
      NODE_ENV: "production",
      PORT: String(LOCAL_PORT),
      HOSTNAME: "127.0.0.1",
      DENTAYA_URL: "",
    },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });

  serverProcess.stdout?.pipe(logStream);
  serverProcess.stderr?.pipe(logStream);

  serverProcess.on("error", (err) => {
    logStream.write(`\nSERVER ERROR: ${err.stack || err}\n`);
  });

  serverProcess.on("exit", (code, signal) => {
    logStream.write(`\nSERVER EXIT code=${code} signal=${signal}\n`);
  });

  const ready = await waitForServer(BASE_URL, 90000);

  if (!ready) {
    throw new Error(
      `DentAYA yerel sunucusu başlatılamadı.\n\nLog:\n${logPath}`
    );
  }
}

function openCad(url = `${BASE_URL}/cad`) {
  const target = normalizeUrl(url);

  if (cadWindow && !cadWindow.isDestroyed()) {
    if (cadWindow.webContents.getURL() !== target) cadWindow.loadURL(target);
    focusWindow(cadWindow);
    return;
  }

  cadWindow = new BrowserWindow({
    icon: path.join(__dirname, "dentaya.ico"),
    width: 1720,
    height: 1000,
    minWidth: 1180,
    minHeight: 720,
    show: false,
    title: "DentAYA CAD",
    backgroundColor: "#080b0f",
    autoHideMenuBar: true,
    webPreferences: browserPreferences(),
  });

  syncWindowLogo(cadWindow);
  cadWindow.loadURL(target);

  cadWindow.once("ready-to-show", () => {
    if (!cadWindow || cadWindow.isDestroyed()) return;
    cadWindow.maximize();
    focusWindow(cadWindow);
  });

  cadWindow.webContents.setWindowOpenHandler(({ url: nextUrl }) => {
    if (isCadUrl(nextUrl)) {
      openCad(nextUrl);
      return { action: "deny" };
    }

    if (isSameOrigin(nextUrl)) {
      openHub(nextUrl);
      return { action: "deny" };
    }

    openSafeExternal(nextUrl);
    return { action: "deny" };
  });

  cadWindow.webContents.on("will-navigate", (event, nextUrl) => {
    if (isCadUrl(nextUrl)) return;

    event.preventDefault();

    if (isSameOrigin(nextUrl)) openHub(nextUrl);
    else openSafeExternal(nextUrl);
  });

  cadWindow.on("closed", () => {
    cadWindow = null;
  });
}

function handleHubNavigation(url) {
  const target = normalizeUrl(url);

  if (isCadUrl(target)) {
    openCad(target);

    if (!restoringHub && mainWindow && !mainWindow.isDestroyed()) {
      restoringHub = true;
      const restoreUrl = isCadUrl(lastHubUrl) ? `${BASE_URL}/workspace` : lastHubUrl;

      setTimeout(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.loadURL(restoreUrl).finally(() => {
            restoringHub = false;
          });
        } else {
          restoringHub = false;
        }
      }, 0);
    }

    return;
  }

  if (isSameOrigin(target)) lastHubUrl = target;
}

function openHub(url = `${BASE_URL}/workspace`) {
  const target = normalizeUrl(url);

  if (isCadUrl(target)) {
    openCad(target);
    return;
  }

  lastHubUrl = target;

  if (!mainWindow || mainWindow.isDestroyed()) {
    createHub(target);
    return;
  }

  if (mainWindow.webContents.getURL() !== target) {
    mainWindow.loadURL(target);
  }

  focusWindow(mainWindow);
}

function createHub(initialUrl = `${BASE_URL}/workspace`) {
  mainWindow = new BrowserWindow({
    icon: path.join(__dirname, "dentaya.ico"),
    width: 1440,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    title: "DentAYA",
    backgroundColor: "#07131d",
    autoHideMenuBar: true,
    webPreferences: browserPreferences(),
  });

  syncApplicationMenu();
  lastHubUrl = normalizeUrl(initialUrl);

  syncWindowLogo(mainWindow);
  mainWindow.loadURL(lastHubUrl);

  mainWindow.once("ready-to-show", () => {
    focusWindow(mainWindow);
  });

  mainWindow.webContents.setWindowOpenHandler(({ url: nextUrl }) => {
    if (isCadUrl(nextUrl)) {
      openCad(nextUrl);
      return { action: "deny" };
    }

    if (isSameOrigin(nextUrl)) {
      openHub(nextUrl);
      return { action: "deny" };
    }

    openSafeExternal(nextUrl);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, nextUrl) => {
    if (isCadUrl(nextUrl)) {
      event.preventDefault();
      openCad(nextUrl);
      return;
    }

    if (!isSameOrigin(nextUrl)) {
      event.preventDefault();
      openSafeExternal(nextUrl);
    }
  });

  mainWindow.webContents.on("did-navigate-in-page", (_event, nextUrl) => {
    handleHubNavigation(nextUrl);
  });

  mainWindow.webContents.on("did-navigate", (_event, nextUrl) => {
    handleHubNavigation(nextUrl);
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
    if (cadWindow && !cadWindow.isDestroyed()) cadWindow.close();
  });
}

function stopServer() {
  if (!serverProcess) return;
  try { serverProcess.kill(); } catch {}
  serverProcess = null;
}

const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => focusWindow(mainWindow));

  app.whenReady().then(async () => {
    try {
      try{const saved=JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'interface-language.json'),'utf8'));await activateDesktopLanguage(saved.locale,false);}catch{}
      await startPackagedServer();
      createHub();
    } catch (err) {
      dialog.showErrorBox(
        menuText("DentAYA Başlatma Hatası"),
        menuText(err instanceof Error ? err.message : String(err))
      );
      app.quit();
    }
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createHub();
    else focusWindow(mainWindow);
  });

  app.on("before-quit", stopServer);

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      stopServer();
      app.quit();
    }
  });
}

// Only our top-level, same-origin windows can request the narrowly scoped operation.
ipcMain.handle("dentaya:desktop-icon", (event, logo) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win || ![mainWindow,cadWindow].includes(win) || event.senderFrame !== event.sender.mainFrame || !isSameOrigin(event.senderFrame.url)) return {ok:false,message:"İşlem bu pencereden yapılamıyor."};
  return updateDesktopIcon({app,shell,logo});
});

let ayaConfigBusy=false;
ipcMain.handle("dentaya:aya-connection",async(event,input)=>{const win=BrowserWindow.fromWebContents(event.sender);if(!win||![mainWindow,cadWindow].includes(win)||event.senderFrame!==event.sender.mainFrame||!isSameOrigin(event.senderFrame.url))return {ok:false,message:"İşlem bu pencereden yapılamıyor."};if(!app.isPackaged)return {ok:false,message:"Bu ayar kurulu masaüstü sürümünde kullanılabilir."};if(ayaConfigBusy)return {ok:false,message:"Bağlantı kontrolü sürüyor."};ayaConfigBusy=true;try{const result=await saveAyaConnection({directory:app.getPath("userData"),safeStorage,key:input?.key,model:input?.model});if(result.ok)setTimeout(()=>{app.relaunch();app.quit();},700);return result;}finally{ayaConfigBusy=false;}});

const managedAya=require('./aya/managed-runtime.cjs').createManagedAya({directory:app.getPath('userData')});
const localAya = require('./aya-local.cjs').createLocalAya({managed:managedAya});
app.on('before-quit',()=>managedAya.dispose());
function trustedAyaSender(event){const win=BrowserWindow.fromWebContents(event.sender);return win&&[mainWindow,cadWindow].includes(win)&&event.senderFrame===event.sender.mainFrame&&isSameOrigin(event.senderFrame.url);}
for(const [channel,method] of [['status','status'],['guide','guide'],['chat','chat'],['cancel','cancel'],['download','startDownload'],['cancel-download','cancelDownload']]){
 ipcMain.handle('dentaya:aya-local-'+channel,async(event,input)=>{
  if(!trustedAyaSender(event))return {ok:false,error:'UNTRUSTED_WINDOW'};
  if((method==='chat'||method==='startDownload')&&(languagePacks.isBusy()||ayaImportBusy))return {ok:false,error:'LOCAL_BUSY'};
  if(method==='guide')return localAya.guide(input?.prompt,await translationFor(input?.locale||'tr'));
  if(method==='chat'){const translate=await translationFor(input?.locale||'tr');return languagePacks.isBusy()||ayaImportBusy?{ok:false,error:'LOCAL_BUSY'}:localAya.chat(input,event.sender.id,translate,output=>{if(typeof input?.requestId==='string'&&/^[a-zA-Z0-9-]{1,80}$/.test(input.requestId)&&!event.sender.isDestroyed())event.sender.send('dentaya:aya-local-token',{requestId:input.requestId,output});});}
  return method==='status'?localAya.status():localAya[method](event.sender.id);
 });
}
app.on('web-contents-created',(_event,contents)=>{const owner=contents.id;contents.once('destroyed',()=>{localAya.cancel(owner);localAya.cancelDownload(owner);managedAya.cancelInstall(owner);});});

let ayaImportBusy=false;
ipcMain.handle('dentaya:aya-managed-install',(event)=>{if(!trustedAyaSender(event))return {ok:false,error:'UNTRUSTED_WINDOW'};if(localAya.isBusy()||languagePacks.isBusy()||ayaImportBusy)return {ok:false,error:'LOCAL_BUSY'};return managedAya.installAll(event.sender.id);});
ipcMain.handle('dentaya:aya-managed-cancel',(event)=>trustedAyaSender(event)?managedAya.cancelInstall(event.sender.id):{ok:false,error:'UNTRUSTED_WINDOW'});
ipcMain.handle('dentaya:aya-managed-stop',(event)=>{if(!trustedAyaSender(event))return {ok:false,error:'UNTRUSTED_WINDOW'};if(localAya.isBusy())return {ok:false,error:'LOCAL_BUSY'};managedAya.stop();return {ok:true};});
ipcMain.handle('dentaya:aya-model-import',async(event)=>{if(!trustedAyaSender(event))return {ok:false,error:'UNTRUSTED_WINDOW'};if(localAya.isBusy()||languagePacks.isBusy()||ayaImportBusy)return {ok:false,error:'LOCAL_BUSY'};ayaImportBusy=true;try{const choice=await dialog.showOpenDialog(BrowserWindow.fromWebContents(event.sender),{properties:['openFile'],filters:[{name:'GGUF',extensions:['gguf']}]});if(choice.canceled)return {ok:false,error:'LOCAL_CANCELLED'};if(!trustedAyaSender(event))return {ok:false,error:'UNTRUSTED_WINDOW'};return await managedAya.importModel(choice.filePaths[0]);}finally{ayaImportBusy=false;}});

const languagePacks=require('./aya/language-packs.cjs').createLanguagePacks({directory:()=>app.getPath('userData'),busy:()=>localAya.isBusy()||ayaImportBusy});
for(const method of ['get','start','status','cancel'])ipcMain.handle('dentaya:language-'+method,(event,input)=>{if(!trustedAyaSender(event))return {ok:false,error:'UNTRUSTED_WINDOW'};return method==='get'?languagePacks.get(input?.locale):method==='start'?languagePacks.start(input,event.sender.id):method==='cancel'?languagePacks.cancel(event.sender.id):languagePacks.status();});
ipcMain.handle('dentaya:language-activate',(event,input)=>trustedAyaSender(event)?activateDesktopLanguage(input?.locale):{ok:false,error:'UNTRUSTED_WINDOW'});
ipcMain.handle('dentaya:language-import',async(event,input)=>{if(!trustedAyaSender(event))return {ok:false,error:'UNTRUSTED_WINDOW'};const result=await languagePacks.importPack(input);if(result.ok&&input.locale===desktopLocale)await activateDesktopLanguage(desktopLocale,false);return result;});
app.on('web-contents-created',(_event,contents)=>contents.once('destroyed',()=>languagePacks.cancel(contents.id)));
