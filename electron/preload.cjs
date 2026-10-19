const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('dentayaDesktop', {
  languagePackGet: input => ipcRenderer.invoke('dentaya:language-get',input),
  languagePackStart: input => ipcRenderer.invoke('dentaya:language-start',input),
  languagePackStatus: () => ipcRenderer.invoke('dentaya:language-status'),
  languagePackCancel: () => ipcRenderer.invoke('dentaya:language-cancel'),
  languagePackActivate: input => ipcRenderer.invoke('dentaya:language-activate',input),
  languagePackImport: input => ipcRenderer.invoke('dentaya:language-import',input),
  localAyaInstall: () => ipcRenderer.invoke('dentaya:aya-managed-install'),
  localAyaInstallCancel: () => ipcRenderer.invoke('dentaya:aya-managed-cancel'),
  localAyaEngineStop: () => ipcRenderer.invoke('dentaya:aya-managed-stop'),
  localAyaImportModel: () => ipcRenderer.invoke('dentaya:aya-model-import'),
  onLocalAyaToken: callback => {const handler=(_event,value)=>{if(value&&typeof value.requestId==='string'&&typeof value.output==='string'&&value.output.length<=64000)callback(value);};ipcRenderer.on('dentaya:aya-local-token',handler);return()=>ipcRenderer.removeListener('dentaya:aya-local-token',handler);},
  localAyaGuide: (input) => ipcRenderer.invoke('dentaya:aya-local-guide', input),
  localAyaStatus: () => ipcRenderer.invoke('dentaya:aya-local-status'),
  localAyaChat: (input) => ipcRenderer.invoke('dentaya:aya-local-chat', input),
  localAyaCancel: () => ipcRenderer.invoke('dentaya:aya-local-cancel'),
  localAyaDownload: () => ipcRenderer.invoke('dentaya:aya-local-download'),
  localAyaCancelDownload: () => ipcRenderer.invoke('dentaya:aya-local-cancel-download'),
  saveAyaConnection: (input) => ipcRenderer.invoke('dentaya:aya-connection', input),
  updateDesktopIcon: (logo) => ipcRenderer.invoke('dentaya:desktop-icon', logo),
  onOpenPreferences: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('dentaya:preferences', handler);
    return () => ipcRenderer.removeListener('dentaya:preferences', handler);
  },
});
