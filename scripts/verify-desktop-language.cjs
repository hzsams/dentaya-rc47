'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),vm=require('node:vm'),{EventEmitter}=require('node:events'),{createRequire}=require('node:module');
const filename=path.resolve(__dirname,'../electron/main.cjs'),realRequire=createRequire(filename),temporary=fs.mkdtempSync(path.join(os.tmpdir(),'dentaya-language-ipc-'));
const handlers=new Map(),windows=[],cancelled=[],starts=[],gets=[];
let menu,busy=false,getHook,chatCalls=0;
class Window extends EventEmitter{
 constructor(){super();this.destroyed=false;this.webContents=new EventEmitter();this.webContents.id=windows.length+1;this.webContents.mainFrame={url:''};this.webContents.getURL=()=>this.webContents.mainFrame.url;this.webContents.setWindowOpenHandler=fn=>{this.open=fn;};this.webContents.send=()=>{};windows.push(this);app.emit('web-contents-created',null,this.webContents);}
 loadURL(url){this.webContents.mainFrame.url=url;}isDestroyed(){return this.destroyed;}isMinimized(){return false;}show(){}focus(){}maximize(){}restore(){}setIcon(){}close(){this.destroyed=true;this.emit('closed');}
 static fromWebContents(contents){return windows.find(win=>win.webContents===contents);}static getAllWindows(){return windows.filter(win=>!win.destroyed);}static getFocusedWindow(){return windows[0];}
}
const switchReads=[];
const app=new EventEmitter();Object.assign(app,{isPackaged:false,commandLine:{appendSwitch(){},getSwitchValue(name){switchReads.push(name);return '';}},getPath:()=>temporary,setPath:(_key,value)=>{app.getPath=()=>value;},requestSingleInstanceLock:()=>true,whenReady:()=>Promise.resolve(),quit(){},relaunch(){}});
const pack={isBusy:()=>busy,get:async locale=>{gets.push(locale);if(getHook)return getHook(locale);return {ok:true,entries:locale==='en'?{'Logo ve görünüm ayarları':'Brand settings','Düzenle':'Edit','Geri al':'Undo','Çıkış':'Quit'}:locale==='fr'?{'Düzenle':'Modifier'}:{}};},start:(input,owner)=>{starts.push({input,owner});return {ok:true};},status:()=>({running:busy}),cancel:owner=>{cancelled.push(owner);return {ok:true};},importPack:async()=>({ok:true})};
const aya={isBusy:()=>false,status:async()=>({ok:true}),guide:(_prompt,t)=>({ok:true,output:t('Geri al')}),chat:async(_input,_owner,t)=>{chatCalls++;return {ok:true,output:t('Geri al')};},cancel:owner=>cancelled.push(owner),cancelDownload:owner=>cancelled.push(owner),startDownload:async()=>({ok:true})};
function requireMock(name){if(name==='electron')return {app,BrowserWindow:Window,Menu:{buildFromTemplate:items=>items,setApplicationMenu:items=>{menu=items;}},shell:{openExternal(){}},dialog:{showErrorBox:(_title,message)=>{throw Error(message);}},ipcMain:{handle:(name,fn)=>handlers.set(name,fn)},safeStorage:{}};if(name==='./aya/language-packs.cjs')return {LANGUAGES:realRequire(name).LANGUAGES,createLanguagePacks:()=>pack};if(name==='./aya-local.cjs')return {createLocalAya:()=>aya};if(name==='./desktop-brand.cjs')return {LOGOS:[],updateDesktopIcon:()=>({ok:true})};return realRequire(name);}
const event=(win,frame=win.webContents.mainFrame)=>({sender:win.webContents,senderFrame:frame});
async function run(){
 vm.runInNewContext(fs.readFileSync(filename,'utf8'),{require:requireMock,__dirname:path.dirname(filename),process,console,URL,setTimeout,clearTimeout},{filename});await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(switchReads,['user-data-dir']);assert.equal(app.getPath('userData'),path.join(temporary,'DentAYA-Desktop'),'No command-line override retains the application profile directory');
 assert.equal(windows.length,1);const owned=windows[0],foreign=new Window();foreign.loadURL('http://localhost:3010/workspace');
 for(const channel of ['get','start','status','cancel','activate','import'])for(const ev of [event(foreign),event(owned,{url:owned.webContents.getURL()})])assert.equal((await handlers.get('dentaya:language-'+channel)(ev,{locale:'en',model:'qwen3:4b'})).error,'UNTRUSTED_WINDOW');

 for(const channel of ['dentaya:aya-managed-install','dentaya:aya-managed-cancel','dentaya:aya-managed-stop','dentaya:aya-model-import'])for(const ev of [event(foreign),event(owned,{url:owned.webContents.getURL()})])assert.equal((await handlers.get(channel)(ev)).error,'UNTRUSTED_WINDOW');
 const originalUrl=owned.webContents.mainFrame.url;owned.loadURL('https://invalid.example/workspace');assert.equal((await handlers.get('dentaya:language-start')(event(owned),{locale:'en'})).error,'UNTRUSTED_WINDOW');owned.loadURL(originalUrl);assert.equal(starts.length,0);
 await handlers.get('dentaya:language-start')(event(owned),{locale:'en',model:'qwen3:4b'});assert.deepEqual(starts[0],{input:{locale:'en',model:'qwen3:4b'},owner:owned.webContents.id});await handlers.get('dentaya:language-cancel')(event(owned));assert.equal(cancelled.at(-1),owned.webContents.id);
 assert.equal((await handlers.get('dentaya:language-activate')(event(owned),{locale:'__proto__'})).error,'INVALID_LOCALE');
 await handlers.get('dentaya:language-activate')(event(owned),{locale:'en'});assert.equal(menu[0].submenu[0].label,'Brand settings');assert.equal(menu[0].submenu[0].accelerator,'CmdOrCtrl+,');assert.equal(menu[1].label,'Edit');assert.equal(menu[1].submenu[0].role,'undo');assert.equal(menu[1].submenu[0].label,'Undo');assert.equal(JSON.parse(fs.readFileSync(path.join(app.getPath('userData'),'interface-language.json'),'utf8')).locale,'en');
 let release;getHook=locale=>locale==='en'?new Promise(resolve=>{release=resolve;}):Promise.resolve({ok:true,entries:{'Düzenle':'Modifier'}});
 const stale=handlers.get('dentaya:language-activate')(event(owned),{locale:'en'});await handlers.get('dentaya:language-activate')(event(owned),{locale:'fr'});release({ok:true,entries:{'Düzenle':'Edit'}});await stale;assert.equal(menu[1].label,'Modifier');getHook=undefined;
 busy=true;assert.equal((await handlers.get('dentaya:aya-local-chat')(event(owned),{locale:'en'})).error,'LOCAL_BUSY');assert.equal(chatCalls,0);busy=false;
 getHook=()=>new Promise(resolve=>{release=resolve;});const race=handlers.get('dentaya:aya-local-chat')(event(owned),{locale:'en'});busy=true;release({ok:true,entries:{'Geri al':'Undo'}});assert.equal((await race).error,'LOCAL_BUSY');assert.equal(chatCalls,0);busy=false;getHook=undefined;
 assert.equal((await handlers.get('dentaya:aya-local-guide')(event(owned),{prompt:'geri al',locale:'en'})).output,'Undo');
 owned.open({url:'http://localhost:3010/cad'});const cad=windows.at(-1);assert.equal((await handlers.get('dentaya:language-get')(event(cad),{locale:'en'})).ok,true);const old=cancelled.length;cad.webContents.emit('destroyed');assert.ok(cancelled.slice(old).every(owner=>owner===cad.webContents.id));assert.equal(cancelled.length-old,3);
 console.log('PASS desktop language IPC: owner/top-frame/origin checks, cancel ownership, CAD window access, localized menu roles/accelerators and persistence, stale activation guard, chat/translation busy race. Electron windows and model inference mocked.');
}
run().finally(()=>fs.rmSync(temporary,{recursive:true,force:true})).catch(error=>{console.error(error);process.exitCode=1;});
