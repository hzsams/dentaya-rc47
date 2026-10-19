export type CommunityProfile={id:string;user_id:string|null;organization_id:string|null;kind:'person'|'clinic'|'laboratory';handle:string;display_name:string;bio:string;city:string;specialty:string;website:string;avatar_path:string|null};
export type CommunityPost={id:string;profile_id:string;kind:'post'|'discussion'|'article';category:string;title:string;body:string;media_path:string|null;media_type:'image'|'video'|null;status:string;created_at:string;author:CommunityProfile;likes:{count:number}[];comments:{count:number}[]};
export const COMMUNITY_CATEGORIES={general:'Genel',cad:'CAD & dijital',materials:'Materyaller',clinic:'Klinik',laboratory:'Laboratuvar',education:'Eğitim'};
export const profileKind=(kind:string)=>kind==='clinic'?'Klinik':kind==='laboratory'?'Laboratuvar':'Kişisel profil';
export function isMissingCommunitySchema(error:unknown){const e=error as {code?:string;message?:string};return ['42P01','PGRST205'].includes(e?.code??'')&&/community_/i.test(e?.message??'');}
export function communityError(error:unknown){const e=error as {code?:string;message?:string};if(isMissingCommunitySchema(error))return 'Topluluk kurulumu eksik. Kurulum panelindeki adımları izleyin.';if(e?.code==='23505')return 'Bu kullanıcı adı veya kayıt zaten mevcut.';if(e?.message?.includes('COMMUNITY_RATE_LIMIT'))return 'Çok hızlı paylaşıyorsunuz. Bir dakika sonra yeniden deneyin.';if(e?.code==='42501')return 'Bu işlem için yetkiniz yok veya oturumunuz sona ermiş.';return 'İşlem tamamlanamadı. Bağlantınızı kontrol edip yeniden deneyin.';}
export function communityFile(file:File,avatar=false){
 const types:Record<string,string>={'image/jpeg':'jpg','image/png':'png','image/webp':'webp','video/mp4':'mp4','video/webm':'webm'};
 const extension=types[file.type];if(!extension||(avatar&&!file.type.startsWith('image/')))throw Error('JPG, PNG, WebP'+(avatar?'':' veya MP4/WebM')+' dosyası seçin.');
 const max=file.type.startsWith('image/')?10:50;
 if(file.size===0||file.size>max*1024*1024)throw Error(`Dosya boş olmamalı ve ${max} MB sınırını aşmamalı.`);
 return {extension,mediaType:file.type.startsWith('image/')?'image' as const:'video' as const};
}
