import type { ModuleFolderLabel } from '../module-navigation';

const tr = {
  folders: {
    clinic: 'Klinik', records: 'Hasta ve vaka kayıtları', planning: 'Planlama', scans: 'Dijital taramalar',
    lab: 'Laboratuvar', design: 'Tasarım', production: 'Laboratuvar ve eğitim', delivery: 'Teslimat',
    management: 'Yönetim', work: 'İşler ve finans', team: 'Ekip', workspace: 'Çalışma alanı',
    communication: 'İletişim', tools: 'Tercihler ve kontroller', system: 'Sistem araçları',
  } satisfies Record<ModuleFolderLabel, string>,
  search: 'Modül bul', placeholder: 'Modül veya klasör ara…', navigation: 'Çalışma alanı menüsü',
  noResults: 'Modül bulunamadı.', keyboardHint: '↑ ↓ Gez · → Aç · ← Kapat · Enter Seç',
};
const en: { folders: Record<ModuleFolderLabel, string> } & Record<Exclude<keyof typeof tr, 'folders'>, string> = {
  folders: {
    clinic: 'Clinic', records: 'Patient and case records', planning: 'Planning', scans: 'Digital scans',
    lab: 'Laboratory', design: 'Design', production: 'Laboratory and training', delivery: 'Delivery',
    management: 'Management', work: 'Work and finance', team: 'Team', workspace: 'Workspace',
    communication: 'Communication', tools: 'Preferences and checks', system: 'System tools',
  },
  search: 'Find a module', placeholder: 'Search modules or folders…', navigation: 'Workspace menu',
  noResults: 'No modules found.', keyboardHint: '↑ ↓ Navigate · → Expand · ← Collapse · Enter Select',
};
export function moduleNavigationText(locale: string) { return locale === 'tr' ? tr : en; }
