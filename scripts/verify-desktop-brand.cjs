const assert=require('node:assert/strict'),fs=require('fs'),os=require('os'),path=require('path');
const {updateDesktopIcon,LOGOS}=require('../electron/desktop-brand.cjs');
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'dentaya-brand-'));const app={isPackaged:true,getPath:()=>temp};let written;
const shell={writeShortcutLink:(file,operation,options)=>{written={file,operation,options};return true;},readShortcutLink:()=>({target:'/apps/DentAYA.exe'})};
assert.equal(LOGOS.length,18);assert.equal(new Set(LOGOS).size,18);
for(const logo of LOGOS){
  assert.equal(updateDesktopIcon({app,shell,logo,platform:'win32',executable:'/apps/DentAYA.exe'}).ok,true);
  assert.ok(fs.existsSync(written.options.icon));
}
assert.equal(updateDesktopIcon({app,shell,logo:'../../escape',platform:'win32'}).ok,false);
assert.equal(updateDesktopIcon({app,shell,logo:LOGOS[0],platform:'linux'}).ok,false);
assert.equal(updateDesktopIcon({app,shell,logo:LOGOS[2],platform:'win32',executable:'/apps/DentAYA.exe'}).ok,true);
assert.equal(written.operation,'create');assert.equal(written.options.target,'/apps/DentAYA.exe');assert.ok(fs.existsSync(written.options.icon));assert.equal(written.options.iconIndex,0);
fs.writeFileSync(path.join(temp,'DentAYA.lnk'),'test fixture');
assert.equal(updateDesktopIcon({app,shell,logo:LOGOS[1],platform:'win32',executable:'/apps/DentAYA.exe'}).ok,true);assert.equal(written.operation,'update');
assert.equal(updateDesktopIcon({app,shell,logo:LOGOS[1],platform:'win32',executable:'/other/program.exe'}).ok,false);
assert.equal(updateDesktopIcon({app,shell:{...shell,writeShortcutLink:()=>false},logo:LOGOS[1],platform:'win32',executable:'/apps/DentAYA.exe'}).ok,false);
console.log('PASS: allowlist, platform, icon persistence, shortcut create/update, foreign shortcut protection, failure result. Windows shell is mocked.');
