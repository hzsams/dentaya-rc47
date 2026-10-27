// Local settings use TR/EN fallback without changing the user's selected language.
export function localSettingsText(locale:string){
 const tr=locale==='tr';
 return {
  title:tr?'Bu cihazın ayarları':'Settings on this computer',local:tr?'Yerel çalışma alanı':'Local workspace',hint:tr?'Görünüm, çalışma düzeni, dil ve AYA tercihleri bu cihazda saklanır. Hesap ve kurum ayarları için oturum açın.':'Appearance, workspace, language and AYA preferences are saved on this computer. Sign in to manage an account or organization.',
  back:tr?'Çalışma alanına dön':'Back to workspace',categories:tr?'Yerel ayar kategorileri':'Local settings categories',appearance:tr?'Renk ve görünüm':'Appearance',work:tr?'Çalışma düzeni':'Workspace',language:tr?'Dil ve bölge':'Language and region',aya:tr?'AYA yerel':'Local AYA',
  navigation:tr?'Modül şeridi':'Activity rail',compact:tr?'Sıkı yerleşim':'Compact layout',reducedMotion:tr?'Hareketi azalt':'Reduce motion',saved:tr?'Tercihler bu cihaza kaydedildi.':'Preferences saved on this computer.',failed:tr?'Tercihler uygulandı; bu cihazda kalıcı kayıt yapılamadı.':'Preferences applied; persistent storage is unavailable.',
 };
}
