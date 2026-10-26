import type { DentayaIconName } from '../app/DentayaIcon';

export type ModuleFolderLabel = 'clinic' | 'records' | 'planning' | 'scans' | 'lab' | 'design' | 'production' | 'delivery' | 'management' | 'work' | 'team' | 'workspace' | 'communication' | 'tools' | 'system';
export type ModuleDestination = { kind: 'module'; href: string; label: string; icon: DentayaIconName };
export type ModuleFolder = { kind: 'folder'; id: string; label: ModuleFolderLabel; children: ModuleNode[] };
export type ModuleNode = ModuleDestination | ModuleFolder;

const destination = (href: string, label: string, icon: DentayaIconName): ModuleDestination => ({ kind: 'module', href, label, icon });
const folder = (id: string, label: ModuleFolderLabel, children: ModuleNode[]): ModuleFolder => ({ kind: 'folder', id, label, children });

// One destination catalog serves the desktop menu and the existing CAD module command.
export const MODULE_TREE: ModuleFolder[] = [
  folder('clinic', 'clinic', [
    folder('clinic/records', 'records', [destination('/patients', 'Hastalar', 'patient'), destination('/cases', 'Vakalar', 'case')]),
    folder('clinic/planning', 'planning', [destination('/appointments', 'Randevular', 'calendar')]),
    folder('clinic/scans', 'scans', [destination('/scans', 'Taramalar', 'scan'), destination('/scan-studio', 'Tarama stüdyosu', 'scan')]),
    destination('/clinic', 'Klinik', 'clinic'),
  ]),
  folder('lab', 'lab', [
    folder('lab/design', 'design', [destination('/design', 'CAD çalışma alanı', 'design'), destination('/cad-library', 'Form kütüphanesi', 'design')]),
    folder('lab/production', 'production', [destination('/labs', 'Laboratuvar', 'lab'), destination('/training', 'Demo ve eğitim', 'guide')]),
    folder('lab/delivery', 'delivery', [destination('/logistics', 'Teslimatlar', 'logistics')]),
  ]),
  folder('management', 'management', [
    folder('management/work', 'work', [destination('/operations', 'İş takibi', 'shield'), destination('/finance', 'Finans', 'finance')]),
    folder('management/team', 'team', [destination('/team', 'Ekip', 'team')]),
  ]),
  folder('workspace', 'workspace', [
    destination('/workspace', 'Genel bakış', 'home'),
    destination('/ai', 'AYA çalışma asistanı', 'ai'),
    folder('workspace/communication', 'communication', [destination('/messages', 'Mesajlar', 'message'), destination('/notifications', 'Bildirimler', 'notification'), destination('/community', 'Topluluk', 'team')]),
    folder('workspace/tools', 'tools', [
      destination('/settings', 'Ayarlar', 'settings'),
      folder('workspace/tools/system', 'system', [destination('/pilot-flow', 'Doğrulama kayıtları', 'shield'), destination('/pilot-check', 'Sistem Kontrolü', 'guide'), destination('/ops-health', 'Operasyon Sağlığı', 'shield'), destination('/release-check', 'RC Kontrolü', 'guide')]),
    ]),
  ]),
];

export function isCurrentModule(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + '/') || (href === '/design' && pathname === '/cad');
}

export function moduleAncestorIds(nodes: ModuleNode[], pathname: string): string[] {
  for (const node of nodes) {
    if (node.kind === 'folder' && moduleDestinations(node.children).some(child => isCurrentModule(pathname, child.href))) {
      return [node.id, ...moduleAncestorIds(node.children, pathname)];
    }
  }
  return [];
}

export function moduleDestinations(nodes: ModuleNode[]): ModuleDestination[] {
  return nodes.flatMap(node => node.kind === 'module' ? [node] : moduleDestinations(node.children));
}

export function moduleFolderIds(nodes: ModuleNode[]): string[] {
  return nodes.flatMap(node => node.kind === 'folder' ? [node.id, ...moduleFolderIds(node.children)] : []);
}

export function normalizeModuleQuery(value: string) {
  return value.toLocaleLowerCase('tr').normalize('NFD').replace(/\p{M}/gu, '').replace(/ı/g, 'i').trim();
}

export function filterModuleTree(nodes: ModuleNode[], query: string, label: (node: ModuleNode) => string): ModuleNode[] {
  const search = normalizeModuleQuery(query);
  if (!search) return nodes;
  return nodes.flatMap(node => {
    const ownLabel = node.kind === 'module' ? `${label(node)} ${node.label}` : label(node);
    if (normalizeModuleQuery(ownLabel).includes(search)) return [node];
    if (node.kind === 'module') return [];
    const children = filterModuleTree(node.children, query, label);
    return children.length ? [{ ...node, children }] : [];
  });
}
