const path = require('path');
const fs = require('fs');
const LOGOS = ['01_dental_form','02_dental_arch','03_cad_geometry','04_scan','05_orbit','06_crown','07_prism','08_wave','09_link','10_spark','11_layer','12_shield','13_apex','14_diamond','15_focus','16_flow','17_petal','18_bridge'];
function updateDesktopIcon({app,shell,logo,platform=process.platform,executable=process.execPath}) {
  if (platform !== 'win32' || !app.isPackaged) return {ok:false,message:'Masaüstü simgesi kurulu Windows uygulamasında değiştirilebilir.'};
  if (!LOGOS.includes(logo)) return {ok:false,message:'Bu logo desteklenmiyor.'};
  try {
    const shortcut = path.join(app.getPath('desktop'),'DentAYA.lnk');
    const exists = fs.existsSync(shortcut);
    if (exists) {
      const current = shell.readShortcutLink(shortcut);
      if (path.resolve(current.target).toLowerCase() !== path.resolve(executable).toLowerCase()) return {ok:false,message:'DentAYA adlı kısayol başka bir kuruluma bağlı. Önce doğru kurulumu kontrol edin.'};
    }
    const directory = path.join(app.getPath('userData'),'brand-icons');
    fs.mkdirSync(directory,{recursive:true});
    const icon = path.join(directory,`${logo}.ico`);
    fs.copyFileSync(path.join(__dirname,'logos',`${logo}_icon.ico`),icon);
    const ok = shell.writeShortcutLink(shortcut,exists?'update':'create',{
      target:executable,icon,iconIndex:0,description:'DentAYA çalışma alanı',appUserModelId:'com.dentaya.desktop',
    });
    return {ok,message:ok?'DentAYA masaüstü simgesi güncellendi. Eski görünürse masaüstünde F5 tuşuna basın.':'Windows kısayolu güncellenemedi.'};
  } catch { return {ok:false,message:'Masaüstü simgesi kaydedilemedi. Klasör erişimini kontrol edin.'}; }
}
module.exports = {LOGOS,updateDesktopIcon};
