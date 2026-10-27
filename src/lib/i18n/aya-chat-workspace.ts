const tr={interrupted:'Önceki yanıt tamamlanmadan sohbetten ayrıldınız. Sorunuz taslakta korundu; düzenleyebilir veya tekrar gönderebilirsiniz.',acceptanceBusy:'Yerel model kabul testi çalışıyor'};
const en:typeof tr={interrupted:'You left before the previous reply completed. Your question is restored in the draft; edit it or send it again.',acceptanceBusy:'Local model acceptance test is running'};
export function ayaChatWorkspaceText(locale:string){return locale==='tr'?tr:en;}
