const tr={
 modules:'Modüller',toggleNavigation:'Modül menüsünü göster / gizle',closeMenu:'Modül menüsünü kapat',
 workspaces:'Çalışma alanları',workManager:'İş yöneticisi',design:'Design',assistant:'AYA',
 workspace:'Çalışma alanı',local:'Yerel çalışma',networkAvailable:'Ağ açık',offline:'Çevrimdışı',
 tools:'Araçlar',searchHint:'Modül adıyla ara',preferences:'Görünüm ve tercihler',menuHint:'Alt + M',
} as const;
const en:{[K in keyof typeof tr]:string}={
 modules:'Modules',toggleNavigation:'Show / hide module navigation',closeMenu:'Close module menu',
 workspaces:'Workspaces',workManager:'Work manager',design:'Design',assistant:'AYA',
 workspace:'Workspace',local:'Local workspace',networkAvailable:'Network online',offline:'Offline',
 tools:'Tools',searchHint:'Find a module',preferences:'Appearance and preferences',menuHint:'Alt + M',
};
export function desktopShellText(locale:string){return locale==='tr'?tr:en;}
