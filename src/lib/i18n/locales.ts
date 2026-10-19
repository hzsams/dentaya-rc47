export const LANGUAGES = [
 {id:'tr',name:'Türkçe',tag:'tr-TR',dir:'ltr'}, {id:'en',name:'English',tag:'en-GB',dir:'ltr'},
 {id:'de',name:'Deutsch',tag:'de-DE',dir:'ltr'}, {id:'fr',name:'Français',tag:'fr-FR',dir:'ltr'},
 {id:'es',name:'Español',tag:'es-ES',dir:'ltr'}, {id:'it',name:'Italiano',tag:'it-IT',dir:'ltr'},
 {id:'pt',name:'Português',tag:'pt-PT',dir:'ltr'}, {id:'nl',name:'Nederlands',tag:'nl-NL',dir:'ltr'},
 {id:'pl',name:'Polski',tag:'pl-PL',dir:'ltr'}, {id:'ro',name:'Română',tag:'ro-RO',dir:'ltr'},
 {id:'ru',name:'Русский',tag:'ru-RU',dir:'ltr'}, {id:'uk',name:'Українська',tag:'uk-UA',dir:'ltr'},
 {id:'ar',name:'العربية',tag:'ar-EG',dir:'rtl'}, {id:'zh',name:'简体中文',tag:'zh-CN',dir:'ltr'},
 {id:'ja',name:'日本語',tag:'ja-JP',dir:'ltr'},
 {id:'sv',name:'Svenska',tag:'sv-SE',dir:'ltr'}, {id:'da',name:'Dansk',tag:'da-DK',dir:'ltr'},
 {id:'el',name:'Ελληνικά',tag:'el-GR',dir:'ltr'}, {id:'cs',name:'Čeština',tag:'cs-CZ',dir:'ltr'},
 {id:'ko',name:'한국어',tag:'ko-KR',dir:'ltr'},
 {id:'bg',name:'Български',tag:'bg-BG',dir:'ltr'}, {id:'hr',name:'Hrvatski',tag:'hr-HR',dir:'ltr'},
 {id:'et',name:'Eesti',tag:'et-EE',dir:'ltr'}, {id:'fi',name:'Suomi',tag:'fi-FI',dir:'ltr'},
 {id:'hu',name:'Magyar',tag:'hu-HU',dir:'ltr'}, {id:'ga',name:'Gaeilge',tag:'ga-IE',dir:'ltr'},
 {id:'lv',name:'Latviešu',tag:'lv-LV',dir:'ltr'}, {id:'lt',name:'Lietuvių',tag:'lt-LT',dir:'ltr'},
 {id:'mt',name:'Malti',tag:'mt-MT',dir:'ltr'}, {id:'sk',name:'Slovenčina',tag:'sk-SK',dir:'ltr'},
 {id:'sl',name:'Slovenščina',tag:'sl-SI',dir:'ltr'},
 {id:'no',name:'Norsk',tag:'nb-NO',dir:'ltr'}, {id:'is',name:'Íslenska',tag:'is-IS',dir:'ltr'},
 {id:'sr',name:'Српски',tag:'sr-RS',dir:'ltr'}, {id:'bs',name:'Bosanski',tag:'bs-BA',dir:'ltr'},
 {id:'sq',name:'Shqip',tag:'sq-AL',dir:'ltr'}, {id:'mk',name:'Македонски',tag:'mk-MK',dir:'ltr'},
 {id:'az',name:'Azərbaycan dili',tag:'az-AZ',dir:'ltr'}, {id:'ka',name:'ქართული',tag:'ka-GE',dir:'ltr'},
 {id:'hy',name:'Հայերեն',tag:'hy-AM',dir:'ltr'}, {id:'he',name:'עברית',tag:'he-IL',dir:'rtl'},
 {id:'fa',name:'فارسی',tag:'fa-IR',dir:'rtl'}, {id:'hi',name:'हिन्दी',tag:'hi-IN',dir:'ltr'},
 {id:'bn',name:'বাংলা',tag:'bn-BD',dir:'ltr'}, {id:'id',name:'Bahasa Indonesia',tag:'id-ID',dir:'ltr'},
 {id:'vi',name:'Tiếng Việt',tag:'vi-VN',dir:'ltr'},
] as const;
export type Locale=typeof LANGUAGES[number]['id'];
export function isLocale(value:unknown):value is Locale {return LANGUAGES.some(l=>l.id===value);}
export function languageInfo(value:unknown){return LANGUAGES.find(l=>l.id===value)??LANGUAGES[0];}

export const EU_LOCALES=['bg','hr','cs','da','nl','en','et','fi','fr','de','el','hu','ga','it','lv','lt','mt','pl','pt','ro','sk','sl','es','sv'] as const satisfies readonly Locale[];
