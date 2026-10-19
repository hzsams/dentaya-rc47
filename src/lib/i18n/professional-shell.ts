const tr = {
  setupTitle: 'Kurum bağlantısı bekleniyor',
  setupDescription: 'Kayıtlar ve ekip işlemleri için kurum bağlantısını tamamlayın. Yerel araçları kullanmaya devam edebilirsiniz.',
  invalidTitle: 'Kurum bağlantısı kontrol edilmeli',
  invalidDescription: 'Bağlantı adresi geçerli değil. Kurum yöneticiniz bağlantı ayarlarını düzeltene kadar sunucuya kayıt yapılamaz.',
  setupDetails: 'Bağlantı ayrıntıları',
  setupTechnical: 'Kurulum sorumlusu: Supabase adresini ve herkese açık bağlantı anahtarını ortam ayarlarında yapılandırın.',
  systemTools: 'Sistem araçları',
  menu: 'Modül menüsü',
  appearance: 'Görünüm',
  selectedResult: 'Seçili sonucu aç',
  navigateResults: 'Sonuçlar arasında gez',
  navigationHint: '↑↓ Sonuçlar arasında gez · Enter Seçili sonucu aç',
  failed: 'Bu işlem tamamlanamadı. Kaydedilmemiş değişiklikleri kontrol edip yeniden deneyin.',
  offline: 'Sunucu bağlantısı bekleniyor. Yerel araçlar ve mevcut kurtarma kayıtları kullanılabilir; sunucu kaydı bağlantı geri geldiğinde yapılmalıdır.',
  supportReference: 'Destek referansı',
};
const en: typeof tr = {
  setupTitle: 'Organization connection pending',
  setupDescription: 'Complete the organization connection to save records and work with your team. Local tools remain available.',
  invalidTitle: 'Check the organization connection',
  invalidDescription: 'The connection address is invalid. Server records cannot be saved until your administrator corrects the connection settings.',
  setupDetails: 'Connection details',
  setupTechnical: 'Setup administrator: configure the Supabase address and public connection key in the environment settings.',
  systemTools: 'System tools',
  menu: 'Module menu',
  appearance: 'Appearance',
  selectedResult: 'Open selected result',
  navigateResults: 'Navigate results',
  navigationHint: '↑↓ Navigate results · Enter Open selected result',
  failed: 'This operation could not be completed. Check your unsaved changes and try again.',
  offline: 'Waiting for the server connection. Local tools and existing recovery records remain available; save to the server after reconnecting.',
  supportReference: 'Support reference',
};
export function professionalShellText(locale: string) { return locale === 'tr' ? tr : en; }
export function needsOrganizationConnection(pathname: string) {
  return !['/', '/ai', '/mini-game', '/training', '/cad-library'].some(path => pathname === path || (path !== '/' && pathname.startsWith(path + '/')));
}
