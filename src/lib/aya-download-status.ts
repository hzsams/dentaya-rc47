// Ollama transport messages are engine codes, not user-authored chat content.
export function ayaDownloadStatus(value:string) {
  if(value==='pulling manifest')return 'Model bilgileri alınıyor…';
  if(/^pulling\s/.test(value))return 'Model dosyaları indiriliyor…';
  if(/^verifying\s/.test(value))return 'Model dosyaları doğrulanıyor…';
  if(value==='writing manifest')return 'Model kaydediliyor…';
  if(value==='removing any unused layers')return 'Model kurulumu tamamlanıyor…';
  if(value==='success')return 'Model kurulumu tamamlandı.';
  return value;
}
